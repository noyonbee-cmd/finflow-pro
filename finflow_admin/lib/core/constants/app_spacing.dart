/// App Spacing Constants
///
/// 4px base unit spacing system.
/// Defines: margins, padding, card radius, button radius,
/// card shadows, and responsive breakpoints.

import 'package:flutter/material.dart';
import 'app_colors.dart';

class AppSpacing {
  AppSpacing._();

  // ─── Base Unit: 4px ──────────────────────────────────────────
  static const double unit = 4.0;

  // ─── Spacing Scale ───────────────────────────────────────────
  static const double xxs = 2.0; // 0.5x
  static const double xs = 4.0; // 1x
  static const double sm = 8.0; // 2x
  static const double md = 12.0; // 3x
  static const double base = 16.0; // 4x
  static const double lg = 20.0; // 5x
  static const double xl = 24.0; // 6x
  static const double xxl = 32.0; // 8x
  static const double xxxl = 40.0; // 10x
  static const double huge = 48.0; // 12x
  static const double massive = 64.0; // 16x

  // ─── Border Radius ───────────────────────────────────────────
  static const double radiusXs = 4.0;
  static const double radiusSm = 6.0;
  static const double radiusMd = 8.0;
  static const double radiusCard = 12.0;
  static const double radiusButton = 10.0;
  static const double radiusLg = 16.0;
  static const double radiusXl = 20.0;
  static const double radiusFull = 999.0;

  static const BorderRadius cardBorderRadius = BorderRadius.all(
    Radius.circular(radiusCard),
  );
  static const BorderRadius buttonBorderRadius = BorderRadius.all(
    Radius.circular(radiusButton),
  );

  // ─── Card Shadows ────────────────────────────────────────────
  static List<BoxShadow> get cardShadow => [
    BoxShadow(
      color: AppColors.black.withValues(alpha: 0.15),
      blurRadius: 12,
      offset: const Offset(0, 4),
    ),
    BoxShadow(
      color: AppColors.black.withValues(alpha: 0.05),
      blurRadius: 4,
      offset: const Offset(0, 1),
    ),
  ];

  static List<BoxShadow> get elevatedShadow => [
    BoxShadow(
      color: AppColors.black.withValues(alpha: 0.25),
      blurRadius: 24,
      offset: const Offset(0, 8),
    ),
    BoxShadow(
      color: AppColors.black.withValues(alpha: 0.08),
      blurRadius: 8,
      offset: const Offset(0, 2),
    ),
  ];

  // ─── Padding Presets ─────────────────────────────────────────
  static const EdgeInsets paddingCard = EdgeInsets.all(base);
  static const EdgeInsets paddingScreen = EdgeInsets.symmetric(
    horizontal: base,
    vertical: sm,
  );
  static const EdgeInsets paddingSection = EdgeInsets.symmetric(
    horizontal: base,
    vertical: xl,
  );
  static const EdgeInsets paddingBottomSheet = EdgeInsets.fromLTRB(
    base,
    xl,
    base,
    xxl,
  );

  // ─── Responsive Breakpoints ──────────────────────────────────
  static const double mobileBreakpoint = 600.0;
  static const double tabletBreakpoint = 900.0;
  static const double desktopBreakpoint = 1200.0;
}
