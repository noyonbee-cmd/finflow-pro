/// Dashboard Models
///
/// Data models for the dashboard summary, wallet, and recent transactions.

class DashboardSummary {
  final int totalInPaisa;
  final int totalInCount;
  final int totalOutPaisa;
  final int totalOutCount;
  final int netProfitPaisa;
  final double profitChangePercent; // vs yesterday
  final int pendingCommissionPaisa;
  final int pendingCommissionAgentCount;
  final int notificationCount;

  const DashboardSummary({
    this.totalInPaisa = 0,
    this.totalInCount = 0,
    this.totalOutPaisa = 0,
    this.totalOutCount = 0,
    this.netProfitPaisa = 0,
    this.profitChangePercent = 0,
    this.pendingCommissionPaisa = 0,
    this.pendingCommissionAgentCount = 0,
    this.notificationCount = 0,
  });

  factory DashboardSummary.fromJson(Map<String, dynamic> json) {
    final data = json['data'] ?? json;
    return DashboardSummary(
      totalInPaisa: data['totalInPaisa'] as int? ?? 0,
      totalInCount: data['totalInCount'] as int? ?? 0,
      totalOutPaisa: data['totalOutPaisa'] as int? ?? 0,
      totalOutCount: data['totalOutCount'] as int? ?? 0,
      netProfitPaisa: data['netProfitPaisa'] as int? ?? 0,
      profitChangePercent:
          (data['profitChangePercent'] as num?)?.toDouble() ?? 0,
      pendingCommissionPaisa: data['pendingCommissionPaisa'] as int? ?? 0,
      pendingCommissionAgentCount:
          data['pendingCommissionAgentCount'] as int? ?? 0,
      notificationCount: data['notificationCount'] as int? ?? 0,
    );
  }
}

class WalletSummary {
  final String id;
  final String name;
  final String type;
  final int balancePaisa;
  final int? lowThresholdPaisa;

  const WalletSummary({
    required this.id,
    required this.name,
    required this.type,
    required this.balancePaisa,
    this.lowThresholdPaisa,
  });

  factory WalletSummary.fromJson(Map<String, dynamic> json) {
    return WalletSummary(
      id: json['_id'] as String? ?? json['id'] as String? ?? '',
      name: json['name'] as String? ?? '',
      type: json['type'] as String? ?? 'cash',
      balancePaisa: json['balancePaisa'] as int? ?? 0,
      lowThresholdPaisa: json['lowThresholdPaisa'] as int?,
    );
  }
}

class RecentTransaction {
  final String id;
  final String clientName;
  final String type;
  final int amountPaisa;
  final int feePaisa;
  final int profitPaisa;
  final String walletName;
  final DateTime createdAt;
  final String? agentName;

  const RecentTransaction({
    required this.id,
    required this.clientName,
    required this.type,
    required this.amountPaisa,
    required this.feePaisa,
    required this.profitPaisa,
    required this.walletName,
    required this.createdAt,
    this.agentName,
  });

  factory RecentTransaction.fromJson(Map<String, dynamic> json) {
    return RecentTransaction(
      id: json['_id'] as String? ?? json['id'] as String? ?? '',
      clientName: json['clientName'] as String? ??
          (json['client'] is Map ? json['client']['name'] as String? ?? '' : ''),
      type: json['type'] as String? ?? 'CR',
      amountPaisa: json['amountPaisa'] as int? ?? 0,
      feePaisa: json['feePaisa'] as int? ?? 0,
      profitPaisa: json['profitPaisa'] as int? ?? 0,
      walletName: json['walletName'] as String? ??
          (json['wallet'] is Map
              ? json['wallet']['name'] as String? ?? ''
              : ''),
      createdAt: json['createdAt'] != null
          ? DateTime.parse(json['createdAt'] as String)
          : DateTime.now(),
      agentName: json['agentName'] as String? ??
          (json['agent'] is Map ? json['agent']['name'] as String? : null),
    );
  }
}
