/// Client Repository
///
/// Data layer for client management — CRUD, search, archive.

import 'package:dio/dio.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/constants/api_constants.dart';
import '../../../core/errors/exceptions.dart';
import '../../../core/network/dio_client.dart';
import 'client_models.dart';

final clientRepositoryProvider = Provider<ClientRepository>((ref) {
  return ClientRepository(dioClient: ref.watch(dioClientProvider));
});

class ClientRepository {
  final DioClient _dioClient;

  ClientRepository({required DioClient dioClient}) : _dioClient = dioClient;

  Future<List<Client>> getClients({String? search}) async {
    try {
      final response = await _dioClient.get(
        ApiConstants.clients,
        queryParameters: {
          if (search != null && search.isNotEmpty) 'search': search,
        },
      );
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
          .map((e) => Client.fromJson(e as Map<String, dynamic>))
          .toList();
    } on DioException catch (e) {
      throw e.error is AppException
          ? e.error as AppException
          : ServerException(message: e.message ?? 'Failed to load clients');
    }
  }

  Future<Client> getClient(String id) async {
    try {
      final response = await _dioClient.get(ApiConstants.client(id));
      final data = response.data is Map
          ? (response.data['data'] ?? response.data) as Map<String, dynamic>
          : response.data as Map<String, dynamic>;
      return Client.fromJson(data);
    } on DioException catch (e) {
      throw e.error is AppException
          ? e.error as AppException
          : ServerException(message: e.message ?? 'Failed to load client');
    }
  }

  Future<Client> createClient(CreateClientRequest request) async {
    try {
      final response = await _dioClient.post(
        ApiConstants.clients,
        data: request.toJson(),
      );
      final data = response.data is Map
          ? (response.data['data'] ?? response.data) as Map<String, dynamic>
          : response.data as Map<String, dynamic>;
      return Client.fromJson(data);
    } on DioException catch (e) {
      throw e.error is AppException
          ? e.error as AppException
          : ServerException(message: e.message ?? 'Failed to create client');
    }
  }

  Future<Client> updateClient(String id, Map<String, dynamic> updates) async {
    try {
      final response = await _dioClient.patch(
        ApiConstants.client(id),
        data: updates,
      );
      final data = response.data is Map
          ? (response.data['data'] ?? response.data) as Map<String, dynamic>
          : response.data as Map<String, dynamic>;
      return Client.fromJson(data);
    } on DioException catch (e) {
      throw e.error is AppException
          ? e.error as AppException
          : ServerException(message: e.message ?? 'Failed to update client');
    }
  }

  Future<void> archiveClient(String id) async {
    try {
      await _dioClient.post(ApiConstants.archiveClient(id));
    } on DioException catch (e) {
      throw e.error is AppException
          ? e.error as AppException
          : ServerException(message: e.message ?? 'Failed to archive client');
    }
  }
}
