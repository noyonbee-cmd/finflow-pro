/// Currency Formatter
///
/// Formats BDT amounts with proper locale (bn_BD),
/// thousands separator, 2 decimal places, and ৳ symbol.
/// Handles: formatAmount, formatCompact, parseAmount.
///
/// All amounts are stored in paisa (integer) and displayed in BDT.
/// 1 BDT = 100 paisa.

import 'package:intl/intl.dart';

class CurrencyFormatter {
  CurrencyFormatter._();

  static final _bdtFormat = NumberFormat('#,##,##0.00', 'en_IN');
  static final _compactFormat = NumberFormat.compact(locale: 'en');

  /// Converts paisa → formatted BDT string.
  /// Example: 123450 → "৳ 1,234.50"
  static String formatBDT(int paisa) {
    final amount = paisa / 100.0;
    return '৳ ${_bdtFormat.format(amount)}';
  }

  /// Compact version for dashboard cards.
  /// Example: 1234500 → "৳ 12.3K"
  /// Example: 123450000 → "৳ 1.2M"
  static String formatBDTCompact(int paisa) {
    final amount = paisa / 100.0;
    if (amount.abs() < 1000) {
      return '৳ ${_bdtFormat.format(amount)}';
    }
    return '৳ ${_compactFormat.format(amount)}';
  }

  /// Formats paisa as plain number without currency symbol.
  /// Example: 123450 → "1,234.50"
  static String formatPlain(int paisa) {
    final amount = paisa / 100.0;
    return _bdtFormat.format(amount);
  }

  /// Parses user-input BDT string → paisa (integer).
  /// Strips ৳, commas, spaces. Handles "1234.5" → 123450.
  /// Returns 0 for invalid input.
  static int parseBDT(String input) {
    if (input.isEmpty) return 0;

    final cleaned = input
        .replaceAll('৳', '')
        .replaceAll(',', '')
        .replaceAll(' ', '')
        .trim();

    if (cleaned.isEmpty) return 0;

    final parsed = double.tryParse(cleaned);
    if (parsed == null) return 0;

    return (parsed * 100).round();
  }

  /// Formats paisa with sign indicator for profit/loss.
  /// Example: 12345 → "+৳ 123.45", -12345 → "-৳ 123.45"
  static String formatBDTSigned(int paisa) {
    final prefix = paisa >= 0 ? '+' : '-';
    final amount = paisa.abs() / 100.0;
    return '$prefix৳ ${_bdtFormat.format(amount)}';
  }

  /// Formats a percentage value.
  /// Example: 1.5 → "1.50%"
  static String formatPercentage(double value) {
    return '${value.toStringAsFixed(2)}%';
  }

  /// Live-format user input as they type (auto-commas).
  /// Returns the formatted string and cursor offset.
  static String liveFormat(String rawDigits) {
    if (rawDigits.isEmpty) return '';

    // Separate integer and decimal parts
    final parts = rawDigits.split('.');
    final intPart = parts[0].replaceAll(RegExp(r'[^0-9]'), '');
    final decPart = parts.length > 1
        ? '.${parts[1].replaceAll(RegExp(r'[^0-9]'), '').substring(0, parts[1].length > 2 ? 2 : parts[1].length)}'
        : '';

    if (intPart.isEmpty && decPart.isEmpty) return '';

    // Add Indian-style commas (last 3, then groups of 2)
    final number = int.tryParse(intPart) ?? 0;
    final formatted = NumberFormat('#,##,##0', 'en_IN').format(number);

    return '$formatted$decPart';
  }
}
