/// Loading Skeleton — Shimmer loading placeholder variants
/// for dashboard cards, list items, and full-page states.

import 'package:flutter/material.dart';
import 'package:shimmer/shimmer.dart';

import '../../core/constants/app_colors.dart';
import '../../core/constants/app_spacing.dart';

class LoadingSkeleton extends StatelessWidget {
  final Widget child;

  const LoadingSkeleton({super.key, required this.child});

  @override
  Widget build(BuildContext context) {
    return Shimmer.fromColors(
      baseColor: AppColors.surface,
      highlightColor: AppColors.surfaceLight,
      child: child,
    );
  }

  /// Dashboard summary cards skeleton
  static Widget dashboardCards() {
    return LoadingSkeleton(
      child: Column(
        children: [
          Row(
            children: [
              Expanded(child: _box(height: 100)),
              const SizedBox(width: 12),
              Expanded(child: _box(height: 100)),
            ],
          ),
          const SizedBox(height: 12),
          _box(height: 90),
        ],
      ),
    );
  }

  /// Horizontal wallet cards skeleton
  static Widget walletCards() {
    return LoadingSkeleton(
      child: SizedBox(
        height: 110,
        child: ListView.separated(
          scrollDirection: Axis.horizontal,
          padding: const EdgeInsets.symmetric(horizontal: AppSpacing.base),
          itemCount: 4,
          separatorBuilder: (_, __) => const SizedBox(width: 12),
          itemBuilder: (_, __) => _box(width: 160, height: 110),
        ),
      ),
    );
  }

  /// Transaction list skeleton
  static Widget transactionList({int count = 5}) {
    return LoadingSkeleton(
      child: Column(
        children: List.generate(
          count,
          (_) => Padding(
            padding: const EdgeInsets.only(bottom: 8),
            child: _box(height: 72),
          ),
        ),
      ),
    );
  }

  /// Single card skeleton
  static Widget card({double? height, double? width}) {
    return LoadingSkeleton(
      child: _box(height: height ?? 80, width: width),
    );
  }

  /// Detail page skeleton
  static Widget detailPage() {
    return LoadingSkeleton(
      child: Padding(
        padding: AppSpacing.paddingScreen,
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            _box(height: 140),
            const SizedBox(height: 16),
            _box(height: 20, width: 200),
            const SizedBox(height: 8),
            _box(height: 14, width: 140),
            const SizedBox(height: 24),
            _box(height: 80),
            const SizedBox(height: 12),
            _box(height: 80),
            const SizedBox(height: 12),
            _box(height: 80),
          ],
        ),
      ),
    );
  }

  static Widget _box({double? height, double? width}) {
    return Container(
      height: height,
      width: width,
      decoration: BoxDecoration(
        color: AppColors.surface,
        borderRadius: AppSpacing.cardBorderRadius,
      ),
    );
  }
}
