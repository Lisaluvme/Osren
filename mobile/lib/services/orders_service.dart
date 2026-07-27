import '../models/order.dart';
import 'api_client.dart';

/// Orders service — wraps `/api/orders/*`.
class OrdersService {
  OrdersService(this._api);

  final ApiClient _api;

  /// `GET /api/orders/?status=&client=&limit=`.
  Future<List<SalesOrder>> list({
    String? status,
    String? client,
    int limit = 100,
  }) async {
    final query = <String, String>{'limit': limit.toString()};
    if (status != null && status.isNotEmpty) query['status'] = status;
    if (client != null && client.isNotEmpty) query['client'] = client;
    final data = await _api.get('/orders', query: query);
    final list = data is List
        ? data
        : (data is Map<String, dynamic> ? data['orders'] : null);
    if (list is! List) return const [];
    return list
        .map((e) => SalesOrder.fromJson(e as Map<String, dynamic>))
        .toList();
  }

  /// `GET /api/orders/:id`.
  Future<SalesOrder> fetch(String id) async {
    final data = await _api.get('/orders/$id') as Map<String, dynamic>;
    return SalesOrder.fromJson(data);
  }

  /// `POST /api/orders`.
  Future<SalesOrder> create({
    required String clientName,
    required List<OrderLineItem> items,
    String? deliveryAddress,
    String? contactNumber,
    String? notes,
  }) async {
    final data = await _api.post('/orders', body: {
      'clientName': clientName,
      'items': items.map((e) => e.toJson()).toList(),
      if (deliveryAddress != null) 'deliveryAddress': deliveryAddress,
      if (contactNumber != null) 'contactNumber': contactNumber,
      if (notes != null) 'notes': notes,
    }) as Map<String, dynamic>;
    return SalesOrder.fromJson(data);
  }

  /// `PATCH /api/orders/:id` — update status and/or capture a signature.
  Future<void> patch({
    required String id,
    String? status,
    String? signature,
  }) async {
    await _api.patch('/orders/$id', body: {
      if (status != null) 'status': status,
      if (signature != null) 'signature': signature,
    });
  }

  /// `DELETE /api/orders/:id` — soft-cancel.
  Future<void> cancel(String id) async {
    await _api.delete('/orders/$id');
  }
}
