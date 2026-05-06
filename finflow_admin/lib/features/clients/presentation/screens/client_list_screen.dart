/// Client List Screen

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../../../core/constants/app_colors.dart';
import '../../../../core/constants/app_spacing.dart';
import '../../../../core/constants/app_text_styles.dart';
import '../../../../core/utils/currency_formatter.dart';
import '../../../../features/clients/data/client_models.dart';
import '../../../../features/clients/data/client_repository.dart';
import '../../../../shared/widgets/loading_skeleton.dart';
import '../../../../shared/widgets/empty_state.dart';
import '../../../../shared/widgets/error_state.dart';


final _clientListProvider = FutureProvider.autoDispose<List<Client>>((
  ref,
) async {
  return ref.watch(clientRepositoryProvider).getClients();
});

class ClientListScreen extends ConsumerStatefulWidget {
  const ClientListScreen({super.key});
  @override
  ConsumerState<ClientListScreen> createState() => _ClientListScreenState();
}

class _ClientListScreenState extends ConsumerState<ClientListScreen> {
  String _search = '';

  @override
  Widget build(BuildContext context) {
    final clientsAsync = ref.watch(_clientListProvider);

    return Scaffold(
      backgroundColor: AppColors.darkBg,
      appBar: AppBar(
        title: Text(
          'Clients',
          style: AppTextStyles.h4.copyWith(color: AppColors.textPrimary),
        ),
        backgroundColor: AppColors.darkBg,
      ),
      body: Column(
        children: [
          Padding(
            padding: const EdgeInsets.symmetric(
              horizontal: AppSpacing.base,
              vertical: AppSpacing.sm,
            ),
            child: TextField(
              style: AppTextStyles.bodyBase.copyWith(
                color: AppColors.textPrimary,
              ),
              decoration: InputDecoration(
                hintText: 'Search clients...',
                hintStyle: AppTextStyles.bodySm.copyWith(
                  color: AppColors.textMuted,
                ),
                prefixIcon: const Icon(
                  Icons.search_rounded,
                  color: AppColors.textTertiary,
                  size: 20,
                ),
                filled: true,
                fillColor: AppColors.surface,
                border: OutlineInputBorder(
                  borderRadius: BorderRadius.circular(AppSpacing.radiusButton),
                  borderSide: BorderSide.none,
                ),
              ),
              onChanged: (v) => setState(() => _search = v),
            ),
          ),
          Expanded(
            child: clientsAsync.when(
              loading: () => Padding(
                padding: const EdgeInsets.all(16),
                child: LoadingSkeleton.transactionList(count: 8),
              ),
              error: (e, _) => ErrorState(
                message: e.toString(),
                onRetry: () => ref.invalidate(_clientListProvider),
              ),
              data: (clients) {
                final filtered = clients
                    .where(
                      (c) =>
                          c.name.toLowerCase().contains(
                            _search.toLowerCase(),
                          ) ||
                          (c.phone ?? '').contains(_search),
                    )
                    .toList();
                if (filtered.isEmpty) {
                  return const EmptyState(
                    icon: Icons.people_outlined,
                    title: 'No clients found',
                    subtitle: 'Add your first client',
                  );
                }
                return RefreshIndicator(
                  onRefresh: () async => ref.invalidate(_clientListProvider),
                  color: AppColors.primary,
                  child: ListView.separated(
                    padding: const EdgeInsets.all(AppSpacing.base),
                    itemCount: filtered.length,
                    separatorBuilder: (_, __) => const SizedBox(height: 8),
                    itemBuilder: (_, i) {
                      final client = filtered[i];
                      return GestureDetector(
                        onTap: () => context.push('/clients/${client.id}'),
                        child: Container(
                          padding: const EdgeInsets.all(AppSpacing.md),
                          decoration: BoxDecoration(
                            color: AppColors.surface,
                            borderRadius: AppSpacing.cardBorderRadius,
                            border: Border.all(
                              color: AppColors.border,
                              width: 0.5,
                            ),
                          ),
                          child: Row(
                            children: [
                              CircleAvatar(
                                radius: 20,
                                backgroundColor: AppColors.primary.withValues(
                                  alpha: 0.15,
                                ),
                                child: Text(
                                  client.name[0].toUpperCase(),
                                  style: AppTextStyles.h5.copyWith(
                                    color: AppColors.primary,
                                  ),
                                ),
                              ),
                              const SizedBox(width: 12),
                              Expanded(
                                child: Column(
                                  crossAxisAlignment: CrossAxisAlignment.start,
                                  children: [
                                    Text(
                                      client.name,
                                      style: AppTextStyles.bodyBaseMedium
                                          .copyWith(
                                            color: AppColors.textPrimary,
                                          ),
                                    ),
                                    if (client.phone != null)
                                      Text(
                                        client.phone!,
                                        style: AppTextStyles.bodyXs.copyWith(
                                          color: AppColors.textTertiary,
                                        ),
                                      ),
                                  ],
                                ),
                              ),
                              Column(
                                crossAxisAlignment: CrossAxisAlignment.end,
                                children: [
                                  Text(
                                    '${client.totalTransactions} txns',
                                    style: AppTextStyles.bodyXs.copyWith(
                                      color: AppColors.textTertiary,
                                    ),
                                  ),
                                  Text(
                                    CurrencyFormatter.formatBDTCompact(
                                      client.totalVolumePaisa,
                                    ),
                                    style: AppTextStyles.numberXs.copyWith(
                                      color: AppColors.textSecondary,
                                    ),
                                  ),
                                ],
                              ),
                              const SizedBox(width: 4),
                              const Icon(
                                Icons.chevron_right_rounded,
                                color: AppColors.textTertiary,
                                size: 18,
                              ),
                            ],
                          ),
                        ),
                      );
                    },
                  ),
                );
              },
            ),
          ),
        ],
      ),
    );
  }
}
