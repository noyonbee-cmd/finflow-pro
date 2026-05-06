/// Agent List Screen

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../../../core/constants/app_colors.dart';
import '../../../../core/constants/app_spacing.dart';
import '../../../../core/constants/app_text_styles.dart';
import '../../../../providers/agent_provider.dart';
import '../../../../shared/widgets/agent_earnings_card.dart';
import '../../../../shared/widgets/loading_skeleton.dart';
import '../../../../shared/widgets/empty_state.dart';
import '../../../../shared/widgets/error_state.dart';

class AgentListScreen extends ConsumerWidget {
  const AgentListScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final state = ref.watch(agentListProvider);

    return Scaffold(
      backgroundColor: AppColors.darkBg,
      appBar: AppBar(
        title: Text(
          'Agents',
          style: AppTextStyles.h4.copyWith(color: AppColors.textPrimary),
        ),
        backgroundColor: AppColors.darkBg,
      ),
      body: state.isLoading && state.agents.isEmpty
          ? Padding(
              padding: const EdgeInsets.all(16),
              child: LoadingSkeleton.transactionList(count: 4),
            )
          : state.errorMessage != null && state.agents.isEmpty
          ? ErrorState(
              message: state.errorMessage!,
              onRetry: () => ref.read(agentListProvider.notifier).refresh(),
            )
          : state.agents.isEmpty
          ? const EmptyState(
              icon: Icons.person_add_rounded,
              title: 'No agents yet',
              subtitle: 'Add your first agent to start',
            )
          : RefreshIndicator(
              onRefresh: () => ref.read(agentListProvider.notifier).refresh(),
              color: AppColors.primary,
              child: ListView.separated(
                padding: const EdgeInsets.all(AppSpacing.base),
                itemCount: state.agents.length,
                separatorBuilder: (_, __) => const SizedBox(height: 12),
                itemBuilder: (_, i) {
                  final agent = state.agents[i];
                  return AgentEarningsCard(
                    name: agent.name,
                    agentId: agent.id.length > 6
                        ? '#${agent.id.substring(agent.id.length - 6).toUpperCase()}'
                        : '#${agent.id}',
                    isActive: agent.isActive,
                    transactionCount: agent.totalTransactions,
                    totalCommissionPaisa: agent.totalCommissionPaisa,
                    settledPaisa: agent.settledCommissionPaisa,
                    pendingPaisa: agent.pendingCommissionPaisa,
                    onViewDetails: () => context.push('/agents/${agent.id}'),
                    onSettleCommission: () => ref
                        .read(agentListProvider.notifier)
                        .settleCommission(agent.id),
                  );
                },
              ),
            ),
    );
  }
}
