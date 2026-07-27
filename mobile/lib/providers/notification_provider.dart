import 'package:flutter/foundation.dart';

import '../models/notification.dart';
import '../services/services.dart';

/// Notifications list + unread badge count.
class NotificationProvider extends ChangeNotifier {
  NotificationProvider(this._services);

  final AppServices _services;

  List<AppNotification> _items = const [];
  int _unread = 0;
  bool _busy = false;
  String? _error;

  List<AppNotification> get items => _items;
  int get unreadCount => _unread;
  bool get busy => _busy;
  String? get error => _error;

  Future<void> load() async {
    _busy = true;
    _error = null;
    notifyListeners();
    try {
      final results = await Future.wait([
        _services.notifications.list(),
        _services.notifications.unreadCount(),
      ]);
      _items = results[0] as List<AppNotification>;
      _unread = results[1] as int;
    } catch (e) {
      _error = e.toString();
    } finally {
      _busy = false;
      notifyListeners();
    }
  }

  Future<void> markAllRead() async {
    await _services.notifications.markAllRead();
    await load();
  }
}
