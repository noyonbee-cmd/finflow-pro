/// Agent Provider (Riverpod)

import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../features/agents/data/agent_models.dart';
import '../features/agents/data/agent_repository.dart';

class AgentListState {
  final bool isLoading;
  final List<Agent> agents;
  final String? errorMessage;

  const AgentListState({
    this.isLoading = false,
    this.agents = const [],
    this.errorMessage,
  });

  AgentListState copyWith({
    bool? isLoading,
    List<Agent>? agents,
    String? errorMessage,
  }) {
    return AgentListState(
      isLoading: isLoading ?? this.isLoading,
      agents: agents ?? this.agents,
      errorMessage: errorMessage,
    );
  }
}

class AgentListNotifier extends StateNotifier<AgentListState> {
  final AgentRepository _repository;

  AgentListNotifier(this._repository) : super(const AgentListState()) {
    loadAgents();
  }

  Future<void> loadAgents() async {
    state = state.copyWith(isLoading: true, errorMessage: null);
    try {
      final agents = await _repository.getAgents();
      state = AgentListState(agents: agents);
    } catch (e) {
      state = state.copyWith(isLoading: false, errorMessage: e.toString());
    }
  }

  Future<void> settleCommission(String agentId) async {
    try {
      await _repository.settleCommission(agentId);
      await loadAgents();
    } catch (e) {
      state = state.copyWith(errorMessage: e.toString());
    }
  }

  Future<void> refresh() => loadAgents();
}

final agentListProvider =
    StateNotifierProvider<AgentListNotifier, AgentListState>((ref) {
      return AgentListNotifier(ref.watch(agentRepositoryProvider));
    });
