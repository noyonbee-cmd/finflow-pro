/// Fee Calculator Widget — Live fee preview that updates
/// as user types amount. Shows base fee, extra fee, total fee,
/// commission, and net profit with color-coded values.

import 'dart:async';
import 'package:flutter/material.dart';

import '../../core/constants/app_colors.dart';
import '../../core/constants/app_spacing.dart';
import '../../core/constants/app_text_styles.dart';
import '../../core/utils/currency_formatter.dart';

class FeeCalculation {
  final int baseFee;
  final int extraFee;
  final int totalFee;
  final int commission;
  final int netProfit;
  final int clientGets;

  const FeeCalculation({
    this.baseFee = 0,
    this.extraFee = 0,
    this.totalFee = 0,
    this.commission = 0,
    this.netProfit = 0,
    this.clientGets = 0,
  });
}

class FeeCalculatorWidget extends StatefulWidget {
  final int amountPaisa;
  final double feePercent;
  final int extraFeePaisa;
  final bool isExtraFeeAdd; // true = add, false = deduct
  final double commissionPercent;
  final String transactionType; // 'CR' or 'DR'
  final String? feeSource; // e.g., "From: Client Profile"
  final ValueChanged<FeeCalculation>? onCalculated;

  const FeeCalculatorWidget({
    super.key,
    required this.amountPaisa,
    required this.feePercent,
    this.extraFeePaisa = 0,
    this.isExtraFeeAdd = true,
    this.commissionPercent = 0,
    this.transactionType = 'CR',
    this.feeSource,
    this.onCalculated,
  });

  @override
  State<FeeCalculatorWidget> createState() => _FeeCalculatorWidgetState();
}

class _FeeCalculatorWidgetState extends State<FeeCalculatorWidget> {
  Timer? _debounce;
  FeeCalculation _calc = const FeeCalculation();

  @override
  void initState() {
    super.initState();
    _calculate();
  }

  @override
  void didUpdateWidget(FeeCalculatorWidget old) {
    super.didUpdateWidget(old);
    _debounce?.cancel();
    _debounce = Timer(const Duration(milliseconds: 150), _calculate);
  }

  @override
  void dispose() {
    _debounce?.cancel();
    super.dispose();
  }

  void _calculate() {
    final amount = widget.amountPaisa;
    // baseFee = (amount / 1000) * feePercent → in paisa
    final baseFee = ((amount / 1000) * widget.feePercent).round();

    int adjustedFee = baseFee;
    final extra = widget.extraFeePaisa;
    if (widget.isExtraFeeAdd) {
      adjustedFee = baseFee + extra;
    } else {
      adjustedFee = baseFee - extra;
    }
    if (adjustedFee < 0) adjustedFee = 0;

    final commission = ((amount / 1000) * widget.commissionPercent).round();
    final netProfit = adjustedFee - commission;

    int clientGets;
    if (widget.transactionType == 'CR') {
      clientGets = amount - adjustedFee;
    } else {
      clientGets = amount; // DR: client gets the payout amount
    }

    final calc = FeeCalculation(
      baseFee: baseFee,
      extraFee: extra,
      totalFee: adjustedFee,
      commission: commission,
      netProfit: netProfit,
      clientGets: clientGets,
    );

    setState(() => _calc = calc);
    widget.onCalculated?.call(calc);
  }

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(AppSpacing.base),
      decoration: BoxDecoration(
        color: AppColors.darkBg,
        borderRadius: AppSpacing.cardBorderRadius,
        border: Border.all(color: AppColors.border, width: 0.5),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // Header
          Row(
            children: [
              const Icon(
                Icons.calculate_rounded,
                size: 16,
                color: AppColors.textTertiary,
              ),
              const SizedBox(width: 6),
              Text(
                'FEE PREVIEW',
                style: AppTextStyles.overline.copyWith(
                  color: AppColors.textTertiary,
                ),
              ),
              const Spacer(),
              if (widget.feeSource != null)
                Text(
                  widget.feeSource!,
                  style: AppTextStyles.bodyXs.copyWith(
                    color: AppColors.textMuted,
                    fontStyle: FontStyle.italic,
                  ),
                ),
            ],
          ),
          const SizedBox(height: AppSpacing.md),

          _row('Base Fee:', _calc.baseFee, AppColors.textSecondary),
          if (_calc.extraFee > 0) ...[
            const SizedBox(height: 6),
            _row(
              widget.isExtraFeeAdd ? 'Extra Fee: +' : 'Extra Fee: −',
              _calc.extraFee,
              AppColors.warningAmber,
            ),
          ],
          const Divider(color: AppColors.border, height: 16),
          _row('Total Fee:', _calc.totalFee, AppColors.feeRed, isBold: true),
          const SizedBox(height: 6),
          _row('Commission:', _calc.commission, AppColors.secondary),
          const SizedBox(height: 6),
          _row(
            'Net Profit:',
            _calc.netProfit,
            AppColors.profitGreen,
            isBold: true,
          ),
          const Divider(color: AppColors.border, height: 16),
          _row(
            widget.transactionType == 'CR' ? 'Client Gets:' : 'Client Pays:',
            widget.transactionType == 'CR'
                ? _calc.clientGets
                : widget.amountPaisa + _calc.totalFee,
            AppColors.textPrimary,
            isBold: true,
          ),
        ],
      ),
    );
  }

  Widget _row(String label, int paisa, Color color, {bool isBold = false}) {
    return Row(
      mainAxisAlignment: MainAxisAlignment.spaceBetween,
      children: [
        Text(
          label,
          style: AppTextStyles.bodySm.copyWith(color: AppColors.textSecondary),
        ),
        Text(
          CurrencyFormatter.formatBDT(paisa),
          style: (isBold ? AppTextStyles.numberSm : AppTextStyles.numberXs)
              .copyWith(color: color),
        ),
      ],
    );
  }
}
