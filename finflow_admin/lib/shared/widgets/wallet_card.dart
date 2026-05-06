/// Wallet Card — Displays wallet balance with brand color accent,
/// available/locked breakdown, commission summary, and action buttons.
/// States: Normal, Low Balance (amber), Zero/Negative (red), Loading (shimmer).

import 'package:flutter/material.dart';
import 'package:shimmer/shimmer.dart';

import '../../core/constants/app_colors.dart';
import '../../core/constants/app_spacing.dart';
import '../../core/constants/app_text_styles.dart';
import '../../core/utils/currency_formatter.dart';

class WalletCard extends StatelessWidget {
  final String name;
  final String type; // bkash, nagad, bank, cash, rocket, upay
  final int balancePaisa;
  final int? lowThresholdPaisa;
  final bool isLoading;
  final VoidCallback? onTap;

  const WalletCard({
    super.key,
    required this.name,
    required this.type,
    required this.balancePaisa,
    this.lowThresholdPaisa,
    this.isLoading = false,
    this.onTap,
  });

  Color get _brandColor {
    switch (type.toLowerCase()) {
      case 'bkash':
        return AppColors.bkash;
      case 'nagad':
        return AppColors.nagad;
      case 'bank':
        return AppColors.bank;
      case 'cash':
        return AppColors.cash;
      case 'rocket':
        return AppColors.rocket;
      case 'upay':
        return AppColors.upay;
      default:
        return AppColors.primary;
    }
  }

  IconData get _icon {
    switch (type.toLowerCase()) {
      case 'bkash':
      case 'nagad':
      case 'rocket':
      case 'upay':
        return Icons.phone_android_rounded;
      case 'bank':
        return Icons.account_balance_rounded;
      case 'cash':
        return Icons.payments_rounded;
      default:
        return Icons.wallet_rounded;
    }
  }

  bool get _isLowBalance =>
      lowThresholdPaisa != null && balancePaisa < lowThresholdPaisa!;

  bool get _isNegative => balancePaisa < 0;

  @override
  Widget build(BuildContext context) {
    if (isLoading) return _buildShimmer();

    final borderColor = _isNegative
        ? AppColors.feeRed
        : (_isLowBalance
              ? AppColors.warningAmber
              : _brandColor.withValues(alpha: 0.3));

    return GestureDetector(
      onTap: onTap,
      child: Container(
        width: 160,
        padding: const EdgeInsets.all(AppSpacing.md),
        decoration: BoxDecoration(
          color: AppColors.surface,
          borderRadius: AppSpacing.cardBorderRadius,
          border: Border.all(color: borderColor, width: 1),
          boxShadow: AppSpacing.cardShadow,
        ),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          mainAxisSize: MainAxisSize.min,
          children: [
            // Icon + Name
            Row(
              children: [
                Container(
                  width: 32,
                  height: 32,
                  decoration: BoxDecoration(
                    color: _brandColor.withValues(alpha: 0.15),
                    borderRadius: BorderRadius.circular(AppSpacing.radiusMd),
                  ),
                  child: Icon(_icon, color: _brandColor, size: 18),
                ),
                const SizedBox(width: 8),
                Expanded(
                  child: Text(
                    name,
                    style: AppTextStyles.bodySmMedium.copyWith(
                      color: AppColors.textSecondary,
                    ),
                    overflow: TextOverflow.ellipsis,
                  ),
                ),
              ],
            ),
            const SizedBox(height: 12),

            // Balance
            Text(
              CurrencyFormatter.formatBDT(balancePaisa),
              style: AppTextStyles.numberLg.copyWith(
                color: _isNegative ? AppColors.feeRed : AppColors.textPrimary,
              ),
              maxLines: 1,
              overflow: TextOverflow.ellipsis,
            ),

            // Low balance warning
            if (_isLowBalance && !_isNegative) ...[
              const SizedBox(height: 6),
              Row(
                children: [
                  const Icon(
                    Icons.warning_amber_rounded,
                    color: AppColors.warningAmber,
                    size: 14,
                  ),
                  const SizedBox(width: 4),
                  Text(
                    'Low balance',
                    style: AppTextStyles.bodyXs.copyWith(
                      color: AppColors.warningAmber,
                      fontWeight: FontWeight.w600,
                    ),
                  ),
                ],
              ),
            ],
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
        width: 160,
        height: 110,
        decoration: BoxDecoration(
          color: AppColors.surface,
          borderRadius: AppSpacing.cardBorderRadius,
        ),
      ),
    );
  }
}
