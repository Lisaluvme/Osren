import '../models/notification.dart';
import 'api_client.dart';

/// Notification service — wraps `/api/notifications/*` (auth required).
class NotificationService {
  NotificationService(this._api);

  final ApiClient _api;

  /// `GET /api/notifications/?is_read=&limit=`.
  Future<List<AppNotification>> list({int limit = 50}) async {
    final data = await _api.get('/notifications', query: {'limit': '$limit'});
    final list = data is List
        ? data
        : (data is Map<String, dynamic> ? data['notifications'] : null);
    if (list is! List) return const [];
    return list
        .map((e) => AppNotification.fromJson(e as Map<String, dynamic>))
        .toList();
  }

  /// `GET /api/notifications/unread-count` → `{count}` or raw int.
  Future<int> unreadCount() async {
    final data = await _api.get('/notifications/unread-count');
    if (data is Map<String, dynamic>) {
      return (data['count'] ?? data['unread_count'] ?? 0) as int;
    }
    if (data is int) return data;
    return 0;
  }

  /// `PUT /api/notifications/:id/read`.
  Future<void> markRead(String id) async {
    await _api.put('/notifications/$id/read');
  }

  /// `PUT /api/notifications/read-all`.
  Future<void> markAllRead() async {
    await _api.put('/notifications/read-all');
  }
}
