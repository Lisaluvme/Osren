import 'dart:convert';
import 'dart:typed_data';

import 'package:pdf/pdf.dart';
import 'package:pdf/widgets.dart' as pw;

import '../models/order.dart';

/// Company details printed in the DO header/footer. Defaults mirror the web
/// app's `deliveryOrderPDFService.ts` placeholder company; override per call.
class CompanyInfo {
  const CompanyInfo({
    required this.name,
    required this.address,
    required this.phone,
    required this.email,
    required this.website,
  });

  final String name;
  final String address;
  final String phone;
  final String email;
  final String website;

  static const CompanyInfo defaultCompany = CompanyInfo(
    name: 'OSREN Integrated Ops',
    address: 'Your Company Address',
    phone: '+60 12-345 6789',
    email: 'info@osren.com',
    website: 'www.osren.com',
  );
}

// Brand palette (matches theme/app_theme.dart).
final PdfColor _primary = PdfColor.fromInt(0xFF007BFF);
final PdfColor _primaryLight = PdfColor.fromInt(0xFFE7F1FF);
final PdfColor _success = PdfColor.fromInt(0xFF28A745);
final PdfColor _warningBg = PdfColor.fromInt(0xFFFFF8E1);
final PdfColor _ink = PdfColor.fromInt(0xFF212529);
final PdfColor _slate = PdfColor.fromInt(0xFF6C757D);
final PdfColor _line = PdfColor.fromInt(0xFFE3E7ED);

/// Builds a Delivery Order PDF for [order] and returns the raw bytes.
///
/// Layout mirrors the web `generateDeliveryOrderPDF` (jsPDF): company header,
/// "DELIVERY ORDER" title bar, info box (DO number/date/ref/status), delivery
/// information, items table + total, notes box, and footer. Per-line unit
/// prices use each item's `unitPrice` (the web version rendered them as 0).
Future<Uint8List> generateDeliveryOrderPdf(
  SalesOrder order, {
  CompanyInfo? company,
}) async {
  final ci = company ?? CompanyInfo.defaultCompany;
  final date = DateTime.tryParse(order.createdAt) ?? DateTime.now();
  final doNumber = _doNumber(order.id, date);

  final doc = pw.Document();
  doc.addPage(
    pw.MultiPage(
      pageFormat: PdfPageFormat.a4,
      margin: const pw.EdgeInsets.all(40),
      build: (ctx) => [
        _companyHeader(ci),
        pw.SizedBox(height: 14),
        _titleBar(),
        pw.SizedBox(height: 14),
        _infoBox(order, doNumber, date),
        pw.SizedBox(height: 16),
        _sectionLabel('Delivery Information'),
        pw.SizedBox(height: 6),
        _deliveryInfo(order),
        pw.SizedBox(height: 16),
        _sectionLabel('Delivery Items'),
        pw.SizedBox(height: 6),
        _itemsTable(order),
        pw.SizedBox(height: 18),
        _notesBox(order),
        if (_hasSignature(order)) ...[
          pw.SizedBox(height: 16),
          _signatureBlock(order),
        ],
        pw.SizedBox(height: 28),
        _footer(ci),
      ],
    ),
  );
  return doc.save();
}

pw.Widget _companyHeader(CompanyInfo ci) {
  return pw.Row(
    crossAxisAlignment: pw.CrossAxisAlignment.start,
    children: [
      pw.Expanded(
        child: pw.Column(
          crossAxisAlignment: pw.CrossAxisAlignment.start,
          children: [
            pw.Text(ci.name,
                style: pw.TextStyle(
                    color: _primary,
                    fontSize: 22,
                    fontWeight: pw.FontWeight.bold)),
            pw.SizedBox(height: 4),
            pw.Text(ci.address, style: pw.TextStyle(color: _slate, fontSize: 10)),
          ],
        ),
      ),
      pw.Column(
        crossAxisAlignment: pw.CrossAxisAlignment.end,
        children: [
          pw.Text(ci.phone, style: pw.TextStyle(color: _ink, fontSize: 10)),
          pw.SizedBox(height: 2),
          pw.Text(ci.email, style: pw.TextStyle(color: _slate, fontSize: 10)),
          pw.SizedBox(height: 2),
          pw.Text(ci.website, style: pw.TextStyle(color: _slate, fontSize: 10)),
        ],
      ),
    ],
  );
}

pw.Widget _titleBar() {
  return pw.Container(
    width: double.infinity,
    padding: const pw.EdgeInsets.symmetric(vertical: 10, horizontal: 14),
    decoration: pw.BoxDecoration(color: _primary),
    child: pw.Text(
      'DELIVERY ORDER',
      textAlign: pw.TextAlign.center,
      style: pw.TextStyle(
        color: PdfColors.white,
        fontSize: 18,
        fontWeight: pw.FontWeight.bold,
        letterSpacing: 1.5,
      ),
    ),
  );
}

pw.Widget _infoBox(SalesOrder order, String doNumber, DateTime date) {
  pw.Widget field(String label, String value) => pw.Column(
        crossAxisAlignment: pw.CrossAxisAlignment.start,
        children: [
          pw.Text(label,
              style: pw.TextStyle(color: _slate, fontSize: 8)),
          pw.SizedBox(height: 2),
          pw.Text(value,
              style: pw.TextStyle(
                  color: _ink, fontSize: 11, fontWeight: pw.FontWeight.bold)),
        ],
      );
  return pw.Container(
    width: double.infinity,
    padding: const pw.EdgeInsets.all(12),
    decoration: pw.BoxDecoration(
      color: _primaryLight,
      borderRadius: pw.BorderRadius.circular(8),
    ),
    child: pw.Row(
      crossAxisAlignment: pw.CrossAxisAlignment.start,
      children: [
        pw.Expanded(child: field('DELIVERY ORDER NO.', doNumber)),
        pw.Expanded(child: field('DELIVERY DATE', _formatDate(date))),
        pw.Expanded(child: field('ORDER REFERENCE', '#${order.id}')),
        pw.Expanded(child: field('STATUS', 'READY FOR DELIVERY')),
      ],
    ),
  );
}

pw.Widget _sectionLabel(String text) => pw.Text(
      text,
      style: pw.TextStyle(
        color: _ink,
        fontSize: 12,
        fontWeight: pw.FontWeight.bold,
      ),
    );

pw.Widget _deliveryInfo(SalesOrder order) {
  pw.Widget line(String icon, String text) => pw.Padding(
        padding: const pw.EdgeInsets.only(bottom: 3),
        child: pw.Row(
          crossAxisAlignment: pw.CrossAxisAlignment.start,
          children: [
            pw.SizedBox(
              width: 16,
              child: pw.Text(icon, style: pw.TextStyle(fontSize: 10)),
            ),
            pw.Expanded(
              child: pw.Text(text,
                  style: pw.TextStyle(color: _ink, fontSize: 10)),
            ),
          ],
        ),
      );
  return pw.Container(
    width: double.infinity,
    padding: const pw.EdgeInsets.all(10),
    decoration: pw.BoxDecoration(
      border: pw.Border(
        top: pw.BorderSide(color: _line, width: 0.8),
        bottom: pw.BorderSide(color: _line, width: 0.8),
      ),
    ),
    child: pw.Column(
      crossAxisAlignment: pw.CrossAxisAlignment.start,
      children: [
        pw.Text(order.clientName,
            style: pw.TextStyle(
                color: _ink, fontSize: 12, fontWeight: pw.FontWeight.bold)),
        pw.SizedBox(height: 4),
        line('Location', order.deliveryAddress?.isNotEmpty == true
            ? order.deliveryAddress!
            : '—'),
        if (order.contactNumber?.isNotEmpty == true)
          line('Phone', order.contactNumber!),
      ],
    ),
  );
}

pw.Widget _itemsTable(SalesOrder order) {
  const flexes = [4, 1, 2, 2];
  pw.Widget cell(String text,
      {required int flex,
      bool header = false,
      bool total = false,
      pw.TextAlign align = pw.TextAlign.left}) {
    return pw.Expanded(
      flex: flex,
      child: pw.Padding(
        padding: const pw.EdgeInsets.symmetric(vertical: 6, horizontal: 6),
        child: pw.Text(
          text,
          textAlign: align,
          style: pw.TextStyle(
            color: total ? PdfColors.white : _ink,
            fontSize: 10,
            fontWeight: (header || total) ? pw.FontWeight.bold : pw.FontWeight.normal,
          ),
        ),
      ),
    );
  }

  pw.Widget row(List<String> values,
          {bool header = false, bool total = false}) =>
      pw.Container(
        decoration: pw.BoxDecoration(
          color: total
              ? _success
              : (header ? _primaryLight : null),
          border: pw.Border(bottom: pw.BorderSide(color: _line, width: 0.5)),
        ),
        child: pw.Row(
          children: [
            for (var i = 0; i < values.length; i++)
              cell(
                values[i],
                flex: flexes[i],
                header: header,
                total: total,
                align: i == 0 ? pw.TextAlign.left : pw.TextAlign.right,
              ),
          ],
        ),
      );

  return pw.Column(
    children: [
      row(const ['Item', 'Qty', 'Unit Price', 'Amount'], header: true),
      for (final item in order.items)
        row([
          item.name,
          '${item.quantity}',
          _money(item.unitPrice),
          _money(item.quantity * item.unitPrice),
        ]),
      row([
        'TOTAL',
        '',
        '',
        _money(order.totalAmount),
      ], total: true),
    ],
  );
}

pw.Widget _notesBox(SalesOrder order) {
  final hasNotes = order.notes?.isNotEmpty == true;
  if (hasNotes) {
    return pw.Container(
      width: double.infinity,
      padding: const pw.EdgeInsets.all(10),
      decoration: pw.BoxDecoration(
        color: _warningBg,
        borderRadius: pw.BorderRadius.circular(6),
        border: pw.Border.all(color: PdfColor.fromInt(0xFFFFC107), width: 0.6),
      ),
      child: pw.Column(
        crossAxisAlignment: pw.CrossAxisAlignment.start,
        children: [
          pw.Text('Delivery Instructions',
              style: pw.TextStyle(
                  color: _ink, fontSize: 10, fontWeight: pw.FontWeight.bold)),
          pw.SizedBox(height: 4),
          pw.Text(order.notes!,
              style: pw.TextStyle(color: _ink, fontSize: 10)),
        ],
      ),
    );
  }
  return pw.Container(
    width: double.infinity,
    padding: const pw.EdgeInsets.all(10),
    decoration: pw.BoxDecoration(
      color: PdfColor.fromInt(0xFFE8F5E9),
      borderRadius: pw.BorderRadius.circular(6),
    ),
    child: pw.Text(
      'Delivery confirmation required. Receiver signature required upon delivery.',
      style: pw.TextStyle(color: _success, fontSize: 10),
    ),
  );
}

bool _hasSignature(SalesOrder order) {
  final sig = order.signature;
  return sig != null && sig.isNotEmpty && sig.contains(',');
}

/// Proof-of-delivery block: renders the captured customer signature (a
/// `data:image/png;base64,...` URL stored on the order) beside the receiver.
pw.Widget _signatureBlock(SalesOrder order) {
  final b64 = order.signature!.substring(order.signature!.indexOf(',') + 1);
  return pw.Column(
    crossAxisAlignment: pw.CrossAxisAlignment.start,
    children: [
      _sectionLabel('Proof of Delivery'),
      pw.SizedBox(height: 6),
      pw.Container(
        padding: const pw.EdgeInsets.all(10),
        decoration: pw.BoxDecoration(
          color: PdfColor.fromInt(0xFFE8F5E9),
          borderRadius: pw.BorderRadius.circular(6),
        ),
        child: pw.Row(
          crossAxisAlignment: pw.CrossAxisAlignment.center,
          children: [
            pw.Image(pw.MemoryImage(base64Decode(b64)),
                height: 56, width: 150, fit: pw.BoxFit.contain),
            pw.SizedBox(width: 12),
            pw.Expanded(
              child: pw.Text('Received by: ${order.clientName}',
                  style: pw.TextStyle(
                      color: _ink,
                      fontSize: 10,
                      fontWeight: pw.FontWeight.bold)),
            ),
          ],
        ),
      ),
    ],
  );
}

pw.Widget _footer(CompanyInfo ci) {
  return pw.Container(
    width: double.infinity,
    padding: const pw.EdgeInsets.only(top: 8),
    decoration: pw.BoxDecoration(
      border: pw.Border(top: pw.BorderSide(color: _line, width: 0.8)),
    ),
    child: pw.Column(
      crossAxisAlignment: pw.CrossAxisAlignment.start,
      children: [
        pw.Text(ci.name,
            style: pw.TextStyle(
                color: _ink, fontSize: 10, fontWeight: pw.FontWeight.bold)),
        pw.SizedBox(height: 2),
        pw.Text(
          'This delivery order is an official confirmation of goods delivery. '
          'Please contact ${ci.phone} for any enquiries.',
          style: pw.TextStyle(color: _slate, fontSize: 8),
        ),
      ],
    ),
  );
}

String _doNumber(String orderId, DateTime date) {
  final d = '${date.year}-${date.month.toString().padLeft(2, '0')}-${date.day.toString().padLeft(2, '0')}';
  final cleaned = orderId.replaceAll(RegExp(r'[^a-zA-Z0-9]'), '').toUpperCase();
  final suffix = (cleaned.length >= 6
          ? cleaned.substring(cleaned.length - 6)
          : cleaned.padLeft(6, '0'));
  return 'DO-$d-$suffix';
}

String _formatDate(DateTime d) {
  final dd = d.day.toString().padLeft(2, '0');
  final mm = d.month.toString().padLeft(2, '0');
  return '$dd/$mm/${d.year}';
}

String _money(num v) => 'RM ${v.toStringAsFixed(2)}';
