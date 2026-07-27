import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import '../models/order.dart';
import '../providers/orders_provider.dart';
import '../theme/app_theme.dart';
import '../widgets/common.dart';
import 'create_order_screen.dart';

/// Sales orders list with status filter and lifecycle actions.
class SalesScreen extends StatefulWidget {
  const SalesScreen({super.key});

  @override
  State<SalesScreen> createState() => _SalesScreenState();
}

class _SalesScreenState extends State<SalesScreen> {
  String? _filter; // null = all

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      context.read<OrdersProvider>().load();
    });
  }

  @override
  Widget build(BuildContext context) {
    final orders = context.watch<OrdersProvider>();
    final filtered = _filter == null
        ? orders.orders
        : orders.orders.where((o) => o.status.name == _filter).toList();

    return Scaffold(
      body: Column(
        children: [
          SizedBox(
            height: 48,
            child: ListView(
              scrollDirection: Axis.horizontal,
              padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
              children: [
                _FilterChip(
                  label: 'All',
                  selected: _filter == null,
                  onSelected: () => setState(() => _filter = null),
                ),
                _FilterChip(
                  label: 'Pending',
                  selected: _filter == 'pending',
                  onSelected: () => setState(() => _filter = 'pending'),
                ),
                _FilterChip(
                  label: 'Completed',
                  selected: _filter == 'completed',
                  onSelected: () => setState(() => _filter = 'completed'),
                ),
                _FilterChip(
                  label: 'Paid',
                  selected: _filter == 'paid',
                  onSelected: () => setState(() => _filter = 'paid'),
                ),
              ],
            ),
          ),
          if (orders.error != null)
            Padding(
              padding: const EdgeInsets.symmetric(horizontal: 16),
              child: ErrorBanner(
                  message: orders.error!, onRetry: () => orders.load()),
            ),
          Expanded(
            child: RefreshIndicator(
              onRefresh: () => orders.load(),
              child: orders.busy && filtered.isEmpty
                  ? const Center(child: CircularProgressIndicator())
                  : filtered.isEmpty
                      ? ListView(
                          children: const [
                            SizedBox(height: 80),
                            EmptyState(
                              message: 'No orders here yet.',
                              icon: Icons.receipt_long_outlined,
                            ),
                          ],
                        )
                      : ListView.separated(
                          padding: const EdgeInsets.symmetric(
                              horizontal: 16, vertical: 8),
                          itemCount: filtered.length,
                          separatorBuilder: (_, __) =>
                              const SizedBox(height: 8),
                          itemBuilder: (context, i) =>
                              _OrderTile(order: filtered[i]),
                        ),
            ),
          ),
        ],
      ),
      floatingActionButton: FloatingActionButton.extended(
        onPressed: () async {
          await Navigator.of(context).push(
            MaterialPageRoute(builder: (_) => const CreateOrderScreen()),
          );
          if (mounted) context.read<OrdersProvider>().load();
        },
        icon: const Icon(Icons.add),
        label: const Text('New order'),
      ),
    );
  }
}

class _FilterChip extends StatelessWidget {
  const _FilterChip({
    required this.label,
    required this.selected,
    required this.onSelected,
  });
  final String label;
  final bool selected;
  final VoidCallback onSelected;

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.only(right: 8),
      child: FilterChip(
        label: Text(label),
        selected: selected,
        onSelected: (_) => onSelected(),
        visualDensity: VisualDensity.compact,
      ),
    );
  }
}

class _OrderTile extends StatelessWidget {
  const _OrderTile({required this.order});
  final SalesOrder order;

  @override
  Widget build(BuildContext context) {
    return Card(
      child: ExpansionTile(
        tilePadding:
            const EdgeInsets.symmetric(horizontal: 12, vertical: 4),
        shape: const Border(),
        collapsedShape: const Border(),
        title: Row(
          children: [
            Expanded(
              child: Text(
                order.clientName,
                style: const TextStyle(fontWeight: FontWeight.w600),
              ),
            ),
            StatusChip.auto(order.status.label),
          ],
        ),
        subtitle: Padding(
          padding: const EdgeInsets.only(top: 4),
          child: Text(
            '${order.totalItems} items · ${formatMoney(order.totalAmount)}'
            '${order.createdAt.isNotEmpty ? ' · ${order.createdAt.split("T").first}' : ''}',
            style: const TextStyle(fontSize: 12),
          ),
        ),
        children: [
          if (order.items.isEmpty)
            const ListTile(
              dense: true,
              title: Text('No line items',
                  style: TextStyle(color: AppTheme.slate)),
            )
          else
            for (final item in order.items)
              ListTile(
                dense: true,
                leading: const Icon(Icons.circle,
                    size: 8, color: AppTheme.primary),
                title: Text(item.name),
                trailing: Text(
                  '${item.quantity} × ${formatMoney(item.unitPrice)}',
                  style: const TextStyle(fontSize: 13),
                ),
              ),
          const Divider(height: 1),
          Padding(
            padding: const EdgeInsets.symmetric(
                horizontal: 12, vertical: 8),
            child: Row(
              children: [
                if (order.status == OrderStatus.pending) ...[
                  _ActionButton(
                    label: 'Complete',
                    icon: Icons.check,
                    color: AppTheme.success,
                    onPressed: () => _setStatus(context, 'completed'),
                  ),
                  const SizedBox(width: 8),
                  _ActionButton(
                    label: 'Cancel',
                    icon: Icons.close,
                    color: AppTheme.danger,
                    onPressed: () => _setStatus(context, 'cancelled'),
                  ),
                  const SizedBox(width: 8),
                  _ActionButton(
                    label: 'Mark paid',
                    icon: Icons.paid_outlined,
                    color: AppTheme.accent,
                    onPressed: () => _setStatus(context, 'paid'),
                  ),
                ] else
                  _ActionButton(
                    label: 'Reopen',
                    icon: Icons.undo,
                    color: AppTheme.slate,
                    onPressed: () => _setStatus(context, 'pending'),
                  ),
              ],
            ),
          ),
        ],
      ),
    );
  }

  Future<void> _setStatus(BuildContext context, String status) async {
    final orders = context.read<OrdersProvider>();
    final messenger = ScaffoldMessenger.of(context);
    final ok = await orders.updateStatus(order.id, status);
    messenger.showSnackBar(
      SnackBar(
        content: Text(ok ? 'Order updated' : 'Update failed'),
        backgroundColor: ok ? AppTheme.success : AppTheme.danger,
      ),
    );
  }
}

class _ActionButton extends StatelessWidget {
  const _ActionButton({
    required this.label,
    required this.icon,
    required this.color,
    required this.onPressed,
  });
  final String label;
  final IconData icon;
  final Color color;
  final VoidCallback onPressed;

  @override
  Widget build(BuildContext context) {
    return Expanded(
      child: OutlinedButton.icon(
        style: OutlinedButton.styleFrom(
          foregroundColor: color,
          side: BorderSide(color: color.withValues(alpha: 0.4)),
        ),
        onPressed: onPressed,
        icon: Icon(icon, size: 16),
        label: Text(label, style: const TextStyle(fontSize: 12)),
      ),
    );
  }
}
