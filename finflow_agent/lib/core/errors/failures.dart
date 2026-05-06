/// Failure Classes
///
/// Domain-level failure representations.
/// Types: ServerFailure, CacheFailure, NetworkFailure,
///        AuthFailure, ValidationFailure, NotFoundFailure.
/// All extend abstract Failure with message and optional statusCode.

import 'package:equatable/equatable.dart';

sealed class Failure extends Equatable {
  final String message;
  final int? statusCode;

  const Failure({required this.message, this.statusCode});

  @override
  List<Object?> get props => [message, statusCode];
}

class ServerFailure extends Failure {
  const ServerFailure({required super.message, super.statusCode});
}

class NetworkFailure extends Failure {
  const NetworkFailure({
    super.message = 'No internet connection. Please check your network.',
  });
}

class AuthFailure extends Failure {
  const AuthFailure({
    super.message = 'Authentication failed.',
    super.statusCode,
  });
}

class CacheFailure extends Failure {
  const CacheFailure({super.message = 'Failed to read from local storage.'});
}

class ValidationFailure extends Failure {
  final Map<String, List<String>>? fieldErrors;

  const ValidationFailure({
    super.message = 'Validation failed.',
    super.statusCode = 422,
    this.fieldErrors,
  });

  @override
  List<Object?> get props => [message, statusCode, fieldErrors];
}

class NotFoundFailure extends Failure {
  const NotFoundFailure({
    super.message = 'The requested resource was not found.',
    super.statusCode = 404,
  });
}

class TimeoutFailure extends Failure {
  const TimeoutFailure({
    super.message = 'Request timed out. Please try again.',
  });
}
