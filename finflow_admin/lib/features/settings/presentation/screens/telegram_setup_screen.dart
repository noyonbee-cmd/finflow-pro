/// Telegram Setup Screen

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../../core/constants/app_colors.dart';
import '../../../../core/constants/app_spacing.dart';
import '../../../../core/constants/app_text_styles.dart';
import '../../../../shared/widgets/app_button.dart';
import '../../../../shared/widgets/app_text_field.dart';

class TelegramSetupScreen extends ConsumerStatefulWidget {
  const TelegramSetupScreen({super.key});
  @override
  ConsumerState<TelegramSetupScreen> createState() =>
      _TelegramSetupScreenState();
}

class _TelegramSetupScreenState extends ConsumerState<TelegramSetupScreen> {
  final _tokenController = TextEditingController();
  final _chatIdController = TextEditingController();
  bool _isConnected = false;
  bool _isLoading = false;

  @override
  void dispose() {
    _tokenController.dispose();
    _chatIdController.dispose();
    super.dispose();
  }

  void _testConnection() async {
    setState(() => _isLoading = true);
    // Simulate API call
    await Future.delayed(const Duration(seconds: 2));
    setState(() {
      _isLoading = false;
      _isConnected = true;
    });
    if (mounted) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Telegram bot connected successfully!')),
      );
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppColors.darkBg,
      appBar: AppBar(
        title: Text(
          'Telegram Bot',
          style: AppTextStyles.h4.copyWith(color: AppColors.textPrimary),
        ),
        backgroundColor: AppColors.darkBg,
      ),
      body: ListView(
        padding: const EdgeInsets.all(AppSpacing.base),
        children: [
          // Info card
          Container(
            padding: const EdgeInsets.all(AppSpacing.base),
            decoration: BoxDecoration(
              color: AppColors.info.withValues(alpha: 0.08),
              borderRadius: AppSpacing.cardBorderRadius,
              border: Border.all(color: AppColors.info.withValues(alpha: 0.2)),
            ),
            child: Row(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                const Icon(
                  Icons.info_outline_rounded,
                  color: AppColors.info,
                  size: 20,
                ),
                const SizedBox(width: 12),
                Expanded(
                  child: Text(
                    'Connect a Telegram bot to receive real-time transaction notifications, daily summaries, and client receipts.',
                    style: AppTextStyles.bodySm.copyWith(
                      color: AppColors.textSecondary,
                    ),
                  ),
                ),
              ],
            ),
          ),
          const SizedBox(height: 24),

          // Setup steps
          Text(
            'SETUP',
            style: AppTextStyles.overline.copyWith(
              color: AppColors.textTertiary,
            ),
          ),
          const SizedBox(height: 12),

          _step('1', 'Create a bot via @BotFather on Telegram'),
          _step('2', 'Copy the bot token and paste below'),
          _step('3', 'Start the bot and send /start'),
          _step('4', 'Enter your Chat ID below'),

          const SizedBox(height: 20),

          AppTextField(
            controller: _tokenController,
            label: 'Bot Token',
            hint: '123456:ABC-DEF1234...',
            prefixIcon: Icons.key_rounded,
          ),
          const SizedBox(height: 16),

          AppTextField(
            controller: _chatIdController,
            label: 'Chat ID',
            hint: '123456789',
            prefixIcon: Icons.chat_rounded,
            keyboardType: TextInputType.number,
          ),
          const SizedBox(height: 24),

          // Status
          if (_isConnected)
            Container(
              padding: const EdgeInsets.all(12),
              decoration: BoxDecoration(
                color: AppColors.profitGreen.withValues(alpha: 0.1),
                borderRadius: AppSpacing.cardBorderRadius,
              ),
              child: Row(
                children: [
                  const Icon(
                    Icons.check_circle_rounded,
                    color: AppColors.profitGreen,
                    size: 20,
                  ),
                  const SizedBox(width: 8),
                  Text(
                    'Bot connected successfully',
                    style: AppTextStyles.bodyBaseMedium.copyWith(
                      color: AppColors.profitGreen,
                    ),
                  ),
                ],
              ),
            ),
          const SizedBox(height: 16),

          AppButton(
            label: _isConnected ? 'Update Connection' : 'Test Connection',
            isLoading: _isLoading,
            onPressed:
                _tokenController.text.isNotEmpty &&
                    _chatIdController.text.isNotEmpty
                ? _testConnection
                : null,
          ),

          const SizedBox(height: 16),

          // Notification toggles
          if (_isConnected) ...[
            const SizedBox(height: 8),
            Text(
              'NOTIFICATIONS',
              style: AppTextStyles.overline.copyWith(
                color: AppColors.textTertiary,
              ),
            ),
            const SizedBox(height: 12),
            _toggleTile(
              'Transaction alerts',
              'Get notified for every CR/DR',
              true,
            ),
            _toggleTile('Daily summary', 'Receive end-of-day report', true),
            _toggleTile(
              'Low balance alerts',
              'When any wallet drops below threshold',
              false,
            ),
            _toggleTile(
              'Agent activity',
              'When agents create transactions',
              false,
            ),
          ],
        ],
      ),
    );
  }

  Widget _step(String number, String text) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 8),
      child: Row(
        children: [
          Container(
            width: 24,
            height: 24,
            decoration: BoxDecoration(
              color: AppColors.primary.withValues(alpha: 0.15),
              shape: BoxShape.circle,
            ),
            child: Center(
              child: Text(
                number,
                style: AppTextStyles.bodyXs.copyWith(
                  color: AppColors.primary,
                  fontWeight: FontWeight.w700,
                ),
              ),
            ),
          ),
          const SizedBox(width: 10),
          Expanded(
            child: Text(
              text,
              style: AppTextStyles.bodySm.copyWith(
                color: AppColors.textSecondary,
              ),
            ),
          ),
        ],
      ),
    );
  }

  Widget _toggleTile(String title, String subtitle, bool initialValue) {
    return StatefulBuilder(
      builder: (_, setToggleState) {
        bool value = initialValue;
        return Padding(
          padding: const EdgeInsets.only(bottom: 6),
          child: Container(
            padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
            decoration: BoxDecoration(
              color: AppColors.surface,
              borderRadius: AppSpacing.cardBorderRadius,
            ),
            child: Row(
              children: [
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        title,
                        style: AppTextStyles.bodyBaseMedium.copyWith(
                          color: AppColors.textPrimary,
                        ),
                      ),
                      Text(
                        subtitle,
                        style: AppTextStyles.bodyXs.copyWith(
                          color: AppColors.textTertiary,
                        ),
                      ),
                    ],
                  ),
                ),
                Switch(
                  value: value,
                  onChanged: (v) => setToggleState(() => value = v),
                  activeThumbColor: AppColors.primary,
                ),
              ],
            ),
          ),
        );
      },
    );
  }
}
