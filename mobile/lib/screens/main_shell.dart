import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import '../models/user.dart';
import '../providers/auth_provider.dart';
import '../providers/notification_provider.dart';
import '../theme/app_theme.dart';
import 'accounts_screen.dart';
import 'dashboard_screen.dart';
import 'delivery_screen.dart';
import 'inventory_screen.dart';
import 'notifications_screen.dart';
import 'sales_screen.dart';
import 'settings_screen.dart';
import 'warehouse_screen.dart';

/// Definition of a nav module: label, icon, the roles allowed to see it, and
/// the screen builder. Mirrors the web app's `MENU_ITEMS` table.
class ModuleDef {
  const ModuleDef({
    required this.id,
    required this.label,
    required this.icon,
    required this.roles,
    required this.builder,
  });

  final String id;
  final String label;
  final IconData icon;
  final Set<UserRole> roles;
  final Widget Function() builder;

  bool visibleFor(UserRole role) => roles.contains(role);
}

/// All modules in drawer order. Role sets match the web app's MENU_ITEMS,
/// with `viewer` treated as least-privilege (Settings only).
const allModules = <ModuleDef>[
  ModuleDef(
    id: 'dashboard',
    label: 'Dashboard',
    icon: Icons.dashboard_outlined,
    roles: {UserRole.admin, UserRole.finance},
    builder: DashboardScreen.new,
  ),
  ModuleDef(
    id: 'inventory',
    label: 'Inventory',
    icon: Icons.inventory_2_outlined,
    roles: {UserRole.admin, UserRole.warehouse, UserRole.sales},
    builder: InventoryScreen.new,
  ),
  ModuleDef(
    id: 'sales',
    label: 'Sales & Orders',
    icon: Icons.point_of_sale_outlined,
    roles: {UserRole.admin, UserRole.sales, UserRole.driver},
    builder: SalesScreen.new,
  ),
  ModuleDef(
    id: 'delivery',
    label: 'Delivery',
    icon: Icons.local_shipping_outlined,
    roles: {UserRole.driver, UserRole.admin},
    builder: DeliveryScreen.new,
  ),
  ModuleDef(
    id: 'warehouse',
    label: 'Warehouse Ops',
    icon: Icons.warehouse_outlined,
    roles: {UserRole.admin, UserRole.warehouse},
    builder: WarehouseScreen.new,
  ),
  ModuleDef(
    id: 'accounts',
    label: 'Accounts (AP/AR)',
    icon: Icons.account_balance_outlined,
    roles: {UserRole.admin, UserRole.finance},
    builder: AccountsScreen.new,
  ),
];

/// Authenticated shell: drawer-driven module navigation + notifications.
class MainShell extends StatefulWidget {
  const MainShell({super.key});

  @override
  State<MainShell> createState() => _MainShellState();
}

class _MainShellState extends State<MainShell> {
  String? _activeId;

  @override
  void initState() {
    super.initState();
    // Load notifications shortly after first frame so the badge populates.
    WidgetsBinding.instance.addPostFrameCallback((_) {
      context.read<NotificationProvider>().load();
    });
  }

  ModuleDef _activeFor(UserRole role) {
    final visible = allModules.where((m) => m.visibleFor(role)).toList();
    if (_activeId != null) {
      final match = visible.where((m) => m.id == _activeId);
      if (match.isNotEmpty) return match.first;
    }
    return visible.isNotEmpty ? visible.first : _settingsModule;
  }

  @override
  Widget build(BuildContext context) {
    final auth = context.watch<AuthProvider>();
    final notifications = context.watch<NotificationProvider>();
    final role = auth.role;
    final visible = allModules.where((m) => m.visibleFor(role)).toList();
    final active = _activeFor(role);

    return Scaffold(
      appBar: AppBar(
        title: Text(active.label),
        actions: [
          IconButton(
            icon: _NotificationBell(unread: notifications.unreadCount),
            onPressed: () => Navigator.of(context).push(
              MaterialPageRoute(builder: (_) => const NotificationsScreen()),
            ),
          ),
          PopupMenuButton<String>(
            icon: CircleAvatar(
              backgroundColor: Colors.white.withValues(alpha: 0.2),
              child: Text(
                (auth.user?.fullName.isNotEmpty ?? false)
                    ? auth.user!.fullName.substring(0, 1).toUpperCase()
                    : '?',
                style: const TextStyle(color: Colors.white),
              ),
            ),
            onSelected: (value) {
              if (value == 'settings') {
                Navigator.of(context).push(
                  MaterialPageRoute(builder: (_) => const SettingsScreen()),
                );
              } else if (value == 'logout') {
                _confirmLogout(context, auth);
              }
            },
            itemBuilder: (_) => const [
              PopupMenuItem(value: 'settings', child: Text('Settings')),
              PopupMenuItem(value: 'logout', child: Text('Sign out')),
            ],
          ),
          const SizedBox(width: 4),
        ],
      ),
      drawer: _ModuleDrawer(
        visible: visible,
        activeId: active.id,
        onSelected: (id) {
          setState(() => _activeId = id);
          Navigator.of(context).pop();
        },
      ),
      body: active.builder(),
    );
  }

  void _confirmLogout(BuildContext context, AuthProvider auth) {
    showDialog<void>(
      context: context,
      builder: (ctx) => AlertDialog(
        title: const Text('Sign out'),
        content: const Text('End your session and return to the login screen?'),
        actions: [
          TextButton(
            onPressed: () => Navigator.of(ctx).pop(),
            child: const Text('Cancel'),
          ),
          FilledButton(
            style: FilledButton.styleFrom(backgroundColor: AppTheme.danger),
            onPressed: () {
              Navigator.of(ctx).pop();
              auth.logout();
            },
            child: const Text('Sign out'),
          ),
        ],
      ),
    );
  }
}

const _settingsModule = ModuleDef(
  id: 'settings',
  label: 'Settings',
  icon: Icons.settings_outlined,
  roles: {UserRole.admin, UserRole.finance, UserRole.sales, UserRole.warehouse,
      UserRole.driver, UserRole.viewer},
  builder: SettingsScreen.new,
);

class _NotificationBell extends StatelessWidget {
  const _NotificationBell({required this.unread});
  final int unread;

  @override
  Widget build(BuildContext context) {
    return Stack(
      clipBehavior: Clip.none,
      children: [
        const Icon(Icons.notifications_none_rounded),
        if (unread > 0)
          Positioned(
            right: -4,
            top: -4,
            child: Container(
              padding: const EdgeInsets.all(2),
              decoration: const BoxDecoration(
                color: AppTheme.danger,
                shape: BoxShape.circle,
              ),
              constraints: const BoxConstraints(minWidth: 16),
              child: Text(
                unread > 9 ? '9+' : '$unread',
                textAlign: TextAlign.center,
                style: const TextStyle(
                  color: Colors.white,
                  fontSize: 10,
                  fontWeight: FontWeight.bold,
                ),
              ),
            ),
          ),
      ],
    );
  }
}

class _ModuleDrawer extends StatelessWidget {
  const _ModuleDrawer({
    required this.visible,
    required this.activeId,
    required this.onSelected,
  });

  final List<ModuleDef> visible;
  final String activeId;
  final ValueChanged<String> onSelected;

  @override
  Widget build(BuildContext context) {
    final auth = context.watch<AuthProvider>();
    final user = auth.user;
    return Drawer(
      child: ListView(
        padding: EdgeInsets.zero,
        children: [
          DrawerHeader(
            decoration: const BoxDecoration(gradient: AppTheme.primaryGradient),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              mainAxisAlignment: MainAxisAlignment.end,
              children: [
                CircleAvatar(
                  backgroundColor: Colors.white.withValues(alpha: 0.2),
                  radius: 24,
                  child: Text(
                    (user?.fullName.isNotEmpty ?? false)
                        ? user!.fullName.substring(0, 1).toUpperCase()
                        : '?',
                    style: const TextStyle(
                        color: Colors.white,
                        fontSize: 22,
                        fontWeight: FontWeight.bold),
                  ),
                ),
                const SizedBox(height: 10),
                Text(
                  user?.fullName ?? 'User',
                  style: const TextStyle(
                    color: Colors.white,
                    fontSize: 18,
                    fontWeight: FontWeight.w600,
                  ),
                ),
                Text(
                  '${user?.email ?? ''}  ·  ${auth.role.label}',
                  style: TextStyle(
                    color: Colors.white.withValues(alpha: 0.85),
                    fontSize: 12,
                  ),
                ),
              ],
            ),
          ),
          for (final m in visible)
            ListTile(
              leading: Icon(m.icon),
              title: Text(m.label),
              selected: m.id == activeId,
              selectedTileColor: AppTheme.primary.withValues(alpha: 0.1),
              onTap: () => onSelected(m.id),
            ),
          ListTile(
            leading: const Icon(Icons.notifications_none_outlined),
            title: const Text('Notifications'),
            onTap: () {
              Navigator.of(context).pop();
              Navigator.of(context).push(
                MaterialPageRoute(builder: (_) => const NotificationsScreen()),
              );
            },
          ),
          const Divider(),
          ListTile(
            leading: const Icon(Icons.settings_outlined),
            title: const Text('Settings'),
            onTap: () {
              Navigator.of(context).pop();
              Navigator.of(context).push(
                MaterialPageRoute(builder: (_) => const SettingsScreen()),
              );
            },
          ),
          ListTile(
            leading: const Icon(Icons.logout, color: AppTheme.danger),
            title: const Text('Sign out',
                style: TextStyle(color: AppTheme.danger)),
            onTap: () {
              Navigator.of(context).pop();
              auth.logout();
            },
          ),
        ],
      ),
    );
  }
}
