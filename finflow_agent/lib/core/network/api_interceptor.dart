/// API Interceptor
///
/// Dio interceptor for:
/// - Attaching JWT access token to every request
/// - Automatic token refresh on 401 responses
/// - Request/response logging in debug mode
/// - Network error transformation

import 'dart:async';
import 'package:dio/dio.dart';
import 'package:flutter/foundation.dart';
import '../constants/api_constants.dart';
import '../errors/exceptions.dart';
import '../storage/secure_storage.dart';

/// Attaches the Bearer token to outgoing requests.
/// On 401, tries a single token refresh then retries the original request.
/// If the refresh also fails, clears session and triggers logout callback.
class AuthInterceptor extends QueuedInterceptor {
  final Dio _dio;
  final SecureStorageService _storage;
  final VoidCallback? _onSessionExpired;

  bool _isRefreshing = false;
  final List<_RetryEntry> _pendingRequests = [];

  AuthInterceptor({
    required Dio dio,
    required SecureStorageService storage,
    VoidCallback? onSessionExpired,
  }) : _dio = dio,
       _storage = storage,
       _onSessionExpired = onSessionExpired;

  @override
  Future<void> onRequest(
    RequestOptions options,
    RequestInterceptorHandler handler,
  ) async {
    // Skip token attachment for auth endpoints
    final path = options.path;
    if (_isPublicEndpoint(path)) {
      return handler.next(options);
    }

    final token = await _storage.getAccessToken();
    if (token != null && token.isNotEmpty) {
      options.headers['Authorization'] = 'Bearer $token';
    }
    return handler.next(options);
  }

  @override
  Future<void> onError(
    DioException err,
    ErrorInterceptorHandler handler,
  ) async {
    // Only handle 401 on non-auth endpoints
    if (err.response?.statusCode != 401 ||
        _isPublicEndpoint(err.requestOptions.path) ||
        err.requestOptions.path == ApiConstants.refreshToken) {
      return handler.next(err);
    }

    // Queue this request for retry after refresh
    if (_isRefreshing) {
      final completer = Completer<Response>();
      _pendingRequests.add(
        _RetryEntry(options: err.requestOptions, completer: completer),
      );
      try {
        final response = await completer.future;
        return handler.resolve(response);
      } catch (e) {
        return handler.next(err);
      }
    }

    _isRefreshing = true;

    try {
      final refreshToken = await _storage.getRefreshToken();
      if (refreshToken == null || refreshToken.isEmpty) {
        throw const UnauthorizedException();
      }

      // Use a fresh Dio instance to avoid interceptor loops
      final freshDio = Dio(
        BaseOptions(
          baseUrl: ApiConstants.baseUrl,
          connectTimeout: const Duration(
            milliseconds: ApiConstants.connectTimeout,
          ),
          receiveTimeout: const Duration(
            milliseconds: ApiConstants.receiveTimeout,
          ),
        ),
      );

      final refreshResponse = await freshDio.post(
        ApiConstants.refreshToken,
        data: {'refreshToken': refreshToken},
      );

      final newAccessToken =
          refreshResponse.data['data']?['accessToken'] as String?;
      final newRefreshToken =
          refreshResponse.data['data']?['refreshToken'] as String?;

      if (newAccessToken == null || newRefreshToken == null) {
        throw const UnauthorizedException();
      }

      // Persist new tokens
      await _storage.saveTokens(
        accessToken: newAccessToken,
        refreshToken: newRefreshToken,
      );

      // Retry the original request
      err.requestOptions.headers['Authorization'] = 'Bearer $newAccessToken';
      final retryResponse = await _dio.fetch(err.requestOptions);

      // Drain the pending queue
      for (final entry in _pendingRequests) {
        entry.options.headers['Authorization'] = 'Bearer $newAccessToken';
        try {
          final r = await _dio.fetch(entry.options);
          entry.completer.complete(r);
        } catch (e) {
          entry.completer.completeError(e);
        }
      }

      _isRefreshing = false;
      _pendingRequests.clear();
      return handler.resolve(retryResponse);
    } catch (_) {
      _isRefreshing = false;

      // Fail all pending
      for (final entry in _pendingRequests) {
        entry.completer.completeError(const UnauthorizedException());
      }
      _pendingRequests.clear();

      // Clear session
      await _storage.clearAll();
      _onSessionExpired?.call();

      return handler.next(err);
    }
  }

  bool _isPublicEndpoint(String path) {
    return path == ApiConstants.adminLogin ||
        path == ApiConstants.adminSignup ||
        path == ApiConstants.agentLogin ||
        path == ApiConstants.agentRegister;
  }
}

/// Transforms [DioException] into typed [AppException] subclasses.
class ErrorTransformInterceptor extends Interceptor {
  @override
  void onError(DioException err, ErrorInterceptorHandler handler) {
    final AppException appException;

    switch (err.type) {
      case DioExceptionType.connectionTimeout:
      case DioExceptionType.sendTimeout:
      case DioExceptionType.receiveTimeout:
        appException = const TimeoutException();
      case DioExceptionType.connectionError:
        appException = const NetworkException();
      case DioExceptionType.badResponse:
        final statusCode = err.response?.statusCode;
        final data = err.response?.data;
        final message = _extractMessage(data) ?? err.message ?? 'Server error';

        if (statusCode == 401) {
          appException = UnauthorizedException(message: message);
        } else if (statusCode == 404) {
          appException = NotFoundException(message: message);
        } else if (statusCode == 422) {
          appException = ValidationException(
            message: message,
            statusCode: statusCode,
            fieldErrors: _extractFieldErrors(data),
          );
        } else {
          appException = ServerException(
            message: message,
            statusCode: statusCode,
          );
        }
      default:
        appException = ServerException(
          message: err.message ?? 'An unexpected error occurred',
        );
    }

    handler.next(
      DioException(
        requestOptions: err.requestOptions,
        response: err.response,
        type: err.type,
        error: appException,
      ),
    );
  }

  String? _extractMessage(dynamic data) {
    if (data is Map<String, dynamic>) {
      return data['message'] as String? ??
          data['error'] as String? ??
          data['msg'] as String?;
    }
    return null;
  }

  Map<String, List<String>>? _extractFieldErrors(dynamic data) {
    if (data is Map<String, dynamic>) {
      final errors = data['errors'];
      if (errors is Map<String, dynamic>) {
        return errors.map(
          (key, value) => MapEntry(
            key,
            (value is List) ? value.cast<String>() : [value.toString()],
          ),
        );
      }
    }
    return null;
  }
}

class _RetryEntry {
  final RequestOptions options;
  final Completer<Response> completer;

  _RetryEntry({required this.options, required this.completer});
}
