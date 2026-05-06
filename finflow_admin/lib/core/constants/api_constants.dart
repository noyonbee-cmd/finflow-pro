/// API Constants
///
/// Base URL, endpoint paths, timeout durations,
/// and header configurations for the FinFlow Pro backend API.

class ApiConstants {
  ApiConstants._();

  // ─── Base URL ─────────────────────────────────────────────────
  /// Override via --dart-define=BASE_URL=...
  static const String baseUrl = String.fromEnvironment(
    'BASE_URL',
    defaultValue: 'http://10.0.2.2:5000/api/v1',
  );

  // ─── Timeouts (milliseconds) ──────────────────────────────────
  static const int connectTimeout = 15000;
  static const int receiveTimeout = 15000;
  static const int sendTimeout = 10000;

  // ─── Auth Endpoints ───────────────────────────────────────────
  static const String adminSignup = '/auth/admin/signup';
  static const String adminLogin = '/auth/admin/login';
  static const String agentLogin = '/auth/agent/login';
  static const String agentRegister = '/auth/agent/register';
  static const String refreshToken = '/auth/refresh';
  static const String logout = '/auth/logout';
  static const String adminSetup = '/auth/admin/setup';
  static const String adminCreateAgent = '/auth/admin/agents';
  static String adminApproveAgent(String id) =>
      '/auth/admin/agents/$id/approve';
  static String adminSuspendAgent(String id) =>
      '/auth/admin/agents/$id/suspend';

  // ─── Transaction Endpoints ────────────────────────────────────
  static const String transactions = '/transactions';
  static const String calculateFee = '/transactions/calculate';
  static const String suggestPayment = '/transactions/suggest-payment';
  static String transaction(String id) => '/transactions/$id';
  static String cancelTransaction(String id) => '/transactions/$id/cancel';
  static String transactionReceipt(String id) => '/transactions/$id/receipt';
  static String sendReceipt(String id) => '/transactions/$id/send-receipt';

  // ─── Wallet Endpoints ────────────────────────────────────────
  static const String wallets = '/wallets';
  static const String walletTransfer = '/wallets/transfer';
  static String wallet(String id) => '/wallets/$id';
  static String walletLedger(String id) => '/wallets/$id/ledger';
  static String walletAdjust(String id) => '/wallets/$id/adjust';

  // ─── Client Endpoints ────────────────────────────────────────
  static const String clients = '/clients';
  static String client(String id) => '/clients/$id';
  static String archiveClient(String id) => '/clients/$id/archive';
  static String clientTransactions(String id) => '/clients/$id/transactions';

  // ─── Agent Endpoints ─────────────────────────────────────────
  static const String agents = '/agents';
  static const String commissionRequest = '/agents/commission/request';
  static String agent(String id) => '/agents/$id';
  static String agentCommission(String id) => '/agents/$id/commission';
  static String settleCommission(String id) => '/agents/$id/settle';

  // ─── Report Endpoints ────────────────────────────────────────
  static const String reports = '/reports';
  static String report(String id) => '/reports/$id';
  static String downloadReport(String id) => '/reports/$id/download';

  // ─── Dashboard ───────────────────────────────────────────────
  static const String dashboardSummary = '/dashboard/summary';
  static const String dashboardChart = '/dashboard/chart';

  // ─── Settings ────────────────────────────────────────────────
  static const String settings = '/settings';
}
