/// Agent Models
///
/// Data transfer objects for agent management.

class Agent {
  final String id;
  final String name;
  final String email;
  final String? phone;
  final String status; // 'ACTIVE', 'SUSPENDED', 'PENDING'
  final double commissionPercent;
  final int totalTransactions;
  final int totalCommissionPaisa;
  final int settledCommissionPaisa;
  final int pendingCommissionPaisa;
  final DateTime createdAt;
  final DateTime? lastActiveAt;

  const Agent({
    required this.id,
    required this.name,
    required this.email,
    this.phone,
    this.status = 'ACTIVE',
    this.commissionPercent = 0,
    this.totalTransactions = 0,
    this.totalCommissionPaisa = 0,
    this.settledCommissionPaisa = 0,
    this.pendingCommissionPaisa = 0,
    required this.createdAt,
    this.lastActiveAt,
  });

  bool get isActive => status == 'ACTIVE';
  bool get isSuspended => status == 'SUSPENDED';

  factory Agent.fromJson(Map<String, dynamic> json) {
    return Agent(
      id: json['_id'] as String? ?? json['id'] as String? ?? '',
      name: json['name'] as String? ?? '',
      email: json['email'] as String? ?? '',
      phone: json['phone'] as String?,
      status: json['status'] as String? ?? 'ACTIVE',
      commissionPercent: (json['commissionPercent'] as num?)?.toDouble() ?? 0,
      totalTransactions: json['totalTransactions'] as int? ?? 0,
      totalCommissionPaisa: json['totalCommissionPaisa'] as int? ?? 0,
      settledCommissionPaisa: json['settledCommissionPaisa'] as int? ?? 0,
      pendingCommissionPaisa: json['pendingCommissionPaisa'] as int? ?? 0,
      createdAt: json['createdAt'] != null
          ? DateTime.parse(json['createdAt'] as String)
          : DateTime.now(),
      lastActiveAt: json['lastActiveAt'] != null
          ? DateTime.parse(json['lastActiveAt'] as String)
          : null,
    );
  }
}
