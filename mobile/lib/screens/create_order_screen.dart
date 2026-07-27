import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import '../models/inventory.dart';
import '../models/order.dart';
import '../providers/inventory_provider.dart';
import '../providers/orders_provider.dart';
import '../theme/app_theme.dart';
import '../widgets/common.dart';

/// Compose a new sales order against `POST /api/orders`.
class CreateOrderScreen extends StatefulWidget {
  const CreateOrderScreen({super.key});

  @override
  State<CreateOrderScreen> createState() => _CreateOrderScreenState();
}

class _CreateOrderScreenState extends State<CreateOrderScreen> {
  final _client = TextEditingController();
  final _address = TextEditingController();
  final _contact = TextEditingController();
  final _notes = TextEditingController();
  final _lines = <OrderLineItem>[];
  final _formKey = GlobalKey<FormState>();

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      final inv = context.read<InventoryProvider>();
      if (inv.items.isEmpty) inv.load();
    });
  }

  @override
  void dispose() {
    _client.dispose();
    _address.dispose();
    _contact.dispose();
    _notes.dispose();
    super.dispose();
  }

  num get _total =>
      _lines.fold<num>(0, (s, l) => s + l.quantity * l.unitPrice);

  void _addItem(InventoryItem item, num qty) {
    setState(() {
      final existing = _lines.indexWhere((l) => l.name == item.name);
      if (existing >= 0) {
        final old = _lines[existing];
        _lines[existing] = OrderLineItem(
          name: old.name,
          quantity: old.quantity + qty,
          unitPrice: old.unitPrice,
          itemTotal: (old.quantity + qty) * old.unitPrice,
        );
      } else {
        _lines.add(OrderLineItem(
          name: item.name,
          quantity: qty,
          unitPrice: item.sellingPrice,
          itemTotal: qty * item.sellingPrice,
        ));
      }
    });
  }

  Future<void> _submit() async {
    if (!_formKey.currentState!.validate()) return;
    if (_lines.isEmpty) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
            content: Text('Add at least one item'),
            backgroundColor: AppTheme.warning),
      );
      return;
    }
    final orders = context.read<OrdersProvider>();
    final ok = await orders.create(
      clientName: _client.text.trim(),
      items: _lines,
      deliveryAddress: _address.text.trim().isEmpty ? null : _address.text.trim(),
      contactNumber: _contact.text.trim().isEmpty ? null : _contact.text.trim(),
      notes: _notes.text.trim().isEmpty ? null : _notes.text.trim(),
    );
    if (!mounted) return;
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(
        content: Text(ok ? 'Order created' : (orders.error ?? 'Create failed')),
        backgroundColor: ok ? AppTheme.success : AppTheme.danger,
      ),
    );
    if (ok) Navigator.of(context).pop();
  }

  @override
  Widget build(BuildContext context) {
    final inv = context.watch<InventoryProvider>();
    return Scaffold(
      appBar: AppBar(title: const Text('New order')),
      body: Form(
        key: _formKey,
        child: ListView(
          padding: const EdgeInsets.all(16),
          children: [
            TextFormField(
              controller: _client,
              decoration: const InputDecoration(
                labelText: 'Customer name',
                prefixIcon: Icon(Icons.person_outline),
              ),
              validator: (v) =>
                  (v == null || v.trim().isEmpty) ? 'Required' : null,
            ),
            const SizedBox(height: 12),
            TextFormField(
              controller: _address,
              decoration: const InputDecoration(
                labelText: 'Delivery address (optional)',
                prefixIcon: Icon(Icons.location_on_outlined),
              ),
            ),
            const SizedBox(height: 12),
            TextFormField(
              controller: _contact,
              keyboardType: TextInputType.phone,
              decoration: const InputDecoration(
                labelText: 'Contact number (optional)',
                prefixIcon: Icon(Icons.phone_outlined),
              ),
            ),
            const SizedBox(height: 12),
            TextFormField(
              controller: _notes,
              maxLines: 2,
              decoration: const InputDecoration(
                labelText: 'Notes (optional)',
                prefixIcon: Icon(Icons.note_alt_outlined),
              ),
            ),
            const SizedBox(height: 20),
            Row(
              children: [
                const Text('Line items',
                    style:
                        TextStyle(fontWeight: FontWeight.w700, fontSize: 16)),
                const Spacer(),
                Text(formatMoney(_total),
                    style: const TextStyle(
                        fontWeight: FontWeight.w700,
                        color: AppTheme.primary)),
              ],
            ),
            const SizedBox(height: 8),
            if (_lines.isEmpty)
              const Padding(
                padding: EdgeInsets.symmetric(vertical: 12),
                child: Text('No items added yet. Pick from inventory below.',
                    style: TextStyle(color: AppTheme.slate, fontSize: 13)),
              )
            else
              Card(
                child: Column(
                  children: [
                    for (final l in _lines) ...[
                      ListTile(
                        dense: true,
                        title: Text(l.name),
                        subtitle: Text(
                            '${l.quantity} × ${formatMoney(l.unitPrice)}'),
                        trailing: Row(
                          mainAxisSize: MainAxisSize.min,
                          children: [
                            Text(formatMoney(l.quantity * l.unitPrice),
                                style: const TextStyle(
                                    fontWeight: FontWeight.w600)),
                            IconButton(
                              icon: const Icon(Icons.delete_outline,
                                  size: 20, color: AppTheme.danger),
                              onPressed: () =>
                                  setState(() => _lines.remove(l)),
                            ),
                          ],
                        ),
                      ),
                      if (l != _lines.last)
                        const Divider(height: 1, indent: 16),
                    ],
                  ],
                ),
              ),
            const SizedBox(height: 12),
            const Align(
              alignment: Alignment.centerLeft,
              child: Text('Tap a product to add 1 to the order',
                  style: TextStyle(color: AppTheme.slate, fontSize: 12)),
            ),
            const SizedBox(height: 8),
            if (inv.busy)
              const Center(
                  child: Padding(
                padding: EdgeInsets.all(16),
                child: CircularProgressIndicator(),
              ))
            else if (inv.items.isEmpty)
              const EmptyState(
                message: 'No inventory available to add.',
                icon: Icons.inventory_2_outlined,
              )
            else
              Wrap(
                spacing: 8,
                runSpacing: 8,
                children: [
                  for (final item in inv.items)
                    ActionChip(
                      label: Text(item.name),
                      avatar: CircleAvatar(
                        backgroundColor:
                            AppTheme.primary.withValues(alpha: 0.1),
                        child: Text(
                            item.sellingPrice.toStringAsFixed(0),
                            style: const TextStyle(
                                fontSize: 10, color: AppTheme.primary)),
                      ),
                      onPressed: () => _addItem(item, 1),
                    ),
                ],
              ),
            const SizedBox(height: 24),
            FilledButton.icon(
              onPressed: _submit,
              icon: const Icon(Icons.check),
              label: const Text('Create order'),
            ),
          ],
        ),
      ),
    );
  }
}
