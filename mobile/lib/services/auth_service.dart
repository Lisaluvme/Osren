import '../models/user.dart';
import 'api_client.dart';

/// Auth service — wraps `/api/auth/*`.
///
/// Login returns the full [AuthSession] (user + tokens). The caller (auth
/// provider) is responsible for persisting the tokens and pushing the access
/// token into the shared [ApiClient].
class AuthService {
  AuthService(this._api);

  final ApiClient _api;

  /// `POST /api/auth/login` → `{user, accessToken, refreshToken}`.
  Future<AuthSession> login({
    required String email,
    required String password,
  }) async {
    final data = await _api.post('/auth/login', body: {
      'email': email.trim(),
      'password': password,
    }) as Map<String, dynamic>;
    return AuthSession.fromJson(data);
  }

  /// `GET /api/auth/me` — refreshes the current user from the server.
  Future<User> currentUser() async {
    final data = await _api.get('/auth/me') as Map<String, dynamic>;
    return User.fromJson(data);
  }

  /// `PUT /api/auth/me` — update display name.
  Future<User> updateProfile({required String fullName}) async {
    final data = await _api.put('/auth/me', body: {'full_name': fullName})
        as Map<String, dynamic>;
    return User.fromJson(data);
  }

  /// `PUT /api/auth/me/password`.
  Future<void> changePassword({
    required String currentPassword,
    required String newPassword,
  }) async {
    await _api.put('/auth/me/password', body: {
      'currentPassword': currentPassword,
      'newPassword': newPassword,
    });
  }

  /// `POST /api/auth/logout` — server-side no-op; client drops tokens after.
  Future<void> logout() async {
    try {
      await _api.post('/auth/logout');
    } catch (_) {
      // Swallow: we clear local state regardless.
    }
  }
}
