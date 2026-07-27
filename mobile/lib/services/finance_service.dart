import '../models/finance.dart';
import 'api_client.dart';

/// Finance service — wraps `/api/finance/*` (AP/AR).
///
/// NOTE: the backend's `finance.js` route is NOT mounted in `server.js` by
/// default. These calls will 404 until `app.use('/api/finance',
/// require('./routes/finance'))` is added. The web app has the same gap.
/// The Flutter app surfaces the error gracefully; mounting the route makes
/// these screens live.
class FinanceService {
  FinanceService(this._api);

  final ApiClient _api;

  /// `GET /api/finance/supplier-invoices`.
  Future<List<SupplierInvoice>> supplierInvoices() async {
    final data = await _api.get('/finance/supplier-invoices');
    return _asList(data).map(SupplierInvoice.fromJson).toList();
  }

  /// `GET /api/finance/payment-vouchers`.
  Future<List<PaymentVoucher>> paymentVouchers() async {
    final data = await _api.get('/finance/payment-vouchers');
    return _asList(data).map(PaymentVoucher.fromJson).toList();
  }

  /// `GET /api/finance/receipt-collections`.
  Future<List<ReceiptCollection>> receiptCollections() async {
    final data = await _api.get('/finance/receipt-collections');
    return _asList(data).map(ReceiptCollection.fromJson).toList();
  }

  /// `POST /api/finance/payment-voucher`.
  Future<void> createPaymentVoucher({
    required String date,
    required String supplier,
    required String supplierInvoiceId,
    required String invoiceNumber,
    required num amountPaid,
    required String paymentMethod,
    String? referenceNo,
    String? remarks,
  }) async {
    await _api.post('/finance/payment-voucher', body: {
      'date': date,
      'supplier': supplier,
      'supplierInvoiceId': supplierInvoiceId,
      'invoiceNumber': invoiceNumber,
      'amountPaid': amountPaid,
      'paymentMethod': paymentMethod,
      if (referenceNo != null) 'referenceNo': referenceNo,
      if (remarks != null) 'remarks': remarks,
    });
  }

  /// `POST /api/finance/receipt-collection`.
  Future<void> createReceiptCollection({
    required String date,
    required String customer,
    required String customerInvoiceId,
    required String invoiceNumber,
    required num amountReceived,
    required String paymentMethod,
    String? referenceNo,
    String? remarks,
  }) async {
    await _api.post('/finance/receipt-collection', body: {
      'date': date,
      'customer': customer,
      'customerInvoiceId': customerInvoiceId,
      'invoiceNumber': invoiceNumber,
      'amountReceived': amountReceived,
      'paymentMethod': paymentMethod,
      if (referenceNo != null) 'referenceNo': referenceNo,
      if (remarks != null) 'remarks': remarks,
    });
  }

  /// `GET /api/finance/dashboard-summary`.
  Future<FinanceDashboard> dashboard() async {
    final data = await _api.get('/finance/dashboard-summary');
    if (data is! Map<String, dynamic>) return FinanceDashboard.empty;
    return FinanceDashboard.fromJson(data);
  }

  List<Map<String, dynamic>> _asList(dynamic data) {
    if (data is List) return data.cast<Map<String, dynamic>>();
    if (data is Map<String, dynamic> && data['data'] is List) {
      return (data['data'] as List).cast<Map<String, dynamic>>();
    }
    return const [];
  }
}
