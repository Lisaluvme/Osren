import '../models/inventory.dart';
import 'api_client.dart';

/// Inventory service — wraps `/api/inventory/*` (no auth required by the
/// backend today, but the Bearer header is still sent when present).
class InventoryService {
  InventoryService(this._api);

  final ApiClient _api;

  /// `GET /api/inventory/list`.
  Future<List<InventoryItem>> list() async {
    final data = await _api.get('/inventory/list');
    return _parseItems(data);
  }

  /// `GET /api/inventory/search?q=`.
  Future<List<InventoryItem>> search(String term) async {
    if (term.trim().isEmpty) return list();
    final data = await _api.get('/inventory/search', query: {'q': term.trim()});
    return _parseItems(data);
  }

  /// `GET /api/inventory/summary`.
  Future<InventorySummary> summary() async {
    final data = await _api.get('/inventory/summary');
    if (data is! Map<String, dynamic>) return InventorySummary.empty;
    return InventorySummary.fromJson(data);
  }

  /// `GET /api/inventory/stock-history/:itemId`.
  Future<List<StockMovement>> stockHistory(String itemId) async {
    final data = await _api.get('/inventory/stock-history/$itemId');
    return _asList(data).map(StockMovement.fromJson).toList();
  }

  /// `POST /api/inventory/add`.
  Future<InventoryItem> add(InventoryItem item) async {
    await _api.post('/inventory/add', body: item.toJson());
    return item;
  }

  /// `POST /api/inventory/update`.
  Future<void> update({
    required String id,
    required Map<String, dynamic> fields,
  }) async {
    await _api.post('/inventory/update', body: {'id': id, ...fields});
  }

  /// `POST /api/inventory/adjust` — `adjustment` may be negative.
  Future<void> adjust({required String id, required num adjustment}) async {
    await _api.post('/inventory/adjust',
        body: {'id': id, 'adjustment': adjustment});
  }

  /// `POST /api/inventory/delete`.
  Future<void> delete(String id) async {
    await _api.post('/inventory/delete', body: {'id': id});
  }

  /// `POST /api/inventory/grn` — record goods received.
  Future<void> createGrn({
    required String grnNumber,
    required String date,
    required String supplier,
    required String warehouse,
    required String itemId,
    required String itemName,
    required num quantityReceived,
    num? unitCost,
    String? remarks,
  }) async {
    await _api.post('/inventory/grn', body: {
      'grnNumber': grnNumber,
      'date': date,
      'supplier': supplier,
      'warehouse': warehouse,
      'itemId': itemId,
      'itemName': itemName,
      'quantityReceived': quantityReceived,
      'unitCost': ?unitCost,
      'remarks': ?remarks,
    });
  }

  /// `GET /api/inventory/transfer-history`.
  Future<List<StockTransfer>> transferHistory() async {
    final data = await _api.get('/inventory/transfer-history');
    return _asList(data).map(StockTransfer.fromJson).toList();
  }

  /// `POST /api/inventory/stock-transfer`.
  Future<void> createTransfer({
    required String transferNumber,
    required String date,
    required String fromWarehouse,
    required String toWarehouse,
    required String itemId,
    required String itemName,
    required num quantity,
    String? remarks,
  }) async {
    await _api.post('/inventory/stock-transfer', body: {
      'transferNumber': transferNumber,
      'date': date,
      'fromWarehouse': fromWarehouse,
      'toWarehouse': toWarehouse,
      'itemId': itemId,
      'itemName': itemName,
      'quantity': quantity,
      'remarks': ?remarks,
    });
  }

  /// `GET /api/inventory/stock-take-history`.
  Future<List<StockTake>> stockTakeHistory() async {
    final data = await _api.get('/inventory/stock-take-history');
    return _asList(data).map(StockTake.fromJson).toList();
  }

  /// `POST /api/inventory/stock-take`.
  Future<void> createStockTake({
    required String stockTakeNumber,
    required String date,
    required String warehouse,
    required String itemId,
    required String itemName,
    required num systemQuantity,
    required num actualQuantity,
    String? varianceReason,
    String? remarks,
  }) async {
    await _api.post('/inventory/stock-take', body: {
      'stockTakeNumber': stockTakeNumber,
      'date': date,
      'warehouse': warehouse,
      'itemId': itemId,
      'itemName': itemName,
      'systemQuantity': systemQuantity,
      'actualQuantity': actualQuantity,
      'variance': actualQuantity - systemQuantity,
      'varianceReason': ?varianceReason,
      'remarks': ?remarks,
    });
  }

  List<InventoryItem> _parseItems(dynamic data) {
    final raw = data is Map<String, dynamic> && data.containsKey('items')
        ? data['items']
        : data;
    return _asList(raw).map(InventoryItem.fromJson).toList();
  }

  List<Map<String, dynamic>> _asList(dynamic data) {
    if (data is List) {
      return data.cast<Map<String, dynamic>>();
    }
    if (data is Map<String, dynamic> && data['data'] is List) {
      return (data['data'] as List).cast<Map<String, dynamic>>();
    }
    return const [];
  }
}
