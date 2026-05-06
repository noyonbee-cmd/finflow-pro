/// App Text Styles
///
/// Typography system using Inter (body) and Outfit (numbers/headers).
/// Defines the full type scale from xs (11px) to 5xl (48px).
/// Financial numbers use tabular numeric variant.

import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';

class AppTextStyles {
  AppTextStyles._();

  // ─── Body Font (Inter) ────────────────────────────────────────

  static TextStyle get _inter => GoogleFonts.inter();

  // Extra Small — 11px
  static TextStyle get bodyXs =>
      _inter.copyWith(fontSize: 11, fontWeight: FontWeight.w400, height: 1.45);

  // Small — 12px
  static TextStyle get bodySm =>
      _inter.copyWith(fontSize: 12, fontWeight: FontWeight.w400, height: 1.5);

  static TextStyle get bodySmMedium =>
      _inter.copyWith(fontSize: 12, fontWeight: FontWeight.w500, height: 1.5);

  static TextStyle get bodySmSemibold =>
      _inter.copyWith(fontSize: 12, fontWeight: FontWeight.w600, height: 1.5);

  // Base — 14px
  static TextStyle get bodyBase =>
      _inter.copyWith(fontSize: 14, fontWeight: FontWeight.w400, height: 1.5);

  static TextStyle get bodyBaseMedium =>
      _inter.copyWith(fontSize: 14, fontWeight: FontWeight.w500, height: 1.5);

  static TextStyle get bodyBaseSemibold =>
      _inter.copyWith(fontSize: 14, fontWeight: FontWeight.w600, height: 1.5);

  static TextStyle get bodyMedium => bodyBaseMedium;


  // Large — 16px
  static TextStyle get bodyLg =>
      _inter.copyWith(fontSize: 16, fontWeight: FontWeight.w400, height: 1.5);

  static TextStyle get bodyLgMedium =>
      _inter.copyWith(fontSize: 16, fontWeight: FontWeight.w500, height: 1.5);

  static TextStyle get bodyLgSemibold =>
      _inter.copyWith(fontSize: 16, fontWeight: FontWeight.w600, height: 1.5);

  // ─── Number / Heading Font (Outfit) ───────────────────────────

  static TextStyle get _outfit =>
      GoogleFonts.outfit(fontFeatures: [const FontFeature.tabularFigures()]);

  // Extra Small number — 12px
  static TextStyle get numberXs =>
      _outfit.copyWith(fontSize: 12, fontWeight: FontWeight.w600, height: 1.3);

  // Small number — 14px
  static TextStyle get numberSm =>
      _outfit.copyWith(fontSize: 14, fontWeight: FontWeight.w600, height: 1.3);

  // Base number — 16px
  static TextStyle get numberBase =>
      _outfit.copyWith(fontSize: 16, fontWeight: FontWeight.w700, height: 1.3);

  // Large number — 20px
  static TextStyle get numberLg =>
      _outfit.copyWith(fontSize: 20, fontWeight: FontWeight.w700, height: 1.2);

  // XL number — 24px
  static TextStyle get numberXl =>
      _outfit.copyWith(fontSize: 24, fontWeight: FontWeight.w700, height: 1.2);

  // 2XL number — 28px
  static TextStyle get number2xl =>
      _outfit.copyWith(fontSize: 28, fontWeight: FontWeight.w800, height: 1.15);

  // 3XL number — 32px
  static TextStyle get number3xl =>
      _outfit.copyWith(fontSize: 32, fontWeight: FontWeight.w800, height: 1.1);

  // 4XL number — 40px
  static TextStyle get number4xl =>
      _outfit.copyWith(fontSize: 40, fontWeight: FontWeight.w800, height: 1.1);

  // 5XL number — 48px
  static TextStyle get number5xl =>
      _outfit.copyWith(fontSize: 48, fontWeight: FontWeight.w800, height: 1.05);

  // ─── Headings (Outfit) ────────────────────────────────────────

  // H6 — 14px
  static TextStyle get h6 => _outfit.copyWith(
    fontSize: 14,
    fontWeight: FontWeight.w600,
    height: 1.4,
    letterSpacing: 0.2,
  );

  // H5 — 16px
  static TextStyle get h5 => _outfit.copyWith(
    fontSize: 16,
    fontWeight: FontWeight.w600,
    height: 1.4,
    letterSpacing: 0.15,
  );

  // H4 — 18px
  static TextStyle get h4 =>
      _outfit.copyWith(fontSize: 18, fontWeight: FontWeight.w700, height: 1.35);

  // H3 — 22px
  static TextStyle get h3 =>
      _outfit.copyWith(fontSize: 22, fontWeight: FontWeight.w700, height: 1.3);

  // H2 — 28px
  static TextStyle get h2 =>
      _outfit.copyWith(fontSize: 28, fontWeight: FontWeight.w700, height: 1.25);

  // H1 — 34px
  static TextStyle get h1 =>
      _outfit.copyWith(fontSize: 34, fontWeight: FontWeight.w800, height: 1.2);

  // ─── Labels / Buttons ─────────────────────────────────────────

  static TextStyle get labelSm => _inter.copyWith(
    fontSize: 11,
    fontWeight: FontWeight.w600,
    height: 1.2,
    letterSpacing: 0.5,
  );

  static TextStyle get labelBase => _inter.copyWith(
    fontSize: 13,
    fontWeight: FontWeight.w600,
    height: 1.2,
    letterSpacing: 0.3,
  );

  static TextStyle get labelLg => _inter.copyWith(
    fontSize: 15,
    fontWeight: FontWeight.w600,
    height: 1.2,
    letterSpacing: 0.2,
  );

  static TextStyle get buttonSm => _inter.copyWith(
    fontSize: 13,
    fontWeight: FontWeight.w600,
    height: 1.0,
    letterSpacing: 0.3,
  );

  static TextStyle get buttonBase => _inter.copyWith(
    fontSize: 15,
    fontWeight: FontWeight.w600,
    height: 1.0,
    letterSpacing: 0.2,
  );

  static TextStyle get buttonLg =>
      _inter.copyWith(fontSize: 17, fontWeight: FontWeight.w600, height: 1.0);

  // ─── Caption ──────────────────────────────────────────────────

  static TextStyle get caption => _inter.copyWith(
    fontSize: 11,
    fontWeight: FontWeight.w400,
    height: 1.4,
    letterSpacing: 0.2,
  );

  static TextStyle get overline => _inter.copyWith(
    fontSize: 10,
    fontWeight: FontWeight.w700,
    height: 1.3,
    letterSpacing: 1.0,
  );
}
