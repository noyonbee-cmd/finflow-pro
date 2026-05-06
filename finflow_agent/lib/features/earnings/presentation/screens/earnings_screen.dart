import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:fl_chart/fl_chart.dart';
import 'package:go_router/go_router.dart';

import '../../../../core/constants/app_colors.dart';
import '../../../../core/constants/app_spacing.dart';
import '../../../../core/constants/app_text_styles.dart';

class EarningsScreen extends ConsumerStatefulWidget {
  const EarningsScreen({super.key});

  @override
  ConsumerState<EarningsScreen> createState() => _EarningsScreenState();
}

class _EarningsScreenState extends ConsumerState<EarningsScreen> {
  String _selectedMonth = 'May 2026'; // Mock selected month

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppColors.darkBg,
      appBar: AppBar(
        title: Text(
          'Earnings',
          style: AppTextStyles.h4.copyWith(color: AppColors.textPrimary),
        ),
        actions: [
          IconButton(
            icon: const Icon(Icons.calendar_month_outlined),
            onPressed: () {
              // Show month picker
            },
          ),
        ],
      ),
      body: RefreshIndicator(
        onRefresh: () async {},
        color: AppColors.primary,
        backgroundColor: AppColors.surface,
        child: ListView(
          padding: const EdgeInsets.all(AppSpacing.md),
          children: [
            _buildMonthSelector(),
            const SizedBox(height: AppSpacing.lg),
            _buildCommissionBreakdown(),
            const SizedBox(height: AppSpacing.lg),
            _buildWeeklyChart(),
            const SizedBox(height: AppSpacing.lg),
            _buildLedgerList(),
          ],
        ),
      ),
    );
  }

  Widget _buildMonthSelector() {
    return Container(
      padding: const EdgeInsets.symmetric(
        horizontal: AppSpacing.md,
        vertical: AppSpacing.sm,
      ),
      decoration: BoxDecoration(
        color: AppColors.surface,
        borderRadius: BorderRadius.circular(AppSpacing.radiusMd),
        border: Border.all(color: AppColors.border, width: 0.5),
      ),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
          IconButton(
            icon: const Icon(
              Icons.chevron_left_rounded,
              color: AppColors.textSecondary,
            ),
            onPressed: () {},
          ),
          Text(
            _selectedMonth,
            style: AppTextStyles.bodyMedium.copyWith(
              color: AppColors.textPrimary,
            ),
          ),
          IconButton(
            icon: const Icon(
              Icons.chevron_right_rounded,
              color: AppColors.textSecondary,
            ),
            onPressed: () {},
          ),
        ],
      ),
    );
  }

  Widget _buildCommissionBreakdown() {
    return Column(
      children: [
        Container(
          padding: const EdgeInsets.all(AppSpacing.md),
          decoration: BoxDecoration(
            color: AppColors.surface,
            borderRadius: BorderRadius.circular(AppSpacing.radiusLg),
            border: Border.all(color: AppColors.border, width: 0.5),
          ),
          child: Column(
            children: [
              Row(
                children: [
                  Expanded(
                    child: _buildStatItem(
                      'Total Earned',
                      '৳ 12,450',
                      const Color(0xFF7C3AED),
                    ),
                  ),
                  Container(width: 1, height: 40, color: AppColors.border),
                  Expanded(
                    child: _buildStatItem(
                      'Settled',
                      '৳ 8,000',
                      AppColors.success,
                    ),
                  ),
                ],
              ),
              const Divider(height: AppSpacing.xl),
              Row(
                children: [
                  Expanded(
                    child: _buildStatItem(
                      'Pending',
                      '৳ 4,450',
                      AppColors.warning,
                    ),
                  ),
                  Container(width: 1, height: 40, color: AppColors.border),
                  Expanded(
                    child: _buildStatItem(
                      'Txns (This Month)',
                      '142',
                      AppColors.textPrimary,
                    ),
                  ),
                ],
              ),
            ],
          ),
        ),
        const SizedBox(height: AppSpacing.md),
        SizedBox(
          width: double.infinity,
          child: ElevatedButton(
            onPressed: () => context.push('/earnings/request-payout'),
            style: ElevatedButton.styleFrom(
              backgroundColor: const Color(0xFF7C3AED),
              foregroundColor: AppColors.white,
              padding: const EdgeInsets.symmetric(vertical: 14),
              shape: RoundedRectangleBorder(
                borderRadius: BorderRadius.circular(AppSpacing.radiusMd),
              ),
              elevation: 0,
            ),
            child: const Text(
              'Request Payout',
              style: TextStyle(fontWeight: FontWeight.w600),
            ),
          ),
        ),
      ],
    );
  }

  Widget _buildStatItem(String label, String value, Color valueColor) {
    return Column(
      children: [
        Text(value, style: AppTextStyles.h4.copyWith(color: valueColor)),
        Text(
          label,
          style: AppTextStyles.bodyXs.copyWith(color: AppColors.textTertiary),
        ),
      ],
    );
  }

  Widget _buildWeeklyChart() {
    return Container(
      padding: const EdgeInsets.all(AppSpacing.md),
      decoration: BoxDecoration(
        color: AppColors.surface,
        borderRadius: BorderRadius.circular(AppSpacing.radiusLg),
        border: Border.all(color: AppColors.border, width: 0.5),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            'Weekly Commission',
            style: AppTextStyles.h5.copyWith(color: AppColors.textPrimary),
          ),
          const SizedBox(height: AppSpacing.lg),
          SizedBox(
            height: 200,
            child: BarChart(
              BarChartData(
                alignment: BarChartAlignment.spaceAround,
                maxY: 5000,
                barTouchData: BarTouchData(enabled: false),
                titlesData: FlTitlesData(
                  show: true,
                  bottomTitles: AxisTitles(
                    sideTitles: SideTitles(
                      showTitles: true,
                      getTitlesWidget: (value, meta) {
                        const titles = ['W1', 'W2', 'W3', 'W4'];
                        if (value.toInt() >= 0 &&
                            value.toInt() < titles.length) {
                          return Padding(
                            padding: const EdgeInsets.only(top: 8),
                            child: Text(
                              titles[value.toInt()],
                              style: AppTextStyles.bodyXs.copyWith(
                                color: AppColors.textTertiary,
                              ),
                            ),
                          );
                        }
                        return const SizedBox.shrink();
                      },
                    ),
                  ),
                  leftTitles: AxisTitles(
                    sideTitles: SideTitles(
                      showTitles: true,
                      reservedSize: 40,
                      getTitlesWidget: (value, meta) {
                        if (value == 0) return const SizedBox.shrink();
                        return Text(
                          '${(value / 1000).toInt()}k',
                          style: AppTextStyles.bodyXs.copyWith(
                            color: AppColors.textTertiary,
                          ),
                        );
                      },
                    ),
                  ),
                  rightTitles: const AxisTitles(
                    sideTitles: SideTitles(showTitles: false),
                  ),
                  topTitles: const AxisTitles(
                    sideTitles: SideTitles(showTitles: false),
                  ),
                ),
                gridData: FlGridData(
                  show: true,
                  drawVerticalLine: false,
                  getDrawingHorizontalLine: (value) =>
                      FlLine(color: AppColors.border, strokeWidth: 0.5),
                ),
                borderData: FlBorderData(show: false),
                barGroups: [
                  _buildBarGroup(0, 3200),
                  _buildBarGroup(1, 4100),
                  _buildBarGroup(2, 2800),
                  _buildBarGroup(3, 2350),
                ],
              ),
            ),
          ),
        ],
      ),
    );
  }

  BarChartGroupData _buildBarGroup(int x, double y) {
    return BarChartGroupData(
      x: x,
      barRods: [
        BarChartRodData(
          toY: y,
          color: const Color(0xFF7C3AED), // Purple
          width: 16,
          borderRadius: const BorderRadius.vertical(top: Radius.circular(4)),
        ),
      ],
    );
  }

  Widget _buildLedgerList() {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          'Commission Ledger',
          style: AppTextStyles.h5.copyWith(color: AppColors.textPrimary),
        ),
        const SizedBox(height: AppSpacing.sm),
        Container(
          decoration: BoxDecoration(
            color: AppColors.surface,
            borderRadius: BorderRadius.circular(AppSpacing.radiusMd),
            border: Border.all(color: AppColors.border, width: 0.5),
          ),
          child: Column(
            children: List.generate(4, (index) {
              final isSettled =
                  index % 2 == 1; // Mock alternating settled/earned
              return Column(
                children: [
                  ListTile(
                    leading: CircleAvatar(
                      backgroundColor:
                          (isSettled
                                  ? AppColors.success
                                  : const Color(0xFF7C3AED))
                              .withValues(alpha: 0.1),
                      child: Icon(
                        isSettled
                            ? Icons.check_circle_outline
                            : Icons.add_circle_outline,
                        color: isSettled
                            ? AppColors.success
                            : const Color(0xFF7C3AED),
                        size: 20,
                      ),
                    ),
                    title: Text(
                      isSettled ? 'Payout Settled' : 'Commission Earned',
                      style: AppTextStyles.bodySmMedium.copyWith(
                        color: AppColors.textPrimary,
                      ),
                    ),
                    subtitle: Text(
                      'May ${15 - index}, 2026',
                      style: AppTextStyles.bodyXs.copyWith(
                        color: AppColors.textTertiary,
                      ),
                    ),
                    trailing: Text(
                      isSettled ? '- ৳ 2,000' : '+ ৳ 25',
                      style: AppTextStyles.bodySmMedium.copyWith(
                        color: isSettled
                            ? AppColors.textPrimary
                            : const Color(0xFF7C3AED),
                      ),
                    ),
                  ),
                  if (index < 3) const Divider(height: 1),
                ],
              );
            }),
          ),
        ),
      ],
    );
  }
}
