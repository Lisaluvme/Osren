import 'package:flutter/foundation.dart';

import '../models/finance.dart';
import '../services/services.dart';

/// AP/AR state: supplier invoices (payables), payment vouchers, receipt
/// collections (receivables), and the finance dashboard summary.
class FinanceProvider extends ChangeNotifier {
  FinanceProvider(this._services);

  final AppServices _services;

  List<SupplierInvoice> _invoices = const [];
  List<PaymentVoucher> _vouchers = const [];
  List<ReceiptCollection> _receipts = const [];
  FinanceDashboard _dashboard = FinanceDashboard.empty;
  bool _busy = false;
  String? _error;

  List<SupplierInvoice> get invoices => _invoices;
  List<PaymentVoucher> get vouchers => _vouchers;
  List<ReceiptCollection> get receipts => _receipts;
  FinanceDashboard get dashboard => _dashboard;
  bool get busy => _busy;
  String? get error => _error;

  num get outstandingPayables =>
      _invoices.where((i) => i.paymentStatus != 'PAID').fold<num>(
            0,
            (s, i) => s + i.amount,
          );

  num get totalCollected =>
      _receipts.fold<num>(0, (s, r) => s + r.amountReceived);

  Future<void> load() async {
    _busy = true;
    _error = null;
    notifyListeners();
    try {
      final results = await Future.wait([
        _services.finance.supplierInvoices(),
        _services.finance.paymentVouchers(),
        _services.finance.receiptCollections(),
        _services.finance.dashboard(),
      ]);
      _invoices = results[0] as List<SupplierInvoice>;
      _vouchers = results[1] as List<PaymentVoucher>;
      _receipts = results[2] as List<ReceiptCollection>;
      _dashboard = results[3] as FinanceDashboard;
    } catch (e) {
      _error = e.toString();
    } finally {
      _busy = false;
      notifyListeners();
    }
  }
}
