/// Central configuration for the OSREN Ops mobile app.
///
/// The Flutter app talks to the SAME Node/Express backend that powers the
/// React web app. Point [apiBaseUrl] at wherever the backend is running.
///
/// When running on a physical Android device, `localhost` refers to the phone
/// itself — use your machine's LAN IP (e.g. http://192.168.1.50:5000/api) and
/// keep the phone on the same Wi-Fi as the backend. For the Android emulator,
/// http://10.0.2.2:5000/api maps to the host machine's localhost.
class AppConfig {
  const AppConfig._();

  /// Base URL of the backend REST API (no trailing slash).
  ///
  /// Default targets the Android emulator's host alias. Override at runtime
  /// from the Settings screen (persisted to SharedPreferences).
  static const String defaultApiBaseUrl = 'http://10.0.2.2:5000/api';

  /// Key under which the runtime API base URL is persisted.
  static const String baseUrlPrefKey = 'api_base_url';

  /// Key under which the JWT access token is persisted.
  static const String accessTokenKey = 'accessToken';

  /// Key under which the JWT refresh token is persisted.
  static const String refreshTokenKey = 'refreshToken';
}
