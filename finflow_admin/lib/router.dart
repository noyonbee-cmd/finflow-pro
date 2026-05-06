/// App Router — go_router configuration with all routes, guards, and bottom nav shell.

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import 'providers/auth_provider.dart';
import 'features/auth/presentation/login_screen.dart';
import 'features/auth/presentation/signup_screen.dart';
import 'features/dashboard/presentation/dashboard_screen.dart';
import 'features/transactions/presentation/screens/transaction_history_screen.dart';
import 'features/transactions/presentation/screens/add_transaction_screen.dart';
import 'features/clients/presentation/screens/client_list_screen.dart';
import 'features/clients/presentation/screens/client_detail_screen.dart';
import 'features/agents/presentation/screens/agent_list_screen.dart';
import 'features/agents/presentation/screens/agent_detail_screen.dart';
import 'features/wallets/presentation/screens/wallet_list_screen.dart';
import 'features/wallets/presentation/screens/wallet_detail_screen.dart';
import 'features/reports/presentation/screens/report_screen.dart';
import 'features/settings/presentation/screens/settings_screen.dart';
import 'features/settings/presentation/screens/telegram_setup_screen.dart';
import 'core/constants/app_colors.dart';
import 'core/constants/app_text_styles.dart';

final _rootNavigatorKey = GlobalKey<NavigatorState>();
final _shellNavigatorKey = GlobalKey<NavigatorState>();

final routerProvider = Provider<GoRouter>((ref) {
  final authState = ref.watch(authProvider);

  return GoRouter(
    navigatorKey: _rootNavigatorKey,
    initialLocation: '/dashboard',
    redirect: (context, state) {
      final isLoggedIn = authState.isAuthenticated;
      final isAuthRoute =
          state.matchedLocation == '/login' ||
          state.matchedLocation == '/signup';

      if (authState.status == AuthStatus.initial ||
          authState.status == AuthStatus.loading) {
        return '/splash';
      }
      if (!isLoggedIn && !isAuthRoute) return '/login';
      if (isLoggedIn && isAuthRoute) return '/dashboard';
      return null;
    },
    routes: [
      // Splash
      GoRoute(path: '/splash', builder: (_, __) => const _SplashScreen()),
      // Auth
      GoRoute(path: '/login', builder: (_, __) => const LoginScreen()),
      GoRoute(path: '/signup', builder: (_, __) => const SignupScreen()),
      // Main shell with bottom nav
      ShellRoute(
        navigatorKey: _shellNavigatorKey,
        builder: (_, state, child) => _MainShell(child: child),
        routes: [
          GoRoute(
            path: '/dashboard',
            pageBuilder: (_, __) =>
                const NoTransitionPage(child: DashboardScreen()),
          ),
          GoRoute(
            path: '/transactions',
            pageBuilder: (_, __) =>
                const NoTransitionPage(child: TransactionHistoryScreen()),
          ),
          GoRoute(
            path: '/clients',
            pageBuilder: (_, __) =>
                const NoTransitionPage(child: ClientListScreen()),
          ),
          GoRoute(
            path: '/agents',
            pageBuilder: (_, __) =>
                const NoTransitionPage(child: AgentListScreen()),
          ),
          GoRoute(
            path: '/more',
            pageBuilder: (_, __) =>
                const NoTransitionPage(child: _MoreScreen()),
          ),
        ],
      ),
      // Full-screen routes
      GoRoute(
        path: '/transactions/add',
        parentNavigatorKey: _rootNavigatorKey,
        builder: (_, __) => const AddTransactionScreen(),
      ),
      GoRoute(
        path: '/clients/:id',
        parentNavigatorKey: _rootNavigatorKey,
        builder: (_, state) =>
            ClientDetailScreen(clientId: state.pathParameters['id']!),
      ),
      GoRoute(
        path: '/agents/:id',
        parentNavigatorKey: _rootNavigatorKey,
        builder: (_, state) =>
            AgentDetailScreen(agentId: state.pathParameters['id']!),
      ),
      GoRoute(
        path: '/wallets',
        parentNavigatorKey: _rootNavigatorKey,
        builder: (_, __) => const WalletListScreen(),
      ),
      GoRoute(
        path: '/wallets/:id',
        parentNavigatorKey: _rootNavigatorKey,
        builder: (_, state) =>
            WalletDetailScreen(walletId: state.pathParameters['id']!),
      ),
      GoRoute(
        path: '/reports',
        parentNavigatorKey: _rootNavigatorKey,
        builder: (_, __) => const ReportScreen(),
      ),
      GoRoute(
        path: '/settings',
        parentNavigatorKey: _rootNavigatorKey,
        builder: (_, __) => const SettingsScreen(),
      ),
      GoRoute(
        path: '/settings/telegram',
        parentNavigatorKey: _rootNavigatorKey,
        builder: (_, __) => const TelegramSetupScreen(),
      ),
    ],
  );
});

// ─── Main Shell with Bottom Navigation ─────────────────────────

class _MainShell extends StatelessWidget {
  final Widget child;
  const _MainShell({required this.child});

  int _currentIndex(BuildContext context) {
    final location = GoRouterState.of(context).matchedLocation;
    if (location.startsWith('/dashboard')) return 0;
    if (location.startsWith('/transactions')) return 1;
    if (location.startsWith('/clients')) return 2;
    if (location.startsWith('/agents')) return 3;
    if (location.startsWith('/more')) return 4;
    return 0;
  }

  @override
  Widget build(BuildContext context) {
    final index = _currentIndex(context);
    return Scaffold(
      body: child,
      floatingActionButton: FloatingActionButton(
        onPressed: () => context.push('/transactions/add'),
        backgroundColor: AppColors.primary,
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
        child: const Icon(Icons.add_rounded, color: AppColors.white, size: 28),
      ),
      floatingActionButtonLocation: FloatingActionButtonLocation.centerDocked,
      bottomNavigationBar: Container(
        decoration: const BoxDecoration(
          color: AppColors.surface,
          border: Border(top: BorderSide(color: AppColors.border, width: 0.5)),
        ),
        child: SafeArea(
          child: SizedBox(
            height: 60,
            child: Row(
              mainAxisAlignment: MainAxisAlignment.spaceAround,
              children: [
                _navItem(
                  context,
                  Icons.dashboard_rounded,
                  'Home',
                  0,
                  index,
                  '/dashboard',
                ),
                _navItem(
                  context,
                  Icons.receipt_long_rounded,
                  'Txns',
                  1,
                  index,
                  '/transactions',
                ),
                const SizedBox(width: 48), // FAB space
                _navItem(
                  context,
                  Icons.people_rounded,
                  'Clients',
                  2,
                  index,
                  '/clients',
                ),
                _navItem(
                  context,
                  Icons.person_rounded,
                  'Agents',
                  3,
                  index,
                  '/agents',
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }

  Widget _navItem(
    BuildContext context,
    IconData icon,
    String label,
    int itemIndex,
    int currentIndex,
    String path,
  ) {
    final isActive = itemIndex == currentIndex;
    return InkWell(
      onTap: () => context.go(path),
      borderRadius: BorderRadius.circular(8),
      child: SizedBox(
        width: 64,
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Icon(
              icon,
              size: 22,
              color: isActive ? AppColors.primary : AppColors.textTertiary,
            ),
            const SizedBox(height: 2),
            Text(
              label,
              style: AppTextStyles.bodyXs.copyWith(
                color: isActive ? AppColors.primary : AppColors.textTertiary,
                fontWeight: isActive ? FontWeight.w600 : FontWeight.w400,
              ),
            ),
          ],
        ),
      ),
    );
  }
}

// ─── Splash Screen ─────────────────────────────────────────────

class _SplashScreen extends StatelessWidget {
  const _SplashScreen();

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppColors.darkBg,
      body: Center(
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Container(
              width: 72,
              height: 72,
              decoration: BoxDecoration(
                gradient: const LinearGradient(
                  colors: AppColors.primaryGradient,
                ),
                borderRadius: BorderRadius.circular(18),
              ),
              child: const Icon(
                Icons.account_balance_wallet_rounded,
                color: AppColors.white,
                size: 36,
              ),
            ),
            const SizedBox(height: 16),
            Text(
              'FinFlow Pro',
              style: AppTextStyles.h2.copyWith(color: AppColors.textPrimary),
            ),
            const SizedBox(height: 24),
            const SizedBox(
              width: 24,
              height: 24,
              child: CircularProgressIndicator(
                strokeWidth: 2,
                color: AppColors.primary,
              ),
            ),
          ],
        ),
      ),
    );
  }
}

// ─── More Screen ───────────────────────────────────────────────

class _MoreScreen extends StatelessWidget {
  const _MoreScreen();

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppColors.darkBg,
      appBar: AppBar(
        title: Text(
          'More',
          style: AppTextStyles.h4.copyWith(color: AppColors.textPrimary),
        ),
        backgroundColor: AppColors.darkBg,
        elevation: 0,
      ),
      body: ListView(
        padding: const EdgeInsets.all(16),
        children: [
          _moreItem(
            context,
            Icons.account_balance_wallet_rounded,
            'Wallets',
            '/wallets',
          ),
          _moreItem(context, Icons.bar_chart_rounded, 'Reports', '/reports'),
          _moreItem(context, Icons.settings_rounded, 'Settings', '/settings'),
        ],
      ),
    );
  }

  Widget _moreItem(
    BuildContext context,
    IconData icon,
    String label,
    String path,
  ) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 8),
      child: ListTile(
        leading: Icon(icon, color: AppColors.primary, size: 22),
        title: Text(
          label,
          style: AppTextStyles.bodyBaseMedium.copyWith(
            color: AppColors.textPrimary,
          ),
        ),
        trailing: const Icon(
          Icons.chevron_right_rounded,
          color: AppColors.textTertiary,
          size: 20,
        ),
        tileColor: AppColors.surface,
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
        onTap: () => context.push(path),
      ),
    );
  }
}
