import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import '../models/finance.dart';
import '../providers/finance_provider.dart';
import '../theme/app_theme.dart';
import '../widgets/common.dart';

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
                    else
                      ElevatedButton.icon(
                        icon: const Icon(Icons.payments, size: 18),
                        label: const Text('Record Payment'),
                        onPressed: acting ? null : () => _recordPayment(r),
                      ),
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
    final ok = await fin.recordPayment(
      r.invoiceId!,
      amount: input.amount,
      method: input.method,
      reference: input.reference,
    );
    if (!mounted) return;
    setState(() => _busyId = null);
    _snack(
      ok
          ? 'Payment recorded for ${r.customer}'
          : (fin.error ?? 'Could not record payment'),
      ok: ok,
    );
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
