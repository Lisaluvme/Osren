import 'package:flutter/foundation.dart';

/// Mirror of the backend `UserRole` vocabulary (`models/Role.js`).
///
/// The backend returns the role as `user.role.name` (lowercase string).
/// Keep these in sync with the web app's `types.ts` `UserRole` enum.
enum UserRole {
  admin,
  sales,
  driver,
  finance,
  warehouse,
  viewer;

  /// Parse the backend's lowercase role name; unknown values fall back to
  /// [viewer] (least privilege), matching the backend's own default.
  static UserRole fromString(String? name) {
    switch (name?.toLowerCase()) {
      case 'admin':
        return UserRole.admin;
      case 'sales':
        return UserRole.sales;
      case 'driver':
        return UserRole.driver;
      case 'finance':
        return UserRole.finance;
      case 'warehouse':
        return UserRole.warehouse;
      default:
        return UserRole.viewer;
    }
  }

  /// Human-friendly label for UI.
  String get label {
    switch (this) {
      case UserRole.admin:
        return 'Administrator';
      case UserRole.sales:
        return 'Sales';
      case UserRole.driver:
        return 'Driver';
      case UserRole.finance:
        return 'Finance';
      case UserRole.warehouse:
        return 'Warehouse';
      case UserRole.viewer:
        return 'Viewer';
    }
  }
}

/// Backend `Role` model (`user.role`).
@immutable
class Role {
  final int id;
  final String name;
  final String? displayName;
  final int? level;

  const Role({
    required this.id,
    required this.name,
    this.displayName,
    this.level,
  });

  factory Role.fromJson(Map<String, dynamic> json) {
    return Role(
      id: json['id'] as int,
      name: (json['name'] as String?) ?? 'viewer',
      displayName: json['display_name'] as String?,
      level: json['level'] as int?,
    );
  }

  Map<String, dynamic> toJson() => {
        'id': id,
        'name': name,
        if (displayName != null) 'display_name': displayName,
        if (level != null) 'level': level,
      };
}

/// Backend `User` model, matching `authController.login` -> `data.user`.
@immutable
class User {
  final String id;
  final String email;
  final String fullName;
  final UserRole role;
  final bool isActive;

  const User({
    required this.id,
    required this.email,
    required this.fullName,
    required this.role,
    required this.isActive,
  });

  factory User.fromJson(Map<String, dynamic> json) {
    final roleJson = json['role'];
    final role = roleJson is Map<String, dynamic>
        ? Role.fromJson(roleJson)
        : null;
    return User(
      id: (json['id'] ?? '').toString(),
      email: (json['email'] ?? '').toString(),
      fullName: (json['full_name'] ?? json['fullName'] ?? '').toString(),
      role: UserRole.fromString(role?.name ?? json['role_name'] as String?),
      isActive: (json['is_active'] ?? true) as bool,
    );
  }

  Map<String, dynamic> toJson() => {
        'id': id,
        'email': email,
        'full_name': fullName,
        'role': role.name,
        'is_active': isActive,
      };
}

/// The full auth payload returned by `POST /api/auth/login` (`data` object).
@immutable
class AuthSession {
  final User user;
  final String accessToken;
  final String refreshToken;
  final String? expiresIn;

  const AuthSession({
    required this.user,
    required this.accessToken,
    required this.refreshToken,
    this.expiresIn,
  });

  factory AuthSession.fromJson(Map<String, dynamic> json) {
    return AuthSession(
      user: User.fromJson(json['user'] as Map<String, dynamic>),
      accessToken: (json['accessToken'] ?? '').toString(),
      refreshToken: (json['refreshToken'] ?? '').toString(),
      expiresIn: json['expiresIn']?.toString(),
    );
  }
}
