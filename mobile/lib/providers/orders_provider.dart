import 'package:flutter/foundation.dart';

import '../models/order.dart';
import '../services/services.dart';

/// Sales orders list + creation state.
class OrdersProvider extends ChangeNotifier {
  OrdersProvider(this._services);

  final AppServices _services;

  List<SalesOrder> _orders = const [];
  bool _busy = false;
  String? _error;

  List<SalesOrder> get orders => _orders;
  bool get busy => _busy;
  String? get error => _error;

  /// Count of orders still awaiting action.
  int get openCount =>
      _orders.where((o) => o.status == OrderStatus.pending).length;

  /// Sum of all order totals (a simple top-line revenue proxy).
  num get totalValue =>
      _orders.fold<num>(0, (sum, o) => sum + o.totalAmount);

  Future<void> load({String? status}) async {
    _busy = true;
    _error = null;
    notifyListeners();
    try {
      _orders = await _services.orders.list(status: status);
    } catch (e) {
      _error = e.toString();
    } finally {
      _busy = false;
      notifyListeners();
    }
  }

  Future<bool> create({
    required String clientName,
    required List<OrderLineItem> items,
    String? deliveryAddress,
    String? contactNumber,
    String? notes,
  }) async {
    try {
      await _services.orders.create(
        clientName: clientName,
        items: items,
        deliveryAddress: deliveryAddress,
        contactNumber: contactNumber,
        notes: notes,
      );
      await load();
      return true;
    } catch (e) {
      _error = e.toString();
      notifyListeners();
      return false;
    }
  }

  Future<bool> updateStatus(String id, String status) async {
    try {
      await _services.orders.patch(id: id, status: status);
      await load();
      return true;
    } catch (e) {
      _error = e.toString();
      notifyListeners();
      return false;
    }
  }

  /// Capture proof-of-delivery: stores the receiver's [signatureDataUrl] (a
  /// `data:image/png;base64,...` string) and moves the order to `invoiced` so
  /// it surfaces in the Accounts (AP/AR) receivables list.
  Future<bool> signAndComplete(String id, String signatureDataUrl) async {
    try {
      await _services.orders.patch(
        id: id,
        status: 'invoiced',
        signature: signatureDataUrl,
      );
      await load();
      return true;
    } catch (e) {
      _error = e.toString();
      notifyListeners();
      return false;
    }
  }
}
