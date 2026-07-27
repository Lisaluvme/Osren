import 'api_client.dart';
import 'auth_service.dart';
import 'finance_service.dart';
import 'inventory_service.dart';
import 'notification_service.dart';
import 'orders_service.dart';

/// Holds the single [ApiClient] and all domain services. One instance is
/// created at app startup and provided down the tree; every provider reads
/// its service from here so the auth token set on the [ApiClient] applies
/// everywhere.
class AppServices {
  AppServices() : api = ApiClient();

  final ApiClient api;
  late final AuthService auth = AuthService(api);
  late final InventoryService inventory = InventoryService(api);
  late final OrdersService orders = OrdersService(api);
  late final FinanceService finance = FinanceService(api);
  late final NotificationService notifications = NotificationService(api);

  /// Apply a runtime base URL (Settings screen) and persist it.
  void configureBaseUrl(String url) => api.setBaseUrl(url);
}
