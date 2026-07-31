import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import '../models/inventory.dart';
import '../providers/inventory_provider.dart';
import '../services/services.dart';
import '../theme/app_theme.dart';
import '../widgets/common.dart';

/// Warehouse operations: goods received (GRN), stock transfers, stock-take.
class WarehouseScreen extends StatelessWidget {
  const WarehouseScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return DefaultTabController(
      length: 3,
      child: Scaffold(
        appBar: PreferredSize(
          preferredSize: const Size.fromHeight(kToolbarHeight),
          child: Material(
            color: AppTheme.primary,
            child: const TabBar(
              tabs: [
                Tab(text: 'Receive'),
                Tab(text: 'Transfers'),
                Tab(text: 'Stock Take'),
              ],
            ),
          ),
        ),
        body: const TabBarView(
          children: [
            GrnFormTab(),
            TransferHistoryTab(),
            StockTakeTab(),
          ],
        ),
      ),
    );
  }
}

/// Loads the full inventory list once so item pickers everywhere are populated.
void _ensureInventory(BuildContext context) {
  final inv = context.read<InventoryProvider>();
  if (inv.items.isEmpty) inv.load();
}

/// Pick an inventory item; returns null if the user cancels.
Future<InventoryItem?> _pickItem(BuildContext context) async {
  final inv = context.read<InventoryProvider>();
  if (inv.items.isEmpty) await inv.load();
  return showModalBottomSheet<InventoryItem>(
    context: context,
    showDragHandle: true,
    builder: (ctx) {
      final items = context.read<InventoryProvider>().items;
      return ListView(
        shrinkWrap: true,
        children: [
          const Padding(
            padding: EdgeInsets.symmetric(horizontal: 16, vertical: 4),
            child: Text('Select product',
                style: TextStyle(fontWeight: FontWeight.w600)),
          ),
          for (final item in items)
            ListTile(
              title: Text(item.name),
              subtitle: Text('${item.sku} · ${item.quantity} on hand'),
              onTap: () => Navigator.of(ctx).pop(item),
            ),
        ],
      );
    },
  );
}

class GrnFormTab extends StatefulWidget {
  const GrnFormTab({super.key});
  @override
  State<GrnFormTab> createState() => _GrnFormTabState();
}

class _GrnFormTabState extends State<GrnFormTab> {
  InventoryItem? _item;
  final _qty = TextEditingController(text: '1');
  final _cost = TextEditingController();
  final _supplier = TextEditingController();
  final _remarks = TextEditingController();
  bool _saving = false;

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) => _ensureInventory(context));
  }

  @override
  void dispose() {
    _qty.dispose();
    _cost.dispose();
    _supplier.dispose();
    _remarks.dispose();
    super.dispose();
  }

  Future<void> _save() async {
    if (_item == null) {
      _toast('Pick a product first', AppTheme.warning);
      return;
    }
    setState(() => _saving = true);
    final services = context.read<AppServices>();
    try {
      await services.inventory.createGrn(
        grnNumber: 'GRN-${DateTime.now().millisecondsSinceEpoch}',
        date: DateTime.now().toIso8601String(),
        supplier: _supplier.text.trim().isEmpty
            ? (_item!.supplier)
            : _supplier.text.trim(),
        warehouse: 'Main',
        itemId: _item!.id,
        itemName: _item!.name,
        quantityReceived: num.tryParse(_qty.text) ?? 0,
        unitCost: num.tryParse(_cost.text),
        remarks: _remarks.text.trim().isEmpty ? null : _remarks.text.trim(),
      );
      await context.read<InventoryProvider>().load();
      if (mounted) {
        _toast('Goods received recorded', AppTheme.success);
        setState(() {
          _item = null;
          _qty.text = '1';
          _cost.clear();
          _supplier.clear();
          _remarks.clear();
        });
      }
    } catch (e) {
      if (mounted) _toast('Failed: $e', AppTheme.danger);
    } finally {
      if (mounted) setState(() => _saving = false);
    }
  }

  void _toast(String msg, Color color) {
    ScaffoldMessenger.of(context)
        .showSnackBar(SnackBar(content: Text(msg), backgroundColor: color));
  }

  @override
  Widget build(BuildContext context) {
    return ListView(
      padding: const EdgeInsets.all(16),
      children: [
        Text('Record goods received',
            style: Theme.of(context)
                .textTheme
                .titleMedium
                ?.copyWith(fontWeight: FontWeight.w700)),
        const SizedBox(height: 12),
        Card(
          child: ListTile(
            title: Text(_item?.name ?? 'Select product'),
            subtitle: Text(_item?.sku ?? 'Tap to choose'),
            trailing: const Icon(Icons.chevron_right),
            onTap: () async {
              final picked = await _pickItem(context);
              if (picked != null) setState(() => _item = picked);
            },
          ),
        ),
        const SizedBox(height: 12),
        TextField(
          controller: _qty,
          keyboardType: TextInputType.number,
          decoration: const InputDecoration(
            labelText: 'Quantity received',
            prefixIcon: Icon(Icons.inventory_outlined),
          ),
        ),
        const SizedBox(height: 12),
        TextField(
          controller: _cost,
          keyboardType: const TextInputType.numberWithOptions(decimal: true),
          decoration: const InputDecoration(
            labelText: 'Unit cost (optional)',
            prefixIcon: Icon(Icons.attach_money),
          ),
        ),
        const SizedBox(height: 12),
        TextField(
          controller: _supplier,
          decoration: InputDecoration(
            labelText: 'Supplier (defaults: ${_item?.supplier ?? "—"})',
            prefixIcon: const Icon(Icons.local_shipping_outlined),
          ),
        ),
        const SizedBox(height: 12),
        TextField(
          controller: _remarks,
          maxLines: 2,
          decoration: const InputDecoration(
            labelText: 'Remarks (optional)',
            prefixIcon: Icon(Icons.note_alt_outlined),
          ),
        ),
        const SizedBox(height: 20),
        FilledButton.icon(
          onPressed: _saving ? null : _save,
          icon: _saving
              ? const SizedBox(
                  width: 18,
                  height: 18,
                  child: CircularProgressIndicator(
                      strokeWidth: 2, color: Colors.white))
              : const Icon(Icons.save_alt_outlined),
          label: const Text('Record GRN'),
        ),
      ],
    );
  }
}

class TransferHistoryTab extends StatefulWidget {
  const TransferHistoryTab({super.key});
  @override
  State<TransferHistoryTab> createState() => _TransferHistoryTabState();
}

class _TransferHistoryTabState extends State<TransferHistoryTab> {
  List<dynamic> _history = const [];
  bool _busy = true;
  String? _error;

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    setState(() {
      _busy = true;
      _error = null;
    });
    try {
      _history = await context.read<AppServices>().inventory.transferHistory();
    } catch (e) {
      _error = e.toString();
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      floatingActionButton: FloatingActionButton.extended(
        onPressed: () => _showCreate(context),
        icon: const Icon(Icons.swap_horiz),
        label: const Text('New transfer'),
      ),
      body: RefreshIndicator(
        onRefresh: _load,
        child: _busy
            ? const Center(child: CircularProgressIndicator())
            : _error != null
                ? ListView(children: [
                    const SizedBox(height: 40),
                    ErrorBanner(message: _error!, onRetry: _load),
                  ])
                : _history.isEmpty
                    ? ListView(children: const [
                        SizedBox(height: 80),
                        EmptyState(
                          message: 'No stock transfers yet.',
                          icon: Icons.swap_horiz,
                        ),
                      ])
                    : ListView.separated(
                        padding: const EdgeInsets.all(16),
                        itemCount: _history.length,
                        separatorBuilder: (_, _) => const SizedBox(height: 8),
                        itemBuilder: (context, i) {
                          final t = _history[i];
                          return Card(
                            child: ListTile(
                              title: Text('${t.itemName} × ${t.quantity}'),
                              subtitle: Text(
                                  '${t.fromWarehouse} → ${t.toWarehouse}'),
                              trailing: Column(
                                crossAxisAlignment: CrossAxisAlignment.end,
                                mainAxisSize: MainAxisSize.min,
                                children: [
                                  Text(t.transferNumber,
                                      style: const TextStyle(
                                          fontSize: 12,
                                          color: AppTheme.slate)),
                                  const SizedBox(height: 4),
                                  StatusChip.auto(t.status),
                                ],
                              ),
                            ),
                          );
                        },
                      ),
      ),
    );
  }

  Future<void> _showCreate(BuildContext context) async {
    final created = await showDialog<bool>(
      context: context,
      builder: (_) => const _TransferDialog(),
    );
    if (created == true) _load();
  }
}

class _TransferDialog extends StatefulWidget {
  const _TransferDialog();
  @override
  State<_TransferDialog> createState() => _TransferDialogState();
}

class _TransferDialogState extends State<_TransferDialog> {
  InventoryItem? _item;
  final _qty = TextEditingController(text: '1');
  final _from = TextEditingController(text: 'Main');
  final _to = TextEditingController();
  bool _saving = false;

  @override
  void dispose() {
    _qty.dispose();
    _from.dispose();
    _to.dispose();
    super.dispose();
  }

  Future<void> _submit() async {
    if (_item == null || _to.text.trim().isEmpty) return;
    setState(() => _saving = true);
    try {
      await context.read<AppServices>().inventory.createTransfer(
            transferNumber: 'TRF-${DateTime.now().millisecondsSinceEpoch}',
            date: DateTime.now().toIso8601String(),
            fromWarehouse: _from.text.trim(),
            toWarehouse: _to.text.trim(),
            itemId: _item!.id,
            itemName: _item!.name,
            quantity: num.tryParse(_qty.text) ?? 0,
          );
      if (mounted) Navigator.of(context).pop(true);
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
            SnackBar(content: Text('Failed: $e'), backgroundColor: AppTheme.danger));
      }
    } finally {
      if (mounted) setState(() => _saving = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return AlertDialog(
      title: const Text('New stock transfer'),
      content: SizedBox(
        width: double.maxFinite,
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            ListTile(
              dense: true,
              contentPadding: EdgeInsets.zero,
              title: Text(_item?.name ?? 'Select product'),
              subtitle: Text(_item?.sku ?? 'Tap to choose'),
              trailing: const Icon(Icons.chevron_right),
              onTap: () async {
                final picked = await _pickItem(context);
                if (picked != null) setState(() => _item = picked);
              },
            ),
            TextField(
              controller: _qty,
              keyboardType: TextInputType.number,
              decoration: const InputDecoration(labelText: 'Quantity'),
            ),
            const SizedBox(height: 8),
            Row(
              children: [
                Expanded(
                  child: TextField(
                    controller: _from,
                    decoration: const InputDecoration(labelText: 'From'),
                  ),
                ),
                const Padding(
                  padding: EdgeInsets.symmetric(horizontal: 8),
                  child: Icon(Icons.arrow_forward),
                ),
                Expanded(
                  child: TextField(
                    controller: _to,
                    decoration: const InputDecoration(labelText: 'To'),
                  ),
                ),
              ],
            ),
          ],
        ),
      ),
      actions: [
        TextButton(
            onPressed: () => Navigator.of(context).pop(false),
            child: const Text('Cancel')),
        FilledButton(
          onPressed: _saving ? null : _submit,
          child: const Text('Transfer'),
        ),
      ],
    );
  }
}

class StockTakeTab extends StatefulWidget {
  const StockTakeTab({super.key});
  @override
  State<StockTakeTab> createState() => _StockTakeTabState();
}

class _StockTakeTabState extends State<StockTakeTab> {
  List<dynamic> _history = const [];
  bool _busy = true;
  String? _error;

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    setState(() {
      _busy = true;
      _error = null;
    });
    try {
      _history = await context.read<AppServices>().inventory.stockTakeHistory();
    } catch (e) {
      _error = e.toString();
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      floatingActionButton: FloatingActionButton.extended(
        onPressed: () => _showCreate(context),
        icon: const Icon(Icons.fact_check_outlined),
        label: const Text('New count'),
      ),
      body: RefreshIndicator(
        onRefresh: _load,
        child: _busy
            ? const Center(child: CircularProgressIndicator())
            : _error != null
                ? ListView(children: [
                    const SizedBox(height: 40),
                    ErrorBanner(message: _error!, onRetry: _load),
                  ])
                : _history.isEmpty
                    ? ListView(children: const [
                        SizedBox(height: 80),
                        EmptyState(
                          message: 'No stock counts recorded.',
                          icon: Icons.fact_check_outlined,
                        ),
                      ])
                    : ListView.separated(
                        padding: const EdgeInsets.all(16),
                        itemCount: _history.length,
                        separatorBuilder: (_, _) => const SizedBox(height: 8),
                        itemBuilder: (context, i) {
                          final t = _history[i];
                          return Card(
                            child: ListTile(
                              title: Text(t.itemName),
                              subtitle: Text(
                                  'System ${t.systemQuantity} · Counted ${t.actualQuantity}'),
                              trailing: Column(
                                crossAxisAlignment: CrossAxisAlignment.end,
                                mainAxisSize: MainAxisSize.min,
                                children: [
                                  Text('Var ${t.variance}',
                                      style: TextStyle(
                                        fontSize: 12,
                                        color: (t.variance as num) == 0
                                            ? AppTheme.success
                                            : AppTheme.danger,
                                        fontWeight: FontWeight.w600,
                                      )),
                                  const SizedBox(height: 4),
                                  StatusChip.auto(t.status),
                                ],
                              ),
                            ),
                          );
                        },
                      ),
      ),
    );
  }

  Future<void> _showCreate(BuildContext context) async {
    final created = await showDialog<bool>(
      context: context,
      builder: (_) => const _StockTakeDialog(),
    );
    if (created == true) _load();
  }
}

class _StockTakeDialog extends StatefulWidget {
  const _StockTakeDialog();
  @override
  State<_StockTakeDialog> createState() => _StockTakeDialogState();
}

class _StockTakeDialogState extends State<_StockTakeDialog> {
  InventoryItem? _item;
  final _actual = TextEditingController();
  final _reason = TextEditingController();
  bool _saving = false;

  @override
  void dispose() {
    _actual.dispose();
    _reason.dispose();
    super.dispose();
  }

  Future<void> _submit() async {
    if (_item == null) return;
    setState(() => _saving = true);
    try {
      await context.read<AppServices>().inventory.createStockTake(
            stockTakeNumber: 'ST-${DateTime.now().millisecondsSinceEpoch}',
            date: DateTime.now().toIso8601String(),
            warehouse: 'Main',
            itemId: _item!.id,
            itemName: _item!.name,
            systemQuantity: _item!.quantity,
            actualQuantity: num.tryParse(_actual.text) ?? 0,
            varianceReason: _reason.text.trim().isEmpty
                ? null
                : _reason.text.trim(),
          );
      if (mounted) Navigator.of(context).pop(true);
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
            SnackBar(content: Text('Failed: $e'), backgroundColor: AppTheme.danger));
      }
    } finally {
      if (mounted) setState(() => _saving = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return AlertDialog(
      title: const Text('Stock count'),
      content: SizedBox(
        width: double.maxFinite,
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            ListTile(
              dense: true,
              contentPadding: EdgeInsets.zero,
              title: Text(_item?.name ?? 'Select product'),
              subtitle: Text(_item == null
                  ? 'Tap to choose'
                  : 'System shows ${_item!.quantity} on hand'),
              trailing: const Icon(Icons.chevron_right),
              onTap: () async {
                final picked = await _pickItem(context);
                if (picked != null) setState(() => _item = picked);
              },
            ),
            TextField(
              controller: _actual,
              keyboardType: TextInputType.number,
              decoration: const InputDecoration(labelText: 'Actual counted qty'),
            ),
            const SizedBox(height: 8),
            TextField(
              controller: _reason,
              decoration:
                  const InputDecoration(labelText: 'Variance reason (optional)'),
            ),
          ],
        ),
      ),
      actions: [
        TextButton(
            onPressed: () => Navigator.of(context).pop(false),
            child: const Text('Cancel')),
        FilledButton(
          onPressed: _saving ? null : _submit,
          child: const Text('Save count'),
        ),
      ],
    );
  }
}
