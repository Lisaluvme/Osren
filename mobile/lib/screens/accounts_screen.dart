import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

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
      length: 3,
      child: Column(
        children: [
          Padding(
            padding: const EdgeInsets.fromLTRB(16, 12, 16, 8),
            child: Row(
              children: [
                Expanded(
                  child: StatCard(
                    label: 'Payables',
                    value: formatMoney(fin.outstandingPayables),
                    icon: Icons.arrow_upward_rounded,
                    accentColor: AppTheme.danger,
                    subtitle: '${fin.invoices.length} invoices',
                  ),
                ),
                const SizedBox(width: 12),
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
                  onRetry: () => fin.load()),
            ),
          Material(
            color: AppTheme.primary,
            child: const TabBar(
              tabs: [
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

class _InvoiceList extends StatelessWidget {
  const _InvoiceList(this.fin);
  final FinanceProvider fin;

  @override
  Widget build(BuildContext context) {
    if (fin.busy && fin.invoices.isEmpty) {
      return const Center(child: CircularProgressIndicator());
    }
    if (fin.invoices.isEmpty) {
      return ListView(children: const [
        SizedBox(height: 80),
        EmptyState(
            message: 'No supplier invoices.', icon: Icons.receipt_outlined),
      ]);
    }
    return ListView.separated(
      padding: const EdgeInsets.all(16),
      itemCount: fin.invoices.length,
      separatorBuilder: (_, __) => const SizedBox(height: 8),
      itemBuilder: (context, i) {
        final inv = fin.invoices[i];
        return Card(
          child: ListTile(
            title: Text(inv.supplier),
            subtitle: Text(
                '${inv.invoiceNumber} · GRN ${inv.grnNumber}\n${inv.invoiceDate.split("T").first}'),
            isThreeLine: true,
            trailing: Column(
              crossAxisAlignment: CrossAxisAlignment.end,
              mainAxisSize: MainAxisSize.min,
              children: [
                Text(formatMoney(inv.amount),
                    style: const TextStyle(fontWeight: FontWeight.w700)),
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
      return ListView(children: const [
        SizedBox(height: 80),
        EmptyState(
            message: 'No payment vouchers.', icon: Icons.payments_outlined),
      ]);
    }
    return ListView.separated(
      padding: const EdgeInsets.all(16),
      itemCount: fin.vouchers.length,
      separatorBuilder: (_, __) => const SizedBox(height: 8),
      itemBuilder: (context, i) {
        final v = fin.vouchers[i];
        return Card(
          child: ListTile(
            title: Text(v.supplier),
            subtitle: Text(
                '${v.voucherNumber} · ${v.date.split("T").first}\n${v.paymentMethod.replaceAll("_", " ")}'),
            isThreeLine: true,
            trailing: Column(
              crossAxisAlignment: CrossAxisAlignment.end,
              mainAxisSize: MainAxisSize.min,
              children: [
                Text(formatMoney(v.amountPaid),
                    style: const TextStyle(fontWeight: FontWeight.w700)),
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
      return ListView(children: const [
        SizedBox(height: 80),
        EmptyState(
            message: 'No receipt collections.', icon: Icons.savings_outlined),
      ]);
    }
    return ListView.separated(
      padding: const EdgeInsets.all(16),
      itemCount: fin.receipts.length,
      separatorBuilder: (_, __) => const SizedBox(height: 8),
      itemBuilder: (context, i) {
        final r = fin.receipts[i];
        return Card(
          child: ListTile(
            title: Text(r.customer),
            subtitle: Text(
                '${r.receiptNumber} · ${r.date.split("T").first}\n${r.paymentMethod.replaceAll("_", " ")}'),
            isThreeLine: true,
            trailing: Column(
              crossAxisAlignment: CrossAxisAlignment.end,
              mainAxisSize: MainAxisSize.min,
              children: [
                Text(formatMoney(r.amountReceived),
                    style: const TextStyle(fontWeight: FontWeight.w700)),
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
