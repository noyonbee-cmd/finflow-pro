/// Agent Repository

import 'package:dio/dio.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/constants/api_constants.dart';
import '../../../core/errors/exceptions.dart';
import '../../../core/network/dio_client.dart';
import 'agent_models.dart';

final agentRepositoryProvider = Provider<AgentRepository>((ref) {
  return AgentRepository(dioClient: ref.watch(dioClientProvider));
});

class AgentRepository {
  final DioClient _dioClient;

  AgentRepository({required DioClient dioClient}) : _dioClient = dioClient;

  Future<List<Agent>> getAgents() async {
    try {
      final response = await _dioClient.get(ApiConstants.agents);
      final data = response.data;
      List items;
      if (data is Map && data['data'] != null) {
        items = data['data'] as List;
      } else if (data is List) {
        items = data;
      } else {
        items = [];
      }
      return items
          .map((e) => Agent.fromJson(e as Map<String, dynamic>))
          .toList();
    } on DioException catch (e) {
      throw e.error is AppException
          ? e.error as AppException
          : ServerException(message: e.message ?? 'Failed to load agents');
    }
  }

  Future<Agent> getAgent(String id) async {
    try {
      final response = await _dioClient.get(ApiConstants.agent(id));
      final data = response.data is Map
          ? (response.data['data'] ?? response.data) as Map<String, dynamic>
          : response.data as Map<String, dynamic>;
      return Agent.fromJson(data);
    } on DioException catch (e) {
      throw e.error is AppException
          ? e.error as AppException
          : ServerException(message: e.message ?? 'Failed to load agent');
    }
  }

  Future<void> settleCommission(String agentId, {int? amountPaisa}) async {
    try {
      await _dioClient.post(
        ApiConstants.settleCommission(agentId),
        data: {if (amountPaisa != null) 'amountPaisa': amountPaisa},
      );
    } on DioException catch (e) {
      throw e.error is AppException
          ? e.error as AppException
          : ServerException(
              message: e.message ?? 'Failed to settle commission',
            );
    }
  }

  Future<void> suspendAgent(String id) async {
    try {
      await _dioClient.post(ApiConstants.adminSuspendAgent(id));
    } on DioException catch (e) {
      throw e.error is AppException
          ? e.error as AppException
          : ServerException(message: e.message ?? 'Failed to suspend agent');
    }
  }

  Future<void> approveAgent(String id) async {
    try {
      await _dioClient.post(ApiConstants.adminApproveAgent(id));
    } on DioException catch (e) {
      throw e.error is AppException
          ? e.error as AppException
          : ServerException(message: e.message ?? 'Failed to approve agent');
    }
  }
}
