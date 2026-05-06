import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../../../core/constants/app_colors.dart';
import '../../../../core/constants/app_spacing.dart';
import '../../../../core/constants/app_text_styles.dart';

class AgentClientListScreen extends ConsumerWidget {
  const AgentClientListScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    return Scaffold(
      backgroundColor: AppColors.darkBg,
      appBar: AppBar(
        title: Text(
          'My Clients',
          style: AppTextStyles.h4.copyWith(color: AppColors.textPrimary),
        ),
        actions: [
          IconButton(
            icon: const Icon(Icons.search_rounded),
            onPressed: () {
              // Search
            },
          ),
        ],
      ),
      body: RefreshIndicator(
        onRefresh: () async {},
        color: AppColors.primary,
        backgroundColor: AppColors.surface,
        child: ListView.builder(
          padding: const EdgeInsets.all(AppSpacing.md),
          itemCount: 8,
          itemBuilder: (context, index) {
            return _buildClientCard(
              context,
              id: 'CLI-${100 + index}',
              name: 'Client ${String.fromCharCode(65 + index)}',
              phone: '+880 171${index} 123456',
              totalTxns: 12 + index,
              totalVolume: '৳ ${(12 + index) * 5000}.00',
            );
          },
        ),
      ),
      floatingActionButton: FloatingActionButton(
        onPressed: () => context.push('/clients/add'),
        backgroundColor: AppColors.primary,
        child: const Icon(Icons.person_add_rounded, color: AppColors.white),
      ),
    );
  }

  Widget _buildClientCard(
    BuildContext context, {
    required String id,
    required String name,
    required String phone,
    required int totalTxns,
    required String totalVolume,
  }) {
    return Container(
      margin: const EdgeInsets.only(bottom: AppSpacing.md),
      decoration: BoxDecoration(
        color: AppColors.surface,
        borderRadius: BorderRadius.circular(AppSpacing.radiusMd),
        border: Border.all(color: AppColors.border, width: 0.5),
      ),
      child: InkWell(
        onTap: () {
          context.push('/clients/$id');
        },
        borderRadius: BorderRadius.circular(AppSpacing.radiusMd),
        child: Padding(
          padding: const EdgeInsets.all(AppSpacing.md),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(
                children: [
                  CircleAvatar(
                    backgroundColor: AppColors.primary.withValues(alpha: 0.1),
                    radius: 20,
                    child: Text(
                      name[0],
                      style: AppTextStyles.h5.copyWith(
                        color: AppColors.primary,
                      ),
                    ),
                  ),
                  const SizedBox(width: AppSpacing.md),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          name,
                          style: AppTextStyles.bodyMedium.copyWith(
                            color: AppColors.textPrimary,
                          ),
                        ),
                        Text(
                          phone,
                          style: AppTextStyles.bodySm.copyWith(
                            color: AppColors.textTertiary,
                          ),
                        ),
                      ],
                    ),
                  ),
                  const Icon(
                    Icons.chevron_right_rounded,
                    color: AppColors.textTertiary,
                  ),
                ],
              ),
              const Padding(
                padding: EdgeInsets.symmetric(vertical: AppSpacing.sm),
                child: Divider(height: 1),
              ),
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceAround,
                children: [
                  Column(
                    children: [
                      Text(
                        '$totalTxns',
                        style: AppTextStyles.bodySmMedium.copyWith(
                          color: AppColors.textPrimary,
                        ),
                      ),
                      Text(
                        'Total Txns',
                        style: AppTextStyles.bodyXs.copyWith(
                          color: AppColors.textTertiary,
                        ),
                      ),
                    ],
                  ),
                  Container(width: 1, height: 24, color: AppColors.border),
                  Column(
                    children: [
                      Text(
                        totalVolume,
                        style: AppTextStyles.bodySmMedium.copyWith(
                          color: AppColors.textPrimary,
                        ),
                      ),
                      Text(
                        'Total Volume',
                        style: AppTextStyles.bodyXs.copyWith(
                          color: AppColors.textTertiary,
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
}
