/// Dashboard Screen
///
/// Main admin dashboard with summary cards, wallet scroll,
/// commission widget, and recent transactions.

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:intl/intl.dart';
import 'package:shimmer/shimmer.dart';

import '../../../core/constants/app_colors.dart';
import '../../../core/constants/app_spacing.dart';
import '../../../core/constants/app_text_styles.dart';
import '../../../core/utils/currency_formatter.dart';
import '../../../providers/auth_provider.dart';
import '../../../providers/dashboard_provider.dart';
import '../../../shared/widgets/transaction_card.dart';
import '../../../shared/widgets/wallet_card.dart';

class DashboardScreen extends ConsumerWidget {
  const DashboardScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final state = ref.watch(dashboardProvider);
    final authState = ref.watch(authProvider);

    return Scaffold(
      backgroundColor: AppColors.darkBg,
      body: SafeArea(
        child: RefreshIndicator(
          color: AppColors.primary,
          backgroundColor: AppColors.surface,
          onRefresh: () => ref.read(dashboardProvider.notifier).refresh(),
          child: CustomScrollView(
            slivers: [
              // ── Header ──
              SliverToBoxAdapter(
                child: _Header(
                  adminName: authState.admin?.name ?? 'Admin',
                  notificationCount: state.summary?.notificationCount ?? 0,
                ),
              ),

              // ── Summary Cards ──
              SliverToBoxAdapter(
                child: Padding(
                  padding: const EdgeInsets.fromLTRB(16, 8, 16, 0),
                  child: state.isLoading
                      ? _buildShimmerRow()
                      : _SummaryCards(
                          totalInPaisa: state.summary?.totalInPaisa ?? 0,
                          totalInCount: state.summary?.totalInCount ?? 0,
                          totalOutPaisa: state.summary?.totalOutPaisa ?? 0,
                          totalOutCount: state.summary?.totalOutCount ?? 0,
                        ),
                ),
              ),

              // ── Net Profit Card ──
              SliverToBoxAdapter(
                child: Padding(
                  padding: const EdgeInsets.fromLTRB(16, 12, 16, 0),
                  child: state.isLoading
                      ? _buildShimmerBlock(height: 100)
                      : _NetProfitCard(
                          netProfitPaisa: state.summary?.netProfitPaisa ?? 0,
                          changePercent:
                              state.summary?.profitChangePercent ?? 0,
                        ),
                ),
              ),

              // ── Wallets Section ──
              SliverToBoxAdapter(
                child: Padding(
                  padding: const EdgeInsets.only(top: 20),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Padding(
                        padding: const EdgeInsets.symmetric(horizontal: 16),
                        child: Row(
                          mainAxisAlignment: MainAxisAlignment.spaceBetween,
                          children: [
                            Text(
                              'Wallets',
                              style: AppTextStyles.h5.copyWith(
                                color: AppColors.textPrimary,
                              ),
                            ),
                            GestureDetector(
                              onTap: () => context.push('/wallets'),
                              child: Text(
                                'View All →',
                                style: AppTextStyles.bodySmSemibold.copyWith(
                                  color: AppColors.primary,
                                ),
                              ),
                            ),
                          ],
                        ),
                      ),
                      const SizedBox(height: 12),
                      SizedBox(
                        height: 130,
                        child: state.isLoading
                            ? _buildWalletShimmer()
                            : ListView.separated(
                                scrollDirection: Axis.horizontal,
                                padding: const EdgeInsets.symmetric(
                                  horizontal: 16,
                                ),
                                itemCount: state.wallets.length,
                                separatorBuilder: (_, __) =>
                                    const SizedBox(width: 12),
                                itemBuilder: (context, index) {
                                  final w = state.wallets[index];
                                  return WalletCard(
                                    name: w.name,
                                    type: w.type,
                                    balancePaisa: w.balancePaisa,
                                    lowThresholdPaisa: w.lowThresholdPaisa,
                                    onTap: () =>
                                        context.push('/wallets/${w.id}'),
                                  );
                                },
                              ),
                      ),
                    ],
                  ),
                ),
              ),

              // ── Agent Commission Widget ──
              SliverToBoxAdapter(
                child: Padding(
                  padding: const EdgeInsets.fromLTRB(16, 20, 16, 0),
                  child: state.isLoading
                      ? _buildShimmerBlock(height: 72)
                      : _CommissionWidget(
                          pendingPaisa:
                              state.summary?.pendingCommissionPaisa ?? 0,
                          agentCount:
                              state.summary?.pendingCommissionAgentCount ?? 0,
                        ),
                ),
              ),

              // ── Recent Transactions ──
              SliverToBoxAdapter(
                child: Padding(
                  padding: const EdgeInsets.fromLTRB(16, 20, 16, 4),
                  child: Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      Text(
                        'Recent Transactions',
                        style: AppTextStyles.h5.copyWith(
                          color: AppColors.textPrimary,
                        ),
                      ),
                      GestureDetector(
                        onTap: () => context.push('/transactions'),
                        child: Row(
                          children: [
                            Text(
                              'View All',
                              style: AppTextStyles.bodySmSemibold.copyWith(
                                color: AppColors.primary,
                              ),
                            ),
                            const SizedBox(width: 4),
                            const Icon(
                              Icons.arrow_forward_ios_rounded,
                              size: 12,
                              color: AppColors.primary,
                            ),
                          ],
                        ),
                      ),
                    ],
                  ),
                ),
              ),

              // ── Transaction List ──
              state.isLoading
                  ? SliverPadding(
                      padding: const EdgeInsets.symmetric(horizontal: 16),
                      sliver: SliverList(
                        delegate: SliverChildBuilderDelegate(
                          (_, __) => Padding(
                            padding: const EdgeInsets.only(bottom: 8),
                            child: TransactionCard(
                              id: '',
                              clientName: '',
                              type: 'CR',
                              amountPaisa: 0,
                              feePaisa: 0,
                              profitPaisa: 0,
                              walletName: '',
                              createdAt: DateTime.now(),
                              isLoading: true,
                            ),
                          ),
                          childCount: 5,
                        ),
                      ),
                    )
                  : SliverPadding(
                      padding: const EdgeInsets.fromLTRB(16, 4, 16, 100),
                      sliver: state.recentTransactions.isEmpty
                          ? SliverToBoxAdapter(child: _EmptyTransactions())
                          : SliverList(
                              delegate: SliverChildBuilderDelegate((
                                context,
                                index,
                              ) {
                                final tx = state.recentTransactions[index];
                                return Padding(
                                  padding: const EdgeInsets.only(bottom: 8),
                                  child: TransactionCard(
                                    id: tx.id,
                                    clientName: tx.clientName,
                                    type: tx.type,
                                    amountPaisa: tx.amountPaisa,
                                    feePaisa: tx.feePaisa,
                                    profitPaisa: tx.profitPaisa,
                                    walletName: tx.walletName,
                                    createdAt: tx.createdAt,
                                    agentName: tx.agentName,
                                    onTap: () =>
                                        context.push('/transactions/${tx.id}'),
                                  ),
                                );
                              }, childCount: state.recentTransactions.length),
                            ),
                    ),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildShimmerRow() {
    return Row(
      children: [
        Expanded(child: _buildShimmerBlock(height: 90)),
        const SizedBox(width: 12),
        Expanded(child: _buildShimmerBlock(height: 90)),
      ],
    );
  }

  Widget _buildShimmerBlock({required double height}) {
    return Shimmer.fromColors(
      baseColor: AppColors.surface,
      highlightColor: AppColors.surfaceLight,
      child: Container(
        height: height,
        decoration: BoxDecoration(
          color: AppColors.surface,
          borderRadius: AppSpacing.cardBorderRadius,
        ),
      ),
    );
  }

  Widget _buildWalletShimmer() {
    return ListView.separated(
      scrollDirection: Axis.horizontal,
      padding: const EdgeInsets.symmetric(horizontal: 16),
      itemCount: 3,
      separatorBuilder: (_, __) => const SizedBox(width: 12),
      itemBuilder: (_, __) => const WalletCard(
        name: '',
        type: '',
        balancePaisa: 0,
        isLoading: true,
      ),
    );
  }
}

// ═════════════════════════════════════════════════════════════════
// HEADER
// ═════════════════════════════════════════════════════════════════

class _Header extends StatelessWidget {
  final String adminName;
  final int notificationCount;

  const _Header({required this.adminName, required this.notificationCount});

  @override
  Widget build(BuildContext context) {
    final today = DateFormat('EEEE, d MMMM yyyy').format(DateTime.now());

    return Padding(
      padding: const EdgeInsets.fromLTRB(16, 16, 16, 4),
      child: Row(
        children: [
          Container(
            width: 40,
            height: 40,
            decoration: BoxDecoration(
              gradient: const LinearGradient(
                colors: AppColors.primaryGradient,
                begin: Alignment.topLeft,
                end: Alignment.bottomRight,
              ),
              borderRadius: BorderRadius.circular(12),
            ),
            child: const Center(
              child: Text(
                'F',
                style: TextStyle(
                  fontSize: 20,
                  fontWeight: FontWeight.w800,
                  color: Colors.white,
                ),
              ),
            ),
          ),
          const SizedBox(width: 12),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  'FinFlow Pro',
                  style: AppTextStyles.h4.copyWith(
                    color: AppColors.textPrimary,
                  ),
                ),
                Text(
                  today,
                  style: AppTextStyles.bodyXs.copyWith(
                    color: AppColors.textTertiary,
                  ),
                ),
              ],
            ),
          ),
          Stack(
            children: [
              IconButton(
                onPressed: () => context.push('/notifications'),
                icon: const Icon(
                  Icons.notifications_outlined,
                  color: AppColors.textSecondary,
                  size: 24,
                ),
              ),
              if (notificationCount > 0)
                Positioned(
                  right: 8,
                  top: 8,
                  child: Container(
                    padding: const EdgeInsets.symmetric(
                      horizontal: 5,
                      vertical: 1,
                    ),
                    decoration: BoxDecoration(
                      color: AppColors.feeRed,
                      borderRadius: BorderRadius.circular(
                        AppSpacing.radiusFull,
                      ),
                    ),
                    child: Text(
                      notificationCount > 9
                          ? '9+'
                          : notificationCount.toString(),
                      style: AppTextStyles.bodyXs.copyWith(
                        color: AppColors.white,
                        fontSize: 9,
                        fontWeight: FontWeight.w700,
                      ),
                    ),
                  ),
                ),
            ],
          ),
          CircleAvatar(
            radius: 18,
            backgroundColor: AppColors.surfaceLight,
            child: Text(
              adminName.isNotEmpty ? adminName[0].toUpperCase() : 'A',
              style: AppTextStyles.labelBase.copyWith(color: AppColors.primary),
            ),
          ),
        ],
      ),
    );
  }
}

// ═════════════════════════════════════════════════════════════════
// SUMMARY CARDS
// ═════════════════════════════════════════════════════════════════

class _SummaryCards extends StatelessWidget {
  final int totalInPaisa;
  final int totalInCount;
  final int totalOutPaisa;
  final int totalOutCount;

  const _SummaryCards({
    required this.totalInPaisa,
    required this.totalInCount,
    required this.totalOutPaisa,
    required this.totalOutCount,
  });

  @override
  Widget build(BuildContext context) {
    return Row(
      children: [
        Expanded(
          child: _StatCard(
            title: 'Total IN',
            amount: CurrencyFormatter.formatBDTCompact(totalInPaisa),
            count: '$totalInCount txns',
            color: AppColors.profitGreen,
            icon: Icons.south_west_rounded,
          ),
        ),
        const SizedBox(width: 12),
        Expanded(
          child: _StatCard(
            title: 'Total OUT',
            amount: CurrencyFormatter.formatBDTCompact(totalOutPaisa),
            count: '$totalOutCount txns',
            color: AppColors.feeRed,
            icon: Icons.north_east_rounded,
          ),
        ),
      ],
    );
  }
}

class _StatCard extends StatelessWidget {
  final String title;
  final String amount;
  final String count;
  final Color color;
  final IconData icon;

  const _StatCard({
    required this.title,
    required this.amount,
    required this.count,
    required this.color,
    required this.icon,
  });

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(AppSpacing.md),
      decoration: BoxDecoration(
        color: AppColors.surface,
        borderRadius: AppSpacing.cardBorderRadius,
        border: Border.all(color: color.withValues(alpha: 0.2), width: 1),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Container(
                width: 28,
                height: 28,
                decoration: BoxDecoration(
                  color: color.withValues(alpha: 0.12),
                  borderRadius: BorderRadius.circular(8),
                ),
                child: Icon(icon, color: color, size: 16),
              ),
              const SizedBox(width: 8),
              Text(
                title,
                style: AppTextStyles.labelBase.copyWith(
                  color: AppColors.textSecondary,
                ),
              ),
            ],
          ),
          const SizedBox(height: 10),
          Text(amount, style: AppTextStyles.numberXl.copyWith(color: color)),
          const SizedBox(height: 2),
          Text(
            count,
            style: AppTextStyles.bodyXs.copyWith(color: AppColors.textTertiary),
          ),
        ],
      ),
    );
  }
}

// ═════════════════════════════════════════════════════════════════
// NET PROFIT CARD
// ═════════════════════════════════════════════════════════════════

class _NetProfitCard extends StatelessWidget {
  final int netProfitPaisa;
  final double changePercent;

  const _NetProfitCard({
    required this.netProfitPaisa,
    required this.changePercent,
  });

  @override
  Widget build(BuildContext context) {
    final isPositive = changePercent >= 0;

    return Container(
      padding: const EdgeInsets.all(AppSpacing.base),
      decoration: BoxDecoration(
        gradient: LinearGradient(
          colors: [
            AppColors.surface,
            AppColors.primary.withValues(alpha: 0.08),
          ],
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
        ),
        borderRadius: AppSpacing.cardBorderRadius,
        border: Border.all(
          color: AppColors.primary.withValues(alpha: 0.2),
          width: 1,
        ),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Text(
                'Net Profit — Today',
                style: AppTextStyles.labelBase.copyWith(
                  color: AppColors.textSecondary,
                ),
              ),
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                decoration: BoxDecoration(
                  color: (isPositive ? AppColors.profitGreen : AppColors.feeRed)
                      .withValues(alpha: 0.12),
                  borderRadius: BorderRadius.circular(AppSpacing.radiusFull),
                ),
                child: Row(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    Icon(
                      isPositive
                          ? Icons.trending_up_rounded
                          : Icons.trending_down_rounded,
                      color: isPositive
                          ? AppColors.profitGreen
                          : AppColors.feeRed,
                      size: 14,
                    ),
                    const SizedBox(width: 3),
                    Text(
                      '${isPositive ? '+' : ''}${changePercent.toStringAsFixed(1)}%',
                      style: AppTextStyles.numberXs.copyWith(
                        color: isPositive
                            ? AppColors.profitGreen
                            : AppColors.feeRed,
                      ),
                    ),
                  ],
                ),
              ),
            ],
          ),
          const SizedBox(height: 8),
          Text(
            CurrencyFormatter.formatBDT(netProfitPaisa),
            style: AppTextStyles.number3xl.copyWith(
              color: AppColors.textPrimary,
            ),
          ),
          const SizedBox(height: 2),
          Text(
            'vs. yesterday',
            style: AppTextStyles.bodyXs.copyWith(color: AppColors.textTertiary),
          ),
        ],
      ),
    );
  }
}

// ═════════════════════════════════════════════════════════════════
// COMMISSION WIDGET
// ═════════════════════════════════════════════════════════════════

class _CommissionWidget extends StatelessWidget {
  final int pendingPaisa;
  final int agentCount;

  const _CommissionWidget({
    required this.pendingPaisa,
    required this.agentCount,
  });

  @override
  Widget build(BuildContext context) {
    if (pendingPaisa == 0 && agentCount == 0) return const SizedBox.shrink();

    return Container(
      padding: const EdgeInsets.all(AppSpacing.md),
      decoration: BoxDecoration(
        color: AppColors.secondary.withValues(alpha: 0.08),
        borderRadius: AppSpacing.cardBorderRadius,
        border: Border.all(
          color: AppColors.secondary.withValues(alpha: 0.25),
          width: 1,
        ),
      ),
      child: Row(
        children: [
          Container(
            width: 40,
            height: 40,
            decoration: BoxDecoration(
              color: AppColors.secondary.withValues(alpha: 0.15),
              borderRadius: BorderRadius.circular(AppSpacing.radiusMd),
            ),
            child: const Icon(
              Icons.people_alt_rounded,
              color: AppColors.secondary,
              size: 20,
            ),
          ),
          const SizedBox(width: 12),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  'Pending Commission',
                  style: AppTextStyles.bodySmMedium.copyWith(
                    color: AppColors.textSecondary,
                  ),
                ),
                const SizedBox(height: 2),
                Text.rich(
                  TextSpan(
                    children: [
                      TextSpan(
                        text: CurrencyFormatter.formatBDT(pendingPaisa),
                        style: AppTextStyles.numberBase.copyWith(
                          color: AppColors.secondary,
                        ),
                      ),
                      TextSpan(
                        text: '  •  $agentCount agents',
                        style: AppTextStyles.bodyXs.copyWith(
                          color: AppColors.textTertiary,
                        ),
                      ),
                    ],
                  ),
                ),
              ],
            ),
          ),
          TextButton(
            onPressed: () => context.push('/agents'),
            style: TextButton.styleFrom(
              backgroundColor: AppColors.secondary,
              foregroundColor: AppColors.white,
              padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
              shape: RoundedRectangleBorder(
                borderRadius: BorderRadius.circular(AppSpacing.radiusButton),
              ),
            ),
            child: Text(
              'Settle',
              style: AppTextStyles.buttonSm.copyWith(color: AppColors.white),
            ),
          ),
        ],
      ),
    );
  }
}

// ═════════════════════════════════════════════════════════════════
// EMPTY STATE
// ═════════════════════════════════════════════════════════════════

class _EmptyTransactions extends StatelessWidget {
  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(32),
      child: Column(
        children: [
          Icon(
            Icons.receipt_long_outlined,
            size: 56,
            color: AppColors.textMuted,
          ),
          const SizedBox(height: 12),
          Text(
            'No transactions yet',
            style: AppTextStyles.bodyLgMedium.copyWith(
              color: AppColors.textSecondary,
            ),
          ),
          const SizedBox(height: 4),
          Text(
            'Tap + to record your first transaction',
            style: AppTextStyles.bodySm.copyWith(color: AppColors.textTertiary),
          ),
        ],
      ),
    );
  }
}
