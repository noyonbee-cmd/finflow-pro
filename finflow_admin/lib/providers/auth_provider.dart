/// Auth Provider (Riverpod)
///
/// Manages authentication state: login, logout, token refresh,
/// current user, and auth status (authenticated/unauthenticated/loading).

import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../features/auth/data/auth_models.dart';
import '../features/auth/data/auth_repository.dart';

// ─── Auth State ────────────────────────────────────────────────

enum AuthStatus { initial, loading, authenticated, unauthenticated, error }

class AuthState {
  final AuthStatus status;
  final AdminUser? admin;
  final String? errorMessage;

  const AuthState({
    this.status = AuthStatus.initial,
    this.admin,
    this.errorMessage,
  });

  AuthState copyWith({
    AuthStatus? status,
    AdminUser? admin,
    String? errorMessage,
  }) {
    return AuthState(
      status: status ?? this.status,
      admin: admin ?? this.admin,
      errorMessage: errorMessage,
    );
  }

  bool get isAuthenticated => status == AuthStatus.authenticated;
  bool get isLoading => status == AuthStatus.loading;
}

// ─── Auth Notifier ─────────────────────────────────────────────

class AuthNotifier extends StateNotifier<AuthState> {
  final AuthRepository _repository;

  AuthNotifier(this._repository) : super(const AuthState()) {
    _init();
  }

  Future<void> _init() async {
    state = state.copyWith(status: AuthStatus.loading);
    try {
      final admin = await _repository.getPersistedAdmin();
      if (admin != null) {
        state = AuthState(status: AuthStatus.authenticated, admin: admin);
      } else {
        state = const AuthState(status: AuthStatus.unauthenticated);
      }
    } catch (_) {
      state = const AuthState(status: AuthStatus.unauthenticated);
    }
  }

  Future<void> login({required String email, required String password}) async {
    state = state.copyWith(status: AuthStatus.loading, errorMessage: null);
    try {
      final response = await _repository.login(
        email: email,
        password: password,
      );
      state = AuthState(
        status: AuthStatus.authenticated,
        admin: response.admin,
      );
    } catch (e) {
      state = AuthState(status: AuthStatus.error, errorMessage: e.toString());
    }
  }

  Future<void> signup(AdminSignupRequest request) async {
    state = state.copyWith(status: AuthStatus.loading, errorMessage: null);
    try {
      final response = await _repository.signup(request);
      state = AuthState(
        status: AuthStatus.authenticated,
        admin: response.admin,
      );
    } catch (e) {
      state = AuthState(status: AuthStatus.error, errorMessage: e.toString());
    }
  }

  Future<void> logout() async {
    state = state.copyWith(status: AuthStatus.loading);
    await _repository.logout();
    state = const AuthState(status: AuthStatus.unauthenticated);
  }

  void onSessionExpired() {
    state = const AuthState(
      status: AuthStatus.unauthenticated,
      errorMessage: 'Session expired. Please log in again.',
    );
  }
}

// ─── Providers ─────────────────────────────────────────────────

final authProvider = StateNotifierProvider<AuthNotifier, AuthState>((ref) {
  final repository = ref.watch(authRepositoryProvider);
  return AuthNotifier(repository);
});

/// Quick check for auth status in router guards.
final isAuthenticatedProvider = Provider<bool>((ref) {
  return ref.watch(authProvider).isAuthenticated;
});
