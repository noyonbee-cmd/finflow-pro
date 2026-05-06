'use strict';

const { Worker } = require('bullmq');
const logger = require('../utils/logger');
const { getBullMQConnection } = require('../config/redis');
const pdfService = require('../services/pdfService');
const Report = require('../models/Report');
const { queueNotification } = require('../services/notificationService');

/**
 * @module reportWorker
 * @description
 * BullMQ worker for async report generation in FinFlow Pro.
 *
 * Processes the 'reports' queue:
 *  1. Runs the appropriate pdfService generator based on report type
 *  2. Uploads PDF to Cloudinary
 *  3. Updates Report document: status → READY, fileUrl
 *  4. Sends in-app notification: report ready
 *
 * Job options: { attempts: 3, backoff: { type: 'exponential', delay: 5000 } }
 */

const prefix = process.env.BULL_QUEUE_PREFIX || 'finflow';

const reportWorker = new Worker(
  `${prefix}:reports`,
  async (job) => {
    const { reportId, adminId, type, dateFrom, dateTo, clientId, agentId, walletId, branding } = job.data;

    logger.info('[ReportWorker] Processing report', { reportId, type, jobId: job.id });

    try {
      // ── Generate PDF based on type ────────────────────────────
      let pdfBuffer;

      switch (type) {
        case 'DAILY_SUMMARY':
          pdfBuffer = await pdfService.generateDailySummaryReport({
            adminId, date: dateFrom, branding,
          });
          break;

        case 'CLIENT_STATEMENT':
          pdfBuffer = await pdfService.generateClientStatement({
            adminId, clientId, dateFrom, dateTo, branding,
          });
          break;

        case 'AGENT_COMMISSION':
          pdfBuffer = await pdfService.generateAgentCommissionReport({
            adminId, agentId, dateFrom, dateTo, branding,
          });
          break;

        case 'WALLET_LEDGER':
          pdfBuffer = await pdfService.generateWalletLedgerReport({
            adminId, walletId, dateFrom, dateTo, branding,
          });
          break;

        default:
          throw new Error(`Unknown report type: ${type}`);
      }

      // ── Upload to Cloudinary ──────────────────────────────────
      const fileName = `report-${type.toLowerCase()}-${reportId}`;
      const upload = await pdfService.uploadPDF({ buffer: pdfBuffer, fileName });

      // ── Update Report document ────────────────────────────────
      await Report.findByIdAndUpdate(reportId, {
        $set: {
          status: 'READY',
          fileUrl: upload.url,
          cloudinaryPublicId: upload.publicId,
          fileSize: pdfBuffer.length,
          generatedAt: new Date(),
          expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
        },
      });

      // ── Send in-app notification ──────────────────────────────
      try {
        await queueNotification({
          adminId,
          recipientId: adminId,
          recipientType: 'ADMIN',
          type: 'REPORT_READY',
          title: 'Report Ready',
          body: `Your ${type.replace(/_/g, ' ')} report is ready for download.`,
          data: { reportId },
          channels: ['IN_APP'],
        });
      } catch (notifErr) {
        logger.warn('[ReportWorker] Failed to send report-ready notification', {
          reportId, error: notifErr.message,
        });
      }

      logger.info('[ReportWorker] Report generated successfully', {
        reportId, type, fileSize: pdfBuffer.length,
      });

      return { reportId, status: 'READY' };
    } catch (err) {
      logger.error('[ReportWorker] Report generation failed', {
        reportId, type, error: err.message, stack: err.stack,
      });

      // Mark report as failed
      await Report.findByIdAndUpdate(reportId, {
        $set: { status: 'FAILED', error: err.message },
      }).catch((dbErr) => {
        logger.error('[ReportWorker] Failed to update report status', { error: dbErr.message });
      });

      throw err; // Let BullMQ handle retries
    }
  },
  {
    connection: getBullMQConnection(),
    concurrency: 2,
    limiter: { max: 5, duration: 60000 },
  }
);

reportWorker.on('completed', (job) => {
  logger.info('[ReportWorker] Job completed', { jobId: job.id });
});

reportWorker.on('failed', (job, err) => {
  logger.error('[ReportWorker] Job failed', {
    jobId: job?.id, error: err.message, attempts: job?.attemptsMade,
  });
});

module.exports = reportWorker;
