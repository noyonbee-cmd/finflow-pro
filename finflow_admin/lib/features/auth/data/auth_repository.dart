/// Auth Repository
///
/// Data layer for authentication — login, signup, logout, refresh.
/// All methods throw [AppException] subclasses on failure.

import 'package:dio/dio.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/constants/api_constants.dart';
import '../../../core/errors/exceptions.dart';
import '../../../core/network/dio_client.dart';
import '../../../core/storage/secure_storage.dart';
import 'auth_models.dart';

final authRepositoryProvider = Provider<AuthRepository>((ref) {
  return AuthRepository(
    dioClient: ref.watch(dioClientProvider),
    storage: ref.watch(secureStorageProvider),
  );
});

class AuthRepository {
  final DioClient _dioClient;
  final SecureStorageService _storage;

  AuthRepository({
    required DioClient dioClient,
    required SecureStorageService storage,
  }) : _dioClient = dioClient,
       _storage = storage;

  /// Admin login with email + password.
  /// Persists tokens and admin profile on success.
  Future<AuthResponse> login({
    required String email,
    required String password,
  }) async {
    try {
      final response = await _dioClient.post(
        ApiConstants.adminLogin,
        data: {'email': email, 'password': password},
      );

      final authResponse = AuthResponse.fromJson(
        response.data as Map<String, dynamic>,
      );

      // Persist session
      await _storage.saveTokens(
        accessToken: authResponse.accessToken,
        refreshToken: authResponse.refreshToken,
      );
      await _storage.saveAdminProfile(authResponse.admin.toJson());

      return authResponse;
    } on DioException catch (e) {
      throw e.error is AppException
          ? e.error as AppException
          : ServerException(message: e.message ?? 'Login failed');
    }
  }

  /// Admin signup — creates a new admin account.
  Future<AuthResponse> signup(AdminSignupRequest request) async {
    try {
      final response = await _dioClient.post(
        ApiConstants.adminSignup,
        data: request.toJson(),
      );

      final authResponse = AuthResponse.fromJson(
        response.data as Map<String, dynamic>,
      );

      await _storage.saveTokens(
        accessToken: authResponse.accessToken,
        refreshToken: authResponse.refreshToken,
      );
      await _storage.saveAdminProfile(authResponse.admin.toJson());

      return authResponse;
    } on DioException catch (e) {
      throw e.error is AppException
          ? e.error as AppException
          : ServerException(message: e.message ?? 'Signup failed');
    }
  }

  /// Logout — revokes the current refresh token server-side.
  Future<void> logout() async {
    try {
      await _dioClient.post(ApiConstants.logout);
    } catch (_) {
      // Best-effort; always clear local session
    } finally {
      await _storage.clearAll();
    }
  }

  /// Refresh tokens — called automatically by the interceptor,
  /// but exposed here for manual use.
  Future<TokenPair> refreshToken() async {
    try {
      final currentRefresh = await _storage.getRefreshToken();
      if (currentRefresh == null) {
        throw const UnauthorizedException();
      }

      final response = await _dioClient.post(
        ApiConstants.refreshToken,
        data: {'refreshToken': currentRefresh},
      );

      final tokenPair = TokenPair.fromJson(
        response.data as Map<String, dynamic>,
      );

      await _storage.saveTokens(
        accessToken: tokenPair.accessToken,
        refreshToken: tokenPair.refreshToken,
      );

      return tokenPair;
    } on DioException catch (e) {
      throw e.error is AppException
          ? e.error as AppException
          : const UnauthorizedException();
    }
  }

  /// Check if there is a persisted session.
  Future<AdminUser?> getPersistedAdmin() async {
    final profile = await _storage.getAdminProfile();
    if (profile == null) return null;
    return AdminUser.fromJson(profile);
  }

  /// Check if tokens exist (quick auth check without network).
  Future<bool> hasSession() async {
    final token = await _storage.getAccessToken();
    return token != null && token.isNotEmpty;
  }
}
