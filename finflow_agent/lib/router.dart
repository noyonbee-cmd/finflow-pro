import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import 'core/constants/app_colors.dart';
import 'core/constants/app_text_styles.dart';

import 'features/auth/presentation/screens/agent_login_screen.dart';
import 'features/dashboard/presentation/screens/agent_dashboard_screen.dart';
import 'features/transactions/presentation/screens/agent_transaction_screen.dart';
import 'features/transactions/presentation/screens/agent_add_transaction_screen.dart';
import 'features/clients/presentation/screens/agent_client_list_screen.dart';
import 'features/earnings/presentation/screens/earnings_screen.dart';
import 'features/earnings/presentation/screens/request_payout_screen.dart';
import 'features/settings/presentation/screens/agent_settings_screen.dart';

final _rootNavigatorKey = GlobalKey<NavigatorState>();
final _shellNavigatorKey = GlobalKey<NavigatorState>();

final routerProvider = Provider<GoRouter>((ref) {
  return GoRouter(
    navigatorKey: _rootNavigatorKey,
    initialLocation: '/dashboard/home',
    routes: [
      // Auth
      GoRoute(path: '/login', builder: (_, __) => const AgentLoginScreen()),

      // Main shell with bottom nav
      ShellRoute(
        navigatorKey: _shellNavigatorKey,
        builder: (_, state, child) => _AgentMainShell(child: child),
        routes: [
          GoRoute(
            path: '/dashboard/home',
            pageBuilder: (_, __) =>
                const NoTransitionPage(child: AgentDashboardScreen()),
          ),
          GoRoute(
            path: '/dashboard/transactions',
            pageBuilder: (_, __) =>
                const NoTransitionPage(child: AgentTransactionScreen()),
          ),
          GoRoute(
            path: '/dashboard/clients',
            pageBuilder: (_, __) =>
                const NoTransitionPage(child: AgentClientListScreen()),
          ),
          GoRoute(
            path: '/dashboard/earnings',
            pageBuilder: (_, __) =>
                const NoTransitionPage(child: EarningsScreen()),
          ),
          GoRoute(
            path: '/dashboard/settings',
            pageBuilder: (_, __) =>
                const NoTransitionPage(child: AgentSettingsScreen()),
          ),
        ],
      ),

      // Full-screen routes
      GoRoute(
        path: '/transactions/add',
        parentNavigatorKey: _rootNavigatorKey,
        builder: (_, __) => const AgentAddTransactionScreen(),
      ),
      GoRoute(
        path: '/transactions/:id',
        parentNavigatorKey: _rootNavigatorKey,
        builder: (_, state) => Scaffold(
          appBar: AppBar(title: const Text('Transaction Detail')),
          body: Center(
            child: Text('Transaction ID: ${state.pathParameters['id']}'),
          ),
        ),
      ),
      GoRoute(
        path: '/clients/add',
        parentNavigatorKey: _rootNavigatorKey,
        builder: (_, __) => Scaffold(
          appBar: AppBar(title: const Text('Add Client')),
          body: const Center(child: Text('Add Client Form')),
        ),
      ),
      GoRoute(
        path: '/clients/:id',
        parentNavigatorKey: _rootNavigatorKey,
        builder: (_, state) => Scaffold(
          appBar: AppBar(title: const Text('Client Detail')),
          body: Center(child: Text('Client ID: ${state.pathParameters['id']}')),
        ),
      ),
      GoRoute(
        path: '/earnings/request-payout',
        parentNavigatorKey: _rootNavigatorKey,
        builder: (_, __) => const RequestPayoutScreen(),
      ),
    ],
  );
});

// ─── Main Shell with Bottom Navigation ─────────────────────────

class _AgentMainShell extends StatelessWidget {
  final Widget child;
  const _AgentMainShell({required this.child});

  int _currentIndex(BuildContext context) {
    final location = GoRouterState.of(context).matchedLocation;
    if (location.startsWith('/dashboard/home')) return 0;
    if (location.startsWith('/dashboard/transactions')) return 1;
    if (location.startsWith('/dashboard/clients')) return 2;
    if (location.startsWith('/dashboard/earnings')) return 3;
    if (location.startsWith('/dashboard/settings')) return 4;
    return 0;
  }

  @override
  Widget build(BuildContext context) {
    final index = _currentIndex(context);
    return Scaffold(
      body: child,
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
                  '/dashboard/home',
                ),
                _navItem(
                  context,
                  Icons.receipt_long_rounded,
                  'Txns',
                  1,
                  index,
                  '/dashboard/transactions',
                ),
                _navItem(
                  context,
                  Icons.people_rounded,
                  'Clients',
                  2,
                  index,
                  '/dashboard/clients',
                ),
                _navItem(
                  context,
                  Icons.account_balance_wallet_rounded,
                  'Earnings',
                  3,
                  index,
                  '/dashboard/earnings',
                ),
                _navItem(
                  context,
                  Icons.person_rounded,
                  'Settings',
                  4,
                  index,
                  '/dashboard/settings',
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
          mainAxisAlignment: MainAxisAlignment.center,
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
              maxLines: 1,
              overflow: TextOverflow.ellipsis,
            ),
          ],
        ),
      ),
    );
  }
}
