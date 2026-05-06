/// Dashboard Repository
///
/// Fetches dashboard summary, wallets, and recent transactions.

import 'package:dio/dio.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/constants/api_constants.dart';
import '../../../core/errors/exceptions.dart';
import '../../../core/network/dio_client.dart';
import 'dashboard_models.dart';

final dashboardRepositoryProvider = Provider<DashboardRepository>((ref) {
  return DashboardRepository(dioClient: ref.watch(dioClientProvider));
});

class DashboardRepository {
  final DioClient _dioClient;

  DashboardRepository({required DioClient dioClient})
      : _dioClient = dioClient;

  Future<DashboardSummary> getSummary() async {
    try {
      final response = await _dioClient.get(ApiConstants.dashboardSummary);
      return DashboardSummary.fromJson(
        response.data as Map<String, dynamic>,
      );
    } on DioException catch (e) {
      throw e.error is AppException
          ? e.error as AppException
          : ServerException(message: e.message ?? 'Failed to load dashboard');
    }
  }

  Future<List<WalletSummary>> getWallets() async {
    try {
      final response = await _dioClient.get(ApiConstants.wallets);
      final data = response.data;
      List items;
      if (data is Map && data['data'] != null) {
        items = data['data'] as List;
      } else if (data is List) {
        items = data;
      } else {
        items = [];
      }
      return items
          .map((e) => WalletSummary.fromJson(e as Map<String, dynamic>))
          .toList();
    } on DioException catch (e) {
      throw e.error is AppException
          ? e.error as AppException
          : ServerException(message: e.message ?? 'Failed to load wallets');
    }
  }

  Future<List<RecentTransaction>> getRecentTransactions({int limit = 5}) async {
    try {
      final response = await _dioClient.get(
        ApiConstants.transactions,
        queryParameters: {'limit': limit, 'sort': '-createdAt'},
      );
      final data = response.data;
      List items;
      if (data is Map && data['data'] != null) {
        items = data['data'] as List;
      } else if (data is List) {
        items = data;
      } else {
        items = [];
      }
      return items
          .map((e) => RecentTransaction.fromJson(e as Map<String, dynamic>))
          .toList();
    } on DioException catch (e) {
      throw e.error is AppException
          ? e.error as AppException
          : ServerException(
              message: e.message ?? 'Failed to load transactions');
    }
  }
}
