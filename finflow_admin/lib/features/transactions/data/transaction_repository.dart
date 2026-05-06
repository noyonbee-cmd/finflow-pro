/// Transaction Repository
///
/// Data layer for transactions — CRUD, filtering, fee calculation, payment suggestion.

import 'package:dio/dio.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/constants/api_constants.dart';
import '../../../core/errors/exceptions.dart';
import '../../../core/network/dio_client.dart';
import 'transaction_models.dart';

final transactionRepositoryProvider = Provider<TransactionRepository>((ref) {
  return TransactionRepository(dioClient: ref.watch(dioClientProvider));
});

class TransactionRepository {
  final DioClient _dioClient;

  TransactionRepository({required DioClient dioClient})
    : _dioClient = dioClient;

  /// Fetch paginated transactions with filters.
  Future<PaginatedTransactions> getTransactions(
    TransactionFilter filter,
  ) async {
    try {
      final response = await _dioClient.get(
        ApiConstants.transactions,
        queryParameters: filter.toQueryParams(),
      );
      return PaginatedTransactions.fromJson(
        response.data as Map<String, dynamic>,
      );
    } on DioException catch (e) {
      throw e.error is AppException
          ? e.error as AppException
          : ServerException(
              message: e.message ?? 'Failed to load transactions',
            );
    }
  }

  /// Get a single transaction by ID.
  Future<Transaction> getTransaction(String id) async {
    try {
      final response = await _dioClient.get(ApiConstants.transaction(id));
      final data = response.data is Map
          ? (response.data['data'] ?? response.data) as Map<String, dynamic>
          : response.data as Map<String, dynamic>;
      return Transaction.fromJson(data);
    } on DioException catch (e) {
      throw e.error is AppException
          ? e.error as AppException
          : ServerException(message: e.message ?? 'Failed to load transaction');
    }
  }

  /// Create a new transaction.
  Future<Transaction> createTransaction(
    CreateTransactionRequest request,
  ) async {
    try {
      final response = await _dioClient.post(
        ApiConstants.transactions,
        data: request.toJson(),
      );
      final data = response.data is Map
          ? (response.data['data'] ?? response.data) as Map<String, dynamic>
          : response.data as Map<String, dynamic>;
      return Transaction.fromJson(data);
    } on DioException catch (e) {
      throw e.error is AppException
          ? e.error as AppException
          : ServerException(
              message: e.message ?? 'Failed to create transaction',
            );
    }
  }

  /// Cancel a transaction.
  Future<void> cancelTransaction(String id) async {
    try {
      await _dioClient.post(ApiConstants.cancelTransaction(id));
    } on DioException catch (e) {
      throw e.error is AppException
          ? e.error as AppException
          : ServerException(
              message: e.message ?? 'Failed to cancel transaction',
            );
    }
  }

  /// Calculate fee for a given amount/rate (server-side calculation).
  Future<Map<String, dynamic>> calculateFee({
    required int amountPaisa,
    required double feePercent,
    required String type,
    String? clientId,
    String? agentId,
  }) async {
    try {
      final response = await _dioClient.post(
        ApiConstants.calculateFee,
        data: {
          'amountPaisa': amountPaisa,
          'feePercent': feePercent,
          'type': type,
          if (clientId != null) 'clientId': clientId,
          if (agentId != null) 'agentId': agentId,
        },
      );
      return (response.data['data'] ?? response.data) as Map<String, dynamic>;
    } on DioException catch (e) {
      throw e.error is AppException
          ? e.error as AppException
          : ServerException(message: e.message ?? 'Fee calculation failed');
    }
  }

  /// Get payment suggestion for an amount.
  Future<Map<String, dynamic>> suggestPayment({
    required int amountPaisa,
    required String type,
  }) async {
    try {
      final response = await _dioClient.post(
        ApiConstants.suggestPayment,
        data: {'amountPaisa': amountPaisa, 'type': type},
      );
      return (response.data['data'] ?? response.data) as Map<String, dynamic>;
    } on DioException catch (e) {
      throw e.error is AppException
          ? e.error as AppException
          : ServerException(message: e.message ?? 'Payment suggestion failed');
    }
  }
}
