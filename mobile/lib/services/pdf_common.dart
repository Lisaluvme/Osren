import 'package:pdf/pdf.dart';
import 'package:pdf/widgets.dart' as pw;

import '../models/order.dart';

/// Company details printed in document headers/footers. Defaults mirror the web
/// app's placeholder company.
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

// Brand palette (matches theme/app_theme.dart + delivery_pdf_service.dart).
final PdfColor brandPrimary = PdfColor.fromInt(0xFF007BFF);
final PdfColor brandPrimaryLight = PdfColor.fromInt(0xFFE7F1FF);
final PdfColor brandSuccess = PdfColor.fromInt(0xFF28A745);
final PdfColor brandWarningBg = PdfColor.fromInt(0xFFFFF8E1);
final PdfColor brandInk = PdfColor.fromInt(0xFF212529);
final PdfColor brandSlate = PdfColor.fromInt(0xFF6C757D);
final PdfColor brandLine = PdfColor.fromInt(0xFFE3E7ED);

/// One row of the price table (decoupled from the order model so the invoice
/// and DO generators share the same renderer).
class PdfLineItem {
  const PdfLineItem({
    required this.name,
    required this.quantity,
    required this.unitPrice,
  });

  final String name;
  final num quantity;
  final num unitPrice;

  num get total => quantity * unitPrice;
}

List<PdfLineItem> lineItemsFromOrder(SalesOrder order) => order.items
    .map((i) => PdfLineItem(name: i.name, quantity: i.quantity, unitPrice: i.unitPrice))
    .toList(growable: false);

String moneyFmt(num v) => 'RM ${v.toStringAsFixed(2)}';

String formatDate(DateTime d) {
  final dd = d.day.toString().padLeft(2, '0');
  final mm = d.month.toString().padLeft(2, '0');
  return '$dd/$mm/${d.year}';
}

pw.Widget companyHeader(CompanyInfo ci) {
  return pw.Row(
    crossAxisAlignment: pw.CrossAxisAlignment.start,
    children: [
      pw.Expanded(
        child: pw.Column(
          crossAxisAlignment: pw.CrossAxisAlignment.start,
          children: [
            pw.Text(ci.name,
                style: pw.TextStyle(
                    color: brandPrimary,
                    fontSize: 22,
                    fontWeight: pw.FontWeight.bold)),
            pw.SizedBox(height: 4),
            pw.Text(ci.address, style: pw.TextStyle(color: brandSlate, fontSize: 10)),
          ],
        ),
      ),
      pw.Column(
        crossAxisAlignment: pw.CrossAxisAlignment.end,
        children: [
          pw.Text(ci.phone, style: pw.TextStyle(color: brandInk, fontSize: 10)),
          pw.SizedBox(height: 2),
          pw.Text(ci.email, style: pw.TextStyle(color: brandSlate, fontSize: 10)),
          pw.SizedBox(height: 2),
          pw.Text(ci.website, style: pw.TextStyle(color: brandSlate, fontSize: 10)),
        ],
      ),
    ],
  );
}

/// Coloured title bar (e.g. "DELIVERY ORDER", "INVOICE", "OFFICIAL RECEIPT").
pw.Widget titleBar(String text, {PdfColor? color}) {
  return pw.Container(
    width: double.infinity,
    padding: const pw.EdgeInsets.symmetric(vertical: 10, horizontal: 14),
    decoration: pw.BoxDecoration(color: color ?? brandPrimary),
    child: pw.Text(
      text,
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

pw.Widget sectionLabel(String text) => pw.Text(
      text,
      style: pw.TextStyle(
        color: brandInk,
        fontSize: 12,
        fontWeight: pw.FontWeight.bold,
      ),
    );

/// A labelled field used inside info boxes.
pw.Widget infoField(String label, String value) {
  return pw.Column(
    crossAxisAlignment: pw.CrossAxisAlignment.start,
    children: [
      pw.Text(label, style: pw.TextStyle(color: brandSlate, fontSize: 8)),
      pw.SizedBox(height: 2),
      pw.Text(value,
          style: pw.TextStyle(
              color: brandInk, fontSize: 11, fontWeight: pw.FontWeight.bold)),
    ],
  );
}

/// Standard items table: Item / Qty / Unit Price / Amount, with a TOTAL row.
pw.Widget priceItemsTable(List<PdfLineItem> items, num total) {
  const flexes = [4, 1, 2, 2];
  pw.Widget cell(String text,
      {required int flex,
      bool header = false,
      bool isTotal = false,
      pw.TextAlign align = pw.TextAlign.left}) {
    return pw.Expanded(
      flex: flex,
      child: pw.Padding(
        padding: const pw.EdgeInsets.symmetric(vertical: 6, horizontal: 6),
        child: pw.Text(
          text,
          textAlign: align,
          style: pw.TextStyle(
            color: isTotal ? PdfColors.white : brandInk,
            fontSize: 10,
            fontWeight: (header || isTotal)
                ? pw.FontWeight.bold
                : pw.FontWeight.normal,
          ),
        ),
      ),
    );
  }

  pw.Widget row(List<String> values, {bool header = false, bool isTotal = false}) {
    return pw.Container(
      decoration: pw.BoxDecoration(
        color: isTotal
            ? brandSuccess
            : (header ? brandPrimaryLight : null),
        border: pw.Border(bottom: pw.BorderSide(color: brandLine, width: 0.5)),
      ),
      child: pw.Row(
        children: [
          for (var i = 0; i < values.length; i++)
            cell(
              values[i],
              flex: flexes[i],
              header: header,
              isTotal: isTotal,
              align: i == 0 ? pw.TextAlign.left : pw.TextAlign.right,
            ),
        ],
      ),
    );
  }

  return pw.Column(
    children: [
      row(const ['Item', 'Qty', 'Unit Price', 'Amount'], header: true),
      for (final item in items)
        row([
          item.name,
          '${item.quantity}',
          moneyFmt(item.unitPrice),
          moneyFmt(item.total),
        ]),
      row(['TOTAL', '', '', moneyFmt(total)], isTotal: true),
    ],
  );
}

pw.Widget docFooter(CompanyInfo ci) {
  return pw.Container(
    width: double.infinity,
    padding: const pw.EdgeInsets.only(top: 8),
    decoration: pw.BoxDecoration(
      border: pw.Border(top: pw.BorderSide(color: brandLine, width: 0.8)),
    ),
    child: pw.Column(
      crossAxisAlignment: pw.CrossAxisAlignment.start,
      children: [
        pw.Text(ci.name,
            style: pw.TextStyle(
                color: brandInk, fontSize: 10, fontWeight: pw.FontWeight.bold)),
        pw.SizedBox(height: 2),
        pw.Text(
          'This is a computer-generated document. '
          'Please contact ${ci.phone} for any enquiries.',
          style: pw.TextStyle(color: brandSlate, fontSize: 8),
        ),
      ],
    ),
  );
}
