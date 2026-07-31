import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import '../models/inventory.dart';
import '../providers/inventory_provider.dart';
import '../theme/app_theme.dart';
import '../widgets/common.dart';
import 'inventory_detail_screen.dart';

/// Inventory list with search and a low-stock filter toggle.
class InventoryScreen extends StatefulWidget {
  const InventoryScreen({super.key});

  @override
  State<InventoryScreen> createState() => _InventoryScreenState();
}

class _InventoryScreenState extends State<InventoryScreen> {
  final _search = TextEditingController();
  bool _lowOnly = false;

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      context.read<InventoryProvider>().load();
    });
  }

  @override
  void dispose() {
    _search.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final inv = context.watch<InventoryProvider>();
    final all = inv.items;
    final items = _lowOnly ? inv.lowStock : all;

    return Column(
      children: [
        Padding(
          padding: const EdgeInsets.fromLTRB(16, 12, 16, 8),
          child: Row(
            children: [
              Expanded(
                child: TextField(
                  controller: _search,
                  textInputAction: TextInputAction.search,
                  decoration: const InputDecoration(
                    hintText: 'Search by name, SKU, brand…',
                    prefixIcon: Icon(Icons.search),
                    isDense: true,
                  ),
                  onSubmitted: (v) => context.read<InventoryProvider>().search(v),
                ),
              ),
              const SizedBox(width: 8),
              FilterChip(
                label: const Text('Low'),
                selected: _lowOnly,
                onSelected: (v) => setState(() => _lowOnly = v),
                avatar: const Icon(Icons.warning_amber_rounded, size: 18),
              ),
            ],
          ),
        ),
        if (inv.error != null)
          Padding(
            padding: const EdgeInsets.symmetric(horizontal: 16),
            child: ErrorBanner(
              message: inv.error!,
              onRetry: () => inv.load(),
            ),
          ),
        Expanded(
          child: RefreshIndicator(
            onRefresh: () => inv.load(),
            child: inv.busy && items.isEmpty
                ? const Center(child: CircularProgressIndicator())
                : items.isEmpty
                    ? ListView(
                        children: const [
                          SizedBox(height: 80),
                          EmptyState(
                            message: 'No products match.',
                            icon: Icons.inventory_2_outlined,
                          ),
                        ],
                      )
                    : ListView.separated(
                        padding: const EdgeInsets.symmetric(
                            horizontal: 16, vertical: 8),
                        itemCount: items.length,
                        separatorBuilder: (_, _) => const SizedBox(height: 8),
                        itemBuilder: (context, i) {
                          final item = items[i];
                          return _InventoryTile(item: item);
                        },
                      ),
          ),
        ),
      ],
    );
  }
}

class _InventoryTile extends StatelessWidget {
  const _InventoryTile({required this.item});
  final InventoryItem item;

  @override
  Widget build(BuildContext context) {
    return Card(
      child: ListTile(
        contentPadding:
            const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
        leading: CircleAvatar(
          backgroundColor: item.isLowStock
              ? AppTheme.danger.withValues(alpha: 0.12)
              : AppTheme.primary.withValues(alpha: 0.1),
          child: Icon(
            item.isLowStock
                ? Icons.warning_amber_rounded
                : Icons.inventory_2_outlined,
            color: item.isLowStock ? AppTheme.danger : AppTheme.primary,
          ),
        ),
        title: Text(
          item.name,
          maxLines: 1,
          overflow: TextOverflow.ellipsis,
          style: const TextStyle(fontWeight: FontWeight.w600),
        ),
        subtitle: Text('${item.sku} · ${item.category}'),
        trailing: Column(
          crossAxisAlignment: CrossAxisAlignment.end,
          mainAxisSize: MainAxisSize.min,
          children: [
            Text('${item.quantity} units',
                style: const TextStyle(fontWeight: FontWeight.w600)),
            const SizedBox(height: 4),
            StatusChip.auto(item.isLowStock ? 'Low' : 'Instock'),
          ],
        ),
        onTap: () => Navigator.of(context).push(
          MaterialPageRoute(
            builder: (_) => InventoryDetailScreen(itemId: item.id),
          ),
        ),
      ),
    );
  }
}
