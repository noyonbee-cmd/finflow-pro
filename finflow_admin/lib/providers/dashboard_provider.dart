/// Dashboard Provider (Riverpod)
///
/// Manages dashboard data: summary stats, wallets, recent transactions.

import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../features/dashboard/data/dashboard_models.dart';
import '../../features/dashboard/data/dashboard_repository.dart';

// ─── Dashboard State ───────────────────────────────────────────

class DashboardState {
  final bool isLoading;
  final DashboardSummary? summary;
  final List<WalletSummary> wallets;
  final List<RecentTransaction> recentTransactions;
  final String? errorMessage;

  const DashboardState({
    this.isLoading = false,
    this.summary,
    this.wallets = const [],
    this.recentTransactions = const [],
    this.errorMessage,
  });

  DashboardState copyWith({
    bool? isLoading,
    DashboardSummary? summary,
    List<WalletSummary>? wallets,
    List<RecentTransaction>? recentTransactions,
    String? errorMessage,
  }) {
    return DashboardState(
      isLoading: isLoading ?? this.isLoading,
      summary: summary ?? this.summary,
      wallets: wallets ?? this.wallets,
      recentTransactions: recentTransactions ?? this.recentTransactions,
      errorMessage: errorMessage,
    );
  }
}

// ─── Dashboard Notifier ────────────────────────────────────────

class DashboardNotifier extends StateNotifier<DashboardState> {
  final DashboardRepository _repository;

  DashboardNotifier(this._repository) : super(const DashboardState()) {
    loadDashboard();
  }

  Future<void> loadDashboard() async {
    state = state.copyWith(isLoading: true, errorMessage: null);
    try {
      final results = await Future.wait([
        _repository.getSummary(),
        _repository.getWallets(),
        _repository.getRecentTransactions(),
      ]);

      state = DashboardState(
        isLoading: false,
        summary: results[0] as DashboardSummary,
        wallets: results[1] as List<WalletSummary>,
        recentTransactions: results[2] as List<RecentTransaction>,
      );
    } catch (e) {
      state = state.copyWith(isLoading: false, errorMessage: e.toString());
    }
  }

  Future<void> refresh() => loadDashboard();
}

// ─── Provider ──────────────────────────────────────────────────

final dashboardProvider =
    StateNotifierProvider<DashboardNotifier, DashboardState>((ref) {
      final repository = ref.watch(dashboardRepositoryProvider);
      return DashboardNotifier(repository);
    });
