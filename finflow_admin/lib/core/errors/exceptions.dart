/// Exception Classes
///
/// Data-layer exception types for error propagation.
/// Types: ServerException, CacheException, NetworkException,
///        UnauthorizedException, NotFoundException.
/// Caught in repositories and mapped to Failure objects.

class AppException implements Exception {
  final String message;
  final int? statusCode;
  final dynamic data;

  const AppException({required this.message, this.statusCode, this.data});

  @override
  String toString() => 'AppException($statusCode): $message';
}

class ServerException extends AppException {
  const ServerException({required super.message, super.statusCode, super.data});
}

class NetworkException extends AppException {
  const NetworkException({
    super.message = 'No internet connection. Please check your network.',
    super.statusCode,
  });
}

class UnauthorizedException extends AppException {
  const UnauthorizedException({
    super.message = 'Session expired. Please log in again.',
    super.statusCode = 401,
  });
}

class NotFoundException extends AppException {
  const NotFoundException({
    super.message = 'The requested resource was not found.',
    super.statusCode = 404,
  });
}

class CacheException extends AppException {
  const CacheException({super.message = 'Failed to read from local storage.'});
}

class ValidationException extends AppException {
  final Map<String, List<String>>? fieldErrors;

  const ValidationException({
    super.message = 'Validation failed.',
    super.statusCode = 422,
    this.fieldErrors,
  });
}

class TimeoutException extends AppException {
  const TimeoutException({
    super.message = 'Request timed out. Please try again.',
  });
}
