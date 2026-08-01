import 'dart:convert';
import 'dart:typed_data';

import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import '../models/finance.dart';
import '../providers/finance_provider.dart';
import '../services/invoice_pdf_service.dart';
import '../services/receipt_pdf_service.dart';
import '../services/services.dart';
import '../theme/app_theme.dart';
import '../widgets/common.dart';
import 'pdf_viewer_screen.dart';

/// Accounts payable / receivable overview.
///
/// Pulls supplier invoices, payment vouchers, and receipt collections from
/// `/api/finance/*`. If the finance route isn't mounted on the backend yet,
/// the error banner explains the 404 and offers retry.
class AccountsScreen extends StatefulWidget {
  const AccountsScreen({super.key});

  @override
  State<AccountsScreen> createState() => _AccountsScreenState();
}

class _AccountsScreenState extends State<AccountsScreen> {
  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      context.read<FinanceProvider>().load();
    });
  }

  @override
  Widget build(BuildContext context) {
    final fin = context.watch<FinanceProvider>();

    return DefaultTabController(
      length: 4,
      child: Column(
        children: [
          Padding(
            padding: const EdgeInsets.fromLTRB(16, 12, 16, 8),
            child: Row(
              children: [
                Expanded(
                  child: StatCard(
                    label: 'Receivable',
                    value: formatMoney(fin.totalReceivables),
                    icon: Icons.assignment_outlined,
                    accentColor: AppTheme.primary,
                    subtitle: '${fin.receivables.length} delivered',
                  ),
                ),
                const SizedBox(width: 8),
                Expanded(
                  child: StatCard(
                    label: 'Payables',
                    value: formatMoney(fin.outstandingPayables),
                    icon: Icons.arrow_upward_rounded,
                    accentColor: AppTheme.danger,
                    subtitle: '${fin.invoices.length} invoices',
                  ),
                ),
                const SizedBox(width: 8),
                Expanded(
                  child: StatCard(
                    label: 'Collected',
                    value: formatMoney(fin.totalCollected),
                    icon: Icons.arrow_downward_rounded,
                    accentColor: AppTheme.success,
                    subtitle: '${fin.receipts.length} receipts',
                  ),
                ),
              ],
            ),
          ),
          if (fin.error != null)
            Padding(
              padding: const EdgeInsets.symmetric(horizontal: 16),
              child: ErrorBanner(
                message:
                    'Could not load finance data. ${fin.error}. '
                    'Ensure /api/finance is mounted on the backend.',
                onRetry: () => fin.load(),
              ),
            ),
          Material(
            color: AppTheme.primary,
            child: const TabBar(
              tabs: [
                Tab(text: 'Receivable'),
                Tab(text: 'Invoices'),
                Tab(text: 'Payments'),
                Tab(text: 'Receipts'),
              ],
            ),
          ),
          Expanded(
            child: RefreshIndicator(
              onRefresh: () => fin.load(),
              child: TabBarView(
                children: [
                  _ReceivableList(fin),
                  _InvoiceList(fin),
                  _VoucherList(fin),
                  _ReceiptList(fin),
                ],
              ),
            ),
          ),
        ],
      ),
    );
  }
}

class _ReceivableList extends StatefulWidget {
  const _ReceivableList(this.fin);
  final FinanceProvider fin;

  @override
  State<_ReceivableList> createState() => _ReceivableListState();
}

class _ReceivableListState extends State<_ReceivableList> {
  /// Id of the receivable currently being acted on (shows a spinner, blocks
  /// re-taps).
  String? _busyId;

  FinanceProvider get fin => widget.fin;

  @override
  Widget build(BuildContext context) {
    if (fin.busy && fin.receivables.isEmpty) {
      return const Center(child: CircularProgressIndicator());
    }
    if (fin.receivables.isEmpty) {
      return ListView(
        children: const [
          SizedBox(height: 80),
          EmptyState(
            message:
                'No receivables yet. Signed deliveries appear here automatically.',
            icon: Icons.assignment_outlined,
          ),
        ],
      );
    }
    return ListView.separated(
      padding: const EdgeInsets.all(16),
      itemCount: fin.receivables.length,
      separatorBuilder: (_, _) => const SizedBox(height: 8),
      itemBuilder: (context, i) {
        final r = fin.receivables[i];
        final created = r.createdAt.isNotEmpty
            ? r.createdAt.split('T').first
            : '';
        final ref = (r.invoiceNumber != null && r.invoiceNumber!.isNotEmpty)
            ? r.invoiceNumber!
            : 'Delivered order';
        final line2 = r.isPendingInvoice
            ? 'Awaiting invoice creation'
            : 'Outstanding ${formatMoney(r.outstandingAmount)} '
                  'of ${formatMoney(r.invoiceAmount)}';
        final acting = _busyId == r.id;

        return Card(
          child: Column(
            children: [
              ListTile(
                title: Text(r.customer),
                subtitle: Text(
                  '$ref${created.isNotEmpty ? ' · $created' : ''}\n$line2',
                ),
                isThreeLine: true,
                trailing: Column(
                  crossAxisAlignment: CrossAxisAlignment.end,
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    Text(
                      formatMoney(r.outstandingAmount),
                      style: const TextStyle(fontWeight: FontWeight.w700),
                    ),
                    const SizedBox(height: 4),
                    StatusChip.auto(r.paymentStatus),
                  ],
                ),
              ),
              _DeliveryProof(r),
              Padding(
                padding: const EdgeInsets.only(right: 8, bottom: 8),
                child: Row(
                  mainAxisAlignment: MainAxisAlignment.end,
                  children: [
                    if (r.isPendingInvoice)
                      ElevatedButton.icon(
                        icon: const Icon(Icons.receipt_long, size: 18),
                        label: const Text('Create Invoice'),
                        onPressed: acting ? null : () => _createInvoice(r),
                      )
                    else ...[
                      IconButton.outlined(
                        tooltip: 'Print / save invoice',
                        icon: const Icon(Icons.picture_as_pdf_outlined, size: 20),
                        onPressed: acting ? null : () => _printInvoice(r),
                      ),
                      const SizedBox(width: 8),
                      ElevatedButton.icon(
                        icon: const Icon(Icons.payments, size: 18),
                        label: const Text('Record Payment'),
                        onPressed: acting ? null : () => _recordPayment(r),
                      ),
                    ],
                    if (acting) ...[
                      const SizedBox(width: 12),
                      const SizedBox(
                        width: 18,
                        height: 18,
                        child: CircularProgressIndicator(strokeWidth: 2),
                      ),
                    ],
                  ],
                ),
              ),
            ],
          ),
        );
      },
    );
  }

  Future<void> _createInvoice(CustomerInvoice r) async {
    setState(() => _busyId = r.id);
    final ok = await fin.createInvoice(r.orderId);
    if (!mounted) return;
    setState(() => _busyId = null);
    _snack(
      ok
          ? 'Invoice created for ${r.customer}'
          : (fin.error ?? 'Could not create invoice'),
      ok: ok,
    );
  }

  Future<void> _recordPayment(CustomerInvoice r) async {
    final input = await _showPaymentSheet(r);
    if (input == null || !mounted) return;
    setState(() => _busyId = r.id);
    final receipt = await fin.recordPayment(
      r.invoiceId!,
      amount: input.amount,
      method: input.method,
      reference: input.reference,
    );
    if (!mounted) return;
    setState(() => _busyId = null);
    if (receipt == null) {
      _snack(fin.error ?? 'Could not record payment', ok: false);
      return;
    }
    _snack('Payment recorded for ${r.customer}', ok: true);
    // Remaining balance after this payment (never negative).
    final balance =
        (r.outstandingAmount - input.amount).clamp(0, r.outstandingAmount);
    await _shareAndUploadReceipt(receipt, balanceDue: balance);
  }

  /// Generate the Invoice PDF, open the system share/print sheet, then upload
  /// it so it's recorded and downloadable.
  Future<void> _printInvoice(CustomerInvoice r) async {
    setState(() => _busyId = r.id);
    try {
      final bytes = await generateInvoicePdf(r);
      await _uploadPdf(
        bytes,
        docType: 'INVOICE',
        refId: r.invoiceId ?? r.id,
        docNumber: r.invoiceNumber ?? r.id,
      );
      if (!mounted) return;
      await Navigator.of(context).push(
        MaterialPageRoute(
          builder: (_) => PdfViewerScreen(
            bytes: bytes,
            title: 'Invoice ${r.invoiceNumber ?? ''}'.trim(),
            shareFilename: '${r.invoiceNumber ?? r.id}.pdf',
          ),
        ),
      );
    } catch (e) {
      _snack('Could not generate invoice PDF', ok: false);
    }
    if (!mounted) return;
    setState(() => _busyId = null);
  }

  /// Generate the Receipt PDF, open the share/print sheet, then upload it.
  Future<void> _shareAndUploadReceipt(
    ReceiptCollection receipt, {
    num? balanceDue,
  }) async {
    try {
      final bytes = await generateReceiptPdf(receipt, balanceDue: balanceDue);
      await _uploadPdf(
        bytes,
        docType: 'RECEIPT',
        refId: receipt.id,
        docNumber: receipt.receiptNumber,
      );
      if (!mounted) return;
      await Navigator.of(context).push(
        MaterialPageRoute(
          builder: (_) => PdfViewerScreen(
            bytes: bytes,
            title: 'Receipt ${receipt.receiptNumber}',
            shareFilename: '${receipt.receiptNumber}.pdf',
          ),
        ),
      );
    } catch (e) {
      // Payment was already recorded; viewing/upload is best-effort.
      debugPrint('Receipt PDF failed: $e');
    }
  }

  /// Upload a generated PDF so it's durably recorded. Best-effort: Supabase may
  /// not be configured yet, in which case the share/print above still worked.
  Future<void> _uploadPdf(
    Uint8List bytes, {
    required String docType,
    required String refId,
    required String docNumber,
  }) async {
    try {
      await context.read<AppServices>().documents.upload(
            bytes: bytes,
            docType: docType,
            refId: refId,
            docNumber: docNumber,
          );
    } catch (e) {
      debugPrint('PDF upload failed: $e');
    }
  }

  /// Amount + method + reference form for recording a payment.
  Future<_PaymentInput?> _showPaymentSheet(CustomerInvoice r) async {
    final amountCtrl = TextEditingController(
      text: r.outstandingAmount > 0
          ? r.outstandingAmount.toStringAsFixed(2)
          : '',
    );
    final refCtrl = TextEditingController();
    const methods = ['Cash', 'Bank Transfer', 'Cheque', 'Card / Online'];
    var method = methods.first;
    final formKey = GlobalKey<FormState>();

    return showModalBottomSheet<_PaymentInput>(
      context: context,
      isScrollControlled: true,
      builder: (ctx) {
        return Padding(
          padding: EdgeInsets.fromLTRB(
            16,
            16,
            16,
            16 + MediaQuery.of(ctx).viewInsets.bottom,
          ),
          child: Form(
            key: formKey,
            child: Column(
              mainAxisSize: MainAxisSize.min,
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  'Record Payment',
                  style: Theme.of(ctx).textTheme.titleMedium,
                ),
                const SizedBox(height: 4),
                Text(
                  '${r.customer}${r.invoiceNumber != null ? ' · ${r.invoiceNumber}' : ''}',
                  style: const TextStyle(color: AppTheme.slate),
                ),
                const SizedBox(height: 2),
                Text(
                  'Outstanding ${formatMoney(r.outstandingAmount)} '
                  'of ${formatMoney(r.invoiceAmount)}',
                  style: const TextStyle(color: AppTheme.slate),
                ),
                const SizedBox(height: 16),
                TextFormField(
                  controller: amountCtrl,
                  keyboardType: const TextInputType.numberWithOptions(
                    decimal: true,
                  ),
                  decoration: const InputDecoration(
                    labelText: 'Amount received',
                    prefixText: 'RM ',
                  ),
                  autofocus: true,
                  validator: (v) {
                    final n = num.tryParse((v ?? '').trim());
                    if (n == null || n <= 0) {
                      return 'Enter a positive amount';
                    }
                    if (n > r.outstandingAmount) {
                      return 'Exceeds outstanding (${formatMoney(r.outstandingAmount)})';
                    }
                    return null;
                  },
                ),
                const SizedBox(height: 12),
                DropdownButtonFormField<String>(
                  initialValue: method,
                  decoration: const InputDecoration(
                    labelText: 'Payment method',
                  ),
                  items: methods
                      .map((m) => DropdownMenuItem(value: m, child: Text(m)))
                      .toList(),
                  onChanged: (v) => method = v ?? methods.first,
                ),
                const SizedBox(height: 12),
                TextField(
                  controller: refCtrl,
                  decoration: const InputDecoration(
                    labelText: 'Reference no. (optional)',
                  ),
                ),
                const SizedBox(height: 20),
                SizedBox(
                  width: double.infinity,
                  child: ElevatedButton(
                    onPressed: () {
                      if (formKey.currentState?.validate() ?? false) {
                        Navigator.of(ctx).pop(
                          _PaymentInput(
                            amount: num.parse(amountCtrl.text.trim()),
                            method: method,
                            reference: refCtrl.text.trim().isEmpty
                                ? null
                                : refCtrl.text.trim(),
                          ),
                        );
                      }
                    },
                    child: const Text('Record payment'),
                  ),
                ),
              ],
            ),
          ),
        );
      },
    );
  }

  void _snack(String msg, {required bool ok}) {
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(
        content: Text(msg),
        backgroundColor: ok ? AppTheme.success : AppTheme.danger,
      ),
    );
  }
}

/// Captured values from the record-payment bottom sheet.
class _PaymentInput {
  const _PaymentInput({
    required this.amount,
    required this.method,
    this.reference,
  });

  final num amount;
  final String method;
  final String? reference;
}

/// Expandable proof-of-delivery block on a receivable card: the captured
/// signature, order line items, delivery address/contact, and a button to open
/// the signed Delivery Order PDF in-app. Hidden when there's nothing to show.
class _DeliveryProof extends StatelessWidget {
  const _DeliveryProof(this.r);
  final CustomerInvoice r;

  @override
  Widget build(BuildContext context) {
    final hasSig = r.signature != null && r.signature!.isNotEmpty;
    final hasAddr = r.deliveryAddress != null && r.deliveryAddress!.isNotEmpty;
    final hasContact = r.contactNumber != null && r.contactNumber!.isNotEmpty;
    final hasItems = r.items.isNotEmpty;
    final hasDo = r.doUrl != null && r.doUrl!.isNotEmpty;

    if (!hasSig && !hasAddr && !hasContact && !hasItems && !hasDo) {
      return const SizedBox.shrink();
    }

    return ExpansionTile(
      tilePadding: const EdgeInsets.symmetric(horizontal: 16),
      dense: true,
      title: const Row(
        children: [
          Icon(Icons.verified_outlined, size: 18, color: AppTheme.success),
          SizedBox(width: 8),
          Text('Delivery proof & order', style: TextStyle(fontSize: 13)),
        ],
      ),
      children: [
        if (hasSig)
          Padding(
            padding: const EdgeInsets.fromLTRB(16, 0, 16, 8),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                const Text('Customer signature',
                    style: TextStyle(fontSize: 11, color: AppTheme.slate)),
                const SizedBox(height: 4),
                Container(
                  padding: const EdgeInsets.all(6),
                  decoration: BoxDecoration(
                    border: Border.all(
                        color: AppTheme.slate.withValues(alpha: 0.3)),
                    borderRadius: BorderRadius.circular(6),
                  ),
                  child:
                      Image.memory(_signatureBytes(r.signature!), height: 64),
                ),
              ],
            ),
          ),
        if (hasAddr)
          ListTile(
            dense: true,
            leading: const Icon(Icons.location_on_outlined,
                size: 20, color: AppTheme.primary),
            title: Text(r.deliveryAddress!,
                style: const TextStyle(fontSize: 13)),
          ),
        if (hasContact)
          ListTile(
            dense: true,
            leading: const Icon(Icons.phone_outlined,
                size: 20, color: AppTheme.primary),
            title: Text(r.contactNumber!,
                style: const TextStyle(fontSize: 13)),
          ),
        for (final item in r.items)
          ListTile(
            dense: true,
            leading:
                const Icon(Icons.circle, size: 8, color: AppTheme.primary),
            title: Text(item.name),
            trailing: Text(
              '${item.quantity} × ${formatMoney(item.unitPrice)}',
              style: const TextStyle(fontSize: 13),
            ),
          ),
        if (r.notes != null && r.notes!.isNotEmpty)
          ListTile(
            dense: true,
            leading: const Icon(Icons.sticky_note_2_outlined,
                size: 20, color: AppTheme.slate),
            title:
                Text(r.notes!, style: const TextStyle(fontSize: 13)),
          ),
        if (hasDo)
          Padding(
            padding: const EdgeInsets.fromLTRB(16, 4, 16, 12),
            child: Align(
              alignment: Alignment.centerLeft,
              child: OutlinedButton.icon(
                icon: const Icon(Icons.picture_as_pdf_outlined, size: 18),
                label: const Text('View signed DO'),
                onPressed: () => Navigator.of(context).push(
                  MaterialPageRoute(
                    builder: (_) => PdfViewerScreen(
                      url: r.doUrl,
                      title: 'Delivery Order',
                      shareFilename: 'DO-${r.orderId}.pdf',
                    ),
                  ),
                ),
              ),
            ),
          ),
      ],
    );
  }
}

/// Decode the signature data URL (`data:image/png;base64,...`) to raw bytes for
/// [Image.memory].
Uint8List _signatureBytes(String dataUrl) {
  final b64 = dataUrl.contains(',') ? dataUrl.split(',').last : dataUrl;
  return base64Decode(b64);
}

class _InvoiceList extends StatelessWidget {
  const _InvoiceList(this.fin);
  final FinanceProvider fin;

  @override
  Widget build(BuildContext context) {
    if (fin.busy && fin.invoices.isEmpty) {
      return const Center(child: CircularProgressIndicator());
    }
    if (fin.invoices.isEmpty) {
      return ListView(
        children: const [
          SizedBox(height: 80),
          EmptyState(
            message: 'No supplier invoices.',
            icon: Icons.receipt_outlined,
          ),
        ],
      );
    }
    return ListView.separated(
      padding: const EdgeInsets.all(16),
      itemCount: fin.invoices.length,
      separatorBuilder: (_, _) => const SizedBox(height: 8),
      itemBuilder: (context, i) {
        final inv = fin.invoices[i];
        return Card(
          child: ListTile(
            title: Text(inv.supplier),
            subtitle: Text(
              '${inv.invoiceNumber} · GRN ${inv.grnNumber}\n${inv.invoiceDate.split("T").first}',
            ),
            isThreeLine: true,
            trailing: Column(
              crossAxisAlignment: CrossAxisAlignment.end,
              mainAxisSize: MainAxisSize.min,
              children: [
                Text(
                  formatMoney(inv.amount),
                  style: const TextStyle(fontWeight: FontWeight.w700),
                ),
                const SizedBox(height: 4),
                StatusChip.auto(inv.paymentStatus),
              ],
            ),
          ),
        );
      },
    );
  }
}

class _VoucherList extends StatelessWidget {
  const _VoucherList(this.fin);
  final FinanceProvider fin;

  @override
  Widget build(BuildContext context) {
    if (fin.busy && fin.vouchers.isEmpty) {
      return const Center(child: CircularProgressIndicator());
    }
    if (fin.vouchers.isEmpty) {
      return ListView(
        children: const [
          SizedBox(height: 80),
          EmptyState(
            message: 'No payment vouchers.',
            icon: Icons.payments_outlined,
          ),
        ],
      );
    }
    return ListView.separated(
      padding: const EdgeInsets.all(16),
      itemCount: fin.vouchers.length,
      separatorBuilder: (_, _) => const SizedBox(height: 8),
      itemBuilder: (context, i) {
        final v = fin.vouchers[i];
        return Card(
          child: ListTile(
            title: Text(v.supplier),
            subtitle: Text(
              '${v.voucherNumber} · ${v.date.split("T").first}\n${v.paymentMethod.replaceAll("_", " ")}',
            ),
            isThreeLine: true,
            trailing: Column(
              crossAxisAlignment: CrossAxisAlignment.end,
              mainAxisSize: MainAxisSize.min,
              children: [
                Text(
                  formatMoney(v.amountPaid),
                  style: const TextStyle(fontWeight: FontWeight.w700),
                ),
                if (v.status != null) ...[
                  const SizedBox(height: 4),
                  StatusChip.auto(v.status!),
                ],
              ],
            ),
          ),
        );
      },
    );
  }
}

class _ReceiptList extends StatelessWidget {
  const _ReceiptList(this.fin);
  final FinanceProvider fin;

  @override
  Widget build(BuildContext context) {
    if (fin.busy && fin.receipts.isEmpty) {
      return const Center(child: CircularProgressIndicator());
    }
    if (fin.receipts.isEmpty) {
      return ListView(
        children: const [
          SizedBox(height: 80),
          EmptyState(
            message: 'No receipt collections.',
            icon: Icons.savings_outlined,
          ),
        ],
      );
    }
    return ListView.separated(
      padding: const EdgeInsets.all(16),
      itemCount: fin.receipts.length,
      separatorBuilder: (_, _) => const SizedBox(height: 8),
      itemBuilder: (context, i) {
        final r = fin.receipts[i];
        return Card(
          child: ListTile(
            title: Text(r.customer),
            subtitle: Text(
              '${r.receiptNumber} · ${r.date.split("T").first}\n${r.paymentMethod.replaceAll("_", " ")}',
            ),
            isThreeLine: true,
            trailing: Column(
              crossAxisAlignment: CrossAxisAlignment.end,
              mainAxisSize: MainAxisSize.min,
              children: [
                Text(
                  formatMoney(r.amountReceived),
                  style: const TextStyle(fontWeight: FontWeight.w700),
                ),
                if (r.status != null) ...[
                  const SizedBox(height: 4),
                  StatusChip.auto(r.status!),
                ],
              ],
            ),
          ),
        );
      },
    );
  }
}
