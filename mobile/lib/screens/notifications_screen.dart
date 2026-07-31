import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import '../models/notification.dart';
import '../providers/notification_provider.dart';
import '../theme/app_theme.dart';
import '../widgets/common.dart';

/// Notifications list with unread highlighting and mark-all-read.
class NotificationsScreen extends StatefulWidget {
  const NotificationsScreen({super.key});

  @override
  State<NotificationsScreen> createState() => _NotificationsScreenState();
}

class _NotificationsScreenState extends State<NotificationsScreen> {
  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      context.read<NotificationProvider>().load();
    });
  }

  @override
  Widget build(BuildContext context) {
    final notif = context.watch<NotificationProvider>();
    return Scaffold(
      appBar: AppBar(
        title: const Text('Notifications'),
        actions: [
          if (notif.unreadCount > 0)
            TextButton.icon(
              onPressed: notif.busy ? null : () => notif.markAllRead(),
              icon: const Icon(Icons.done_all, color: Colors.white),
              label: const Text('Read all',
                  style: TextStyle(color: Colors.white)),
            ),
        ],
      ),
      body: RefreshIndicator(
        onRefresh: () => notif.load(),
        child: notif.busy && notif.items.isEmpty
            ? const Center(child: CircularProgressIndicator())
            : notif.error != null
                ? ListView(children: [
                    const SizedBox(height: 40),
                    ErrorBanner(message: notif.error!, onRetry: () => notif.load()),
                  ])
                : notif.items.isEmpty
                    ? ListView(children: const [
                        SizedBox(height: 100),
                        EmptyState(
                          message: 'No notifications.',
                          icon: Icons.notifications_none_rounded,
                        ),
                      ])
                    : ListView.separated(
                        padding: const EdgeInsets.symmetric(vertical: 8),
                        itemCount: notif.items.length,
                        separatorBuilder: (_, _) =>
                            const Divider(height: 1, indent: 56),
                        itemBuilder: (context, i) =>
                            _NotificationTile(item: notif.items[i]),
                      ),
      ),
    );
  }
}

class _NotificationTile extends StatelessWidget {
  const _NotificationTile({required this.item});
  final AppNotification item;

  @override
  Widget build(BuildContext context) {
    return ListTile(
      leading: CircleAvatar(
        backgroundColor: item.isRead
            ? AppTheme.slate.withValues(alpha: 0.1)
            : AppTheme.primary.withValues(alpha: 0.12),
        child: Icon(Icons.notifications, color: item.isRead ? AppTheme.slate : AppTheme.primary),
      ),
      title: Row(
        children: [
          Expanded(
            child: Text(
              item.title.isEmpty ? item.type : item.title,
              style: TextStyle(
                fontWeight: item.isRead ? FontWeight.w500 : FontWeight.w700,
              ),
            ),
          ),
          Text(
            item.createdAt.split('T').first,
            style: const TextStyle(fontSize: 11, color: AppTheme.slate),
          ),
        ],
      ),
      subtitle: Text(item.message),
      onTap: () {
        if (!item.isRead) {
          context.read<NotificationProvider>().load();
        }
      },
    );
  }
}
