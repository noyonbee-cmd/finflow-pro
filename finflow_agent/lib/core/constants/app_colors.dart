/// App Color Constants
///
/// Centralized color palette following the FinFlow Pro design system.
/// Includes: brand colors, semantic colors (profit/fee/warning),
/// neutral system, dark mode variants, and wallet brand colors.

import 'dart:ui';

class AppColors {
  AppColors._();

  // ─── Brand ────────────────────────────────────────────────────
  static const Color primary = Color(0xFF1A56DB);
  static const Color primaryLight = Color(0xFF3B82F6);
  static const Color primaryDark = Color(0xFF1E40AF);
  static const Color secondary = Color(0xFF7C3AED);
  static const Color secondaryLight = Color(0xFF8B5CF6);
  static const Color secondaryDark = Color(0xFF6D28D9);

  // ─── Semantic — Profit ────────────────────────────────────────
  static const Color profitGreen = Color(0xFF059669);
  static const Color profitGreenLight = Color(0xFF10B981);
  static const Color profitBg = Color(0xFFECFDF5);

  // ─── Semantic — Fee / Loss ────────────────────────────────────
  static const Color feeRed = Color(0xFFDC2626);
  static const Color feeRedLight = Color(0xFFEF4444);
  static const Color feeBg = Color(0xFFFEF2F2);

  // ─── Semantic — Warning ───────────────────────────────────────
  static const Color warningAmber = Color(0xFFD97706);
  static const Color warningAmberLight = Color(0xFFF59E0B);
  static const Color warningBg = Color(0xFFFFFBEB);

  // ─── Semantic — Info ──────────────────────────────────────────
  static const Color info = Color(0xFF0284C7);
  static const Color infoBg = Color(0xFFF0F9FF);

  // ─── Semantic Aliases ─────────────────────────────────────────
  static const Color success = profitGreen;
  static const Color warning = warningAmber;
  static const Color error = feeRed;

  // ─── Dark Mode ────────────────────────────────────────────────
  static const Color darkBg = Color(0xFF0F172A);
  static const Color surface = Color(0xFF1E293B);
  static const Color surfaceLight = Color(0xFF334155);
  static const Color surfaceLighter = Color(0xFF475569);

  // ─── Neutrals ─────────────────────────────────────────────────
  static const Color white = Color(0xFFFFFFFF);
  static const Color black = Color(0xFF000000);
  static const Color textPrimary = Color(0xFFF8FAFC);
  static const Color textSecondary = Color(0xFF94A3B8);
  static const Color textTertiary = Color(0xFF64748B);
  static const Color textMuted = Color(0xFF475569);
  static const Color border = Color(0xFF334155);
  static const Color borderLight = Color(0xFF1E293B);
  static const Color divider = Color(0xFF1E293B);
  static const Color scaffoldBg = Color(0xFF0F172A);

  // ─── Wallet Brand Colors ──────────────────────────────────────
  static const Color bkash = Color(0xFFE2136E);
  static const Color nagad = Color(0xFFFF6A00);
  static const Color bank = Color(0xFF1A56DB);
  static const Color cash = Color(0xFF059669);
  static const Color rocket = Color(0xFF8B2FC9);
  static const Color upay = Color(0xFF00A884);

  // ─── Gradient Presets ─────────────────────────────────────────
  static const List<Color> primaryGradient = [
    Color(0xFF1A56DB),
    Color(0xFF7C3AED),
  ];

  static const List<Color> profitGradient = [
    Color(0xFF059669),
    Color(0xFF10B981),
  ];

  static const List<Color> lossGradient = [
    Color(0xFFDC2626),
    Color(0xFFEF4444),
  ];

  static const List<Color> cardGradient = [
    Color(0xFF1E293B),
    Color(0xFF0F172A),
  ];
}
