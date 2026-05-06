'use strict';

const puppeteer = require('puppeteer');
const logger = require('../utils/logger');
const config = require('../config/env');
const { Transaction, Wallet, WalletLog, CommissionLedger, Agent, Client } = require('../models');
const dayjs = require('dayjs');

/**
 * @module pdfService
 * @description
 * PDF report generation service for FinFlow Pro using Puppeteer.
 *
 * Report types:
 *  - Daily Summary Report
 *  - Client Statement Report
 *  - Agent Commission Report
 *  - Wallet Ledger Report
 *
 * All reports are generated as branded HTML → PDF via headless Chromium.
 * Browser is auto-closed after each generation to prevent memory leaks.
 * Generated PDFs can be uploaded to Cloudinary for URL-based access.
 */

// ═══════════════════════════════════════════════════════════════
// HELPERS
// ═══════════════════════════════════════════════════════════════

function fmtAmt(paisa) {
  const n = (paisa / 100).toFixed(2);
  return `৳${Number(n).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`;
}

function fmtDate(d) { return dayjs(d).format('DD MMM YYYY'); }
function fmtDateTime(d) { return dayjs(d).format('DD MMM YYYY, hh:mm A'); }

/**
 * Launch Puppeteer, render HTML to PDF, close browser.
 * @param {string} html - Full HTML document string.
 * @returns {Promise<Buffer>} PDF buffer.
 */
async function renderPDF(html) {
  let browser = null;
  try {
    const launchOpts = {
      headless: 'new',
      args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-gpu'],
    };
    if (config.puppeteer?.executablePath || process.env.PUPPETEER_EXECUTABLE_PATH) {
      launchOpts.executablePath = process.env.PUPPETEER_EXECUTABLE_PATH;
    }

    browser = await puppeteer.launch(launchOpts);
    const page = await browser.newPage();
    await page.setContent(html, { waitUntil: 'networkidle0', timeout: 30000 });

    const pdf = await page.pdf({
      format: 'A4',
      printBackground: true,
      margin: { top: '20mm', right: '15mm', bottom: '20mm', left: '15mm' },
    });

    return Buffer.from(pdf);
  } finally {
    if (browser) await browser.close();
  }
}

// ═══════════════════════════════════════════════════════════════
// HTML TEMPLATE BUILDER
// ═══════════════════════════════════════════════════════════════

function buildReportHTML({ title, content, branding = {} }) {
  const {
    logoUrl = null,
    primaryColor = '#6366F1',
    footerText = 'Powered by FinFlow Pro',
  } = branding;

  const logoBlock = logoUrl
    ? `<img src="${logoUrl}" alt="Logo" style="height:40px;margin-right:12px;">`
    : '';

  return `<!DOCTYPE html>
<html><head><meta charset="utf-8">
<style>
  * { margin:0; padding:0; box-sizing:border-box; }
  body { font-family:'Segoe UI',Arial,sans-serif; font-size:11px; color:#1f2937; line-height:1.5; }
  .header { background:${primaryColor}; color:#fff; padding:20px 24px; display:flex; align-items:center; }
  .header h1 { font-size:18px; font-weight:700; }
  .header .sub { font-size:11px; opacity:.85; margin-top:2px; }
  .body { padding:20px 24px; }
  h2 { font-size:14px; color:${primaryColor}; border-bottom:2px solid ${primaryColor}; padding-bottom:4px; margin:16px 0 8px; }
  table { width:100%; border-collapse:collapse; margin:8px 0 16px; font-size:10px; }
  th { background:#f3f4f6; color:#374151; padding:6px 8px; text-align:left; font-weight:600; border:1px solid #e5e7eb; }
  td { padding:5px 8px; border:1px solid #e5e7eb; }
  tr:nth-child(even) td { background:#f9fafb; }
  .summary-grid { display:flex; gap:12px; margin:8px 0 16px; flex-wrap:wrap; }
  .summary-card { flex:1; min-width:120px; background:#f0f0ff; border-radius:6px; padding:10px; text-align:center; }
  .summary-card .label { font-size:9px; color:#6b7280; text-transform:uppercase; }
  .summary-card .value { font-size:16px; font-weight:700; color:${primaryColor}; margin-top:2px; }
  .cr { color:#059669; } .dr { color:#dc2626; }
  .footer { margin-top:24px; padding:12px 24px; border-top:1px solid #e5e7eb; font-size:9px; color:#9ca3af; text-align:center; }
  .amount { font-family:monospace; text-align:right; white-space:nowrap; }
</style></head><body>
<div class="header">${logoBlock}<div><h1>${title}</h1></div></div>
<div class="body">${content}</div>
<div class="footer">${footerText} &bull; Generated: ${fmtDateTime(new Date())}</div>
</body></html>`;
}

// ═══════════════════════════════════════════════════════════════
// REPORT GENERATORS
// ═══════════════════════════════════════════════════════════════

async function generateDailySummaryReport({ adminId, date, branding = {} }) {
  const dayStart = dayjs(date).startOf('day').toDate();
  const dayEnd = dayjs(date).endOf('day').toDate();

  const txns = await Transaction.find({
    adminId, createdAt: { $gte: dayStart, $lte: dayEnd }, status: { $ne: 'CANCELLED' },
  }).sort({ createdAt: -1 }).lean();

  const wallets = await Wallet.find({ adminId, isActive: true }).lean();

  let totalCR = 0, totalDR = 0, totalFee = 0, totalProfit = 0;
  const agentMap = {};

  txns.forEach((t) => {
    if (t.type === 'CR') totalCR += t.amount;
    else totalDR += t.amount;
    totalFee += t.totalFee || 0;
    totalProfit += t.netProfit || 0;
    if (t.agentId) {
      const key = t.agentId.toString();
      if (!agentMap[key]) agentMap[key] = { name: t.agentName || 'Unknown', commission: 0, count: 0 };
      agentMap[key].commission += t.agentCommission || 0;
      agentMap[key].count++;
    }
  });

  const summaryCards = `<div class="summary-grid">
    <div class="summary-card"><div class="label">Total CR</div><div class="value cr">${fmtAmt(totalCR)}</div></div>
    <div class="summary-card"><div class="label">Total DR</div><div class="value dr">${fmtAmt(totalDR)}</div></div>
    <div class="summary-card"><div class="label">Net Profit</div><div class="value">${fmtAmt(totalProfit)}</div></div>
    <div class="summary-card"><div class="label">Transactions</div><div class="value">${txns.length}</div></div>
  </div>`;

  const walletRows = wallets.map((w) =>
    `<tr><td>${w.name}</td><td>${w.type}</td><td class="amount">${fmtAmt(w.balance)}</td></tr>`
  ).join('');

  const agentRows = Object.values(agentMap).map((a) =>
    `<tr><td>${a.name}</td><td>${a.count}</td><td class="amount">${fmtAmt(a.commission)}</td></tr>`
  ).join('') || '<tr><td colspan="3">No agent transactions</td></tr>';

  const txnRows = txns.map((t) =>
    `<tr><td>${fmtDateTime(t.createdAt)}</td><td>${t.clientName}</td><td><span class="${t.type.toLowerCase()}">${t.type}</span></td>` +
    `<td class="amount">${fmtAmt(t.amount)}</td><td class="amount">${fmtAmt(t.totalFee)}</td>` +
    `<td class="amount">${fmtAmt(t.netProfit)}</td><td>${t.refId}</td></tr>`
  ).join('') || '<tr><td colspan="7">No transactions</td></tr>';

  const content = `
    <p style="color:#6b7280;">Report Date: <strong>${fmtDate(date)}</strong></p>
    ${summaryCards}
    <h2>Wallet Balances</h2>
    <table><tr><th>Wallet</th><th>Type</th><th>Balance</th></tr>${walletRows}</table>
    <h2>Agent Commission Breakdown</h2>
    <table><tr><th>Agent</th><th>Transactions</th><th>Commission</th></tr>${agentRows}</table>
    <h2>Transaction List</h2>
    <table><tr><th>Time</th><th>Client</th><th>Type</th><th>Amount</th><th>Fee</th><th>Profit</th><th>Ref</th></tr>${txnRows}</table>`;

  const html = buildReportHTML({ title: `Daily Summary — ${fmtDate(date)}`, content, branding });
  return renderPDF(html);
}

async function generateClientStatement({ adminId, clientId, dateFrom, dateTo, branding = {} }) {
  const client = await Client.findOne({ _id: clientId, adminId }).lean();
  if (!client) throw new Error('Client not found');

  const txns = await Transaction.find({
    adminId, clientId,
    createdAt: { $gte: new Date(dateFrom), $lte: dayjs(dateTo).endOf('day').toDate() },
    status: { $ne: 'CANCELLED' },
  }).sort({ createdAt: 1 }).lean();

  let runBal = 0;
  const txnRows = txns.map((t) => {
    runBal += t.type === 'CR' ? t.amount : -t.amount;
    return `<tr><td>${fmtDate(t.createdAt)}</td><td><span class="${t.type.toLowerCase()}">${t.type}</span></td>` +
      `<td class="amount">${fmtAmt(t.amount)}</td><td class="amount">${fmtAmt(t.totalFee)}</td>` +
      `<td class="amount">${fmtAmt(t.amount - t.totalFee)}</td>` +
      `<td>${t.walletEntries?.[0]?.walletType || 'N/A'}</td><td>${t.refId}</td>` +
      `<td class="amount">${fmtAmt(runBal)}</td></tr>`;
  }).join('') || '<tr><td colspan="8">No transactions found</td></tr>';

  const totalCR = txns.filter(t => t.type === 'CR').reduce((s, t) => s + t.amount, 0);
  const totalDR = txns.filter(t => t.type === 'DR').reduce((s, t) => s + t.amount, 0);

  const content = `
    <p><strong>Client:</strong> ${client.name} &bull; <strong>Phone:</strong> ${client.phone || 'N/A'}</p>
    <p><strong>Period:</strong> ${fmtDate(dateFrom)} — ${fmtDate(dateTo)}</p>
    <div class="summary-grid">
      <div class="summary-card"><div class="label">Total CR</div><div class="value cr">${fmtAmt(totalCR)}</div></div>
      <div class="summary-card"><div class="label">Total DR</div><div class="value dr">${fmtAmt(totalDR)}</div></div>
      <div class="summary-card"><div class="label">Transactions</div><div class="value">${txns.length}</div></div>
    </div>
    <h2>Transaction History</h2>
    <table><tr><th>Date</th><th>Type</th><th>Amount</th><th>Fee</th><th>Net</th><th>Wallet</th><th>Ref</th><th>Balance</th></tr>${txnRows}</table>`;

  const html = buildReportHTML({ title: `Client Statement — ${client.name}`, content, branding });
  return renderPDF(html);
}

async function generateAgentCommissionReport({ adminId, agentId, dateFrom, dateTo, branding = {} }) {
  const agent = await Agent.findOne({ _id: agentId, adminId }).lean();
  if (!agent) throw new Error('Agent not found');

  const ledger = await CommissionLedger.find({
    adminId, agentId,
    createdAt: { $gte: new Date(dateFrom), $lte: dayjs(dateTo).endOf('day').toDate() },
  }).sort({ createdAt: 1 }).lean();

  const earned = ledger.filter(e => e.type === 'EARNED').reduce((s, e) => s + e.amount, 0);
  const settled = ledger.filter(e => e.type === 'SETTLED').reduce((s, e) => s + e.amount, 0);
  const pending = earned - settled;

  const ledgerRows = ledger.map((e) =>
    `<tr><td>${fmtDateTime(e.createdAt)}</td><td>${e.type}</td>` +
    `<td class="amount">${fmtAmt(e.amount)}</td><td class="amount">${fmtAmt(e.balanceAfter)}</td>` +
    `<td>${e.note || '—'}</td></tr>`
  ).join('') || '<tr><td colspan="5">No commission entries</td></tr>';

  const content = `
    <p><strong>Agent:</strong> ${agent.name} &bull; <strong>Status:</strong> ${agent.status}</p>
    <p><strong>Period:</strong> ${fmtDate(dateFrom)} — ${fmtDate(dateTo)}</p>
    <div class="summary-grid">
      <div class="summary-card"><div class="label">Earned</div><div class="value cr">${fmtAmt(earned)}</div></div>
      <div class="summary-card"><div class="label">Settled</div><div class="value">${fmtAmt(settled)}</div></div>
      <div class="summary-card"><div class="label">Pending</div><div class="value dr">${fmtAmt(pending)}</div></div>
    </div>
    <h2>Commission Ledger</h2>
    <table><tr><th>Date</th><th>Type</th><th>Amount</th><th>Balance After</th><th>Note</th></tr>${ledgerRows}</table>`;

  const html = buildReportHTML({ title: `Agent Commission — ${agent.name}`, content, branding });
  return renderPDF(html);
}

async function generateWalletLedgerReport({ adminId, walletId, dateFrom, dateTo, branding = {} }) {
  const wallet = await Wallet.findOne({ _id: walletId, adminId }).lean();
  if (!wallet) throw new Error('Wallet not found');

  const logs = await WalletLog.find({
    adminId, walletId,
    createdAt: { $gte: new Date(dateFrom), $lte: dayjs(dateTo).endOf('day').toDate() },
  }).sort({ createdAt: 1 }).lean();

  const openBal = logs.length > 0 ? (logs[0].balanceAfter - logs[0].amount) : wallet.balance;
  const closeBal = logs.length > 0 ? logs[logs.length - 1].balanceAfter : wallet.balance;
  const sumEntries = logs.reduce((s, l) => s + l.amount, 0);

  const logRows = logs.map((l) =>
    `<tr><td>${fmtDateTime(l.createdAt)}</td><td>${l.type || l.direction || '—'}</td>` +
    `<td class="amount">${fmtAmt(l.amount)}</td><td class="amount">${fmtAmt(l.balanceAfter)}</td></tr>`
  ).join('') || '<tr><td colspan="4">No entries found</td></tr>';

  const content = `
    <p><strong>Wallet:</strong> ${wallet.name} (${wallet.type}) &bull; <strong>Period:</strong> ${fmtDate(dateFrom)} — ${fmtDate(dateTo)}</p>
    <div class="summary-grid">
      <div class="summary-card"><div class="label">Opening</div><div class="value">${fmtAmt(openBal)}</div></div>
      <div class="summary-card"><div class="label">Closing</div><div class="value">${fmtAmt(closeBal)}</div></div>
      <div class="summary-card"><div class="label">Entries</div><div class="value">${logs.length}</div></div>
    </div>
    <h2>Ledger Entries</h2>
    <table><tr><th>Date</th><th>Type</th><th>Amount</th><th>Balance After</th></tr>${logRows}</table>
    <h2>Reconciliation</h2>
    <p>Sum of entries: ${fmtAmt(sumEntries)} &bull; Closing − Opening: ${fmtAmt(closeBal - openBal)}</p>
    <p>${sumEntries === (closeBal - openBal) ? '✅ Reconciled' : '⚠️ Mismatch detected'}</p>`;

  const html = buildReportHTML({ title: `Wallet Ledger — ${wallet.name}`, content, branding });
  return renderPDF(html);
}

// ═══════════════════════════════════════════════════════════════
// CLOUDINARY UPLOAD
// ═══════════════════════════════════════════════════════════════

async function uploadPDF({ buffer, fileName }) {
  if (!config.cloudinary.cloudName || !config.cloudinary.apiKey) {
    logger.warn('[PDF] Cloudinary not configured — skipping upload');
    return { url: null, publicId: null };
  }

  try {
    const cloudinary = require('cloudinary').v2;
    cloudinary.config({
      cloud_name: config.cloudinary.cloudName,
      api_key: config.cloudinary.apiKey,
      api_secret: config.cloudinary.apiSecret,
    });

    const result = await new Promise((resolve, reject) => {
      const stream = cloudinary.uploader.upload_stream(
        {
          resource_type: 'raw',
          folder: config.cloudinary.folder,
          public_id: fileName.replace('.pdf', ''),
          format: 'pdf',
        },
        (err, result) => (err ? reject(err) : resolve(result))
      );
      stream.end(buffer);
    });

    logger.info('[PDF] Uploaded to Cloudinary', { publicId: result.public_id, url: result.secure_url });
    return { url: result.secure_url, publicId: result.public_id };
  } catch (err) {
    logger.error('[PDF] Cloudinary upload failed', { error: err.message });
    throw err;
  }
}

module.exports = {
  generateDailySummaryReport,
  generateClientStatement,
  generateAgentCommissionReport,
  generateWalletLedgerReport,
  buildReportHTML,
  uploadPDF,
  renderPDF,
};
