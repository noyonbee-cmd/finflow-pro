import 'dart:ui';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../../core/constants/app_colors.dart';
import '../../../../core/constants/app_spacing.dart';
import '../../../../core/constants/app_text_styles.dart';
import '../../../../core/utils/currency_formatter.dart';
import '../../../../features/wallets/data/wallet_models.dart';
import '../../../../features/wallets/data/wallet_repository.dart';
import '../../../../shared/widgets/loading_skeleton.dart';
import '../../../../shared/widgets/error_state.dart';
import '../../../../shared/widgets/app_button.dart';

class WalletDetailScreen extends ConsumerWidget {
  final String walletId;
  const WalletDetailScreen({super.key, required this.walletId});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final walletAsync = ref.watch(_walletDetailProvider(walletId));

    return Scaffold(
      backgroundColor: AppColors.darkBg,
      appBar: AppBar(
        backgroundColor: AppColors.darkBg,
        title: Text(
          'Wallet Details',
          style: AppTextStyles.h4.copyWith(color: AppColors.textPrimary),
        ),
        actions: [
          IconButton(
            icon: const Icon(
              Icons.settings_outlined,
              color: AppColors.textPrimary,
            ),
            onPressed: () {},
          ),
        ],
      ),
      body: walletAsync.when(
        loading: () => LoadingSkeleton.detailPage(),
        error: (e, _) => ErrorState(
          message: e.toString(),
          onRetry: () => ref.invalidate(_walletDetailProvider(walletId)),
        ),
        data: (wallet) {
          return ListView(
            padding: const EdgeInsets.all(AppSpacing.base),
            children: [
              // 1. Header Info
              _buildWalletHeader(wallet),
              const SizedBox(height: AppSpacing.lg),

              // 2. Balance Card (Glassmorphism)
              _buildBalanceCard(wallet),
              const SizedBox(height: AppSpacing.lg),

              // 3. Quick Actions
              _buildQuickActions(),
              const SizedBox(height: AppSpacing.xl),

              // 4. Transaction List
              Text(
                'Recent Activity',
                style: AppTextStyles.h4.copyWith(color: AppColors.textPrimary),
              ),
              const SizedBox(height: AppSpacing.sm),
              _buildTransactionList(),
            ],
          );
        },
      ),
    );
  }

  Widget _buildWalletHeader(Wallet wallet) {
    Color iconColor;
    switch (wallet.type.toLowerCase()) {
      case 'bkash':
        iconColor = Colors.pink;
        break;
      case 'nagad':
        iconColor = Colors.orange;
        break;
      default:
        iconColor = AppColors.primary;
    }

    return Row(
      children: [
        Container(
          width: 48,
          height: 48,
          decoration: BoxDecoration(
            color: iconColor.withValues(alpha: 0.15),
            borderRadius: BorderRadius.circular(12),
          ),
          child: Icon(Icons.account_balance_wallet, color: iconColor),
        ),
        const SizedBox(width: 16),
        Expanded(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                wallet.type.toUpperCase(),
                style: AppTextStyles.bodySm.copyWith(color: AppColors.textSecondary),
              ),
              Text(
                wallet.name,
                style: AppTextStyles.h3.copyWith(color: AppColors.textPrimary),
              ),
            ],
          ),
        ),
        Container(
          padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
          decoration: BoxDecoration(
            color: wallet.isActive
                ? AppColors.profitGreen.withValues(alpha: 0.1)
                : AppColors.feeRed.withValues(alpha: 0.1),
            borderRadius: BorderRadius.circular(AppSpacing.radiusFull),
          ),
          child: Text(
            wallet.isActive ? 'Active' : 'Inactive',
            style: AppTextStyles.labelSm.copyWith(
              color: wallet.isActive ? AppColors.profitGreen : AppColors.feeRed,
            ),
          ),
        ),
      ],
    );
  }

  Widget _buildBalanceCard(Wallet wallet) {
    return ClipRRect(
      borderRadius: BorderRadius.circular(12),
      child: BackdropFilter(
        filter: ImageFilter.blur(sigmaX: 12, sigmaY: 12),
        child: Container(
          padding: const EdgeInsets.all(24),
          decoration: BoxDecoration(
            color: AppColors.surface.withValues(alpha: 0.8),
            borderRadius: BorderRadius.circular(12),
            border: Border.all(
              color: AppColors.textPrimary.withValues(alpha: 0.1),
              width: 0.5,
            ),
          ),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                'Available Balance',
                style: AppTextStyles.bodyBase.copyWith(
                  color: AppColors.textSecondary,
                ),
              ),
              const SizedBox(height: 8),
              Text(
                CurrencyFormatter.formatBDT(wallet.balancePaisa),
                style: AppTextStyles.h1.copyWith(color: AppColors.textPrimary),
              ),
              const Padding(
                padding: EdgeInsets.symmetric(vertical: 20),
                child: Divider(color: AppColors.textMuted, height: 1),
              ),
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        'Today In',
                        style: AppTextStyles.bodySm.copyWith(
                          color: AppColors.textTertiary,
                        ),
                      ),
                      const SizedBox(height: 4),
                      Text(
                        CurrencyFormatter.formatBDT(4500000),
                        style: AppTextStyles.bodyBaseMedium.copyWith(
                          color: AppColors.profitGreen,
                        ),
                      ),
                    ],
                  ),
                  Column(
                    crossAxisAlignment: CrossAxisAlignment.end,
                    children: [
                      Text(
                        'Today Out',
                        style: AppTextStyles.bodySm.copyWith(
                          color: AppColors.textTertiary,
                        ),
                      ),
                      const SizedBox(height: 4),
                      Text(
                        CurrencyFormatter.formatBDT(1200000),
                        style: AppTextStyles.bodyBaseMedium.copyWith(
                          color: AppColors.feeRed,
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
    );
  }

  Widget _buildQuickActions() {
    return Row(
      children: [
        Expanded(
          child: AppButton(
            label: 'Add',
            icon: Icons.add,
            onPressed: () {},
            variant: AppButtonVariant.secondary,
          ),
        ),
        const SizedBox(width: 12),
        Expanded(
          child: AppButton(
            label: 'Withdraw',
            icon: Icons.arrow_upward,
            onPressed: () {},
            variant: AppButtonVariant.secondary,
          ),
        ),
        const SizedBox(width: 12),
        Expanded(
          child: AppButton(
            label: 'Sync',
            icon: Icons.sync,
            onPressed: () {},
            variant: AppButtonVariant.secondary,
          ),
        ),
      ],
    );
  }

  Widget _buildTransactionList() {
    return ListView.builder(
      shrinkWrap: true,
      physics: const NeverScrollableScrollPhysics(),
      itemCount: 5,
      itemBuilder: (context, index) {
        final isCredit = index % 2 == 0;
        return Container(
          margin: const EdgeInsets.only(bottom: 8),
          padding: const EdgeInsets.all(16),
          decoration: BoxDecoration(
            color: AppColors.surface,
            borderRadius: BorderRadius.circular(12),
            border: Border.all(
              color: AppColors.textPrimary.withValues(alpha: 0.05),
              width: 0.5,
            ),
          ),
          child: Row(
            children: [
              Container(
                padding: const EdgeInsets.all(10),
                decoration: BoxDecoration(
                  color: isCredit
                      ? AppColors.profitGreen.withValues(alpha: 0.1)
                      : AppColors.feeRed.withValues(alpha: 0.1),
                  shape: BoxShape.circle,
                ),
                child: Icon(
                  isCredit ? Icons.arrow_downward : Icons.arrow_upward,
                  color: isCredit ? AppColors.profitGreen : AppColors.feeRed,
                  size: 20,
                ),
              ),
              const SizedBox(width: 16),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      isCredit ? 'Client Payment' : 'Agent Settlement',
                      style: AppTextStyles.bodySmMedium.copyWith(
                        color: AppColors.textPrimary,
                      ),
                    ),
                    const SizedBox(height: 4),
                    Text(
                      'Today, 10:4${index} AM',
                      style: AppTextStyles.caption.copyWith(
                        color: AppColors.textTertiary,
                      ),
                    ),
                  ],
                ),
              ),
              Text(
                '${isCredit ? '+' : '-'}${CurrencyFormatter.formatBDT(150000)}',
                style: AppTextStyles.bodyBaseMedium.copyWith(
                  color: isCredit ? AppColors.profitGreen : AppColors.feeRed,
                ),
              ),
            ],
          ),
        );
      },
    );
  }
}

final _walletDetailProvider = FutureProvider.autoDispose.family<Wallet, String>(
  (ref, id) {
    return ref.watch(walletRepositoryProvider).getWallet(id);
  },
);
