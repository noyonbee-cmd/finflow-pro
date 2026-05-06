'use strict';

/**
 * @module models/index
 * @description
 * Central export for all Mongoose models in FinFlow Pro.
 * Import from this file for clean, single-line model access:
 *
 * @example
 *   const { Admin, Transaction, Wallet } = require('./models');
 */

const Admin = require('./Admin');
const Agent = require('./Agent');
const Client = require('./Client');
const Wallet = require('./Wallet');
const Transaction = require('./Transaction');
const WalletLog = require('./WalletLog');
const CommissionLedger = require('./CommissionLedger');
const RefreshToken = require('./RefreshToken');
const Settings = require('./Settings');
const Notification = require('./Notification');
const Report = require('./Report');
const User = require('./User');

module.exports = {
  Admin,
  Agent,
  Client,
  Wallet,
  Transaction,
  WalletLog,
  CommissionLedger,
  RefreshToken,
  Settings,
  Notification,
  Report,
  User,
};
