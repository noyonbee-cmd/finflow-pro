/// Split Payment Bottom Sheet — Shows payment source selection
/// with auto-suggested wallet combination, manual override,
/// amount distribution controls, and total validation.

import 'package:flutter/material.dart';

import '../../core/constants/app_colors.dart';
import '../../core/constants/app_spacing.dart';
import '../../core/constants/app_text_styles.dart';
import '../../core/utils/currency_formatter.dart';

class WalletAllocation {
  final String walletId;
  final String name;
  final String type;
  final int balancePaisa;
  int allocatedPaisa;

  WalletAllocation({
    required this.walletId,
    required this.name,
    required this.type,
    required this.balancePaisa,
    this.allocatedPaisa = 0,
  });
}

class SplitPaymentSheet extends StatefulWidget {
  final int totalRequiredPaisa;
  final List<WalletAllocation> wallets;
  final List<WalletAllocation>? suggestedSplit;
  final ValueChanged<List<WalletAllocation>> onConfirm;

  const SplitPaymentSheet({
    super.key,
    required this.totalRequiredPaisa,
    required this.wallets,
    this.suggestedSplit,
    required this.onConfirm,
  });

  static Future<List<WalletAllocation>?> show({
    required BuildContext context,
    required int totalRequiredPaisa,
    required List<WalletAllocation> wallets,
    List<WalletAllocation>? suggestedSplit,
  }) {
    return showModalBottomSheet<List<WalletAllocation>>(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (ctx) => SplitPaymentSheet(
        totalRequiredPaisa: totalRequiredPaisa,
        wallets: wallets,
        suggestedSplit: suggestedSplit,
        onConfirm: (allocations) => Navigator.of(ctx).pop(allocations),
      ),
    );
  }

  @override
  State<SplitPaymentSheet> createState() => _SplitPaymentSheetState();
}

class _SplitPaymentSheetState extends State<SplitPaymentSheet> {
  late List<WalletAllocation> _allocations;

  @override
  void initState() {
    super.initState();
    if (widget.suggestedSplit != null) {
      _allocations = widget.suggestedSplit!;
    } else {
      _allocations = widget.wallets.map((w) {
        return WalletAllocation(
          walletId: w.walletId,
          name: w.name,
          type: w.type,
          balancePaisa: w.balancePaisa,
          allocatedPaisa: 0,
        );
      }).toList();
    }
  }

  int get _totalAllocated =>
      _allocations.fold(0, (sum, w) => sum + w.allocatedPaisa);

  int get _remaining => widget.totalRequiredPaisa - _totalAllocated;

  bool get _isValid => _remaining == 0;

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

  @override
  Widget build(BuildContext context) {
    return Container(
      constraints: BoxConstraints(
        maxHeight: MediaQuery.of(context).size.height * 0.8,
      ),
      decoration: const BoxDecoration(
        color: AppColors.darkBg,
        borderRadius: BorderRadius.vertical(top: Radius.circular(20)),
      ),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          // Handle
          Center(
            child: Container(
              margin: const EdgeInsets.only(top: 12),
              width: 40,
              height: 4,
              decoration: BoxDecoration(
                color: AppColors.surfaceLight,
                borderRadius: BorderRadius.circular(2),
              ),
            ),
          ),
          Padding(
            padding: AppSpacing.paddingBottomSheet,
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                // Title
                Row(
                  children: [
                    const Icon(
                      Icons.account_balance_wallet_rounded,
                      color: AppColors.primary,
                      size: 20,
                    ),
                    const SizedBox(width: 8),
                    Text(
                      'Payment Source',
                      style: AppTextStyles.h5.copyWith(
                        color: AppColors.textPrimary,
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 4),
                Text(
                  'Total Required: ${CurrencyFormatter.formatBDT(widget.totalRequiredPaisa)}',
                  style: AppTextStyles.bodySm.copyWith(
                    color: AppColors.textSecondary,
                  ),
                ),
                const SizedBox(height: AppSpacing.base),

                // Wallet list
                ...List.generate(_allocations.length, (i) {
                  final w = _allocations[i];
                  final isSelected = w.allocatedPaisa > 0;
                  return Padding(
                    padding: const EdgeInsets.only(bottom: 8),
                    child: Container(
                      padding: const EdgeInsets.all(12),
                      decoration: BoxDecoration(
                        color: isSelected
                            ? _brandColor(w.type).withValues(alpha: 0.08)
                            : AppColors.surface,
                        borderRadius: AppSpacing.cardBorderRadius,
                        border: Border.all(
                          color: isSelected
                              ? _brandColor(w.type).withValues(alpha: 0.3)
                              : AppColors.border,
                        ),
                      ),
                      child: Column(
                        children: [
                          Row(
                            children: [
                              Checkbox(
                                value: isSelected,
                                onChanged: (val) {
                                  setState(() {
                                    if (val == true) {
                                      final canAllocate = w.balancePaisa.clamp(
                                        0,
                                        _remaining,
                                      );
                                      w.allocatedPaisa = canAllocate;
                                    } else {
                                      w.allocatedPaisa = 0;
                                    }
                                  });
                                },
                                activeColor: _brandColor(w.type),
                                side: const BorderSide(
                                  color: AppColors.textTertiary,
                                ),
                              ),
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
                                      'Available: ${CurrencyFormatter.formatBDT(w.balancePaisa)}',
                                      style: AppTextStyles.bodyXs.copyWith(
                                        color: AppColors.textTertiary,
                                      ),
                                    ),
                                  ],
                                ),
                              ),
                              if (isSelected)
                                Text(
                                  CurrencyFormatter.formatBDT(w.allocatedPaisa),
                                  style: AppTextStyles.numberSm.copyWith(
                                    color: _brandColor(w.type),
                                  ),
                                ),
                            ],
                          ),
                          if (isSelected) ...[
                            const SizedBox(height: 8),
                            SliderTheme(
                              data: SliderThemeData(
                                activeTrackColor: _brandColor(w.type),
                                inactiveTrackColor: _brandColor(
                                  w.type,
                                ).withValues(alpha: 0.2),
                                thumbColor: _brandColor(w.type),
                                overlayColor: _brandColor(
                                  w.type,
                                ).withValues(alpha: 0.1),
                                trackHeight: 4,
                              ),
                              child: Slider(
                                value: w.allocatedPaisa.toDouble(),
                                min: 0,
                                max: w.balancePaisa
                                    .clamp(0, w.allocatedPaisa + _remaining)
                                    .toDouble(),
                                onChanged: (val) {
                                  setState(() {
                                    w.allocatedPaisa = val.round();
                                  });
                                },
                              ),
                            ),
                          ],
                        ],
                      ),
                    ),
                  );
                }),

                const SizedBox(height: AppSpacing.md),

                // Summary
                Container(
                  padding: const EdgeInsets.all(12),
                  decoration: BoxDecoration(
                    color: AppColors.surface,
                    borderRadius: AppSpacing.cardBorderRadius,
                    border: Border.all(
                      color: _isValid
                          ? AppColors.profitGreen.withValues(alpha: 0.3)
                          : AppColors.warningAmber.withValues(alpha: 0.3),
                    ),
                  ),
                  child: Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      Text(
                        'Total:',
                        style: AppTextStyles.bodyBaseSemibold.copyWith(
                          color: AppColors.textPrimary,
                        ),
                      ),
                      Column(
                        crossAxisAlignment: CrossAxisAlignment.end,
                        children: [
                          Text(
                            CurrencyFormatter.formatBDT(_totalAllocated),
                            style: AppTextStyles.numberBase.copyWith(
                              color: _isValid
                                  ? AppColors.profitGreen
                                  : AppColors.warningAmber,
                            ),
                          ),
                          if (!_isValid)
                            Text(
                              'Remaining: ${CurrencyFormatter.formatBDT(_remaining)}',
                              style: AppTextStyles.bodyXs.copyWith(
                                color: AppColors.warningAmber,
                              ),
                            ),
                        ],
                      ),
                    ],
                  ),
                ),
                const SizedBox(height: AppSpacing.base),

                // Confirm button
                SizedBox(
                  width: double.infinity,
                  height: 48,
                  child: ElevatedButton(
                    onPressed: _isValid
                        ? () => widget.onConfirm(
                            _allocations
                                .where((w) => w.allocatedPaisa > 0)
                                .toList(),
                          )
                        : null,
                    style: ElevatedButton.styleFrom(
                      backgroundColor: AppColors.primary,
                      disabledBackgroundColor: AppColors.surfaceLight,
                      shape: RoundedRectangleBorder(
                        borderRadius: AppSpacing.buttonBorderRadius,
                      ),
                    ),
                    child: Text(
                      _isValid ? 'Confirm Split' : 'Allocate Full Amount',
                      style: AppTextStyles.buttonBase.copyWith(
                        color: _isValid ? AppColors.white : AppColors.textMuted,
                      ),
                    ),
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}
