/// Transaction Models
///
/// Data transfer objects for transactions: Transaction, TransactionFilter,
/// CreateTransactionRequest, FeeCalculationResponse, PaymentSuggestion.

class Transaction {
  final String id;
  final String type; // 'CR' or 'DR'
  final String clientId;
  final String clientName;
  final int amountPaisa;
  final double feePercent;
  final int baseFeePaisa;
  final int extraFeePaisa;
  final String? extraFeeNote;
  final bool isExtraFeeAdd;
  final int totalFeePaisa;
  final int commissionPaisa;
  final int netProfitPaisa;
  final int clientGetsPaisa;
  final String? agentId;
  final String? agentName;
  final String walletId;
  final String walletName;
  final String walletType;
  final List<PaymentSplit>? paymentSplits;
  final String? note;
  final String status; // 'COMPLETED', 'PENDING', 'CANCELLED'
  final DateTime createdAt;
  final DateTime? updatedAt;

  const Transaction({
    required this.id,
    required this.type,
    required this.clientId,
    required this.clientName,
    required this.amountPaisa,
    this.feePercent = 0,
    this.baseFeePaisa = 0,
    this.extraFeePaisa = 0,
    this.extraFeeNote,
    this.isExtraFeeAdd = true,
    this.totalFeePaisa = 0,
    this.commissionPaisa = 0,
    this.netProfitPaisa = 0,
    this.clientGetsPaisa = 0,
    this.agentId,
    this.agentName,
    required this.walletId,
    required this.walletName,
    this.walletType = 'cash',
    this.paymentSplits,
    this.note,
    this.status = 'COMPLETED',
    required this.createdAt,
    this.updatedAt,
  });

  factory Transaction.fromJson(Map<String, dynamic> json) {
    return Transaction(
      id: json['_id'] as String? ?? json['id'] as String? ?? '',
      type: json['type'] as String? ?? 'CR',
      clientId:
          json['clientId'] as String? ??
          (json['client'] is Map ? json['client']['_id'] as String? ?? '' : ''),
      clientName:
          json['clientName'] as String? ??
          (json['client'] is Map
              ? json['client']['name'] as String? ?? ''
              : ''),
      amountPaisa: json['amountPaisa'] as int? ?? 0,
      feePercent: (json['feePercent'] as num?)?.toDouble() ?? 0,
      baseFeePaisa: json['baseFeePaisa'] as int? ?? 0,
      extraFeePaisa: json['extraFeePaisa'] as int? ?? 0,
      extraFeeNote: json['extraFeeNote'] as String?,
      isExtraFeeAdd: json['isExtraFeeAdd'] as bool? ?? true,
      totalFeePaisa:
          json['totalFeePaisa'] as int? ?? json['feePaisa'] as int? ?? 0,
      commissionPaisa: json['commissionPaisa'] as int? ?? 0,
      netProfitPaisa:
          json['netProfitPaisa'] as int? ?? json['profitPaisa'] as int? ?? 0,
      clientGetsPaisa: json['clientGetsPaisa'] as int? ?? 0,
      agentId:
          json['agentId'] as String? ??
          (json['agent'] is Map ? json['agent']['_id'] as String? : null),
      agentName:
          json['agentName'] as String? ??
          (json['agent'] is Map ? json['agent']['name'] as String? : null),
      walletId:
          json['walletId'] as String? ??
          (json['wallet'] is Map ? json['wallet']['_id'] as String? ?? '' : ''),
      walletName:
          json['walletName'] as String? ??
          (json['wallet'] is Map
              ? json['wallet']['name'] as String? ?? ''
              : ''),
      walletType:
          json['walletType'] as String? ??
          (json['wallet'] is Map
              ? json['wallet']['type'] as String? ?? 'cash'
              : 'cash'),
      paymentSplits: json['paymentSplits'] != null
          ? (json['paymentSplits'] as List)
                .map((e) => PaymentSplit.fromJson(e as Map<String, dynamic>))
                .toList()
          : null,
      note: json['note'] as String?,
      status: json['status'] as String? ?? 'COMPLETED',
      createdAt: json['createdAt'] != null
          ? DateTime.parse(json['createdAt'] as String)
          : DateTime.now(),
      updatedAt: json['updatedAt'] != null
          ? DateTime.parse(json['updatedAt'] as String)
          : null,
    );
  }
}

class PaymentSplit {
  final String walletId;
  final String walletName;
  final int amountPaisa;

  const PaymentSplit({
    required this.walletId,
    required this.walletName,
    required this.amountPaisa,
  });

  factory PaymentSplit.fromJson(Map<String, dynamic> json) {
    return PaymentSplit(
      walletId: json['walletId'] as String? ?? '',
      walletName: json['walletName'] as String? ?? '',
      amountPaisa: json['amountPaisa'] as int? ?? 0,
    );
  }

  Map<String, dynamic> toJson() => {
    'walletId': walletId,
    'amountPaisa': amountPaisa,
  };
}

class CreateTransactionRequest {
  final String type;
  final String clientId;
  final int amountPaisa;
  final double feePercent;
  final int? extraFeePaisa;
  final String? extraFeeNote;
  final bool isExtraFeeAdd;
  final String? agentId;
  final String walletId;
  final List<PaymentSplit>? paymentSplits;
  final String? note;

  const CreateTransactionRequest({
    required this.type,
    required this.clientId,
    required this.amountPaisa,
    required this.feePercent,
    this.extraFeePaisa,
    this.extraFeeNote,
    this.isExtraFeeAdd = true,
    this.agentId,
    required this.walletId,
    this.paymentSplits,
    this.note,
  });

  Map<String, dynamic> toJson() => {
    'type': type,
    'clientId': clientId,
    'amountPaisa': amountPaisa,
    'feePercent': feePercent,
    if (extraFeePaisa != null) 'extraFeePaisa': extraFeePaisa,
    if (extraFeeNote != null) 'extraFeeNote': extraFeeNote,
    'isExtraFeeAdd': isExtraFeeAdd,
    if (agentId != null) 'agentId': agentId,
    'walletId': walletId,
    if (paymentSplits != null)
      'paymentSplits': paymentSplits!.map((s) => s.toJson()).toList(),
    if (note != null) 'note': note,
  };
}

class TransactionFilter {
  final String? type; // 'CR', 'DR', or null for all
  final String? clientId;
  final String? agentId;
  final String? walletId;
  final DateTime? startDate;
  final DateTime? endDate;
  final String? search;
  final String? cursor;
  final int limit;

  const TransactionFilter({
    this.type,
    this.clientId,
    this.agentId,
    this.walletId,
    this.startDate,
    this.endDate,
    this.search,
    this.cursor,
    this.limit = 20,
  });

  Map<String, dynamic> toQueryParams() => {
    if (type != null) 'type': type,
    if (clientId != null) 'clientId': clientId,
    if (agentId != null) 'agentId': agentId,
    if (walletId != null) 'walletId': walletId,
    if (startDate != null) 'startDate': startDate!.toIso8601String(),
    if (endDate != null) 'endDate': endDate!.toIso8601String(),
    if (search != null && search!.isNotEmpty) 'search': search,
    if (cursor != null) 'cursor': cursor,
    'limit': limit,
    'sort': '-createdAt',
  };
}

class PaginatedTransactions {
  final List<Transaction> items;
  final String? nextCursor;
  final int totalCount;
  final int totalInPaisa;
  final int totalOutPaisa;

  const PaginatedTransactions({
    this.items = const [],
    this.nextCursor,
    this.totalCount = 0,
    this.totalInPaisa = 0,
    this.totalOutPaisa = 0,
  });

  factory PaginatedTransactions.fromJson(Map<String, dynamic> json) {
    final data = json['data'];
    List items;
    if (data is List) {
      items = data;
    } else if (data is Map && data['items'] != null) {
      items = data['items'] as List;
    } else {
      items = [];
    }
    return PaginatedTransactions(
      items: items
          .map((e) => Transaction.fromJson(e as Map<String, dynamic>))
          .toList(),
      nextCursor:
          json['nextCursor'] as String? ??
          (json['pagination'] is Map
              ? json['pagination']['nextCursor'] as String?
              : null),
      totalCount: json['totalCount'] as int? ?? items.length,
      totalInPaisa: json['totalInPaisa'] as int? ?? 0,
      totalOutPaisa: json['totalOutPaisa'] as int? ?? 0,
    );
  }
}
