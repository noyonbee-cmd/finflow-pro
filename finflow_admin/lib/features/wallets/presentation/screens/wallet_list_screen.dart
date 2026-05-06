/// Wallet List Screen

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../../../core/constants/app_colors.dart';
import '../../../../core/constants/app_spacing.dart';
import '../../../../core/constants/app_text_styles.dart';
import '../../../../core/utils/currency_formatter.dart';
import '../../../../providers/wallet_provider.dart';
import '../../../../shared/widgets/loading_skeleton.dart';
import '../../../../shared/widgets/empty_state.dart';
import '../../../../shared/widgets/error_state.dart';

class WalletListScreen extends ConsumerWidget {
  const WalletListScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final state = ref.watch(walletListProvider);
    final totalBalance = state.wallets.fold<int>(
      0,
      (sum, w) => sum + w.balancePaisa,
    );

    return Scaffold(
      backgroundColor: AppColors.darkBg,
      appBar: AppBar(
        title: Text(
          'Wallets',
          style: AppTextStyles.h4.copyWith(color: AppColors.textPrimary),
        ),
        backgroundColor: AppColors.darkBg,
      ),
      body: state.isLoading && state.wallets.isEmpty
          ? Padding(
              padding: const EdgeInsets.all(16),
              child: LoadingSkeleton.transactionList(count: 4),
            )
          : state.errorMessage != null && state.wallets.isEmpty
          ? ErrorState(
              message: state.errorMessage!,
              onRetry: () => ref.read(walletListProvider.notifier).refresh(),
            )
          : state.wallets.isEmpty
          ? const EmptyState(
              icon: Icons.account_balance_wallet_outlined,
              title: 'No wallets',
              subtitle: 'Set up your wallets in settings',
            )
          : RefreshIndicator(
              onRefresh: () => ref.read(walletListProvider.notifier).refresh(),
              color: AppColors.primary,
              child: ListView(
                padding: const EdgeInsets.all(AppSpacing.base),
                children: [
                  // Total balance card
                  Container(
                    padding: const EdgeInsets.all(AppSpacing.lg),
                    decoration: BoxDecoration(
                      gradient: const LinearGradient(
                        colors: AppColors.primaryGradient,
                        begin: Alignment.topLeft,
                        end: Alignment.bottomRight,
                      ),
                      borderRadius: AppSpacing.cardBorderRadius,
                    ),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          'Total Balance',
                          style: AppTextStyles.bodySm.copyWith(
                            color: AppColors.white.withValues(alpha: 0.7),
                          ),
                        ),
                        const SizedBox(height: 4),
                        Text(
                          CurrencyFormatter.formatBDT(totalBalance),
                          style: AppTextStyles.number3xl.copyWith(
                            color: AppColors.white,
                          ),
                        ),
                        const SizedBox(height: 4),
                        Text(
                          '${state.wallets.length} wallets',
                          style: AppTextStyles.bodyXs.copyWith(
                            color: AppColors.white.withValues(alpha: 0.6),
                          ),
                        ),
                      ],
                    ),
                  ),
                  const SizedBox(height: 16),
                  ...state.wallets.map(
                    (w) => Padding(
                      padding: const EdgeInsets.only(bottom: 12),
                      child: GestureDetector(
                        onTap: () => context.push('/wallets/${w.id}'),
                        child: Container(
                          padding: const EdgeInsets.all(AppSpacing.base),
                          decoration: BoxDecoration(
                            color: AppColors.surface,
                            borderRadius: AppSpacing.cardBorderRadius,
                            border: Border.all(
                              color: AppColors.border,
                              width: 0.5,
                            ),
                          ),
                          child: Row(
                            children: [
                              Container(
                                width: 40,
                                height: 40,
                                decoration: BoxDecoration(
                                  color: _brandColor(
                                    w.type,
                                  ).withValues(alpha: 0.15),
                                  borderRadius: BorderRadius.circular(
                                    AppSpacing.radiusMd,
                                  ),
                                ),
                                child: Icon(
                                  _icon(w.type),
                                  color: _brandColor(w.type),
                                  size: 20,
                                ),
                              ),
                              const SizedBox(width: 12),
                              Expanded(
                                child: Column(
                                  crossAxisAlignment: CrossAxisAlignment.start,
                                  children: [
                                    Text(
                                      w.name,
                                      style: AppTextStyles.bodyBaseMedium
                                          .copyWith(
                                            color: AppColors.textPrimary,
                                          ),
                                    ),
                                    Text(
                                      w.type.toUpperCase(),
                                      style: AppTextStyles.bodyXs.copyWith(
                                        color: AppColors.textTertiary,
                                      ),
                                    ),
                                  ],
                                ),
                              ),
                              Column(
                                crossAxisAlignment: CrossAxisAlignment.end,
                                children: [
                                  Text(
                                    CurrencyFormatter.formatBDT(w.balancePaisa),
                                    style: AppTextStyles.numberBase.copyWith(
                                      color: AppColors.textPrimary,
                                    ),
                                  ),
                                  if (w.isLowBalance)
                                    Row(
                                      mainAxisSize: MainAxisSize.min,
                                      children: [
                                        const Icon(
                                          Icons.warning_amber_rounded,
                                          color: AppColors.warningAmber,
                                          size: 12,
                                        ),
                                        const SizedBox(width: 4),
                                        Text(
                                          'Low',
                                          style: AppTextStyles.bodyXs.copyWith(
                                            color: AppColors.warningAmber,
                                          ),
                                        ),
                                      ],
                                    ),
                                ],
                              ),
                            ],
                          ),
                        ),
                      ),
                    ),
                  ),
                ],
              ),
            ),
    );
  }

  Color _brandColor(String type) {
    switch (type.toLowerCase()) {
      case 'bkash':
        return AppColors.bkash;
      case 'nagad':
        return AppColors.nagad;
      case 'bank':
        return AppColors.bank;
      case 'cash':
        return AppColors.cash;
      default:
        return AppColors.primary;
    }
  }

  IconData _icon(String type) {
    switch (type.toLowerCase()) {
      case 'bkash':
      case 'nagad':
        return Icons.phone_android_rounded;
      case 'bank':
        return Icons.account_balance_rounded;
      case 'cash':
        return Icons.payments_rounded;
      default:
        return Icons.wallet_rounded;
    }
  }
}
