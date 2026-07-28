import 'package:flutter/material.dart';
import 'package:printing/printing.dart';
import 'package:provider/provider.dart';
import 'package:url_launcher/url_launcher.dart';

import '../models/order.dart';
import '../providers/orders_provider.dart';
import '../services/delivery_pdf_service.dart';
import '../theme/app_theme.dart';
import '../widgets/common.dart';
import 'signature_pad_screen.dart';

/// Driver delivery run list. Shows orders that are ready to deliver
/// (`processing` = DO Created) and, under the "Completed" filter, those the
/// driver has signed off (`invoiced` = awaiting payment in Accounts).
class DeliveryScreen extends StatefulWidget {
  const DeliveryScreen({super.key});

  @override
  State<DeliveryScreen> createState() => _DeliveryScreenState();
}

class _DeliveryScreenState extends State<DeliveryScreen> {
  /// false = To Deliver (pending + processing), true = Completed (invoiced).
  bool _showCompleted = false;

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
    final filtered = _showCompleted
        ? orders.orders
            .where((o) => o.status == OrderStatus.invoiced)
            .toList()
        : orders.orders
            .where((o) =>
                o.status == OrderStatus.pending ||
                o.status == OrderStatus.processing)
            .toList();

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
                  label: 'To Deliver',
                  selected: !_showCompleted,
                  onSelected: () => setState(() => _showCompleted = false),
                ),
                _FilterChip(
                  label: 'Completed',
                  selected: _showCompleted,
                  onSelected: () => setState(() => _showCompleted = true),
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
                          children: [
                            const SizedBox(height: 80),
                            EmptyState(
                              message: !_showCompleted
                                  ? 'No deliveries queued. New sales orders appear here automatically.'
                                  : 'Nothing signed off yet.',
                              icon: Icons.local_shipping_outlined,
                            ),
                          ],
                        )
                      : ListView.separated(
                          padding: const EdgeInsets.symmetric(
                              horizontal: 16, vertical: 8),
                          itemCount: filtered.length,
                          separatorBuilder: (_, _) =>
                              const SizedBox(height: 8),
                          itemBuilder: (context, i) =>
                              _DeliveryTile(order: filtered[i]),
                        ),
            ),
          ),
        ],
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

class _DeliveryTile extends StatelessWidget {
  const _DeliveryTile({required this.order});
  final SalesOrder order;

  @override
  Widget build(BuildContext context) {
    final address = order.deliveryAddress;
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
          if (address != null && address.isNotEmpty)
            ListTile(
              dense: true,
              leading: const Icon(Icons.location_on_outlined,
                  size: 20, color: AppTheme.primary),
              title: Text(address,
                  style: const TextStyle(fontSize: 13)),
            ),
          if (order.contactNumber != null && order.contactNumber!.isNotEmpty)
            ListTile(
              dense: true,
              leading: const Icon(Icons.phone_outlined,
                  size: 20, color: AppTheme.primary),
              title: Text(order.contactNumber!,
                  style: const TextStyle(fontSize: 13)),
            ),
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
            padding:
                const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
            child: Row(
              children: [
                _ActionButton(
                  label: 'Navigate',
                  icon: Icons.directions,
                  color: AppTheme.primary,
                  onPressed: () => _navigate(context),
                ),
                const SizedBox(width: 8),
                _ActionButton(
                  label: 'DO Report',
                  icon: Icons.picture_as_pdf_outlined,
                  color: AppTheme.accent,
                  onPressed: () => _viewReport(context),
                ),
                const SizedBox(width: 8),
                if (order.status == OrderStatus.invoiced)
                  _ActionButton(
                    label: 'Reopen',
                    icon: Icons.undo,
                    color: AppTheme.slate,
                    onPressed: () => _setStatus(context, 'processing'),
                  )
                else
                  _ActionButton(
                    label: 'Sign',
                    icon: Icons.draw_outlined,
                    color: AppTheme.success,
                    onPressed: () => _captureSignature(context),
                  ),
              ],
            ),
          ),
        ],
      ),
    );
  }

  Future<void> _navigate(BuildContext context) async {
    final query = (order.deliveryAddress != null &&
            order.deliveryAddress!.isNotEmpty)
        ? order.deliveryAddress!
        : order.clientName;
    final uri = Uri.parse(
      'https://www.google.com/maps/search/?api=1&query=${Uri.encodeComponent(query)}',
    );
    final messenger = ScaffoldMessenger.of(context);
    try {
      final ok = await launchUrl(uri, mode: LaunchMode.externalApplication);
      if (!ok) {
        messenger.showSnackBar(const SnackBar(
          content: Text('Could not open Google Maps'),
          backgroundColor: AppTheme.danger,
        ));
      }
    } catch (e) {
      messenger.showSnackBar(SnackBar(
        content: Text('Could not open Google Maps: $e'),
        backgroundColor: AppTheme.danger,
      ));
    }
  }

  Future<void> _viewReport(BuildContext context) async {
    final messenger = ScaffoldMessenger.of(context);
    try {
      final bytes = await generateDeliveryOrderPdf(order);
      await Printing.sharePdf(bytes: bytes, filename: 'DO-${order.id}.pdf');
    } catch (e) {
      messenger.showSnackBar(SnackBar(
        content: Text('Could not generate DO report: $e'),
        backgroundColor: AppTheme.danger,
      ));
    }
  }

  Future<void> _captureSignature(BuildContext context) async {
    final dataUrl = await Navigator.of(context).push<String>(
      MaterialPageRoute(
        builder: (_) => SignaturePadScreen(customerName: order.clientName),
      ),
    );
    if (dataUrl == null) return;
    if (!context.mounted) return;
    final orders = context.read<OrdersProvider>();
    final messenger = ScaffoldMessenger.of(context);
    final ok = await orders.signAndComplete(order.id, dataUrl);
    messenger.showSnackBar(
      SnackBar(
        content:
            Text(ok ? 'Signed — sent to Accounts' : 'Could not save signature'),
        backgroundColor: ok ? AppTheme.success : AppTheme.danger,
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
