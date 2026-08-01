import 'dart:typed_data';

import 'package:pdf/pdf.dart';
import 'package:pdf/widgets.dart' as pw;

import '../models/finance.dart';
import 'pdf_common.dart';

/// Builds an **Official Receipt** PDF for [receipt]. When [balanceDue] is
/// supplied, the remaining balance is shown. Layout mirrors the other
/// document generators (shared helpers in pdf_common.dart).
Future<Uint8List> generateReceiptPdf(
  ReceiptCollection receipt, {
  num? balanceDue,
  CompanyInfo? company,
}) async {
  final ci = company ?? CompanyInfo.defaultCompany;
  final date = DateTime.tryParse(receipt.date) ?? DateTime.now();

  final doc = pw.Document();
  doc.addPage(
    pw.MultiPage(
      pageFormat: PdfPageFormat.a4,
      margin: const pw.EdgeInsets.all(40),
      build: (ctx) => [
        companyHeader(ci),
        pw.SizedBox(height: 14),
        titleBar('OFFICIAL RECEIPT', color: brandSuccess),
        pw.SizedBox(height: 14),
        _infoBox(receipt, date),
        pw.SizedBox(height: 18),
        _receivedFrom(receipt),
        pw.SizedBox(height: 16),
        _amountBox(receipt),
        pw.SizedBox(height: 16),
        if (balanceDue != null) _balanceBox(balanceDue),
        pw.SizedBox(height: 28),
        docFooter(ci),
      ],
    ),
  );
  return doc.save();
}

pw.Widget _infoBox(ReceiptCollection receipt, DateTime date) {
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
        pw.Expanded(child: infoField('RECEIPT NO.', receipt.receiptNumber)),
        pw.Expanded(child: infoField('DATE', formatDate(date))),
        pw.Expanded(
            child: infoField('INVOICE REFERENCE', receipt.invoiceNumber.isNotEmpty ? receipt.invoiceNumber : '—')),
      ],
    ),
  );
}

pw.Widget _receivedFrom(ReceiptCollection receipt) {
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
        pw.Text('Received with thanks from',
            style: pw.TextStyle(color: brandSlate, fontSize: 9)),
        pw.SizedBox(height: 3),
        pw.Text(receipt.customer,
            style: pw.TextStyle(
                color: brandInk, fontSize: 12, fontWeight: pw.FontWeight.bold)),
        pw.SizedBox(height: 4),
        pw.Text(
          'Being payment for invoice ${receipt.invoiceNumber.isNotEmpty ? receipt.invoiceNumber : '—'} '
          '(${receipt.paymentMethod.replaceAll('_', ' ')})',
          style: pw.TextStyle(color: brandInk, fontSize: 10),
        ),
      ],
    ),
  );
}

pw.Widget _amountBox(ReceiptCollection receipt) {
  return pw.Container(
    width: double.infinity,
    padding: const pw.EdgeInsets.all(14),
    decoration: pw.BoxDecoration(
      color: brandSuccess,
      borderRadius: pw.BorderRadius.circular(8),
    ),
    child: pw.Row(
      crossAxisAlignment: pw.CrossAxisAlignment.center,
      children: [
        pw.Expanded(
          child: pw.Column(
            crossAxisAlignment: pw.CrossAxisAlignment.start,
            children: [
              pw.Text('AMOUNT RECEIVED',
                  style: pw.TextStyle(color: PdfColors.white, fontSize: 9)),
              pw.SizedBox(height: 2),
              pw.Text(moneyFmt(receipt.amountReceived),
                  style: pw.TextStyle(
                      color: PdfColors.white,
                      fontSize: 24,
                      fontWeight: pw.FontWeight.bold)),
            ],
          ),
        ),
        pw.Column(
          crossAxisAlignment: pw.CrossAxisAlignment.end,
          children: [
            pw.Text('Method',
                style: pw.TextStyle(color: PdfColors.white, fontSize: 8)),
            pw.Text(receipt.paymentMethod.replaceAll('_', ' '),
                style: pw.TextStyle(
                    color: PdfColors.white,
                    fontSize: 11,
                    fontWeight: pw.FontWeight.bold)),
            if (receipt.referenceNo != null &&
                receipt.referenceNo!.isNotEmpty) ...[
              pw.SizedBox(height: 4),
              pw.Text('Ref: ${receipt.referenceNo}',
                  style: pw.TextStyle(color: PdfColors.white, fontSize: 8)),
            ],
          ],
        ),
      ],
    ),
  );
}

pw.Widget _balanceBox(num balanceDue) {
  return pw.Container(
    width: double.infinity,
    padding: const pw.EdgeInsets.symmetric(vertical: 8, horizontal: 12),
    decoration: pw.BoxDecoration(
      color: brandWarningBg,
      borderRadius: pw.BorderRadius.circular(6),
    ),
    child: pw.Row(
      children: [
        pw.Expanded(
          child: pw.Text('Outstanding balance',
              style: pw.TextStyle(
                  color: brandInk, fontSize: 11, fontWeight: pw.FontWeight.bold)),
        ),
        pw.Text(moneyFmt(balanceDue),
            style: pw.TextStyle(
                color: brandInk, fontSize: 11, fontWeight: pw.FontWeight.bold)),
      ],
    ),
  );
}
