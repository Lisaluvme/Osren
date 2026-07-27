import 'package:flutter/foundation.dart';

/// Supplier invoice (AP), mirrored from the (currently unmounted) finance
/// route `/api/finance/supplier-invoices`. Field names match the backend.
@immutable
class SupplierInvoice {
  final String id;
  final String invoiceNumber;
  final String grnNumber;
  final String supplier;
  final String invoiceDate;
  final num amount;
  final String paymentStatus;
  final String? remarks;

  const SupplierInvoice({
    required this.id,
    required this.invoiceNumber,
    required this.grnNumber,
    required this.supplier,
    required this.invoiceDate,
    required this.amount,
    required this.paymentStatus,
    this.remarks,
  });

  factory SupplierInvoice.fromJson(Map<String, dynamic> json) {
    return SupplierInvoice(
      id: (json['id'] ?? '').toString(),
      invoiceNumber: (json['invoiceNumber'] ?? '').toString(),
      grnNumber: (json['grnNumber'] ?? '').toString(),
      supplier: (json['supplier'] ?? '').toString(),
      invoiceDate: (json['invoiceDate'] ?? '').toString(),
      amount: (json['amount'] ?? 0) as num,
      paymentStatus: (json['paymentStatus'] ?? 'PENDING').toString().toUpperCase(),
      remarks: json['remarks'] as String?,
    );
  }
}

/// Payment voucher (money out to a supplier), `/api/finance/payment-vouchers`.
@immutable
class PaymentVoucher {
  final String id;
  final String voucherNumber;
  final String date;
  final String supplier;
  final String invoiceNumber;
  final num amountPaid;
  final String paymentMethod;
  final String? referenceNo;
  final String? status;

  const PaymentVoucher({
    required this.id,
    required this.voucherNumber,
    required this.date,
    required this.supplier,
    required this.invoiceNumber,
    required this.amountPaid,
    required this.paymentMethod,
    this.referenceNo,
    this.status,
  });

  factory PaymentVoucher.fromJson(Map<String, dynamic> json) {
    return PaymentVoucher(
      id: (json['id'] ?? '').toString(),
      voucherNumber: (json['voucherNumber'] ?? '').toString(),
      date: (json['date'] ?? '').toString(),
      supplier: (json['supplier'] ?? '').toString(),
      invoiceNumber: (json['invoiceNumber'] ?? '').toString(),
      amountPaid: (json['amountPaid'] ?? 0) as num,
      paymentMethod: (json['paymentMethod'] ?? 'OTHER').toString(),
      referenceNo: json['referenceNo'] as String?,
      status: json['status'] as String?,
    );
  }
}

/// Receipt collection (money in from a customer), `/api/finance/receipt-collections`.
@immutable
class ReceiptCollection {
  final String id;
  final String receiptNumber;
  final String date;
  final String customer;
  final String invoiceNumber;
  final num amountReceived;
  final String paymentMethod;
  final String? referenceNo;
  final String? status;

  const ReceiptCollection({
    required this.id,
    required this.receiptNumber,
    required this.date,
    required this.customer,
    required this.invoiceNumber,
    required this.amountReceived,
    required this.paymentMethod,
    this.referenceNo,
    this.status,
  });

  factory ReceiptCollection.fromJson(Map<String, dynamic> json) {
    return ReceiptCollection(
      id: (json['id'] ?? '').toString(),
      receiptNumber: (json['receiptNumber'] ?? '').toString(),
      date: (json['date'] ?? '').toString(),
      customer: (json['customer'] ?? '').toString(),
      invoiceNumber: (json['invoiceNumber'] ?? '').toString(),
      amountReceived: (json['amountReceived'] ?? 0) as num,
      paymentMethod: (json['paymentMethod'] ?? 'OTHER').toString(),
      referenceNo: json['referenceNo'] as String?,
      status: json['status'] as String?,
    );
  }
}

/// AP/AR dashboard summary, `/api/finance/dashboard-summary`.
@immutable
class FinanceDashboard {
  final num totalReceivables;
  final num totalPayables;
  final num collectedThisPeriod;
  final num paidThisPeriod;

  const FinanceDashboard({
    required this.totalReceivables,
    required this.totalPayables,
    required this.collectedThisPeriod,
    required this.paidThisPeriod,
  });

  factory FinanceDashboard.fromJson(Map<String, dynamic> json) {
    return FinanceDashboard(
      totalReceivables: (json['totalReceivables'] ?? 0) as num,
      totalPayables: (json['totalPayables'] ?? 0) as num,
      collectedThisPeriod: (json['collectedThisPeriod'] ?? 0) as num,
      paidThisPeriod: (json['paidThisPeriod'] ?? 0) as num,
    );
  }

  static const empty = FinanceDashboard(
    totalReceivables: 0,
    totalPayables: 0,
    collectedThisPeriod: 0,
    paidThisPeriod: 0,
  );
}
