import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import '../providers/inventory_provider.dart';
import '../providers/orders_provider.dart';
import '../theme/app_theme.dart';
import '../widgets/common.dart';

/// Operations overview: stock health, open orders, and quick highlights.
class DashboardScreen extends StatefulWidget {
  const DashboardScreen({super.key});

  @override
  State<DashboardScreen> createState() => _DashboardScreenState();
}

class _DashboardScreenState extends State<DashboardScreen> {
  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) => _refresh());
  }

  Future<void> _refresh() async {
    await Future.wait([
      context.read<InventoryProvider>().load(),
      context.read<OrdersProvider>().load(),
    ]);
  }

  @override
  Widget build(BuildContext context) {
    final inv = context.watch<InventoryProvider>();
    final orders = context.watch<OrdersProvider>();
    final summary = inv.summary;

    return RefreshIndicator(
      onRefresh: _refresh,
      child: ListView(
        padding: const EdgeInsets.all(16),
        children: [
          if (inv.error != null || orders.error != null)
            ErrorBanner(
              message: (inv.error ?? orders.error)!,
              onRetry: _refresh,
            ),
          const SizedBox(height: 4),
          _KpiGrid(summary: summary, orders: orders),
          const SizedBox(height: 20),
          Row(
            children: [
              const SectionTitle('Low stock'),
              const Spacer(),
              if (inv.busy)
                const Padding(
                  padding: EdgeInsets.only(right: 8),
                  child: SizedBox(
                    width: 14,
                    height: 14,
                    child: CircularProgressIndicator(strokeWidth: 2),
                  ),
                ),
            ],
          ),
          const SizedBox(height: 8),
          if (inv.lowStock.isEmpty && !inv.busy)
            const EmptyState(
              message: 'No low-stock items. Inventory levels are healthy.',
              icon: Icons.check_circle_outline,
            )
          else
            Card(
              child: Column(
                children: [
                  for (final item in inv.lowStock.take(6)) ...[
                    ListTile(
                      dense: true,
                      title: Text(item.name),
                      subtitle: Text('${item.sku} · ${item.brand}'),
                      trailing: Column(
                        crossAxisAlignment: CrossAxisAlignment.end,
                        mainAxisSize: MainAxisSize.min,
                        children: [
                          Text('${item.quantity} left',
                              style: const TextStyle(
                                  fontWeight: FontWeight.w600)),
                          Text('min ${item.minLevel}',
                              style: const TextStyle(
                                  fontSize: 11, color: AppTheme.slate)),
                        ],
                      ),
                    ),
                    if (item != inv.lowStock.take(6).last)
                      const Divider(height: 1, indent: 16),
                  ],
                ],
              ),
            ),
          const SizedBox(height: 20),
          Row(
            children: const [
              SectionTitle('Recent orders'),
              Spacer(),
            ],
          ),
          const SizedBox(height: 8),
          if (orders.orders.isEmpty && !orders.busy)
            const EmptyState(
              message: 'No orders yet.',
              icon: Icons.receipt_long_outlined,
            )
          else
            Card(
              child: Column(
                children: [
                  for (final o in orders.orders.take(6)) ...[
                    ListTile(
                      dense: true,
                      title: Text(o.clientName),
                      subtitle: Text(
                        '${o.totalItems} items · ${o.createdAt.split("T").first}',
                      ),
                      trailing: Column(
                        crossAxisAlignment: CrossAxisAlignment.end,
                        mainAxisSize: MainAxisSize.min,
                        children: [
                          Text(formatMoney(o.totalAmount),
                              style: const TextStyle(
                                  fontWeight: FontWeight.w600)),
                          const SizedBox(height: 4),
                          StatusChip.auto(o.status.label),
                        ],
                      ),
                    ),
                    if (o != orders.orders.take(6).last)
                      const Divider(height: 1, indent: 16),
                  ],
                ],
              ),
            ),
        ],
      ),
    );
  }
}

class _KpiGrid extends StatelessWidget {
  const _KpiGrid({required this.summary, required this.orders});

  final dynamic summary;
  final OrdersProvider orders;

  @override
  Widget build(BuildContext context) {
    final s = summary as dynamic;
    Widget pad(StatCard card) => Padding(
          padding: const EdgeInsets.only(left: 6, right: 6),
          child: card,
        );
    return Column(
      children: [
        Row(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Expanded(
              child: pad(StatCard(
                label: 'Stock value',
                value: formatMoney(s.totalStockValue as num),
                icon: Icons.savings_outlined,
                accentColor: AppTheme.primary,
                subtitle: '${s.totalItems} products',
              )),
            ),
            Expanded(
              child: pad(StatCard(
                label: 'Low stock',
                value: '${s.lowStockCount}',
                icon: Icons.warning_amber_rounded,
                accentColor: (s.lowStockCount as int) > 0
                    ? AppTheme.danger
                    : AppTheme.success,
                subtitle: '${s.totalQuantity} units on hand',
              )),
            ),
          ],
        ),
        const SizedBox(height: 12),
        Row(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Expanded(
              child: pad(StatCard(
                label: 'Open orders',
                value: '${orders.openCount}',
                icon: Icons.shopping_bag_outlined,
                accentColor: AppTheme.accent,
                subtitle: '${orders.orders.length} total',
              )),
            ),
            Expanded(
              child: pad(StatCard(
                label: 'Order value',
                value: formatMoney(orders.totalValue),
                icon: Icons.trending_up_rounded,
                accentColor: AppTheme.success,
                subtitle: 'All listed orders',
              )),
            ),
          ],
        ),
      ],
    );
  }
}

class SectionTitle extends StatelessWidget {
  const SectionTitle(this.text, {super.key});
  final String text;

  @override
  Widget build(BuildContext context) {
    return Text(
      text,
      style: const TextStyle(
        fontSize: 16,
        fontWeight: FontWeight.w700,
        color: Color(0xFF0F172A),
      ),
    );
  }
}
