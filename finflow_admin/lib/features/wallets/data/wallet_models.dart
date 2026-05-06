/// Wallet Models

class Wallet {
  final String id;
  final String name;
  final String type;
  final int balancePaisa;
  final int lockedPaisa;
  final int? lowThresholdPaisa;
  final bool isActive;
  final DateTime createdAt;

  const Wallet({
    required this.id,
    required this.name,
    required this.type,
    required this.balancePaisa,
    this.lockedPaisa = 0,
    this.lowThresholdPaisa,
    this.isActive = true,
    required this.createdAt,
  });

  int get availablePaisa => balancePaisa - lockedPaisa;
  bool get isLowBalance =>
      lowThresholdPaisa != null && balancePaisa < lowThresholdPaisa!;

  factory Wallet.fromJson(Map<String, dynamic> json) {
    return Wallet(
      id: json['_id'] as String? ?? json['id'] as String? ?? '',
      name: json['name'] as String? ?? '',
      type: json['type'] as String? ?? 'cash',
      balancePaisa: json['balancePaisa'] as int? ?? 0,
      lockedPaisa: json['lockedPaisa'] as int? ?? 0,
      lowThresholdPaisa: json['lowThresholdPaisa'] as int?,
      isActive: json['isActive'] as bool? ?? true,
      createdAt: json['createdAt'] != null
          ? DateTime.parse(json['createdAt'] as String)
          : DateTime.now(),
    );
  }
}

class WalletLogEntry {
  final String id;
  final String type; // 'CR', 'DR', 'TRANSFER', 'ADJUSTMENT'
  final int amountPaisa;
  final int balanceAfterPaisa;
  final String? reference;
  final String? note;
  final DateTime createdAt;

  const WalletLogEntry({
    required this.id,
    required this.type,
    required this.amountPaisa,
    required this.balanceAfterPaisa,
    this.reference,
    this.note,
    required this.createdAt,
  });

  factory WalletLogEntry.fromJson(Map<String, dynamic> json) {
    return WalletLogEntry(
      id: json['_id'] as String? ?? json['id'] as String? ?? '',
      type: json['type'] as String? ?? '',
      amountPaisa: json['amountPaisa'] as int? ?? 0,
      balanceAfterPaisa: json['balanceAfterPaisa'] as int? ?? 0,
      reference: json['reference'] as String?,
      note: json['note'] as String?,
      createdAt: json['createdAt'] != null
          ? DateTime.parse(json['createdAt'] as String)
          : DateTime.now(),
    );
  }
}
