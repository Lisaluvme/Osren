import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import '../providers/auth_provider.dart';
import '../services/services.dart';
import '../theme/app_theme.dart';

/// Settings: profile, API base URL (persisted), password change, sign out.
class SettingsScreen extends StatefulWidget {
  const SettingsScreen({super.key});

  @override
  State<SettingsScreen> createState() => _SettingsScreenState();
}

class _SettingsScreenState extends State<SettingsScreen> {
  late final TextEditingController _baseUrl;

  @override
  void initState() {
    super.initState();
    final auth = context.read<AuthProvider>();
    _baseUrl = TextEditingController(text: auth.apiBaseUrl);
  }

  @override
  void dispose() {
    _baseUrl.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final auth = context.watch<AuthProvider>();
    final user = auth.user;
    return Scaffold(
      appBar: AppBar(title: const Text('Settings')),
      body: ListView(
        children: [
          ListTile(
            leading: CircleAvatar(
              backgroundColor: AppTheme.primary,
              child: Text(
                (user?.fullName.isNotEmpty ?? false)
                    ? user!.fullName.substring(0, 1).toUpperCase()
                    : '?',
                style: const TextStyle(color: Colors.white),
              ),
            ),
            title: Text(user?.fullName ?? 'User'),
            subtitle: Text('${user?.email ?? ''}\n${auth.role.label}'),
            isThreeLine: true,
          ),
          const Divider(),
          const _SectionHeader('Connection'),
          ListTile(
            leading: const Icon(Icons.dns_outlined),
            title: const Text('Backend API URL'),
            subtitle: Text(
              'Point at your server. Use 10.0.2.2:5000 for the emulator, '
              'or your PC\'s LAN IP for a real device.',
              style: const TextStyle(fontSize: 12, color: AppTheme.slate),
            ),
          ),
          Padding(
            padding: const EdgeInsets.symmetric(horizontal: 16),
            child: Row(
              children: [
                Expanded(
                  child: TextField(
                    controller: _baseUrl,
                    decoration: const InputDecoration(
                      isDense: true,
                      hintText: 'http://10.0.2.2:5000/api',
                    ),
                  ),
                ),
                const SizedBox(width: 8),
                FilledButton(
                  onPressed: () async {
                    await auth.setApiBaseUrl(_baseUrl.text.trim());
                    if (mounted) {
                      ScaffoldMessenger.of(context).showSnackBar(
                        const SnackBar(content: Text('API URL saved')),
                      );
                    }
                  },
                  child: const Text('Save'),
                ),
              ],
            ),
          ),
          const SizedBox(height: 12),
          const Divider(),
          const _SectionHeader('Account'),
          ListTile(
            leading: const Icon(Icons.lock_outline),
            title: const Text('Change password'),
            onTap: () => _showChangePassword(context),
          ),
          ListTile(
            leading: const Icon(Icons.logout, color: AppTheme.danger),
            title: const Text('Sign out',
                style: TextStyle(color: AppTheme.danger)),
            onTap: () => auth.logout(),
          ),
          const Divider(),
          const _SectionHeader('About'),
          const ListTile(
            leading: Icon(Icons.info_outline),
            title: Text('OSREN Ops Mobile'),
            subtitle: Text(
                'Flutter companion to the OSREN integrated operations '
                'manager. Talks to the same Node/Express backend as the '
                'web app.'),
          ),
        ],
      ),
    );
  }

  void _showChangePassword(BuildContext context) {
    final current = TextEditingController();
    final next = TextEditingController();
    showDialog(
      context: context,
      builder: (ctx) => AlertDialog(
        title: const Text('Change password'),
        content: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            TextField(
              controller: current,
              obscureText: true,
              decoration: const InputDecoration(labelText: 'Current password'),
            ),
            const SizedBox(height: 8),
            TextField(
              controller: next,
              obscureText: true,
              decoration: const InputDecoration(labelText: 'New password'),
            ),
          ],
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.of(ctx).pop(),
            child: const Text('Cancel'),
          ),
          FilledButton(
            onPressed: () async {
              if (current.text.isEmpty || next.text.isEmpty) return;
              try {
                await context
                    .read<AppServices>()
                    .auth
                    .changePassword(
                        currentPassword: current.text, newPassword: next.text);
                if (ctx.mounted) {
                  Navigator.of(ctx).pop();
                  ScaffoldMessenger.of(context).showSnackBar(
                    const SnackBar(content: Text('Password updated')),
                  );
                }
              } catch (e) {
                if (ctx.mounted) {
                  ScaffoldMessenger.of(context).showSnackBar(
                    SnackBar(
                        content: Text('Failed: $e'),
                        backgroundColor: AppTheme.danger),
                  );
                }
              }
            },
            child: const Text('Update'),
          ),
        ],
      ),
    );
  }
}

class _SectionHeader extends StatelessWidget {
  const _SectionHeader(this.label);
  final String label;

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.fromLTRB(16, 12, 16, 4),
      child: Text(
        label,
        style: const TextStyle(
          color: AppTheme.primary,
          fontWeight: FontWeight.w700,
          fontSize: 13,
        ),
      ),
    );
  }
}
