import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import '../models/inventory.dart';
import '../providers/inventory_provider.dart';
import '../services/services.dart';
import '../theme/app_theme.dart';

/// Warehouse operations: goods received (GRN) — add stock.
class WarehouseScreen extends StatelessWidget {
  const WarehouseScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return const GrnFormTab();
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
  if (!context.mounted) return null;
  final items = inv.items;
  return showModalBottomSheet<InventoryItem>(
    context: context,
    showDragHandle: true,
    builder: (ctx) {
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
    final inventory = context.read<InventoryProvider>();
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
      await inventory.load();
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
