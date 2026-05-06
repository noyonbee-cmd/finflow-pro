/// Agent Card — Displays agent info with status indicator,
/// transaction count, commission summary (total/settled/pending),
/// and action buttons (view details, settle).

import 'package:flutter/material.dart';

import '../../core/constants/app_colors.dart';
import '../../core/constants/app_spacing.dart';
import '../../core/constants/app_text_styles.dart';
import '../../core/utils/currency_formatter.dart';
import '../../features/agents/data/agent_models.dart';

class AgentCard extends StatelessWidget {
  final Agent agent;
  final VoidCallback? onTap;
  final VoidCallback? onSettle;

  const AgentCard({super.key, required this.agent, this.onTap, this.onSettle});

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTap: onTap,
      child: Container(
        padding: const EdgeInsets.all(AppSpacing.base),
        decoration: BoxDecoration(
          color: AppColors.surface,
          borderRadius: AppSpacing.cardBorderRadius,
          border: Border.all(color: AppColors.border, width: 0.5),
        ),
        child: Column(
          children: [
            // Header row
            Row(
              children: [
                // Avatar
                Container(
                  width: 44,
                  height: 44,
                  decoration: BoxDecoration(
                    color: AppColors.secondary.withValues(alpha: 0.15),
                    borderRadius: BorderRadius.circular(AppSpacing.radiusMd),
                  ),
                  child: Center(
                    child: Text(
                      agent.name.isNotEmpty ? agent.name[0].toUpperCase() : 'A',
                      style: AppTextStyles.h4.copyWith(
                        color: AppColors.secondary,
                      ),
                    ),
                  ),
                ),
                const SizedBox(width: 12),
                // Name + status
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        agent.name,
                        style: AppTextStyles.bodyBaseSemibold.copyWith(
                          color: AppColors.textPrimary,
                        ),
                        maxLines: 1,
                        overflow: TextOverflow.ellipsis,
                      ),
                      const SizedBox(height: 2),
                      Text(
                        '${agent.totalTransactions} transactions • ${CurrencyFormatter.formatPercentage(agent.commissionPercent)} rate',
                        style: AppTextStyles.bodyXs.copyWith(
                          color: AppColors.textTertiary,
                        ),
                      ),
                    ],
                  ),
                ),
                // Status badge
                _StatusBadge(status: agent.status),
              ],
            ),
            const SizedBox(height: 12),
            // Commission row
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
              decoration: BoxDecoration(
                color: AppColors.darkBg,
                borderRadius: BorderRadius.circular(AppSpacing.radiusMd),
              ),
              child: Row(
                children: [
                  _CommissionStat(
                    label: 'Total',
                    amount: agent.totalCommissionPaisa,
                    color: AppColors.textSecondary,
                  ),
                  _divider(),
                  _CommissionStat(
                    label: 'Settled',
                    amount: agent.settledCommissionPaisa,
                    color: AppColors.profitGreen,
                  ),
                  _divider(),
                  _CommissionStat(
                    label: 'Pending',
                    amount: agent.pendingCommissionPaisa,
                    color: AppColors.warningAmber,
                  ),
                ],
              ),
            ),
            // Settle button
            if (agent.pendingCommissionPaisa > 0) ...[
              const SizedBox(height: 10),
              SizedBox(
                width: double.infinity,
                child: TextButton(
                  onPressed: onSettle,
                  style: TextButton.styleFrom(
                    backgroundColor: AppColors.secondary.withValues(alpha: 0.1),
                    foregroundColor: AppColors.secondary,
                    shape: RoundedRectangleBorder(
                      borderRadius: AppSpacing.buttonBorderRadius,
                    ),
                    padding: const EdgeInsets.symmetric(vertical: 8),
                  ),
                  child: Text(
                    'Settle ${CurrencyFormatter.formatBDT(agent.pendingCommissionPaisa)}',
                    style: AppTextStyles.buttonSm.copyWith(
                      color: AppColors.secondary,
                    ),
                  ),
                ),
              ),
            ],
          ],
        ),
      ),
    );
  }

  Widget _divider() {
    return Container(
      width: 1,
      height: 28,
      margin: const EdgeInsets.symmetric(horizontal: 10),
      color: AppColors.border,
    );
  }
}

class _StatusBadge extends StatelessWidget {
  final String status;
  const _StatusBadge({required this.status});

  @override
  Widget build(BuildContext context) {
    final Color bg;
    final Color fg;
    switch (status) {
      case 'ACTIVE':
        bg = AppColors.profitGreen.withValues(alpha: 0.12);
        fg = AppColors.profitGreen;
        break;
      case 'SUSPENDED':
        bg = AppColors.feeRed.withValues(alpha: 0.12);
        fg = AppColors.feeRed;
        break;
      default:
        bg = AppColors.warningAmber.withValues(alpha: 0.12);
        fg = AppColors.warningAmber;
    }
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
      decoration: BoxDecoration(
        color: bg,
        borderRadius: BorderRadius.circular(AppSpacing.radiusFull),
      ),
      child: Text(
        status,
        style: AppTextStyles.labelSm.copyWith(color: fg, fontSize: 10),
      ),
    );
  }
}

class _CommissionStat extends StatelessWidget {
  final String label;
  final int amount;
  final Color color;
  const _CommissionStat({
    required this.label,
    required this.amount,
    required this.color,
  });

  @override
  Widget build(BuildContext context) {
    return Expanded(
      child: Column(
        children: [
          Text(
            label,
            style: AppTextStyles.bodyXs.copyWith(color: AppColors.textTertiary),
          ),
          const SizedBox(height: 2),
          Text(
            CurrencyFormatter.formatBDTCompact(amount),
            style: AppTextStyles.numberSm.copyWith(color: color),
          ),
        ],
      ),
    );
  }
}
