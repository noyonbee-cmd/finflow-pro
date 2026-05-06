/// Wallet Provider (Riverpod)

import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../features/wallets/data/wallet_models.dart';
import '../features/wallets/data/wallet_repository.dart';

class WalletListState {
  final bool isLoading;
  final List<Wallet> wallets;
  final String? errorMessage;

  const WalletListState({
    this.isLoading = false,
    this.wallets = const [],
    this.errorMessage,
  });

  WalletListState copyWith({
    bool? isLoading,
    List<Wallet>? wallets,
    String? errorMessage,
  }) {
    return WalletListState(
      isLoading: isLoading ?? this.isLoading,
      wallets: wallets ?? this.wallets,
      errorMessage: errorMessage,
    );
  }
}

class WalletListNotifier extends StateNotifier<WalletListState> {
  final WalletRepository _repository;

  WalletListNotifier(this._repository) : super(const WalletListState()) {
    loadWallets();
  }

  Future<void> loadWallets() async {
    state = state.copyWith(isLoading: true, errorMessage: null);
    try {
      final wallets = await _repository.getWallets();
      state = WalletListState(wallets: wallets);
    } catch (e) {
      state = state.copyWith(isLoading: false, errorMessage: e.toString());
    }
  }

  Future<void> refresh() => loadWallets();
}

final walletListProvider =
    StateNotifierProvider<WalletListNotifier, WalletListState>((ref) {
      return WalletListNotifier(ref.watch(walletRepositoryProvider));
    });
