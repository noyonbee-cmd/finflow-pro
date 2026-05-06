import 'dart:ui';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../../../core/constants/app_colors.dart';
import '../../../../core/constants/app_spacing.dart';
import '../../../../core/constants/app_text_styles.dart';
import '../../../../providers/auth_provider.dart';

class SettingsScreen extends ConsumerWidget {
  const SettingsScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final auth = ref.watch(authProvider);

    return Scaffold(
      backgroundColor: AppColors.darkBg,
      appBar: AppBar(
        title: Text(
          'Settings',
          style: AppTextStyles.h4.copyWith(color: AppColors.textPrimary),
        ),
        backgroundColor: AppColors.darkBg,
      ),
      body: ListView(
        padding: const EdgeInsets.all(AppSpacing.base),
        children: [
          // Profile card (Glassmorphism)
          ClipRRect(
            borderRadius: BorderRadius.circular(12),
            child: BackdropFilter(
              filter: ImageFilter.blur(sigmaX: 12, sigmaY: 12),
              child: Container(
                padding: const EdgeInsets.all(20),
                decoration: BoxDecoration(
                  color: AppColors.surface.withValues(alpha: 0.8),
                  borderRadius: BorderRadius.circular(12),
                  border: Border.all(
                    color: AppColors.textPrimary.withValues(alpha: 0.1),
                    width: 0.5,
                  ),
                ),
                child: Row(
                  children: [
                    CircleAvatar(
                      radius: 28,
                      backgroundColor: AppColors.primary.withValues(
                        alpha: 0.15,
                      ),
                      child: Text(
                        (auth.admin?.name ?? 'A')[0].toUpperCase(),
                        style: AppTextStyles.h4.copyWith(
                          color: AppColors.primary,
                        ),
                      ),
                    ),
                    const SizedBox(width: 16),
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(
                            auth.admin?.name ?? 'Admin User',
                            style: AppTextStyles.h5.copyWith(
                              color: AppColors.textPrimary,
                            ),
                          ),
                          Text(
                            auth.admin?.email ?? 'admin@finflow.com',
                            style: AppTextStyles.bodySm.copyWith(
                              color: AppColors.textSecondary,
                            ),
                          ),
                        ],
                      ),
                    ),
                  ],
                ),
              ),
            ),
          ),
          const SizedBox(height: 24),

          Text(
            'BUSINESS',
            style: AppTextStyles.overline.copyWith(
              color: AppColors.textTertiary,
            ),
          ),
          const SizedBox(height: 8),
          _settingsTile(
            context,
            Icons.business_rounded,
            'Business Profile',
            'Name, logo, and details',
            null,
          ),
          _settingsTile(
            context,
            Icons.percent_rounded,
            'Default Fee Rates',
            'Set default fee and commission rates',
            null,
          ),
          _settingsTile(
            context,
            Icons.notifications_rounded,
            'Notifications',
            'Manage notification preferences',
            null,
          ),

          const SizedBox(height: 20),
          Text(
            'INTEGRATIONS',
            style: AppTextStyles.overline.copyWith(
              color: AppColors.textTertiary,
            ),
          ),
          const SizedBox(height: 8),
          _settingsTile(
            context,
            Icons.telegram,
            'Telegram Bot',
            'Connect your Telegram bot',
            '/settings/telegram',
          ),
          _settingsTile(
            context,
            Icons.message_rounded,
            'SMS / WhatsApp',
            'Configure messaging channels',
            null,
          ),
          _settingsTile(
            context,
            Icons.description_rounded,
            'Message Templates',
            'Edit receipt and notification templates',
            null,
          ),

          const SizedBox(height: 20),
          Text(
            'SECURITY',
            style: AppTextStyles.overline.copyWith(
              color: AppColors.textTertiary,
            ),
          ),
          const SizedBox(height: 8),
          _settingsTile(
            context,
            Icons.lock_rounded,
            'App Lock',
            'PIN and biometric authentication',
            null,
          ),
          _settingsTile(
            context,
            Icons.backup_rounded,
            'Backup & Restore',
            'Data backup and recovery',
            null,
          ),

          const SizedBox(height: 20),
          Text(
            'ABOUT',
            style: AppTextStyles.overline.copyWith(
              color: AppColors.textTertiary,
            ),
          ),
          const SizedBox(height: 8),
          _settingsTile(
            context,
            Icons.info_outline_rounded,
            'About FinFlow Pro',
            'Version, licenses, and credits',
            null,
          ),

          const SizedBox(height: 24),

          // Logout
          SizedBox(
            width: double.infinity,
            height: 48,
            child: OutlinedButton.icon(
              onPressed: () {
                showDialog(
                  context: context,
                  builder: (ctx) => AlertDialog(
                    backgroundColor: AppColors.surface,
                    title: Text(
                      'Log Out',
                      style: AppTextStyles.h5.copyWith(
                        color: AppColors.textPrimary,
                      ),
                    ),
                    content: Text(
                      'Are you sure you want to log out?',
                      style: AppTextStyles.bodyBase.copyWith(
                        color: AppColors.textSecondary,
                      ),
                    ),
                    actions: [
                      TextButton(
                        onPressed: () => Navigator.pop(ctx),
                        child: Text(
                          'Cancel',
                          style: AppTextStyles.buttonSm.copyWith(
                            color: AppColors.textSecondary,
                          ),
                        ),
                      ),
                      TextButton(
                        onPressed: () {
                          Navigator.pop(ctx);
                          ref.read(authProvider.notifier).logout();
                        },
                        child: Text(
                          'Log Out',
                          style: AppTextStyles.buttonSm.copyWith(
                            color: AppColors.feeRed,
                          ),
                        ),
                      ),
                    ],
                  ),
                );
              },
              icon: const Icon(
                Icons.logout_rounded,
                size: 18,
                color: AppColors.feeRed,
              ),
              label: Text(
                'Log Out',
                style: AppTextStyles.buttonBase.copyWith(
                  color: AppColors.feeRed,
                ),
              ),
              style: OutlinedButton.styleFrom(
                side: const BorderSide(color: AppColors.feeRed),
                shape: RoundedRectangleBorder(
                  borderRadius: AppSpacing.buttonBorderRadius,
                ),
              ),
            ),
          ),
          const SizedBox(height: 32),
        ],
      ),
    );
  }

  Widget _settingsTile(
    BuildContext context,
    IconData icon,
    String title,
    String subtitle,
    String? route,
  ) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 6),
      child: ListTile(
        leading: Icon(icon, color: AppColors.primary, size: 22),
        title: Text(
          title,
          style: AppTextStyles.bodyBaseMedium.copyWith(
            color: AppColors.textPrimary,
          ),
        ),
        subtitle: Text(
          subtitle,
          style: AppTextStyles.bodyXs.copyWith(color: AppColors.textTertiary),
        ),
        trailing: const Icon(
          Icons.chevron_right_rounded,
          color: AppColors.textTertiary,
          size: 18,
        ),
        tileColor: AppColors.surface,
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(AppSpacing.radiusCard),
        ),
        onTap: route != null
            ? () => context.push(route)
            : () {
                ScaffoldMessenger.of(
                  context,
                ).showSnackBar(const SnackBar(content: Text('Coming soon')));
              },
      ),
    );
  }
}
