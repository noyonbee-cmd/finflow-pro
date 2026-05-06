/// Agent Earnings Card — Shows agent info with status, transaction count,
/// commission breakdown (total/settled/pending), and action buttons.

import 'package:flutter/material.dart';

import '../../core/constants/app_colors.dart';
import '../../core/constants/app_spacing.dart';
import '../../core/constants/app_text_styles.dart';
import '../../core/utils/currency_formatter.dart';

class AgentEarningsCard extends StatelessWidget {
  final String name;
  final String agentId;
  final bool isActive;
  final int transactionCount;
  final int totalCommissionPaisa;
  final int settledPaisa;
  final int pendingPaisa;
  final VoidCallback? onViewDetails;
  final VoidCallback? onSettleCommission;

  const AgentEarningsCard({
    super.key,
    required this.name,
    required this.agentId,
    required this.isActive,
    required this.transactionCount,
    required this.totalCommissionPaisa,
    required this.settledPaisa,
    required this.pendingPaisa,
    this.onViewDetails,
    this.onSettleCommission,
  });

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(AppSpacing.base),
      decoration: BoxDecoration(
        color: AppColors.surface,
        borderRadius: AppSpacing.cardBorderRadius,
        border: Border.all(color: AppColors.border, width: 0.5),
        boxShadow: AppSpacing.cardShadow,
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // Header: Name + Status
          Row(
            children: [
              Container(
                width: 40,
                height: 40,
                decoration: BoxDecoration(
                  color: AppColors.secondary.withValues(alpha: 0.15),
                  borderRadius: BorderRadius.circular(AppSpacing.radiusMd),
                ),
                child: Center(
                  child: Text(
                    name.isNotEmpty ? name[0].toUpperCase() : '?',
                    style: AppTextStyles.h5.copyWith(
                      color: AppColors.secondary,
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
                      name,
                      style: AppTextStyles.bodyBaseMedium.copyWith(
                        color: AppColors.textPrimary,
                      ),
                      overflow: TextOverflow.ellipsis,
                    ),
                    Text(
                      'Agent ID: $agentId',
                      style: AppTextStyles.bodyXs.copyWith(
                        color: AppColors.textTertiary,
                      ),
                    ),
                  ],
                ),
              ),
              Container(
                padding: const EdgeInsets.symmetric(
                  horizontal: 10,
                  vertical: 4,
                ),
                decoration: BoxDecoration(
                  color: isActive
                      ? AppColors.profitGreen.withValues(alpha: 0.12)
                      : AppColors.feeRed.withValues(alpha: 0.12),
                  borderRadius: BorderRadius.circular(AppSpacing.radiusFull),
                ),
                child: Text(
                  isActive ? 'Active' : 'Inactive',
                  style: AppTextStyles.bodyXs.copyWith(
                    color: isActive ? AppColors.profitGreen : AppColors.feeRed,
                    fontWeight: FontWeight.w600,
                  ),
                ),
              ),
            ],
          ),
          const SizedBox(height: AppSpacing.base),
          const Divider(color: AppColors.border, height: 1),
          const SizedBox(height: AppSpacing.md),

          // Stats
          Text(
            'THIS MONTH',
            style: AppTextStyles.overline.copyWith(
              color: AppColors.textTertiary,
            ),
          ),
          const SizedBox(height: AppSpacing.sm),

          _statRow('Transactions', '$transactionCount', AppColors.textPrimary),
          const SizedBox(height: 4),
          _statRow(
            'Commission',
            CurrencyFormatter.formatBDT(totalCommissionPaisa),
            AppColors.secondary,
          ),
          const SizedBox(height: 4),
          _statRow(
            'Settled',
            CurrencyFormatter.formatBDT(settledPaisa),
            AppColors.profitGreen,
          ),
          const SizedBox(height: 4),
          _statRow(
            'Pending',
            CurrencyFormatter.formatBDT(pendingPaisa),
            AppColors.warningAmber,
          ),
          const SizedBox(height: AppSpacing.base),

          // Actions
          Row(
            children: [
              Expanded(
                child: OutlinedButton(
                  onPressed: onViewDetails,
                  style: OutlinedButton.styleFrom(
                    foregroundColor: AppColors.textSecondary,
                    side: const BorderSide(color: AppColors.border),
                    shape: RoundedRectangleBorder(
                      borderRadius: AppSpacing.buttonBorderRadius,
                    ),
                    padding: const EdgeInsets.symmetric(vertical: 10),
                  ),
                  child: Text(
                    'View Details',
                    style: AppTextStyles.buttonSm.copyWith(
                      color: AppColors.textSecondary,
                    ),
                  ),
                ),
              ),
              const SizedBox(width: 8),
              Expanded(
                child: ElevatedButton(
                  onPressed: pendingPaisa > 0 ? onSettleCommission : null,
                  style: ElevatedButton.styleFrom(
                    backgroundColor: AppColors.secondary,
                    disabledBackgroundColor: AppColors.surfaceLight,
                    foregroundColor: AppColors.white,
                    shape: RoundedRectangleBorder(
                      borderRadius: AppSpacing.buttonBorderRadius,
                    ),
                    padding: const EdgeInsets.symmetric(vertical: 10),
                  ),
                  child: Text(
                    'Settle',
                    style: AppTextStyles.buttonSm.copyWith(
                      color: AppColors.white,
                    ),
                  ),
                ),
              ),
            ],
          ),
        ],
      ),
    );
  }

  Widget _statRow(String label, String value, Color color) {
    return Row(
      mainAxisAlignment: MainAxisAlignment.spaceBetween,
      children: [
        Text(
          label,
          style: AppTextStyles.bodySm.copyWith(color: AppColors.textSecondary),
        ),
        Text(value, style: AppTextStyles.numberXs.copyWith(color: color)),
      ],
    );
  }
}
