/// Client Provider (Riverpod)
///
/// Manages client list state, search, detail fetch, and CRUD operations.

import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../features/clients/data/client_models.dart';
import '../features/clients/data/client_repository.dart';

// ─── Client List State ─────────────────────────────────────────

class ClientListState {
  final bool isLoading;
  final List<Client> clients;
  final List<Client> filteredClients;
  final String searchQuery;
  final String? errorMessage;

  const ClientListState({
    this.isLoading = false,
    this.clients = const [],
    this.filteredClients = const [],
    this.searchQuery = '',
    this.errorMessage,
  });

  ClientListState copyWith({
    bool? isLoading,
    List<Client>? clients,
    List<Client>? filteredClients,
    String? searchQuery,
    String? errorMessage,
  }) {
    return ClientListState(
      isLoading: isLoading ?? this.isLoading,
      clients: clients ?? this.clients,
      filteredClients: filteredClients ?? this.filteredClients,
      searchQuery: searchQuery ?? this.searchQuery,
      errorMessage: errorMessage,
    );
  }
}

class ClientListNotifier extends StateNotifier<ClientListState> {
  final ClientRepository _repository;

  ClientListNotifier(this._repository) : super(const ClientListState()) {
    loadClients();
  }

  Future<void> loadClients() async {
    state = state.copyWith(isLoading: true, errorMessage: null);
    try {
      final clients = await _repository.getClients();
      state = ClientListState(clients: clients, filteredClients: clients);
    } catch (e) {
      state = state.copyWith(isLoading: false, errorMessage: e.toString());
    }
  }

  void search(String query) {
    final q = query.toLowerCase().trim();
    if (q.isEmpty) {
      state = state.copyWith(searchQuery: '', filteredClients: state.clients);
      return;
    }
    final filtered = state.clients.where((c) {
      return c.name.toLowerCase().contains(q) ||
          (c.phone?.contains(q) ?? false) ||
          (c.email?.toLowerCase().contains(q) ?? false);
    }).toList();
    state = state.copyWith(searchQuery: q, filteredClients: filtered);
  }

  Future<void> createClient(CreateClientRequest request) async {
    try {
      await _repository.createClient(request);
      await loadClients();
    } catch (e) {
      state = state.copyWith(errorMessage: e.toString());
    }
  }

  Future<void> archiveClient(String id) async {
    try {
      await _repository.archiveClient(id);
      await loadClients();
    } catch (e) {
      state = state.copyWith(errorMessage: e.toString());
    }
  }

  Future<void> refresh() => loadClients();
}

final clientListProvider =
    StateNotifierProvider<ClientListNotifier, ClientListState>((ref) {
      return ClientListNotifier(ref.watch(clientRepositoryProvider));
    });

// ─── Client Detail ─────────────────────────────────────────────

final clientDetailProvider = FutureProvider.family<Client, String>((
  ref,
  id,
) async {
  final repository = ref.watch(clientRepositoryProvider);
  return repository.getClient(id);
});
