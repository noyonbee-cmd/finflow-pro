'use strict';

const mongoose = require('mongoose');
const ApiResponse = require('../utils/apiResponse');
const logger = require('../utils/logger');
const { Client, Transaction, Settings, Agent } = require('../models');

/**
 * @module client.controller
 * @description Client API controllers for FinFlow Pro.
 */

function bdtToPaisa(bdt) { return Math.round(Number(bdt) * 100); }
function paisaToBdt(paisa) { return (paisa / 100).toFixed(2); }
function resolveAdminId(user) { return user.role === 'ADMIN' ? user.id : user.adminId; }

function enrichClient(c) {
  const obj = c.toJSON ? c.toJSON() : { ...c };
  if (obj.stats) {
    obj.stats.totalVolume_bdt = paisaToBdt(obj.stats.totalVolume || 0);
    obj.stats.totalFeesPaid_bdt = paisaToBdt(obj.stats.totalFeesPaid || 0);
  }
  return obj;
}

// ═══════════════════════════════════════════════════════════════
// CREATE CLIENT
// ═══════════════════════════════════════════════════════════════

async function createClient(req, res, next) {
  try {
    const adminId = resolveAdminId(req.user);
    const {
      name, phone, email, address,
      customFeePercent, customCommissionPercent,
      assignedAgentId, tags, notes,
    } = req.body;

    // Agent permission check
    if (req.user.role === 'AGENT') {
      const settings = await Settings.findOne({ adminId: new mongoose.Types.ObjectId(adminId) }).lean();
      // Allow by default if settings don't exist
      if (settings && settings.agentCanAddClients === false) {
        return ApiResponse.error(res, 'Agents are not permitted to add clients', 403, 'AGENT_NOT_ALLOWED');
      }
    }

    // Phone uniqueness within adminId
    const existing = await Client.findOne({
      adminId: new mongoose.Types.ObjectId(adminId),
      phone: phone.trim(),
    }).lean();

    if (existing) {
      return ApiResponse.error(res, 'A client with this phone number already exists', 409, 'DUPLICATE_PHONE');
    }

    // If agent creates: auto-assign
    let effectiveAgentId = assignedAgentId || null;
    if (req.user.role === 'AGENT') {
      effectiveAgentId = req.user.id;
    }

    // Validate agent belongs to admin
    if (effectiveAgentId) {
      const agent = await Agent.findOne({
        _id: new mongoose.Types.ObjectId(effectiveAgentId),
        adminId: new mongoose.Types.ObjectId(adminId),
      }).lean();
      if (!agent) {
        return ApiResponse.error(res, 'Assigned agent not found', 404, 'AGENT_NOT_FOUND');
      }
    }

    const client = await Client.create({
      adminId,
      name: name.trim(),
      phone: phone.trim(),
      email: email || null,
      address: address || null,
      customFeePercent: customFeePercent ?? null,
      customCommissionPercent: customCommissionPercent ?? null,
      assignedAgentId: effectiveAgentId,
      tags: tags || [],
      notes: notes || '',
      createdBy: {
        id: new mongoose.Types.ObjectId(req.user.id),
        role: req.user.role,
      },
    });

    logger.info('Client created', { clientId: client._id, adminId, phone });

    return ApiResponse.success(res, enrichClient(client), 'Client created successfully', 201);
  } catch (err) {
    next(err);
  }
}

// ═══════════════════════════════════════════════════════════════
// GET CLIENTS (paginated, cursor-based)
// ═══════════════════════════════════════════════════════════════

async function getClients(req, res, next) {
  try {
    const adminId = resolveAdminId(req.user);
    const {
      search, agentId, isArchived, tags,
      cursor, limit: rawLimit = 20,
    } = req.query;

    const limit = Math.min(Math.max(parseInt(rawLimit, 10) || 20, 1), 100);

    const query = { adminId: new mongoose.Types.ObjectId(adminId) };

    // Agent: only see own clients
    if (req.user.role === 'AGENT') {
      query.assignedAgentId = new mongoose.Types.ObjectId(req.user.id);
    } else if (agentId) {
      query.assignedAgentId = new mongoose.Types.ObjectId(agentId);
    }

    if (isArchived !== undefined) {
      query.isArchived = isArchived === 'true';
    } else {
      query.isArchived = false; // Default: show active
    }

    if (tags) {
      const tagArr = tags.split(',').map((t) => t.trim().toLowerCase());
      query.tags = { $in: tagArr };
    }

    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { phone: { $regex: search, $options: 'i' } },
      ];
    }

    if (cursor) {
      query._id = { $lt: new mongoose.Types.ObjectId(cursor) };
    }

    const clients = await Client.find(query)
      .sort({ _id: -1 })
      .limit(limit + 1)
      .populate('assignedAgentId', 'name phone')
      .lean({ virtuals: true });

    const hasMore = clients.length > limit;
    const results = hasMore ? clients.slice(0, limit) : clients;
    const nextCursor = hasMore ? results[results.length - 1]._id.toString() : null;

    // Total count for the filtered query (without cursor)
    const countQuery = { ...query };
    delete countQuery._id;
    const total = await Client.countDocuments(countQuery);

    return res.status(200).json({
      success: true,
      message: 'Clients retrieved',
      data: results.map(enrichClient),
      pagination: { limit, hasMore, nextCursor, total },
    });
  } catch (err) {
    next(err);
  }
}

// ═══════════════════════════════════════════════════════════════
// GET SINGLE CLIENT
// ═══════════════════════════════════════════════════════════════

async function getClient(req, res, next) {
  try {
    const adminId = resolveAdminId(req.user);
    const { id } = req.params;

    const query = {
      _id: new mongoose.Types.ObjectId(id),
      adminId: new mongoose.Types.ObjectId(adminId),
    };

    if (req.user.role === 'AGENT') {
      query.assignedAgentId = new mongoose.Types.ObjectId(req.user.id);
    }

    const client = await Client.findOne(query)
      .populate('assignedAgentId', 'name phone')
      .lean({ virtuals: true });

    if (!client) {
      return ApiResponse.error(res, 'Client not found', 404, 'CLIENT_NOT_FOUND');
    }

    // Transaction summary
    const [txnSummary] = await Transaction.aggregate([
      {
        $match: {
          adminId: new mongoose.Types.ObjectId(adminId),
          clientId: new mongoose.Types.ObjectId(id),
          status: 'COMPLETED',
        },
      },
      {
        $group: {
          _id: null,
          totalCR: { $sum: { $cond: [{ $eq: ['$type', 'CR'] }, '$amount', 0] } },
          totalDR: { $sum: { $cond: [{ $eq: ['$type', 'DR'] }, '$amount', 0] } },
          totalFee: { $sum: '$totalFee' },
          count: { $sum: 1 },
        },
      },
    ]);

    return ApiResponse.success(res, {
      ...enrichClient(client),
      transactionSummary: {
        totalCR: txnSummary?.totalCR || 0,
        totalCR_bdt: paisaToBdt(txnSummary?.totalCR || 0),
        totalDR: txnSummary?.totalDR || 0,
        totalDR_bdt: paisaToBdt(txnSummary?.totalDR || 0),
        totalFee: txnSummary?.totalFee || 0,
        totalFee_bdt: paisaToBdt(txnSummary?.totalFee || 0),
        count: txnSummary?.count || 0,
      },
    }, 'Client retrieved');
  } catch (err) {
    next(err);
  }
}

// ═══════════════════════════════════════════════════════════════
// UPDATE CLIENT
// ═══════════════════════════════════════════════════════════════

async function updateClient(req, res, next) {
  try {
    const adminId = resolveAdminId(req.user);
    const { id } = req.params;

    const client = await Client.findOne({
      _id: new mongoose.Types.ObjectId(id),
      adminId: new mongoose.Types.ObjectId(adminId),
    });

    if (!client) {
      return ApiResponse.error(res, 'Client not found', 404, 'CLIENT_NOT_FOUND');
    }

    // Agent: only limited fields
    if (req.user.role === 'AGENT') {
      if (client.assignedAgentId?.toString() !== req.user.id) {
        return ApiResponse.error(res, 'Access denied', 403, 'ACCESS_DENIED');
      }
      const { notes, tags } = req.body;
      if (notes !== undefined) client.notes = notes;
      if (tags !== undefined) client.tags = tags;
    } else {
      // Admin: all fields
      const {
        name, phone, email, address,
        customFeePercent, customCommissionPercent,
        assignedAgentId, tags, notes,
      } = req.body;

      if (name !== undefined) client.name = name;
      if (phone !== undefined) {
        // Check uniqueness
        const dup = await Client.findOne({
          adminId: new mongoose.Types.ObjectId(adminId),
          phone: phone.trim(),
          _id: { $ne: client._id },
        }).lean();
        if (dup) {
          return ApiResponse.error(res, 'Phone number already in use', 409, 'DUPLICATE_PHONE');
        }
        client.phone = phone.trim();
      }
      if (email !== undefined) client.email = email;
      if (address !== undefined) client.address = address;
      if (customFeePercent !== undefined) client.customFeePercent = customFeePercent;
      if (customCommissionPercent !== undefined) client.customCommissionPercent = customCommissionPercent;
      if (assignedAgentId !== undefined) client.assignedAgentId = assignedAgentId || null;
      if (tags !== undefined) client.tags = tags;
      if (notes !== undefined) client.notes = notes;
    }

    await client.save();

    logger.info('Client updated', { clientId: id, adminId });

    return ApiResponse.success(res, enrichClient(client), 'Client updated');
  } catch (err) {
    next(err);
  }
}

// ═══════════════════════════════════════════════════════════════
// ARCHIVE CLIENT (Admin only)
// ═══════════════════════════════════════════════════════════════

async function archiveClient(req, res, next) {
  try {
    const adminId = resolveAdminId(req.user);
    const { id } = req.params;

    const client = await Client.findOneAndUpdate(
      {
        _id: new mongoose.Types.ObjectId(id),
        adminId: new mongoose.Types.ObjectId(adminId),
      },
      { isArchived: true },
      { new: true }
    );

    if (!client) {
      return ApiResponse.error(res, 'Client not found', 404, 'CLIENT_NOT_FOUND');
    }

    logger.info('Client archived', { clientId: id, adminId });

    return ApiResponse.success(res, enrichClient(client), 'Client archived');
  } catch (err) {
    next(err);
  }
}

// ═══════════════════════════════════════════════════════════════
// GET CLIENT TRANSACTIONS (paginated)
// ═══════════════════════════════════════════════════════════════

async function getClientTransactions(req, res, next) {
  try {
    const adminId = resolveAdminId(req.user);
    const { id } = req.params;
    const { cursor, limit: rawLimit = 20 } = req.query;

    const limit = Math.min(Math.max(parseInt(rawLimit, 10) || 20, 1), 100);

    // Verify client access
    const clientQuery = {
      _id: new mongoose.Types.ObjectId(id),
      adminId: new mongoose.Types.ObjectId(adminId),
    };
    if (req.user.role === 'AGENT') {
      clientQuery.assignedAgentId = new mongoose.Types.ObjectId(req.user.id);
    }

    const client = await Client.findOne(clientQuery).lean();
    if (!client) {
      return ApiResponse.error(res, 'Client not found', 404, 'CLIENT_NOT_FOUND');
    }

    const txnQuery = {
      adminId: new mongoose.Types.ObjectId(adminId),
      clientId: new mongoose.Types.ObjectId(id),
    };

    if (cursor) {
      txnQuery._id = { $lt: new mongoose.Types.ObjectId(cursor) };
    }

    const transactions = await Transaction.find(txnQuery)
      .sort({ _id: -1 })
      .limit(limit + 1)
      .populate('agentId', 'name')
      .populate('walletEntries.walletId', 'name type')
      .lean();

    const hasMore = transactions.length > limit;
    const results = hasMore ? transactions.slice(0, limit) : transactions;
    const nextCursorVal = hasMore ? results[results.length - 1]._id.toString() : null;

    const enriched = results.map((txn) => {
      const obj = { ...txn };
      obj.amountBdt = paisaToBdt(obj.amount || 0);
      obj.totalFee_bdt = paisaToBdt(obj.totalFee || 0);
      return obj;
    });

    return res.status(200).json({
      success: true,
      message: 'Client transactions retrieved',
      data: enriched,
      client: { id: client._id, name: client.name, phone: client.phone },
      pagination: { limit, hasMore, nextCursor: nextCursorVal },
    });
  } catch (err) {
    next(err);
  }
}

module.exports = {
  createClient,
  getClients,
  getClient,
  updateClient,
  archiveClient,
  getClientTransactions,
};
