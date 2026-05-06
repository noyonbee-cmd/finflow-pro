/// Date Formatter Utilities
///
/// Formatting helpers for dates, times, and relative timestamps.

import 'package:intl/intl.dart';

class DateFormatter {
  DateFormatter._();

  static final _fullDate = DateFormat('dd MMM yyyy');
  static final _shortDate = DateFormat('dd/MM/yyyy');
  static final _time = DateFormat('h:mm a');
  static final _dateTime = DateFormat('dd MMM yyyy, h:mm a');
  static final _dayMonth = DateFormat('dd MMM');
  static final _monthYear = DateFormat('MMM yyyy');
  static final _dayName = DateFormat('EEEE');

  /// "06 May 2026"
  static String fullDate(DateTime dt) => _fullDate.format(dt);

  /// "06/05/2026"
  static String shortDate(DateTime dt) => _shortDate.format(dt);

  /// "2:45 PM"
  static String time(DateTime dt) => _time.format(dt);

  /// "06 May 2026, 2:45 PM"
  static String dateTime(DateTime dt) => _dateTime.format(dt);

  /// "06 May"
  static String dayMonth(DateTime dt) => _dayMonth.format(dt);

  /// "May 2026"
  static String monthYear(DateTime dt) => _monthYear.format(dt);

  /// "Tuesday"
  static String dayName(DateTime dt) => _dayName.format(dt);

  /// "Today", "Yesterday", or "06 May 2026"
  static String relative(DateTime dt) {
    final now = DateTime.now();
    final today = DateTime(now.year, now.month, now.day);
    final date = DateTime(dt.year, dt.month, dt.day);

    if (date == today) return 'Today';
    if (date == today.subtract(const Duration(days: 1))) return 'Yesterday';
    if (date == today.add(const Duration(days: 1))) return 'Tomorrow';

    return fullDate(dt);
  }

  /// "2 min ago", "1 hr ago", or time/date
  static String timeAgo(DateTime dt) {
    final diff = DateTime.now().difference(dt);

    if (diff.inSeconds < 60) return 'Just now';
    if (diff.inMinutes < 60) return '${diff.inMinutes} min ago';
    if (diff.inHours < 24) return '${diff.inHours} hr ago';
    if (diff.inDays < 7) return '${diff.inDays}d ago';

    return fullDate(dt);
  }

  /// Group key for transaction lists: "Today", "Yesterday", or "06 May 2026"
  static String groupKey(DateTime dt) => relative(dt);
}
