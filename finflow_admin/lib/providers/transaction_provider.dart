/// Transaction Provider (Riverpod)

import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../features/transactions/data/transaction_models.dart';
import '../features/transactions/data/transaction_repository.dart';

// ─── Transaction List State ────────────────────────────────────

class TransactionListState {
  final bool isLoading;
  final List<Transaction> transactions;
  final String? nextCursor;
  final bool hasMore;
  final TransactionFilter filter;
  final int totalInPaisa;
  final int totalOutPaisa;
  final String? errorMessage;

  const TransactionListState({
    this.isLoading = false,
    this.transactions = const [],
    this.nextCursor,
    this.hasMore = true,
    this.filter = const TransactionFilter(),
    this.totalInPaisa = 0,
    this.totalOutPaisa = 0,
    this.errorMessage,
  });

  TransactionListState copyWith({
    bool? isLoading,
    List<Transaction>? transactions,
    String? nextCursor,
    bool? hasMore,
    TransactionFilter? filter,
    int? totalInPaisa,
    int? totalOutPaisa,
    String? errorMessage,
  }) {
    return TransactionListState(
      isLoading: isLoading ?? this.isLoading,
      transactions: transactions ?? this.transactions,
      nextCursor: nextCursor ?? this.nextCursor,
      hasMore: hasMore ?? this.hasMore,
      filter: filter ?? this.filter,
      totalInPaisa: totalInPaisa ?? this.totalInPaisa,
      totalOutPaisa: totalOutPaisa ?? this.totalOutPaisa,
      errorMessage: errorMessage,
    );
  }
}

class TransactionListNotifier extends StateNotifier<TransactionListState> {
  final TransactionRepository _repository;

  TransactionListNotifier(this._repository)
    : super(const TransactionListState()) {
    loadTransactions();
  }

  Future<void> loadTransactions() async {
    state = state.copyWith(isLoading: true, errorMessage: null);
    try {
      final result = await _repository.getTransactions(state.filter);
      state = TransactionListState(
        transactions: result.items,
        nextCursor: result.nextCursor,
        hasMore: result.nextCursor != null,
        filter: state.filter,
        totalInPaisa: result.totalInPaisa,
        totalOutPaisa: result.totalOutPaisa,
      );
    } catch (e) {
      state = state.copyWith(isLoading: false, errorMessage: e.toString());
    }
  }

  Future<void> loadMore() async {
    if (state.isLoading || !state.hasMore) return;
    state = state.copyWith(isLoading: true);
    try {
      final filter = TransactionFilter(
        type: state.filter.type,
        clientId: state.filter.clientId,
        agentId: state.filter.agentId,
        walletId: state.filter.walletId,
        startDate: state.filter.startDate,
        endDate: state.filter.endDate,
        search: state.filter.search,
        cursor: state.nextCursor,
      );
      final result = await _repository.getTransactions(filter);
      state = state.copyWith(
        isLoading: false,
        transactions: [...state.transactions, ...result.items],
        nextCursor: result.nextCursor,
        hasMore: result.nextCursor != null,
      );
    } catch (e) {
      state = state.copyWith(isLoading: false, errorMessage: e.toString());
    }
  }

  void setFilter(TransactionFilter filter) {
    state = TransactionListState(filter: filter);
    loadTransactions();
  }

  Future<void> refresh() => loadTransactions();
}

final transactionListProvider =
    StateNotifierProvider<TransactionListNotifier, TransactionListState>((ref) {
      final repository = ref.watch(transactionRepositoryProvider);
      return TransactionListNotifier(repository);
    });

// ─── Add Transaction State ─────────────────────────────────────

class AddTransactionState {
  final bool isSubmitting;
  final bool isSuccess;
  final String? errorMessage;

  const AddTransactionState({
    this.isSubmitting = false,
    this.isSuccess = false,
    this.errorMessage,
  });
}

class AddTransactionNotifier extends StateNotifier<AddTransactionState> {
  final TransactionRepository _repository;

  AddTransactionNotifier(this._repository) : super(const AddTransactionState());

  Future<void> submit(CreateTransactionRequest request) async {
    state = const AddTransactionState(isSubmitting: true);
    try {
      await _repository.createTransaction(request);
      state = const AddTransactionState(isSuccess: true);
    } catch (e) {
      state = AddTransactionState(errorMessage: e.toString());
    }
  }

  void reset() => state = const AddTransactionState();
}

final addTransactionProvider =
    StateNotifierProvider<AddTransactionNotifier, AddTransactionState>((ref) {
      return AddTransactionNotifier(ref.watch(transactionRepositoryProvider));
    });
