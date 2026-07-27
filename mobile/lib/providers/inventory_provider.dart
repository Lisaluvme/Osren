import 'package:flutter/foundation.dart';

import '../models/inventory.dart';
import '../services/services.dart';

/// Inventory list + summary state.
class InventoryProvider extends ChangeNotifier {
  InventoryProvider(this._services);

  final AppServices _services;

  List<InventoryItem> _items = const [];
  InventorySummary _summary = InventorySummary.empty;
  bool _busy = false;
  String? _error;

  List<InventoryItem> get items => _items;
  InventorySummary get summary => _summary;
  bool get busy => _busy;
  String? get error => _error;

  /// Low-stock items only (quantity at/below reorder level).
  List<InventoryItem> get lowStock =>
      _items.where((i) => i.isLowStock).toList(growable: false);

  Future<void> load() async {
    _busy = true;
    _error = null;
    notifyListeners();
    try {
      final results = await Future.wait([
        _services.inventory.list(),
        _services.inventory.summary(),
      ]);
      _items = results[0] as List<InventoryItem>;
      _summary = results[1] as InventorySummary;
    } catch (e) {
      _error = e.toString();
    } finally {
      _busy = false;
      notifyListeners();
    }
  }

  Future<void> search(String term) async {
    _busy = true;
    _error = null;
    notifyListeners();
    try {
      _items = await _services.inventory.search(term);
    } catch (e) {
      _error = e.toString();
    } finally {
      _busy = false;
      notifyListeners();
    }
  }

  Future<bool> adjust({required String id, required num delta}) async {
    try {
      await _services.inventory.adjust(id: id, adjustment: delta);
      await load();
      return true;
    } catch (e) {
      _error = e.toString();
      notifyListeners();
      return false;
    }
  }
}
