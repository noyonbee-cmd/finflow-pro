import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../../../core/constants/app_colors.dart';
import '../../../../core/constants/app_spacing.dart';
import '../../../../core/constants/app_text_styles.dart';

class AgentSettingsScreen extends ConsumerStatefulWidget {
  const AgentSettingsScreen({super.key});

  @override
  ConsumerState<AgentSettingsScreen> createState() =>
      _AgentSettingsScreenState();
}

class _AgentSettingsScreenState extends ConsumerState<AgentSettingsScreen> {
  bool _biometricEnabled = true;
  bool _telegramNotifications = true;

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppColors.darkBg,
      appBar: AppBar(
        title: Text(
          'Settings',
          style: AppTextStyles.h4.copyWith(color: AppColors.textPrimary),
        ),
      ),
      body: ListView(
        padding: const EdgeInsets.all(AppSpacing.md),
        children: [
          _buildProfileSection(),
          const SizedBox(height: AppSpacing.xl),
          _buildTelegramSetup(),
          const SizedBox(height: AppSpacing.xl),
          _buildSecuritySection(),
          const SizedBox(height: AppSpacing.xxl),
          _buildLogoutButton(),
          const SizedBox(height: AppSpacing.xl),
        ],
      ),
    );
  }

  Widget _buildProfileSection() {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          'Profile',
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
            children: [
              ListTile(
                leading: const Icon(
                  Icons.person_rounded,
                  color: AppColors.primary,
                ),
                title: Text(
                  'Name',
                  style: AppTextStyles.bodySm.copyWith(
                    color: AppColors.textTertiary,
                  ),
                ),
                subtitle: Text(
                  'John Doe (Agent)',
                  style: AppTextStyles.bodyMedium.copyWith(
                    color: AppColors.textPrimary,
                  ),
                ),
              ),
              const Divider(height: 1),
              ListTile(
                leading: const Icon(
                  Icons.phone_rounded,
                  color: AppColors.primary,
                ),
                title: Text(
                  'Phone Number',
                  style: AppTextStyles.bodySm.copyWith(
                    color: AppColors.textTertiary,
                  ),
                ),
                subtitle: Text(
                  '+880 1712-345678',
                  style: AppTextStyles.bodyMedium.copyWith(
                    color: AppColors.textPrimary,
                  ),
                ),
              ),
              const Divider(height: 1),
              ListTile(
                leading: const Icon(
                  Icons.percent_rounded,
                  color: const Color(0xFF7C3AED),
                ),
                title: Text(
                  'Commission Rate',
                  style: AppTextStyles.bodySm.copyWith(
                    color: AppColors.textTertiary,
                  ),
                ),
                subtitle: Text(
                  '0.50% per transaction',
                  style: AppTextStyles.bodyMedium.copyWith(
                    color: const Color(0xFF7C3AED),
                  ),
                ),
              ),
            ],
          ),
        ),
      ],
    );
  }

  Widget _buildTelegramSetup() {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          'Telegram Notifications',
          style: AppTextStyles.h5.copyWith(color: AppColors.textPrimary),
        ),
        const SizedBox(height: AppSpacing.sm),
        Container(
          padding: const EdgeInsets.all(AppSpacing.md),
          decoration: BoxDecoration(
            color: AppColors.surface,
            borderRadius: BorderRadius.circular(AppSpacing.radiusMd),
            border: Border.all(color: AppColors.border, width: 0.5),
          ),
          child: Column(
            children: [
              Row(
                children: [
                  const Icon(
                    Icons.telegram_rounded,
                    color: Colors.blue,
                    size: 28,
                  ),
                  const SizedBox(width: AppSpacing.sm),
                  Expanded(
                    child: Text(
                      'Personal Bot Setup',
                      style: AppTextStyles.bodyMedium.copyWith(
                        color: AppColors.textPrimary,
                      ),
                    ),
                  ),
                ],
              ),
              const SizedBox(height: AppSpacing.md),
              const TextField(
                decoration: InputDecoration(
                  labelText: 'Bot Token',
                  hintText: '123456:ABC-DEF1234ghIkl-zyx57W2v1u123ew11',
                  prefixIcon: Icon(Icons.token_rounded),
                ),
              ),
              const SizedBox(height: AppSpacing.sm),
              const TextField(
                decoration: InputDecoration(
                  labelText: 'Personal Chat ID',
                  hintText: '123456789',
                  prefixIcon: Icon(Icons.chat_rounded),
                ),
              ),
              const SizedBox(height: AppSpacing.md),
              SwitchListTile(
                contentPadding: EdgeInsets.zero,
                title: Text(
                  'Transaction Alerts',
                  style: AppTextStyles.bodyMedium.copyWith(
                    color: AppColors.textPrimary,
                  ),
                ),
                subtitle: Text(
                  'Receive alerts for your transactions',
                  style: AppTextStyles.bodySm.copyWith(
                    color: AppColors.textTertiary,
                  ),
                ),
                value: _telegramNotifications,
                onChanged: (val) =>
                    setState(() => _telegramNotifications = val),
                activeThumbColor: AppColors.primary,
              ),
              const SizedBox(height: AppSpacing.md),
              SizedBox(
                width: double.infinity,
                child: OutlinedButton(
                  onPressed: () {
                    ScaffoldMessenger.of(context).showSnackBar(
                      const SnackBar(
                        content: Text('Test message sent to Telegram'),
                      ),
                    );
                  },
                  child: const Text('Test Connection'),
                ),
              ),
            ],
          ),
        ),
      ],
    );
  }

  Widget _buildSecuritySection() {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          'Security',
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
            children: [
              ListTile(
                leading: const Icon(
                  Icons.lock_rounded,
                  color: AppColors.textSecondary,
                ),
                title: Text(
                  'Change Password',
                  style: AppTextStyles.bodyMedium.copyWith(
                    color: AppColors.textPrimary,
                  ),
                ),
                trailing: const Icon(
                  Icons.chevron_right_rounded,
                  color: AppColors.textTertiary,
                ),
                onTap: () {
                  // Navigate to change password
                },
              ),
              const Divider(height: 1),
              SwitchListTile(
                secondary: const Icon(
                  Icons.fingerprint_rounded,
                  color: AppColors.textSecondary,
                ),
                title: Text(
                  'Biometric Login',
                  style: AppTextStyles.bodyMedium.copyWith(
                    color: AppColors.textPrimary,
                  ),
                ),
                value: _biometricEnabled,
                onChanged: (val) => setState(() => _biometricEnabled = val),
                activeThumbColor: AppColors.primary,
              ),
            ],
          ),
        ),
      ],
    );
  }

  Widget _buildLogoutButton() {
    return SizedBox(
      width: double.infinity,
      child: TextButton.icon(
        onPressed: () {
          // Add logout logic here
          context.go('/login');
        },
        icon: const Icon(Icons.logout_rounded, color: AppColors.error),
        label: Text(
          'Log Out',
          style: AppTextStyles.bodyMedium.copyWith(
            color: AppColors.error,
            fontWeight: FontWeight.w600,
          ),
        ),
        style: TextButton.styleFrom(
          padding: const EdgeInsets.symmetric(vertical: 16),
          backgroundColor: AppColors.error.withValues(alpha: 0.1),
          shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(AppSpacing.radiusMd),
          ),
        ),
      ),
    );
  }
}
