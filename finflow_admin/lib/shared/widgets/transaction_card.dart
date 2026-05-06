/// Transaction Card — Shows transaction summary with type badge (CR/DR),
/// amount, fee, net, commission, profit breakdown.
/// Supports swipe actions (edit, cancel, copy, receipt).

import 'package:flutter/material.dart';
import 'package:shimmer/shimmer.dart';

import '../../core/constants/app_colors.dart';
import '../../core/constants/app_spacing.dart';
import '../../core/constants/app_text_styles.dart';
import '../../core/utils/currency_formatter.dart';

class TransactionCard extends StatelessWidget {
  final String id;
  final String clientName;
  final String type; // 'CR' or 'DR'
  final int amountPaisa;
  final int feePaisa;
  final int profitPaisa;
  final String walletName;
  final DateTime createdAt;
  final String? agentName;
  final VoidCallback? onTap;
  final bool isLoading;

  const TransactionCard({
    super.key,
    required this.id,
    required this.clientName,
    required this.type,
    required this.amountPaisa,
    required this.feePaisa,
    required this.profitPaisa,
    required this.walletName,
    required this.createdAt,
    this.agentName,
    this.onTap,
    this.isLoading = false,
  });

  bool get _isCR => type.toUpperCase() == 'CR';

  @override
  Widget build(BuildContext context) {
    if (isLoading) return _buildShimmer();

    return GestureDetector(
      onTap: onTap,
      child: Container(
        padding: const EdgeInsets.all(AppSpacing.md),
        decoration: BoxDecoration(
          color: AppColors.surface,
          borderRadius: AppSpacing.cardBorderRadius,
          border: Border.all(color: AppColors.border, width: 0.5),
        ),
        child: Row(
          children: [
            // Type Badge
            Container(
              width: 42,
              height: 42,
              decoration: BoxDecoration(
                color: (_isCR ? AppColors.profitGreen : AppColors.feeRed)
                    .withValues(alpha: 0.12),
                borderRadius: BorderRadius.circular(AppSpacing.radiusMd),
              ),
              child: Center(
                child: Text(
                  _isCR ? 'CR' : 'DR',
                  style: AppTextStyles.labelBase.copyWith(
                    color: _isCR ? AppColors.profitGreen : AppColors.feeRed,
                    fontWeight: FontWeight.w700,
                  ),
                ),
              ),
            ),
            const SizedBox(width: 12),

            // Client + Wallet
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    clientName,
                    style: AppTextStyles.bodyBaseMedium.copyWith(
                      color: AppColors.textPrimary,
                    ),
                    overflow: TextOverflow.ellipsis,
                  ),
                  const SizedBox(height: 2),
                  Text(
                    '$walletName${agentName != null ? ' • $agentName' : ''}',
                    style: AppTextStyles.bodyXs.copyWith(
                      color: AppColors.textTertiary,
                    ),
                    overflow: TextOverflow.ellipsis,
                  ),
                ],
              ),
            ),

            // Amount + Profit
            Column(
              crossAxisAlignment: CrossAxisAlignment.end,
              children: [
                Text(
                  CurrencyFormatter.formatBDT(amountPaisa),
                  style: AppTextStyles.numberSm.copyWith(
                    color: _isCR ? AppColors.profitGreen : AppColors.feeRed,
                  ),
                ),
                const SizedBox(height: 2),
                Text(
                  'Profit ${CurrencyFormatter.formatBDT(profitPaisa)}',
                  style: AppTextStyles.bodyXs.copyWith(
                    color: AppColors.profitGreen,
                  ),
                ),
              ],
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildShimmer() {
    return Shimmer.fromColors(
      baseColor: AppColors.surface,
      highlightColor: AppColors.surfaceLight,
      child: Container(
        height: 72,
        decoration: BoxDecoration(
          color: AppColors.surface,
          borderRadius: AppSpacing.cardBorderRadius,
        ),
      ),
    );
  }
}
