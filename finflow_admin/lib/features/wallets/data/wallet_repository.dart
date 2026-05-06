/// Wallet Repository

import 'package:dio/dio.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/constants/api_constants.dart';
import '../../../core/errors/exceptions.dart';
import '../../../core/network/dio_client.dart';
import 'wallet_models.dart';

final walletRepositoryProvider = Provider<WalletRepository>((ref) {
  return WalletRepository(dioClient: ref.watch(dioClientProvider));
});

class WalletRepository {
  final DioClient _dioClient;
  WalletRepository({required DioClient dioClient}) : _dioClient = dioClient;

  Future<List<Wallet>> getWallets() async {
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
          .map((e) => Wallet.fromJson(e as Map<String, dynamic>))
          .toList();
    } on DioException catch (e) {
      throw e.error is AppException
          ? e.error as AppException
          : ServerException(message: e.message ?? 'Failed to load wallets');
    }
  }

  Future<Wallet> getWallet(String id) async {
    try {
      final response = await _dioClient.get(ApiConstants.wallet(id));
      final data = response.data is Map
          ? (response.data['data'] ?? response.data) as Map<String, dynamic>
          : response.data as Map<String, dynamic>;
      return Wallet.fromJson(data);
    } on DioException catch (e) {
      throw e.error is AppException
          ? e.error as AppException
          : ServerException(message: e.message ?? 'Failed to load wallet');
    }
  }

  Future<List<WalletLogEntry>> getWalletLedger(String id) async {
    try {
      final response = await _dioClient.get(ApiConstants.walletLedger(id));
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
          .map((e) => WalletLogEntry.fromJson(e as Map<String, dynamic>))
          .toList();
    } on DioException catch (e) {
      throw e.error is AppException
          ? e.error as AppException
          : ServerException(message: e.message ?? 'Failed to load ledger');
    }
  }

  Future<void> adjustWallet(
    String id, {
    required int amountPaisa,
    required String note,
  }) async {
    try {
      await _dioClient.post(
        ApiConstants.walletAdjust(id),
        data: {'amountPaisa': amountPaisa, 'note': note},
      );
    } on DioException catch (e) {
      throw e.error is AppException
          ? e.error as AppException
          : ServerException(message: e.message ?? 'Failed to adjust wallet');
    }
  }

  Future<void> transfer({
    required String fromWalletId,
    required String toWalletId,
    required int amountPaisa,
    String? note,
  }) async {
    try {
      await _dioClient.post(
        ApiConstants.walletTransfer,
        data: {
          'fromWalletId': fromWalletId,
          'toWalletId': toWalletId,
          'amountPaisa': amountPaisa,
          if (note != null) 'note': note,
        },
      );
    } on DioException catch (e) {
      throw e.error is AppException
          ? e.error as AppException
          : ServerException(message: e.message ?? 'Transfer failed');
    }
  }
}
