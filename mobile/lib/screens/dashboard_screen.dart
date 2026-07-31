import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import '../models/order.dart';
import '../providers/auth_provider.dart';
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
    final user = context.watch<AuthProvider>().user;
    final s = inv.summary;

    final stockValue = formatMoney(_toNum(s.totalStockValue));
    final productCount = _toInt(s.totalItems);
    final unitCount = _toInt(s.totalQuantity);
    final lowCount = _toInt(s.lowStockCount);

    return RefreshIndicator(
      onRefresh: _refresh,
      child: ListView(
        physics: const AlwaysScrollableScrollPhysics(),
        padding: const EdgeInsets.fromLTRB(16, 16, 16, 24),
        children: [
          _HeroHeader(
            user: _firstName(user?.fullName),
            stockValue: stockValue,
            productCount: productCount,
            unitCount: unitCount,
            lowCount: lowCount,
          ),
          const SizedBox(height: 18),
          if (inv.error != null || orders.error != null) ...[
            ErrorBanner(
              message: (inv.error ?? orders.error)!,
              onRetry: _refresh,
            ),
            const SizedBox(height: 16),
          ],
          _KpiGrid(orders: orders),
          const SizedBox(height: 22),
          _SectionHeader(
            title: 'Low stock',
            count: inv.lowStock.length,
            loading: inv.busy,
          ),
          if (inv.lowStock.isEmpty && !inv.busy)
            const _EmptyCard(
              message: 'No low-stock items. Inventory levels are healthy.',
              icon: Icons.check_circle_outline,
            )
          else
            _LowStockCard(inv.lowStock.take(6)),
          const SizedBox(height: 22),
          _SectionHeader(
            title: 'Recent orders',
            count: orders.orders.length,
          ),
          if (orders.orders.isEmpty && !orders.busy)
            const _EmptyCard(
              message: 'No orders yet.',
              icon: Icons.receipt_long_outlined,
            )
          else
            _OrdersCard(orders.orders.take(6)),
        ],
      ),
    );
  }
}

// ---------------------------------------------------------------------------
// Hero
// ---------------------------------------------------------------------------

class _HeroHeader extends StatelessWidget {
  const _HeroHeader({
    required this.user,
    required this.stockValue,
    required this.productCount,
    required this.unitCount,
    required this.lowCount,
  });

  final String? user;
  final String stockValue;
  final int productCount;
  final int unitCount;
  final int lowCount;

  @override
  Widget build(BuildContext context) {
    return Container(
      width: double.infinity,
      padding: const EdgeInsets.fromLTRB(20, 22, 20, 20),
      decoration: BoxDecoration(
        gradient: AppTheme.primaryGradient,
        borderRadius: BorderRadius.circular(22),
        boxShadow: [
          BoxShadow(
            color: AppTheme.primary.withValues(alpha: 0.25),
            blurRadius: 20,
            offset: const Offset(0, 10),
          ),
        ],
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      '${_greeting()}${user != null ? ', $user' : ''}',
                      style: const TextStyle(
                        color: Colors.white,
                        fontSize: 18,
                        fontWeight: FontWeight.w600,
                      ),
                    ),
                    const SizedBox(height: 2),
                    Text(
                      _today(),
                      style: TextStyle(
                        color: Colors.white.withValues(alpha: 0.85),
                        fontSize: 13,
                      ),
                    ),
                  ],
                ),
              ),
              Container(
                width: 44,
                height: 44,
                decoration: BoxDecoration(
                  color: Colors.white.withValues(alpha: 0.18),
                  borderRadius: BorderRadius.circular(12),
                ),
                child: const Icon(Icons.inventory_2_rounded,
                    color: Colors.white, size: 22),
              ),
            ],
          ),
          const SizedBox(height: 18),
          Text(
            stockValue,
            style: const TextStyle(
              color: Colors.white,
              fontSize: 30,
              fontWeight: FontWeight.w800,
              letterSpacing: -0.5,
              height: 1.1,
            ),
          ),
          const SizedBox(height: 2),
          Text(
            'Total stock value',
            style: TextStyle(
              color: Colors.white.withValues(alpha: 0.85),
              fontSize: 13,
            ),
          ),
          Container(
            height: 1,
            margin: const EdgeInsets.only(top: 18, bottom: 16),
            color: Colors.white.withValues(alpha: 0.2),
          ),
          Row(
            children: [
              Expanded(
                child: _MiniStat(label: 'Products', value: '$productCount'),
              ),
              _vDivider(),
              Expanded(
                child: _MiniStat(label: 'Units on hand', value: '$unitCount'),
              ),
              _vDivider(),
              Expanded(child: _MiniStat(label: 'Low stock', value: '$lowCount')),
            ],
          ),
        ],
      ),
    );
  }

  Widget _vDivider() => Container(
        width: 1,
        height: 30,
        margin: const EdgeInsets.symmetric(horizontal: 8),
        color: Colors.white.withValues(alpha: 0.2),
      );
}

class _MiniStat extends StatelessWidget {
  const _MiniStat({required this.label, required this.value});
  final String label;
  final String value;

  @override
  Widget build(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      mainAxisSize: MainAxisSize.min,
      children: [
        Text(
          value,
          style: const TextStyle(
            color: Colors.white,
            fontSize: 16,
            fontWeight: FontWeight.w700,
          ),
        ),
        const SizedBox(height: 2),
        Text(
          label,
          style: TextStyle(
            color: Colors.white.withValues(alpha: 0.8),
            fontSize: 11,
          ),
        ),
      ],
    );
  }
}

// ---------------------------------------------------------------------------
// KPI grid (orders side — inventory is summarised in the hero)
// ---------------------------------------------------------------------------

class _KpiGrid extends StatelessWidget {
  const _KpiGrid({required this.orders});
  final OrdersProvider orders;

  @override
  Widget build(BuildContext context) {
    final total = orders.orders.length;
    final num avg = total > 0 ? orders.totalValue / total : 0;
    final delivered =
        orders.orders.where((o) => o.status == OrderStatus.invoiced).length;
    Widget pad(StatCard card) => Padding(
          padding: const EdgeInsets.symmetric(horizontal: 6),
          child: card,
        );
    return Column(
      children: [
        Row(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Expanded(
              child: pad(StatCard(
                label: 'Open orders',
                value: '${orders.openCount}',
                icon: Icons.shopping_bag_outlined,
                accentColor: AppTheme.accent,
                subtitle: '$total total',
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
        const SizedBox(height: 12),
        Row(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Expanded(
              child: pad(StatCard(
                label: 'Avg order',
                value: formatMoney(avg),
                icon: Icons.receipt_long_outlined,
                accentColor: AppTheme.primary,
                subtitle: 'Per order',
              )),
            ),
            Expanded(
              child: pad(StatCard(
                label: 'Delivered',
                value: '$delivered',
                icon: Icons.local_shipping_outlined,
                accentColor: AppTheme.success,
                subtitle: 'Awaiting payment',
              )),
            ),
          ],
        ),
      ],
    );
  }
}

// ---------------------------------------------------------------------------
// Section header
// ---------------------------------------------------------------------------

class _SectionHeader extends StatelessWidget {
  const _SectionHeader({required this.title, this.count, this.loading = false});

  final String title;
  final int? count;
  final bool loading;

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 10),
      child: Row(
        children: [
          Text(
            title,
            style: const TextStyle(
              fontSize: 16,
              fontWeight: FontWeight.w700,
              color: AppTheme.ink,
            ),
          ),
          if (count != null) ...[
            const SizedBox(width: 8),
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
              decoration: BoxDecoration(
                color: AppTheme.primaryLight,
                borderRadius: BorderRadius.circular(999),
              ),
              child: Text(
                '$count',
                style: const TextStyle(
                  fontSize: 12,
                  fontWeight: FontWeight.w600,
                  color: AppTheme.primaryDark,
                ),
              ),
            ),
          ],
          const Spacer(),
          if (loading)
            const SizedBox(
              width: 14,
              height: 14,
              child: CircularProgressIndicator(strokeWidth: 2),
            ),
        ],
      ),
    );
  }
}

// ---------------------------------------------------------------------------
// Low stock card
// ---------------------------------------------------------------------------

class _LowStockCard extends StatelessWidget {
  const _LowStockCard(this.items);
  final Iterable<dynamic> items;

  @override
  Widget build(BuildContext context) {
    final list = items.toList();
    return Card(
      child: Padding(
        padding: const EdgeInsets.symmetric(vertical: 4),
        child: Column(
          children: [
            for (int i = 0; i < list.length; i++) ...[
              _LowStockRow(item: list[i]),
              if (i < list.length - 1) const Divider(height: 1, indent: 60),
            ],
          ],
        ),
      ),
    );
  }
}

class _LowStockRow extends StatelessWidget {
  const _LowStockRow({required this.item});
  final dynamic item;

  @override
  Widget build(BuildContext context) {
    final qty = _toInt(item.quantity);
    final min = _toInt(item.minLevel);
    final out = qty <= 0;
    final color = out ? AppTheme.danger : AppTheme.warning;
    // Stock level relative to a comfortable buffer (2x min). Clamped 0..1.
    final ratio = min > 0 ? (qty / (min * 2)).clamp(0.0, 1.0) : 0.0;

    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
      child: Row(
        children: [
          _IconChip(
            icon: out ? Icons.error_outline : Icons.inventory_2_outlined,
            color: color,
          ),
          const SizedBox(width: 12),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(item.name,
                    style: const TextStyle(fontWeight: FontWeight.w600)),
                const SizedBox(height: 2),
                Text('${item.sku} · ${item.brand}',
                    style: const TextStyle(fontSize: 12, color: AppTheme.slate)),
                const SizedBox(height: 8),
                ClipRRect(
                  borderRadius: BorderRadius.circular(4),
                  child: LinearProgressIndicator(
                    value: ratio,
                    minHeight: 5,
                    backgroundColor: AppTheme.line,
                    color: color,
                  ),
                ),
              ],
            ),
          ),
          const SizedBox(width: 12),
          Column(
            crossAxisAlignment: CrossAxisAlignment.end,
            mainAxisSize: MainAxisSize.min,
            children: [
              Text('$qty left',
                  style: const TextStyle(fontWeight: FontWeight.w600)),
              const SizedBox(height: 2),
              Text('min $min',
                  style: const TextStyle(fontSize: 11, color: AppTheme.slate)),
            ],
          ),
        ],
      ),
    );
  }
}

// ---------------------------------------------------------------------------
// Recent orders card
// ---------------------------------------------------------------------------

class _OrdersCard extends StatelessWidget {
  const _OrdersCard(this.orders);
  final Iterable<dynamic> orders;

  @override
  Widget build(BuildContext context) {
    final list = orders.toList();
    return Card(
      child: Padding(
        padding: const EdgeInsets.symmetric(vertical: 4),
        child: Column(
          children: [
            for (int i = 0; i < list.length; i++) ...[
              _OrderRow(order: list[i]),
              if (i < list.length - 1) const Divider(height: 1, indent: 60),
            ],
          ],
        ),
      ),
    );
  }
}

class _OrderRow extends StatelessWidget {
  const _OrderRow({required this.order});
  final dynamic order;

  @override
  Widget build(BuildContext context) {
    final client = order.clientName as String? ?? '';
    final initial =
        client.isNotEmpty ? client.substring(0, 1).toUpperCase() : '?';
    final created = (order.createdAt as String?) ?? '';
    final date = created.isNotEmpty ? created.split('T').first : '';

    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
      child: Row(
        children: [
          CircleAvatar(
            radius: 18,
            backgroundColor: AppTheme.primaryLight,
            child: Text(initial,
                style: const TextStyle(
                    color: AppTheme.primaryDark, fontWeight: FontWeight.w700)),
          ),
          const SizedBox(width: 12),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(client, style: const TextStyle(fontWeight: FontWeight.w600)),
                const SizedBox(height: 2),
                Text('${order.totalItems} items · $date',
                    style: const TextStyle(fontSize: 12, color: AppTheme.slate)),
              ],
            ),
          ),
          const SizedBox(width: 12),
          Column(
            crossAxisAlignment: CrossAxisAlignment.end,
            mainAxisSize: MainAxisSize.min,
            children: [
              Text(formatMoney(_toNum(order.totalAmount)),
                  style: const TextStyle(fontWeight: FontWeight.w600)),
              const SizedBox(height: 4),
              StatusChip.auto(order.status.label as String),
            ],
          ),
        ],
      ),
    );
  }
}

// ---------------------------------------------------------------------------
// Shared bits
// ---------------------------------------------------------------------------

class _IconChip extends StatelessWidget {
  const _IconChip({required this.icon, required this.color});
  final IconData icon;
  final Color color;

  @override
  Widget build(BuildContext context) {
    return Container(
      width: 38,
      height: 38,
      decoration: BoxDecoration(
        color: color.withValues(alpha: 0.12),
        borderRadius: BorderRadius.circular(10),
      ),
      child: Icon(icon, color: color, size: 20),
    );
  }
}

class _EmptyCard extends StatelessWidget {
  const _EmptyCard({required this.message, required this.icon});
  final String message;
  final IconData icon;

  @override
  Widget build(BuildContext context) {
    return Card(
      child: Padding(
        padding: const EdgeInsets.symmetric(vertical: 28, horizontal: 16),
        child: EmptyState(message: message, icon: icon),
      ),
    );
  }
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

String _greeting() {
  final h = DateTime.now().hour;
  if (h < 12) return 'Good morning';
  if (h < 17) return 'Good afternoon';
  return 'Good evening';
}

String _today() {
  const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
  const months = [
    'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
    'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
  ];
  final now = DateTime.now();
  return '${days[now.weekday - 1]}, ${now.day} ${months[now.month - 1]} ${now.year}';
}

String? _firstName(String? fullName) {
  final t = fullName?.trim();
  if (t == null || t.isEmpty) return null;
  return t.split(' ').first;
}

num _toNum(dynamic v) => v == null ? 0 : (v as num);
int _toInt(dynamic v) => _toNum(v).toInt();
