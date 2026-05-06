/// Input Validators
///
/// Form validation utilities used across all screens.

class Validators {
  Validators._();

  static String? required(String? value, [String fieldName = 'This field']) {
    if (value == null || value.trim().isEmpty) {
      return '$fieldName is required';
    }
    return null;
  }

  static String? email(String? value) {
    if (value == null || value.trim().isEmpty) return 'Email is required';
    final regex = RegExp(r'^[\w\-.+]+@[\w\-.]+\.\w{2,}$');
    if (!regex.hasMatch(value.trim())) return 'Enter a valid email address';
    return null;
  }

  static String? password(String? value) {
    if (value == null || value.isEmpty) return 'Password is required';
    if (value.length < 8) return 'Password must be at least 8 characters';
    return null;
  }

  static String? phone(String? value) {
    if (value == null || value.trim().isEmpty) return null; // Optional
    final cleaned = value.replaceAll(RegExp(r'[\s\-\(\)]'), '');
    if (cleaned.length < 10 || cleaned.length > 15) {
      return 'Enter a valid phone number';
    }
    return null;
  }

  static String? amount(String? value) {
    if (value == null || value.trim().isEmpty) return 'Amount is required';
    final cleaned = value.replaceAll(',', '').replaceAll('৳', '').trim();
    final parsed = double.tryParse(cleaned);
    if (parsed == null || parsed <= 0) return 'Enter a valid amount';
    return null;
  }

  static String? percentage(String? value) {
    if (value == null || value.trim().isEmpty) return 'Required';
    final cleaned = value.replaceAll('%', '').trim();
    final parsed = double.tryParse(cleaned);
    if (parsed == null || parsed < 0 || parsed > 100) {
      return 'Enter a valid percentage (0-100)';
    }
    return null;
  }

  /// Password strength: 0 = weak, 1 = fair, 2 = good, 3 = strong
  static int passwordStrength(String password) {
    int score = 0;
    if (password.length >= 8) score++;
    if (password.length >= 12) score++;
    if (RegExp(r'[A-Z]').hasMatch(password) &&
        RegExp(r'[a-z]').hasMatch(password)) {
      score++;
    }
    if (RegExp(r'[0-9]').hasMatch(password)) score++;
    if (RegExp(r'[!@#\$%\^&\*\(\)]').hasMatch(password)) score++;
    if (score > 3) score = 3;
    return score;
  }

  static String passwordStrengthLabel(int strength) {
    switch (strength) {
      case 0:
        return 'Weak';
      case 1:
        return 'Fair';
      case 2:
        return 'Good';
      case 3:
        return 'Strong';
      default:
        return '';
    }
  }
}
