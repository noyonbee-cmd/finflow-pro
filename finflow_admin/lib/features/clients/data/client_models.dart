/// Client Models
///
/// Data transfer objects for client management.

class Client {
  final String id;
  final String name;
  final String? phone;
  final String? email;
  final double? customFeePercent;
  final double? customCommissionPercent;
  final int totalTransactions;
  final int totalVolumePaisa;
  final String? tag;
  final bool isArchived;
  final DateTime createdAt;
  final DateTime? updatedAt;

  const Client({
    required this.id,
    required this.name,
    this.phone,
    this.email,
    this.customFeePercent,
    this.customCommissionPercent,
    this.totalTransactions = 0,
    this.totalVolumePaisa = 0,
    this.tag,
    this.isArchived = false,
    required this.createdAt,
    this.updatedAt,
  });

  factory Client.fromJson(Map<String, dynamic> json) {
    return Client(
      id: json['_id'] as String? ?? json['id'] as String? ?? '',
      name: json['name'] as String? ?? '',
      phone: json['phone'] as String?,
      email: json['email'] as String?,
      customFeePercent: (json['customFeePercent'] as num?)?.toDouble(),
      customCommissionPercent: (json['customCommissionPercent'] as num?)
          ?.toDouble(),
      totalTransactions: json['totalTransactions'] as int? ?? 0,
      totalVolumePaisa: json['totalVolumePaisa'] as int? ?? 0,
      tag: json['tag'] as String?,
      isArchived: json['isArchived'] as bool? ?? false,
      createdAt: json['createdAt'] != null
          ? DateTime.parse(json['createdAt'] as String)
          : DateTime.now(),
      updatedAt: json['updatedAt'] != null
          ? DateTime.parse(json['updatedAt'] as String)
          : null,
    );
  }
}

class CreateClientRequest {
  final String name;
  final String? phone;
  final String? email;
  final double? customFeePercent;
  final String? tag;

  const CreateClientRequest({
    required this.name,
    this.phone,
    this.email,
    this.customFeePercent,
    this.tag,
  });

  Map<String, dynamic> toJson() => {
    'name': name,
    if (phone != null) 'phone': phone,
    if (email != null) 'email': email,
    if (customFeePercent != null) 'customFeePercent': customFeePercent,
    if (tag != null) 'tag': tag,
  };
}
