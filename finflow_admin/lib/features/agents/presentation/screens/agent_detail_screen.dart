import 'dart:ui';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../../core/constants/app_colors.dart';
import '../../../../core/constants/app_spacing.dart';
import '../../../../core/constants/app_text_styles.dart';
import '../../../../core/utils/currency_formatter.dart';

import '../../../../features/agents/data/agent_models.dart';
import '../../../../features/agents/data/agent_repository.dart';
import '../../../../shared/widgets/loading_skeleton.dart';
import '../../../../shared/widgets/error_state.dart';
import '../../../../shared/widgets/app_button.dart';

class AgentDetailScreen extends ConsumerWidget {
  final String agentId;
  const AgentDetailScreen({super.key, required this.agentId});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final agentAsync = ref.watch(_agentDetailProvider(agentId));

    return Scaffold(
      backgroundColor: AppColors.darkBg,
      appBar: AppBar(
        backgroundColor: AppColors.darkBg,
        title: Text(
          'Agent Details',
          style: AppTextStyles.h4.copyWith(color: AppColors.textPrimary),
        ),
        actions: [
          PopupMenuButton<String>(
            icon: const Icon(Icons.more_vert, color: AppColors.textPrimary),
            color: AppColors.surface,
            onSelected: (value) {},
            itemBuilder: (context) => [
              const PopupMenuItem(
                value: 'edit',
                child: Text(
                  'Edit Profile',
                  style: TextStyle(color: AppColors.textPrimary),
                ),
              ),
              const PopupMenuItem(
                value: 'suspend',
                child: Text(
                  'Suspend Agent',
                  style: TextStyle(color: AppColors.feeRed),
                ),
              ),
            ],
          ),
        ],
      ),
      body: agentAsync.when(
        loading: () => LoadingSkeleton.detailPage(),
        error: (e, _) => ErrorState(
          message: e.toString(),
          onRetry: () => ref.invalidate(_agentDetailProvider(agentId)),
        ),
        data: (agent) {
          return Column(
            children: [
              Expanded(
                child: ListView(
                  padding: const EdgeInsets.all(AppSpacing.base),
                  children: [
                    // 2. Profile Card (Glassmorphism)
                    _buildProfileCard(agent),
                    const SizedBox(height: AppSpacing.lg),

                    // 3. Commission Summary
                    _buildCommissionSummary(agent),
                    const SizedBox(height: AppSpacing.lg),

                    // 4. Performance Stats Card
                    _buildPerformanceStats(agent),
                    const SizedBox(height: AppSpacing.lg),

                    // 5. Settlement History List
                    Text(
                      'Settlement History',
                      style: AppTextStyles.h4.copyWith(
                        color: AppColors.textPrimary,
                      ),
                    ),
                    const SizedBox(height: AppSpacing.sm),
                    _buildSettlementHistory(),
                  ],
                ),
              ),

              // 6. Settle Button (Bottom fixed)
              if (agent.pendingCommissionPaisa > 0)
                Container(
                  padding: const EdgeInsets.all(AppSpacing.base),
                  decoration: BoxDecoration(
                    color: AppColors.darkBg,
                    border: Border(
                      top: BorderSide(
                        color: AppColors.textPrimary.withValues(alpha: 0.1),
                        width: 0.5,
                      ),
                    ),
                  ),
                  child: AppButton(
                    label:
                        'Settle ${CurrencyFormatter.formatBDT(agent.pendingCommissionPaisa)} Pending',
                    variant: AppButtonVariant.secondary,
                    onPressed: () {},
                  ),
                ),
            ],
          );
        },
      ),
    );
  }

  Widget _buildProfileCard(Agent agent) {
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
            children: [
              CircleAvatar(
                radius: 44,
                backgroundColor: AppColors.secondary.withValues(alpha: 0.15),
                child: Text(
                  agent.name[0].toUpperCase(),
                  style: AppTextStyles.h1.copyWith(color: AppColors.secondary),
                ),
              ),
              const SizedBox(height: 16),
              Text(
                agent.name,
                style: AppTextStyles.h3.copyWith(color: AppColors.textPrimary),
              ),
              const SizedBox(height: 4),
              Text(
                agent.phone ?? 'No Phone',
                style: AppTextStyles.bodyBase.copyWith(
                  color: AppColors.textSecondary,
                ),
              ),
              const SizedBox(height: 16),
              Row(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  Container(
                    padding: const EdgeInsets.symmetric(
                      horizontal: 12,
                      vertical: 6,
                    ),
                    decoration: BoxDecoration(
                      color: agent.isActive
                          ? AppColors.profitGreen.withValues(alpha: 0.1)
                          : AppColors.feeRed.withValues(alpha: 0.1),
                      borderRadius: BorderRadius.circular(
                        AppSpacing.radiusFull,
                      ),
                    ),
                    child: Text(
                      agent.status,
                      style: AppTextStyles.labelSm.copyWith(
                        color: agent.isActive
                            ? AppColors.profitGreen
                            : AppColors.feeRed,
                      ),
                    ),
                  ),
                  const SizedBox(width: 8),
                  Container(
                    padding: const EdgeInsets.symmetric(
                      horizontal: 12,
                      vertical: 6,
                    ),
                    decoration: BoxDecoration(
                      color: AppColors.secondary.withValues(alpha: 0.1),
                      borderRadius: BorderRadius.circular(
                        AppSpacing.radiusFull,
                      ),
                    ),
                    child: Text(
                      'Rate: ${agent.commissionPercent}%',
                      style: AppTextStyles.labelSm.copyWith(
                        color: AppColors.secondary,
                      ),
                    ),
                  ),
                ],
              ),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildCommissionSummary(Agent agent) {
    return Container(
      padding: const EdgeInsets.all(20),
      decoration: BoxDecoration(
        color: AppColors.surface,
        borderRadius: BorderRadius.circular(12),
        border: Border.all(
          color: AppColors.textPrimary.withValues(alpha: 0.1),
          width: 0.5,
        ),
      ),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
          _buildStatCol(
            'Total',
            CurrencyFormatter.formatBDT(agent.totalCommissionPaisa),
            AppColors.textPrimary,
          ),
          Container(
            width: 1,
            height: 40,
            color: AppColors.textPrimary.withValues(alpha: 0.1),
          ),
          _buildStatCol(
            'Settled',
            CurrencyFormatter.formatBDT(agent.settledCommissionPaisa),
            AppColors.profitGreen,
          ),
          Container(
            width: 1,
            height: 40,
            color: AppColors.textPrimary.withValues(alpha: 0.1),
          ),
          _buildStatCol(
            'Pending',
            CurrencyFormatter.formatBDT(agent.pendingCommissionPaisa),
            AppColors.warningAmber,
          ),
        ],
      ),
    );
  }

  Widget _buildStatCol(String label, String value, Color valueColor) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.center,
      children: [
        Text(
          label,
          style: AppTextStyles.bodySm.copyWith(color: AppColors.textTertiary),
        ),
        const SizedBox(height: 8),
        Text(
          value,
          style: AppTextStyles.bodyBaseMedium.copyWith(color: valueColor),
        ),
      ],
    );
  }

  Widget _buildPerformanceStats(Agent agent) {
    return Container(
      padding: const EdgeInsets.all(20),
      decoration: BoxDecoration(
        color: AppColors.surface,
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
            'Performance Stats',
            style: AppTextStyles.h4.copyWith(color: AppColors.textPrimary),
          ),
          const SizedBox(height: 16),
          _row('Total transactions processed', '${agent.totalTransactions}'),
          _row('This month', '45 txns, ৳12,300 volume'),
          _row('Average per transaction', '৳360'),
        ],
      ),
    );
  }

  Widget _row(String label, String value) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 12),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
          Text(
            label,
            style: AppTextStyles.bodySm.copyWith(
              color: AppColors.textSecondary,
            ),
          ),
          Text(
            value,
            style: AppTextStyles.bodySmMedium.copyWith(
              color: AppColors.textPrimary,
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildSettlementHistory() {
    return ListView.builder(
      shrinkWrap: true,
      physics: const NeverScrollableScrollPhysics(),
      itemCount: 4,
      itemBuilder: (context, index) {
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
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    'May 0${5 - index}, 2026',
                    style: AppTextStyles.bodySmMedium.copyWith(
                      color: AppColors.textPrimary,
                    ),
                  ),
                  const SizedBox(height: 4),
                  Text(
                    'Paid via bKash',
                    style: AppTextStyles.caption.copyWith(
                      color: AppColors.textTertiary,
                    ),
                  ),
                ],
              ),
              Text(
                CurrencyFormatter.formatBDT(125000),
                style: AppTextStyles.bodyBaseMedium.copyWith(
                  color: AppColors.profitGreen,
                ),
              ),
            ],
          ),
        );
      },
    );
  }
}

final _agentDetailProvider = FutureProvider.autoDispose.family<Agent, String>((
  ref,
  id,
) {
  return ref.watch(agentRepositoryProvider).getAgent(id);
});
