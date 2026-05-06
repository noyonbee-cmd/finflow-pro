'use strict';

const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/auth');
const roleGuard = require('../middleware/roleGuard');
const reportCtrl = require('../controllers/report.controller');

/**
 * @module report.routes
 * @description Report API routes for FinFlow Pro.
 *
 * POST   /reports               — Generate report (Admin)
 * GET    /reports               — List reports (Admin)
 * GET    /reports/:reportId     — Report status (Admin)
 * GET    /reports/:reportId/download — Download URL (Admin)
 */

router.post(
  '/',
  authenticate,
  roleGuard('ADMIN'),
  reportCtrl.generateReport
);

router.get(
  '/',
  authenticate,
  roleGuard('ADMIN'),
  reportCtrl.listReports
);

router.get(
  '/:reportId',
  authenticate,
  roleGuard('ADMIN'),
  reportCtrl.getReportStatus
);

router.get(
  '/:reportId/download',
  authenticate,
  roleGuard('ADMIN'),
  reportCtrl.downloadReport
);

module.exports = router;
