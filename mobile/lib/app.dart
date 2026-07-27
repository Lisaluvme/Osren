import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import 'providers/auth_provider.dart';
import 'providers/finance_provider.dart';
import 'providers/inventory_provider.dart';
import 'providers/notification_provider.dart';
import 'providers/orders_provider.dart';
import 'screens/login_screen.dart';
import 'screens/main_shell.dart';
import 'services/services.dart';
import 'theme/app_theme.dart';

/// Root widget. Builds the service container, wires the ChangeNotifier
/// providers, restores any persisted session, and routes between the login
/// screen and the authenticated shell.
class OsrenOpsApp extends StatelessWidget {
  const OsrenOpsApp({super.key});

  @override
  Widget build(BuildContext context) {
    // Single service container shared by every provider so the auth token
    // set on the ApiClient propagates to all domain services.
    final services = AppServices();

    return MultiProvider(
      providers: [
        Provider<AppServices>.value(value: services),
        ChangeNotifierProvider(
          create: (_) => AuthProvider(services)..bootstrap(),
        ),
        ChangeNotifierProvider(
          create: (_) => InventoryProvider(services),
        ),
        ChangeNotifierProvider(
          create: (_) => OrdersProvider(services),
        ),
        ChangeNotifierProvider(
          create: (_) => FinanceProvider(services),
        ),
        ChangeNotifierProvider(
          create: (_) => NotificationProvider(services),
        ),
      ],
      child: MaterialApp(
        title: 'OSREN Ops',
        debugShowCheckedModeBanner: false,
        theme: AppTheme.light(),
        home: const _RootGate(),
      ),
    );
  }
}

/// Decides what to show while the auth session is restoring, and once it has:
/// the login screen when signed out, or the main shell when signed in.
class _RootGate extends StatelessWidget {
  const _RootGate();

  @override
  Widget build(BuildContext context) {
    final auth = context.watch<AuthProvider>();
    if (!auth.bootstrapped) {
      return const Scaffold(
        body: Center(
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              CircularProgressIndicator(),
              SizedBox(height: 16),
              Text('Loading…'),
            ],
          ),
        ),
      );
    }
    return auth.isLoggedIn ? const MainShell() : const LoginScreen();
  }
}
