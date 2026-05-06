import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../../../core/constants/app_colors.dart';
import '../../../../core/constants/app_spacing.dart';
import '../../../../core/constants/app_text_styles.dart';

class AgentTransactionScreen extends ConsumerWidget {
  const AgentTransactionScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    return Scaffold(
      backgroundColor: AppColors.darkBg,
      appBar: AppBar(
        title: Text(
          'Transactions',
          style: AppTextStyles.h4.copyWith(color: AppColors.textPrimary),
        ),
        actions: [
          IconButton(
            icon: const Icon(Icons.filter_list_rounded),
            onPressed: () {
              // Show filters
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
          itemCount: 10,
          itemBuilder: (context, index) {
            final isCashIn = index % 2 == 0;
            return _buildTransactionCard(
              context,
              id: 'TXN-${1000 + index}',
              type: isCashIn ? 'Cash In' : 'Cash Out',
              clientName: 'Client ${String.fromCharCode(65 + index)}',
              amount: isCashIn ? '5,000.00' : '2,500.00',
              commission: isCashIn ? '25.00' : '15.00',
              date: 'May 15, 2026',
              time: '10:${index}5 AM',
              isCashIn: isCashIn,
            );
          },
        ),
      ),
      floatingActionButton: FloatingActionButton(
        onPressed: () => context.push('/transactions/add'),
        backgroundColor: AppColors.primary,
        child: const Icon(Icons.add, color: AppColors.white),
      ),
    );
  }

  Widget _buildTransactionCard(
    BuildContext context, {
    required String id,
    required String type,
    required String clientName,
    required String amount,
    required String commission,
    required String date,
    required String time,
    required bool isCashIn,
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
          // Go to details, not yet implemented but route might exist
          context.push('/transactions/$id');
        },
        borderRadius: BorderRadius.circular(AppSpacing.radiusMd),
        child: Padding(
          padding: const EdgeInsets.all(AppSpacing.md),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  Row(
                    children: [
                      Container(
                        padding: const EdgeInsets.all(8),
                        decoration: BoxDecoration(
                          color:
                              (isCashIn ? AppColors.success : AppColors.error)
                                  .withValues(alpha: 0.1),
                          shape: BoxShape.circle,
                        ),
                        child: Icon(
                          isCashIn
                              ? Icons.arrow_downward_rounded
                              : Icons.arrow_upward_rounded,
                          color: isCashIn ? AppColors.success : AppColors.error,
                          size: 20,
                        ),
                      ),
                      const SizedBox(width: AppSpacing.sm),
                      Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(
                            '$type - $clientName',
                            style: AppTextStyles.bodySmMedium.copyWith(
                              color: AppColors.textPrimary,
                            ),
                          ),
                          Text(
                            id,
                            style: AppTextStyles.bodyXs.copyWith(
                              color: AppColors.textTertiary,
                            ),
                          ),
                        ],
                      ),
                    ],
                  ),
                  Column(
                    crossAxisAlignment: CrossAxisAlignment.end,
                    children: [
                      Text(
                        '৳ $amount',
                        style: AppTextStyles.bodySmMedium.copyWith(
                          color: AppColors.textPrimary,
                        ),
                      ),
                      Text(
                        '+ ৳ $commission',
                        style: AppTextStyles.bodyXs.copyWith(
                          color: const Color(0xFF7C3AED), // Purple
                          fontWeight: FontWeight.w600,
                        ),
                      ),
                    ],
                  ),
                ],
              ),
              const Padding(
                padding: EdgeInsets.symmetric(vertical: AppSpacing.sm),
                child: Divider(height: 1),
              ),
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  Row(
                    children: [
                      const Icon(
                        Icons.access_time_rounded,
                        color: AppColors.textTertiary,
                        size: 14,
                      ),
                      const SizedBox(width: 4),
                      Text(
                        '$date • $time',
                        style: AppTextStyles.bodyXs.copyWith(
                          color: AppColors.textTertiary,
                        ),
                      ),
                    ],
                  ),
                  Container(
                    padding: const EdgeInsets.symmetric(
                      horizontal: 8,
                      vertical: 2,
                    ),
                    decoration: BoxDecoration(
                      color: AppColors.success.withValues(alpha: 0.1),
                      borderRadius: BorderRadius.circular(4),
                    ),
                    child: Text(
                      'Completed',
                      style: AppTextStyles.bodyXs.copyWith(
                        color: AppColors.success,
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
}
