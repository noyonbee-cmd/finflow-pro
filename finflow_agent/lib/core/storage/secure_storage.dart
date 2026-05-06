/// Secure Storage Wrapper
///
/// flutter_secure_storage abstraction for storing
/// sensitive data: access token, refresh token, user ID.
/// Provides typed read/write/delete methods.

import 'dart:convert';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';

final secureStorageProvider = Provider<SecureStorageService>((ref) {
  return SecureStorageService();
});

class SecureStorageService {
  static const _accessTokenKey = 'access_token';
  static const _refreshTokenKey = 'refresh_token';
  static const _adminProfileKey = 'admin_profile';

  final FlutterSecureStorage _storage;

  SecureStorageService({FlutterSecureStorage? storage})
    : _storage =
          storage ??
          const FlutterSecureStorage(
            aOptions: AndroidOptions(encryptedSharedPreferences: true),
            iOptions: IOSOptions(
              accessibility: KeychainAccessibility.first_unlock_this_device,
            ),
          );

  // ─── Token Management ────────────────────────────────────────

  Future<void> saveTokens({
    required String accessToken,
    required String refreshToken,
  }) async {
    await Future.wait([
      _storage.write(key: _accessTokenKey, value: accessToken),
      _storage.write(key: _refreshTokenKey, value: refreshToken),
    ]);
  }

  Future<String?> getAccessToken() async {
    return _storage.read(key: _accessTokenKey);
  }

  Future<String?> getRefreshToken() async {
    return _storage.read(key: _refreshTokenKey);
  }

  Future<void> clearTokens() async {
    await Future.wait([
      _storage.delete(key: _accessTokenKey),
      _storage.delete(key: _refreshTokenKey),
    ]);
  }

  // ─── Admin Profile ───────────────────────────────────────────

  Future<void> saveAdminProfile(Map<String, dynamic> admin) async {
    final json = jsonEncode(admin);
    await _storage.write(key: _adminProfileKey, value: json);
  }

  Future<Map<String, dynamic>?> getAdminProfile() async {
    final json = await _storage.read(key: _adminProfileKey);
    if (json == null) return null;
    return jsonDecode(json) as Map<String, dynamic>;
  }

  Future<void> clearAdminProfile() async {
    await _storage.delete(key: _adminProfileKey);
  }

  // ─── Full Wipe ───────────────────────────────────────────────

  Future<void> clearAll() async {
    await _storage.deleteAll();
  }
}
