import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import '../models/inventory.dart';
import '../providers/inventory_provider.dart';
import '../theme/app_theme.dart';
import '../widgets/common.dart';

/// Per-item detail: stock metrics, cost/price, and a quick +/- adjustment
/// that calls `POST /api/inventory/adjust`.
class InventoryDetailScreen extends StatefulWidget {
  const InventoryDetailScreen({super.key, required this.itemId});
  final String itemId;

  @override
  State<InventoryDetailScreen> createState() => _InventoryDetailScreenState();
}

class _InventoryDetailScreenState extends State<InventoryDetailScreen> {
  @override
  Widget build(BuildContext context) {
    final inv = context.watch<InventoryProvider>();
    final item = inv.items.firstWhere(
      (i) => i.id == widget.itemId,
      orElse: () => const InventoryItem(
        id: '',
        name: 'Unknown',
        sku: '',
        category: '',
        brand: '',
        quantity: 0,
        minLevel: 0,
        unitCost: 0,
        sellingPrice: 0,
        supplier: '',
        lastMovement: '',
      ),
    );

    return Scaffold(
      appBar: AppBar(title: Text(item.name)),
      body: ListView(
        padding: const EdgeInsets.all(16),
        children: [
          Card(
            child: Padding(
              padding: const EdgeInsets.all(16),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    children: [
                      Expanded(
                        child: Text(
                          item.name,
                          style: const TextStyle(
                            fontSize: 20,
                            fontWeight: FontWeight.w700,
                          ),
                        ),
                      ),
                      StatusChip.auto(item.isLowStock ? 'Low' : 'Instock'),
                    ],
                  ),
                  const SizedBox(height: 4),
                  Text('${item.sku} · ${item.brand}',
                      style: const TextStyle(color: AppTheme.slate)),
                  const Divider(height: 24),
                  Row(
                    children: [
                      Expanded(
                        child: _Metric(
                            'On hand', '${item.quantity}', AppTheme.primary),
                      ),
                      Expanded(
                        child: _Metric(
                            'Reorder lvl', '${item.minLevel}', AppTheme.slate),
                      ),
                      Expanded(
                        child: _Metric(
                          'Stock value',
                          formatMoney(item.stockValue),
                          AppTheme.success,
                        ),
                      ),
                    ],
                  ),
                ],
              ),
            ),
          ),
          const SizedBox(height: 12),
          Card(
            child: Column(
              children: [
                _Row('Category', item.category),
                _Row('Supplier', item.supplier),
                _Row('Unit cost', formatMoney(item.unitCost)),
                _Row('Selling price', formatMoney(item.sellingPrice)),
                _Row('Profit / unit', formatMoney(item.profit)),
                _Row('Margin',
                    '${item.marginPercent.toStringAsFixed(1)}%'),
                _Row('Last movement', item.lastMovement.split('T').first,
                    last: true),
              ],
            ),
          ),
          const SizedBox(height: 16),
          const Text('Quick adjust stock',
              style: TextStyle(fontWeight: FontWeight.w600)),
          const SizedBox(height: 8),
          Row(
            children: [
              Expanded(
                child: OutlinedButton.icon(
                  onPressed: inv.busy
                      ? null
                      : () => _adjust(context, inv, -1),
                  icon: const Icon(Icons.remove),
                  label: const Text('1'),
                ),
              ),
              const SizedBox(width: 8),
              Expanded(
                child: OutlinedButton.icon(
                  onPressed: inv.busy
                      ? null
                      : () => _adjust(context, inv, -10),
                  icon: const Icon(Icons.remove),
                  label: const Text('10'),
                ),
              ),
              const SizedBox(width: 8),
              Expanded(
                child: FilledButton.icon(
                  onPressed: inv.busy
                      ? null
                      : () => _adjust(context, inv, 1),
                  icon: const Icon(Icons.add),
                  label: const Text('1'),
                ),
              ),
              const SizedBox(width: 8),
              Expanded(
                child: FilledButton.icon(
                  onPressed: inv.busy
                      ? null
                      : () => _adjust(context, inv, 10),
                  icon: const Icon(Icons.add),
                  label: const Text('10'),
                ),
              ),
            ],
          ),
          if (inv.error != null) ...[
            const SizedBox(height: 12),
            ErrorBanner(message: inv.error!, onRetry: () => inv.load()),
          ],
        ],
      ),
    );
  }

  Future<void> _adjust(
    BuildContext context,
    InventoryProvider inv,
    num delta,
  ) async {
    final ok = await inv.adjust(id: widget.itemId, delta: delta);
    if (!ok && mounted) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text('Adjustment failed'),
          backgroundColor: AppTheme.danger,
        ),
      );
    }
  }
}

class _Metric extends StatelessWidget {
  const _Metric(this.label, this.value, this.color);
  final String label;
  final String value;
  final Color color;

  @override
  Widget build(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(label,
            style: const TextStyle(fontSize: 11, color: AppTheme.slate)),
        const SizedBox(height: 2),
        Text(value,
            style: TextStyle(
                fontSize: 18, fontWeight: FontWeight.w700, color: color)),
      ],
    );
  }
}

class _Row extends StatelessWidget {
  const _Row(this.label, this.value, {this.last = false});
  final String label;
  final String value;
  final bool last;

  @override
  Widget build(BuildContext context) {
    return ListTile(
      dense: true,
      title: Text(label, style: const TextStyle(color: AppTheme.slate)),
      trailing: Text(value,
          style: const TextStyle(fontWeight: FontWeight.w600)),
      shape: last
          ? null
          : const Border(
              bottom: BorderSide(color: Color(0xFFE2E8F0), width: 0.5),
            ),
    );
  }
}
