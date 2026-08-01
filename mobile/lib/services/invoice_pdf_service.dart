import 'dart:typed_data';

import 'package:pdf/pdf.dart';
import 'package:pdf/widgets.dart' as pw;

import '../models/finance.dart';
import '../models/order.dart';
import 'pdf_common.dart';

/// Builds an **Invoice** PDF for [invoice]. When the source [order] is supplied
/// its line items are rendered; otherwise a single amount line is shown.
/// Layout mirrors the Delivery Order PDF (shared helpers in pdf_common.dart).
Future<Uint8List> generateInvoicePdf(
  CustomerInvoice invoice, {
  SalesOrder? order,
  CompanyInfo? company,
}) async {
  final ci = company ?? CompanyInfo.defaultCompany;
  final date = DateTime.tryParse(invoice.createdAt) ?? DateTime.now();
  final items = order != null ? lineItemsFromOrder(order) : const <PdfLineItem>[];

  final doc = pw.Document();
  doc.addPage(
    pw.MultiPage(
      pageFormat: PdfPageFormat.a4,
      margin: const pw.EdgeInsets.all(40),
      build: (ctx) => [
        companyHeader(ci),
        pw.SizedBox(height: 14),
        titleBar('INVOICE'),
        pw.SizedBox(height: 14),
        _infoBox(invoice, date),
        pw.SizedBox(height: 16),
        sectionLabel('Billed To'),
        pw.SizedBox(height: 6),
        _customerBox(invoice, order),
        pw.SizedBox(height: 16),
        sectionLabel('Invoice Items'),
        pw.SizedBox(height: 6),
        if (items.isNotEmpty)
          priceItemsTable(items, invoice.invoiceAmount)
        else
          _singleAmountTable(invoice.invoiceAmount),
        pw.SizedBox(height: 14),
        _totalsBox(invoice),
        pw.SizedBox(height: 28),
        docFooter(ci),
      ],
    ),
  );
  return doc.save();
}

pw.Widget _infoBox(CustomerInvoice invoice, DateTime date) {
  return pw.Container(
    width: double.infinity,
    padding: const pw.EdgeInsets.all(12),
    decoration: pw.BoxDecoration(
      color: brandPrimaryLight,
      borderRadius: pw.BorderRadius.circular(8),
    ),
    child: pw.Row(
      crossAxisAlignment: pw.CrossAxisAlignment.start,
      children: [
        pw.Expanded(
            child: infoField('INVOICE NO.', invoice.invoiceNumber ?? '—')),
        pw.Expanded(child: infoField('INVOICE DATE', formatDate(date))),
        pw.Expanded(child: infoField('ORDER REFERENCE', '#${invoice.orderId}')),
        pw.Expanded(child: infoField('STATUS', invoice.paymentStatus)),
      ],
    ),
  );
}

pw.Widget _customerBox(CustomerInvoice invoice, SalesOrder? order) {
  return pw.Container(
    width: double.infinity,
    padding: const pw.EdgeInsets.all(10),
    decoration: pw.BoxDecoration(
      border: pw.Border(
        top: pw.BorderSide(color: brandLine, width: 0.8),
        bottom: pw.BorderSide(color: brandLine, width: 0.8),
      ),
    ),
    child: pw.Column(
      crossAxisAlignment: pw.CrossAxisAlignment.start,
      children: [
        pw.Text(invoice.customer,
            style: pw.TextStyle(
                color: brandInk, fontSize: 12, fontWeight: pw.FontWeight.bold)),
        if (order?.deliveryAddress?.isNotEmpty == true) ...[
          pw.SizedBox(height: 4),
          pw.Text(order!.deliveryAddress!,
              style: pw.TextStyle(color: brandInk, fontSize: 10)),
        ],
        if (order?.contactNumber?.isNotEmpty == true) ...[
          pw.SizedBox(height: 2),
          pw.Text('Phone: ${order!.contactNumber}',
              style: pw.TextStyle(color: brandSlate, fontSize: 10)),
        ],
      ],
    ),
  );
}

/// Used when the source order (and therefore line items) isn't available.
pw.Widget _singleAmountTable(num amount) {
  return pw.Container(
    decoration: pw.BoxDecoration(
      color: brandPrimaryLight,
      border: pw.Border(bottom: pw.BorderSide(color: brandLine, width: 0.5)),
    ),
    child: pw.Row(
      children: [
        pw.Expanded(
          flex: 7,
          child: pw.Padding(
            padding: const pw.EdgeInsets.symmetric(vertical: 6, horizontal: 6),
            child: pw.Text('Invoice total',
                style: pw.TextStyle(
                    color: brandInk, fontSize: 10, fontWeight: pw.FontWeight.bold)),
          ),
        ),
        pw.Expanded(
          flex: 3,
          child: pw.Padding(
            padding: const pw.EdgeInsets.symmetric(vertical: 6, horizontal: 6),
            child: pw.Text(moneyFmt(amount),
                textAlign: pw.TextAlign.right,
                style: pw.TextStyle(
                    color: brandInk, fontSize: 10, fontWeight: pw.FontWeight.bold)),
          ),
        ),
      ],
    ),
  );
}

pw.Widget _totalsBox(CustomerInvoice invoice) {
  pw.Widget line(String label, num value, {bool emphasis = false}) => pw.Container(
        padding: const pw.EdgeInsets.symmetric(vertical: 4, horizontal: 10),
        decoration: pw.BoxDecoration(
          color: emphasis ? brandSuccess : null,
          borderRadius: pw.BorderRadius.circular(6),
        ),
        child: pw.Row(
          children: [
            pw.Expanded(
              child: pw.Text(label,
                  style: pw.TextStyle(
                      color: emphasis ? PdfColors.white : brandSlate,
                      fontSize: 11,
                      fontWeight: pw.FontWeight.bold)),
            ),
            pw.Text(moneyFmt(value),
                style: pw.TextStyle(
                    color: emphasis ? PdfColors.white : brandInk,
                    fontSize: 11,
                    fontWeight: pw.FontWeight.bold)),
          ],
        ),
      );
  return pw.Align(
    alignment: pw.Alignment.centerRight,
    child: pw.ConstrainedBox(
      constraints: const pw.BoxConstraints(maxWidth: 260),
      child: pw.Column(
        crossAxisAlignment: pw.CrossAxisAlignment.stretch,
        children: [
          line('Invoice amount', invoice.invoiceAmount),
          line('Amount received', invoice.receivedAmount),
          line('Balance due', invoice.outstandingAmount, emphasis: true),
        ],
      ),
    ),
  );
}
