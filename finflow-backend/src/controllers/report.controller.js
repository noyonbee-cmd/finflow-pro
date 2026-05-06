'use strict';

const { Queue } = require('bullmq');
const logger = require('../utils/logger');
const ApiResponse = require('../utils/apiResponse');
const { AppError } = require('../middleware/errorHandler');
const { getBullMQConnection } = require('../config/redis');
const Report = require('../models/Report');
const Settings = require('../models/Settings');

/**
 * @module report.controller
 * @description
 * Report generation controller for FinFlow Pro.
 *
 * Reports are generated asynchronously via BullMQ:
 *  1. Client requests a report → GENERATING status returned
 *  2. BullMQ worker generates PDF + uploads to Cloudinary
 *  3. Client polls status → READY with downloadUrl
 */

let reportQueue = null;

function getReportQueue() {
  if (!reportQueue) {
    const prefix = process.env.BULL_QUEUE_PREFIX || 'finflow';
    reportQueue = new Queue(`${prefix}:reports`, {
      connection: getBullMQConnection(),
      defaultJobOptions: {
        removeOnComplete: 50,
        removeOnFail: 100,
        attempts: 3,
        backoff: { type: 'exponential', delay: 5000 },
      },
    });
  }
  return reportQueue;
}

/**
 * POST /reports
 * Queue a new report generation job.
 */
async function generateReport(req, res, next) {
  try {
    const adminId = req.user.id;
    const { type, dateFrom, dateTo, clientId, agentId, walletId } = req.body;

    if (!type || !dateFrom || !dateTo) {
      throw new AppError('type, dateFrom, and dateTo are required', 400, 'INVALID_INPUT');
    }

    const validTypes = ['DAILY_SUMMARY', 'CLIENT_STATEMENT', 'AGENT_COMMISSION', 'WALLET_LEDGER'];
    if (!validTypes.includes(type)) {
      throw new AppError(`type must be one of: ${validTypes.join(', ')}`, 400, 'INVALID_TYPE');
    }

    if (type === 'CLIENT_STATEMENT' && !clientId) {
      throw new AppError('clientId is required for CLIENT_STATEMENT reports', 400, 'INVALID_INPUT');
    }
    if (type === 'AGENT_COMMISSION' && !agentId) {
      throw new AppError('agentId is required for AGENT_COMMISSION reports', 400, 'INVALID_INPUT');
    }
    if (type === 'WALLET_LEDGER' && !walletId) {
      throw new AppError('walletId is required for WALLET_LEDGER reports', 400, 'INVALID_INPUT');
    }

    // Fetch branding
    const settings = await Settings.findOne({ adminId }).lean();
    const branding = settings?.reportBranding || {};

    // Create report document
    const report = await Report.create({
      adminId,
      type,
      status: 'GENERATING',
      dateRange: { from: new Date(dateFrom), to: new Date(dateTo) },
      filters: { clientId: clientId || null, agentId: agentId || null, walletId: walletId || null },
    });

    // Enqueue BullMQ job
    const queue = getReportQueue();
    const job = await queue.add('generate-report', {
      reportId: report._id.toString(),
      adminId,
      type,
      dateFrom,
      dateTo,
      clientId,
      agentId,
      walletId,
      branding,
    });

    // Store job ID on the report
    report.jobId = job.id;
    await report.save();

    logger.info('Report generation queued', { reportId: report._id, type, jobId: job.id });

    return ApiResponse.success(res, {
      jobId: job.id,
      reportId: report._id,
      status: 'GENERATING',
    }, 'Report generation started', 202);
  } catch (err) {
    next(err);
  }
}

/**
 * GET /reports/:reportId
 * Get current status of a report.
 */
async function getReportStatus(req, res, next) {
  try {
    const adminId = req.user.id;
    const { reportId } = req.params;

    const report = await Report.findOne({ _id: reportId, adminId }).lean();
    if (!report) {
      throw new AppError('Report not found', 404, 'REPORT_NOT_FOUND');
    }

    const data = {
      id: report._id,
      type: report.type,
      status: report.status,
      dateRange: report.dateRange,
      generatedAt: report.generatedAt,
    };

    if (report.status === 'READY') {
      data.downloadUrl = report.fileUrl;
      data.fileSize = report.fileSize;
    }

    if (report.status === 'FAILED') {
      data.error = report.error;
    }

    return ApiResponse.success(res, data);
  } catch (err) {
    next(err);
  }
}

/**
 * GET /reports/:reportId/download
 * Get download URL for a completed report.
 */
async function downloadReport(req, res, next) {
  try {
    const adminId = req.user.id;
    const { reportId } = req.params;

    const report = await Report.findOne({ _id: reportId, adminId }).lean();
    if (!report) {
      throw new AppError('Report not found', 404, 'REPORT_NOT_FOUND');
    }

    if (report.status !== 'READY') {
      throw new AppError(`Report is not ready. Current status: ${report.status}`, 400, 'REPORT_NOT_READY');
    }

    if (!report.fileUrl) {
      throw new AppError('Report file URL is missing', 500, 'FILE_MISSING');
    }

    return ApiResponse.success(res, { downloadUrl: report.fileUrl });
  } catch (err) {
    next(err);
  }
}

/**
 * GET /reports
 * List past reports for the admin.
 */
async function listReports(req, res, next) {
  try {
    const adminId = req.user.id;
    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const limit = Math.min(50, Math.max(1, parseInt(req.query.limit, 10) || 20));
    const skip = (page - 1) * limit;

    const filter = { adminId };
    if (req.query.type) filter.type = req.query.type;
    if (req.query.status) filter.status = req.query.status;

    const [reports, total] = await Promise.all([
      Report.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit).lean(),
      Report.countDocuments(filter),
    ]);

    return ApiResponse.paginated(res, reports, total, page, limit, 'Reports retrieved');
  } catch (err) {
    next(err);
  }
}

module.exports = { generateReport, getReportStatus, downloadReport, listReports };
