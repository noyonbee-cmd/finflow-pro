/// Auth Models
///
/// Data transfer objects for authentication flows.

class AuthResponse {
  final String accessToken;
  final String refreshToken;
  final AdminUser admin;

  const AuthResponse({
    required this.accessToken,
    required this.refreshToken,
    required this.admin,
  });

  factory AuthResponse.fromJson(Map<String, dynamic> json) {
    final data = json['data'] ?? json;
    return AuthResponse(
      accessToken: data['accessToken'] as String,
      refreshToken: data['refreshToken'] as String,
      admin: AdminUser.fromJson(data['admin'] as Map<String, dynamic>),
    );
  }
}

class AdminUser {
  final String id;
  final String name;
  final String email;
  final String? businessName;
  final String? phone;
  final String role;
  final String? avatarUrl;
  final bool isSetupComplete;

  const AdminUser({
    required this.id,
    required this.name,
    required this.email,
    this.businessName,
    this.phone,
    this.role = 'ADMIN',
    this.avatarUrl,
    this.isSetupComplete = false,
  });

  factory AdminUser.fromJson(Map<String, dynamic> json) {
    return AdminUser(
      id: json['_id'] as String? ?? json['id'] as String? ?? '',
      name: json['name'] as String? ?? '',
      email: json['email'] as String? ?? '',
      businessName: json['businessName'] as String?,
      phone: json['phone'] as String?,
      role: json['role'] as String? ?? 'ADMIN',
      avatarUrl: json['avatarUrl'] as String?,
      isSetupComplete: json['isSetupComplete'] as bool? ?? false,
    );
  }

  Map<String, dynamic> toJson() => {
    'id': id,
    'name': name,
    'email': email,
    'businessName': businessName,
    'phone': phone,
    'role': role,
    'avatarUrl': avatarUrl,
    'isSetupComplete': isSetupComplete,
  };
}

class TokenPair {
  final String accessToken;
  final String refreshToken;

  const TokenPair({required this.accessToken, required this.refreshToken});

  factory TokenPair.fromJson(Map<String, dynamic> json) {
    final data = json['data'] ?? json;
    return TokenPair(
      accessToken: data['accessToken'] as String,
      refreshToken: data['refreshToken'] as String,
    );
  }
}

class AdminSignupRequest {
  final String name;
  final String email;
  final String password;
  final String? businessName;
  final String? phone;

  const AdminSignupRequest({
    required this.name,
    required this.email,
    required this.password,
    this.businessName,
    this.phone,
  });

  Map<String, dynamic> toJson() => {
    'name': name,
    'email': email,
    'password': password,
    if (businessName != null) 'businessName': businessName,
    if (phone != null) 'phone': phone,
  };
}
