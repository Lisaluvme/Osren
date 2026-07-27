import 'package:flutter/foundation.dart';

/// In-app notification, mirrored from `/api/notifications`.
@immutable
class AppNotification {
  final String id;
  final String type;
  final String title;
  final String message;
  final bool isRead;
  final String createdAt;
  final String? relatedEntityType;
  final String? relatedEntityId;

  const AppNotification({
    required this.id,
    required this.type,
    required this.title,
    required this.message,
    required this.isRead,
    required this.createdAt,
    this.relatedEntityType,
    this.relatedEntityId,
  });

  factory AppNotification.fromJson(Map<String, dynamic> json) {
    return AppNotification(
      id: (json['id'] ?? '').toString(),
      type: (json['type'] ?? 'general').toString(),
      title: (json['title'] ?? '').toString(),
      message: (json['message'] ?? '').toString(),
      isRead: (json['is_read'] ?? json['isRead'] ?? false) as bool,
      createdAt: (json['createdAt'] ?? json['created_at'] ?? '').toString(),
      relatedEntityType: json['relatedEntityType'] as String?,
      relatedEntityId: json['relatedEntityId'] as String?,
    );
  }
}
