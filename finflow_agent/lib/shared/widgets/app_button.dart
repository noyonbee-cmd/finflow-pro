/// App Button — Primary action button with gradient fill,
/// loading spinner, icon support, and disabled state.

import 'package:flutter/material.dart';

import '../../core/constants/app_colors.dart';
import '../../core/constants/app_spacing.dart';
import '../../core/constants/app_text_styles.dart';

enum AppButtonVariant { primary, secondary, outline, danger, ghost }

class AppButton extends StatelessWidget {
  final String label;
  final VoidCallback? onPressed;
  final bool isLoading;
  final IconData? icon;
  final AppButtonVariant variant;
  final bool fullWidth;
  final double? height;

  const AppButton({
    super.key,
    required this.label,
    this.onPressed,
    this.isLoading = false,
    this.icon,
    this.variant = AppButtonVariant.primary,
    this.fullWidth = true,
    this.height,
  });

  @override
  Widget build(BuildContext context) {
    final isDisabled = onPressed == null || isLoading;

    return SizedBox(
      width: fullWidth ? double.infinity : null,
      height: height ?? 52,
      child: AnimatedContainer(
        duration: const Duration(milliseconds: 200),
        decoration: BoxDecoration(
          gradient: _gradient(isDisabled),
          color: _bgColor(isDisabled),
          borderRadius: AppSpacing.buttonBorderRadius,
          border: _border(isDisabled),
          boxShadow: variant == AppButtonVariant.primary && !isDisabled
              ? [
                  BoxShadow(
                    color: AppColors.primary.withValues(alpha: 0.3),
                    blurRadius: 12,
                    offset: const Offset(0, 4),
                  ),
                ]
              : null,
        ),
        child: Material(
          color: Colors.transparent,
          child: InkWell(
            onTap: isDisabled ? null : onPressed,
            borderRadius: AppSpacing.buttonBorderRadius,
            splashColor: Colors.white.withValues(alpha: 0.1),
            child: Center(
              child: isLoading
                  ? SizedBox(
                      width: 22,
                      height: 22,
                      child: CircularProgressIndicator(
                        strokeWidth: 2.5,
                        valueColor: AlwaysStoppedAnimation<Color>(
                          _textColor(isDisabled),
                        ),
                      ),
                    )
                  : Row(
                      mainAxisSize: fullWidth
                          ? MainAxisSize.max
                          : MainAxisSize.min,
                      mainAxisAlignment: MainAxisAlignment.center,
                      children: [
                        if (icon != null) ...[
                          Icon(icon, size: 20, color: _textColor(isDisabled)),
                          const SizedBox(width: 8),
                        ],
                        Text(
                          label,
                          style: AppTextStyles.buttonBase.copyWith(
                            color: _textColor(isDisabled),
                          ),
                        ),
                      ],
                    ),
            ),
          ),
        ),
      ),
    );
  }

  LinearGradient? _gradient(bool isDisabled) {
    if (variant != AppButtonVariant.primary) return null;
    if (isDisabled) return null;
    return const LinearGradient(
      colors: AppColors.primaryGradient,
      begin: Alignment.centerLeft,
      end: Alignment.centerRight,
    );
  }

  Color? _bgColor(bool isDisabled) {
    if (variant == AppButtonVariant.primary) {
      return isDisabled ? AppColors.surfaceLight : null;
    }
    switch (variant) {
      case AppButtonVariant.secondary:
        return isDisabled ? AppColors.surfaceLight : AppColors.secondary;
      case AppButtonVariant.outline:
      case AppButtonVariant.ghost:
        return Colors.transparent;
      case AppButtonVariant.danger:
        return isDisabled ? AppColors.surfaceLight : AppColors.feeRed;
      default:
        return null;
    }
  }

  Border? _border(bool isDisabled) {
    if (variant == AppButtonVariant.outline) {
      return Border.all(
        color: isDisabled ? AppColors.border : AppColors.primary,
        width: 1.5,
      );
    }
    return null;
  }

  Color _textColor(bool isDisabled) {
    if (isDisabled) return AppColors.textMuted;
    switch (variant) {
      case AppButtonVariant.primary:
      case AppButtonVariant.secondary:
      case AppButtonVariant.danger:
        return AppColors.white;
      case AppButtonVariant.outline:
        return AppColors.primary;
      case AppButtonVariant.ghost:
        return AppColors.textPrimary;
    }
  }
}
