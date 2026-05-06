/// Transaction History Screen — Filterable, searchable list with pagination.

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../../../core/constants/app_colors.dart';
import '../../../../core/constants/app_spacing.dart';
import '../../../../core/constants/app_text_styles.dart';
import '../../../../core/utils/currency_formatter.dart';
import '../../../../core/utils/date_formatter.dart';
import '../../../../providers/transaction_provider.dart';
import '../../../../features/transactions/data/transaction_models.dart';
import '../../../../shared/widgets/transaction_card.dart';
import '../../../../shared/widgets/loading_skeleton.dart';
import '../../../../shared/widgets/empty_state.dart';
import '../../../../shared/widgets/error_state.dart';

class TransactionHistoryScreen extends ConsumerStatefulWidget {
  const TransactionHistoryScreen({super.key});

  @override
  ConsumerState<TransactionHistoryScreen> createState() =>
      _TransactionHistoryScreenState();
}

class _TransactionHistoryScreenState
    extends ConsumerState<TransactionHistoryScreen> {
  final _searchController = TextEditingController();
  final _scrollController = ScrollController();
  String _activeFilter = 'All';

  @override
  void initState() {
    super.initState();
    _scrollController.addListener(_onScroll);
  }

  @override
  void dispose() {
    _searchController.dispose();
    _scrollController.dispose();
    super.dispose();
  }

  void _onScroll() {
    if (_scrollController.position.pixels >=
        _scrollController.position.maxScrollExtent - 200) {
      ref.read(transactionListProvider.notifier).loadMore();
    }
  }

  void _onFilterChanged(String filter) {
    setState(() => _activeFilter = filter);
    String? type;
    DateTime? startDate;
    final now = DateTime.now();

    switch (filter) {
      case 'CR':
        type = 'CR';
      case 'DR':
        type = 'DR';
      case 'Today':
        startDate = DateTime(now.year, now.month, now.day);
      case 'This Week':
        startDate = now.subtract(Duration(days: now.weekday - 1));
    }

    ref
        .read(transactionListProvider.notifier)
        .setFilter(
          TransactionFilter(
            type: type,
            startDate: startDate,
            search: _searchController.text.isNotEmpty
                ? _searchController.text
                : null,
          ),
        );
  }

  @override
  Widget build(BuildContext context) {
    final state = ref.watch(transactionListProvider);

    return Scaffold(
      backgroundColor: AppColors.darkBg,
      appBar: AppBar(
        title: Text(
          'Transactions',
          style: AppTextStyles.h4.copyWith(color: AppColors.textPrimary),
        ),
        backgroundColor: AppColors.darkBg,
        actions: [
          IconButton(
            onPressed: () => context.push('/transactions/add'),
            icon: const Icon(Icons.add_rounded, color: AppColors.primary),
          ),
        ],
      ),
      body: Column(
        children: [
          // Search bar
          Padding(
            padding: const EdgeInsets.symmetric(
              horizontal: AppSpacing.base,
              vertical: AppSpacing.sm,
            ),
            child: TextField(
              controller: _searchController,
              style: AppTextStyles.bodyBase.copyWith(
                color: AppColors.textPrimary,
              ),
              decoration: InputDecoration(
                hintText: 'Search client, amount...',
                hintStyle: AppTextStyles.bodySm.copyWith(
                  color: AppColors.textMuted,
                ),
                prefixIcon: const Icon(
                  Icons.search_rounded,
                  color: AppColors.textTertiary,
                  size: 20,
                ),
                filled: true,
                fillColor: AppColors.surface,
                border: OutlineInputBorder(
                  borderRadius: BorderRadius.circular(AppSpacing.radiusButton),
                  borderSide: BorderSide.none,
                ),
                contentPadding: const EdgeInsets.symmetric(vertical: 12),
              ),
              onSubmitted: (val) {
                ref
                    .read(transactionListProvider.notifier)
                    .setFilter(
                      TransactionFilter(
                        type: _activeFilter == 'CR'
                            ? 'CR'
                            : (_activeFilter == 'DR' ? 'DR' : null),
                        search: val.isNotEmpty ? val : null,
                      ),
                    );
              },
            ),
          ),

          // Filter chips
          SizedBox(
            height: 36,
            child: ListView(
              scrollDirection: Axis.horizontal,
              padding: const EdgeInsets.symmetric(horizontal: AppSpacing.base),
              children: ['All', 'CR', 'DR', 'Today', 'This Week'].map((f) {
                final isActive = _activeFilter == f;
                return Padding(
                  padding: const EdgeInsets.only(right: 8),
                  child: ChoiceChip(
                    label: Text(
                      f,
                      style: AppTextStyles.bodyXs.copyWith(
                        color: isActive
                            ? AppColors.white
                            : AppColors.textSecondary,
                        fontWeight: FontWeight.w600,
                      ),
                    ),
                    selected: isActive,
                    selectedColor: AppColors.primary,
                    backgroundColor: AppColors.surface,
                    side: BorderSide(
                      color: isActive ? AppColors.primary : AppColors.border,
                    ),
                    shape: RoundedRectangleBorder(
                      borderRadius: BorderRadius.circular(
                        AppSpacing.radiusFull,
                      ),
                    ),
                    onSelected: (_) => _onFilterChanged(f),
                  ),
                );
              }).toList(),
            ),
          ),

          // Summary banner
          if (!state.isLoading && state.transactions.isNotEmpty)
            Padding(
              padding: const EdgeInsets.all(AppSpacing.base),
              child: Container(
                padding: const EdgeInsets.all(12),
                decoration: BoxDecoration(
                  color: AppColors.surface,
                  borderRadius: AppSpacing.cardBorderRadius,
                ),
                child: Row(
                  children: [
                    Expanded(
                      child: Column(
                        children: [
                          Text(
                            'Total IN',
                            style: AppTextStyles.bodyXs.copyWith(
                              color: AppColors.textTertiary,
                            ),
                          ),
                          Text(
                            CurrencyFormatter.formatBDTCompact(
                              state.totalInPaisa,
                            ),
                            style: AppTextStyles.numberSm.copyWith(
                              color: AppColors.profitGreen,
                            ),
                          ),
                        ],
                      ),
                    ),
                    Container(width: 1, height: 30, color: AppColors.border),
                    Expanded(
                      child: Column(
                        children: [
                          Text(
                            'Total OUT',
                            style: AppTextStyles.bodyXs.copyWith(
                              color: AppColors.textTertiary,
                            ),
                          ),
                          Text(
                            CurrencyFormatter.formatBDTCompact(
                              state.totalOutPaisa,
                            ),
                            style: AppTextStyles.numberSm.copyWith(
                              color: AppColors.feeRed,
                            ),
                          ),
                        ],
                      ),
                    ),
                  ],
                ),
              ),
            ),

          // Transaction list
          Expanded(
            child: state.isLoading && state.transactions.isEmpty
                ? Padding(
                    padding: const EdgeInsets.all(AppSpacing.base),
                    child: LoadingSkeleton.transactionList(),
                  )
                : state.errorMessage != null && state.transactions.isEmpty
                ? ErrorState(
                    message: state.errorMessage!,
                    onRetry: () =>
                        ref.read(transactionListProvider.notifier).refresh(),
                  )
                : state.transactions.isEmpty
                ? const EmptyState(
                    icon: Icons.receipt_long_rounded,
                    title: 'No transactions yet',
                    subtitle: 'Tap + to add your first transaction',
                  )
                : RefreshIndicator(
                    onRefresh: () =>
                        ref.read(transactionListProvider.notifier).refresh(),
                    color: AppColors.primary,
                    child: ListView.builder(
                      controller: _scrollController,
                      padding: const EdgeInsets.symmetric(
                        horizontal: AppSpacing.base,
                      ),
                      itemCount:
                          state.transactions.length + (state.hasMore ? 1 : 0),
                      itemBuilder: (context, index) {
                        if (index >= state.transactions.length) {
                          return const Padding(
                            padding: EdgeInsets.all(16),
                            child: Center(
                              child: CircularProgressIndicator(
                                strokeWidth: 2,
                                color: AppColors.primary,
                              ),
                            ),
                          );
                        }

                        final tx = state.transactions[index];
                        // Date separator
                        final showDate =
                            index == 0 ||
                            DateFormatter.groupKey(tx.createdAt) !=
                                DateFormatter.groupKey(
                                  state.transactions[index - 1].createdAt,
                                );

                        return Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            if (showDate)
                              Padding(
                                padding: const EdgeInsets.only(
                                  top: 16,
                                  bottom: 8,
                                ),
                                child: Text(
                                  DateFormatter.groupKey(tx.createdAt),
                                  style: AppTextStyles.labelSm.copyWith(
                                    color: AppColors.textTertiary,
                                  ),
                                ),
                              ),
                            Padding(
                              padding: const EdgeInsets.only(bottom: 8),
                              child: TransactionCard(
                                id: tx.id,
                                clientName: tx.clientName,
                                type: tx.type,
                                amountPaisa: tx.amountPaisa,
                                feePaisa: tx.totalFeePaisa,
                                profitPaisa: tx.netProfitPaisa,
                                walletName: tx.walletName,
                                createdAt: tx.createdAt,
                                agentName: tx.agentName,
                              ),
                            ),
                          ],
                        );
                      },
                    ),
                  ),
          ),
        ],
      ),
    );
  }
}
