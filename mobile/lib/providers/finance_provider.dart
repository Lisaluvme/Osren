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
  List<CustomerInvoice> _receivables = const [];
  FinanceDashboard _dashboard = FinanceDashboard.empty;
  bool _busy = false;
  String? _error;

  List<SupplierInvoice> get invoices => _invoices;
  List<PaymentVoucher> get vouchers => _vouchers;
  List<ReceiptCollection> get receipts => _receipts;
  List<CustomerInvoice> get receivables => _receivables;
  FinanceDashboard get dashboard => _dashboard;
  bool get busy => _busy;
  String? get error => _error;

  num get outstandingPayables =>
      _invoices.where((i) => i.paymentStatus != 'PAID').fold<num>(
            0,
            (s, i) => s + i.amount,
          );

  /// Total still owed on signed/delivered orders awaiting payment.
  num get totalReceivables =>
      _receivables.fold<num>(0, (s, r) => s + r.outstandingAmount);

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
        _services.finance.customerInvoicesOutstanding(),
        _services.finance.dashboard(),
      ]);
      _invoices = results[0] as List<SupplierInvoice>;
      _vouchers = results[1] as List<PaymentVoucher>;
      _receipts = results[2] as List<ReceiptCollection>;
      _receivables = results[3] as List<CustomerInvoice>;
      _dashboard = results[4] as FinanceDashboard;
    } catch (e) {
      _error = e.toString();
    } finally {
      _busy = false;
      notifyListeners();
    }
  }

  /// Create a customer invoice from a delivered order. The order stays
  /// delivered (not paid); the receivable moves Pending Invoice → Unpaid.
  /// Returns true on success.
  Future<bool> createInvoice(String orderId) async {
    try {
      await _services.finance.createCustomerInvoice(orderId: orderId);
      await load();
      return true;
    } catch (e) {
      _error = e.toString();
      notifyListeners();
      return false;
    }
  }

  /// Record a payment against a customer invoice [invoiceId]. Auto-generates a
  /// receipt, updates the invoice balance/status (Partial Paid / Paid), and
  /// marks the order `paid` once settled. Returns true on success.
  Future<bool> recordPayment(
    String invoiceId, {
    required num amount,
    required String method,
    String? reference,
    String? remarks,
  }) async {
    try {
      await _services.finance.recordInvoicePayment(
        invoiceId: invoiceId,
        amountReceived: amount,
        paymentMethod: method,
        referenceNo: reference,
        remarks: remarks,
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
