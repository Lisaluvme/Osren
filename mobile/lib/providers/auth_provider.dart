import 'package:firebase_auth/firebase_auth.dart' as fba;
import 'package:flutter/foundation.dart';
import 'package:shared_preferences/shared_preferences.dart';

import '../config/config.dart';
import '../models/user.dart';
import '../services/services.dart';

/// Auth + session state, backed by **Firebase Authentication** (project
/// `osren-becbb`).
///
/// Email/password sign-in happens client-side via firebase_auth. Firebase
/// persists the session, so no manual token storage is needed. The user's role
/// is read from the ID-token custom claim `role`; if that isn't set, a small
/// admin-email allowlist is used as a fallback.
class AuthProvider extends ChangeNotifier {
  AuthProvider(this._services);

  final AppServices _services;

  User? _user;
  bool _busy = false;
  String? _error;
  bool _bootstrapped = false;

  User? get user => _user;
  bool get isLoggedIn => _user != null;
  bool get busy => _busy;
  String? get error => _error;
  bool get bootstrapped => _bootstrapped;

  /// Role of the signed-in user (or [UserRole.viewer] when signed out).
  UserRole get role => _user?.role ?? UserRole.viewer;

  /// Emails recognised as admin when no custom `role` claim is present.
  /// (Proper roles should be set as custom claims via the service account.)
  static const _adminEmails = {'sales7777.isnyc@gmail.com', 'admin@osren.com'};

  /// Restore session (firebase_auth persists it) + base URL on app start.
  Future<void> bootstrap() async {
    try {
      final prefs = await SharedPreferences.getInstance();
      final baseUrl = prefs.getString(AppConfig.baseUrlPrefKey);
      if (baseUrl != null && baseUrl.isNotEmpty) {
        _services.configureBaseUrl(baseUrl);
      }
      final fb = fba.FirebaseAuth.instance.currentUser;
      if (fb != null) {
        _user = await _toUser(fb);
      }
      // Reflect sign-outs that happen elsewhere (e.g. another tab).
      fba.FirebaseAuth.instance.authStateChanges().listen((fbUser) {
        if (fbUser == null && _user != null) {
          _user = null;
          notifyListeners();
        }
      });
    } catch (e) {
      _error = e.toString();
    } finally {
      _bootstrapped = true;
      notifyListeners();
    }
  }

  /// Firebase email/password sign-in.
  Future<bool> login({required String email, required String password}) async {
    _busy = true;
    _error = null;
    notifyListeners();
    try {
      final cred = await fba.FirebaseAuth.instance.signInWithEmailAndPassword(
        email: email.trim(),
        password: password,
      );
      _user = await _toUser(cred.user!);
      return true;
    } on fba.FirebaseAuthException catch (e) {
      _error = _firebaseError(e);
      return false;
    } catch (e) {
      _error = e.toString();
      return false;
    } finally {
      _busy = false;
      notifyListeners();
    }
  }

  /// Sign out of Firebase.
  Future<void> logout() async {
    await fba.FirebaseAuth.instance.signOut();
    _services.api.accessToken = null;
    _user = null;
    notifyListeners();
  }

  /// Persist a new base URL chosen in Settings.
  Future<void> setApiBaseUrl(String url) async {
    _services.configureBaseUrl(url);
    final prefs = await SharedPreferences.getInstance();
    await prefs.setString(AppConfig.baseUrlPrefKey, url);
    notifyListeners();
  }

  String get apiBaseUrl => _services.api.baseUrl;

  /// Build our [User] model from a Firebase user, resolving the role from the
  /// ID-token custom claim (falling back to the admin allowlist).
  Future<User> _toUser(fba.User fb) async {
    String? roleFromClaim;
    try {
      final token = await fb.getIdTokenResult(true);
      roleFromClaim = token.claims?['role'] as String?;
    } catch (_) {
      // Claim lookup is best-effort.
    }
    final UserRole role;
    final parsed = UserRole.fromString(roleFromClaim);
    if (parsed != UserRole.viewer) {
      role = parsed;
    } else if (_adminEmails.contains(fb.email?.toLowerCase())) {
      role = UserRole.admin;
    } else {
      role = UserRole.viewer;
    }

    // Attach the Firebase ID token to the API client (used only by the few
    // authenticated endpoints; the core modules are no-auth).
    try {
      _services.api.accessToken = await fb.getIdToken();
    } catch (_) {}

    return User(
      id: fb.uid,
      email: fb.email ?? '',
      fullName: fb.displayName ??
          (fb.email?.isNotEmpty == true ? fb.email!.split('@').first : 'User'),
      role: role,
      isActive: true,
    );
  }

  String _firebaseError(fba.FirebaseAuthException e) {
    switch (e.code) {
      case 'invalid-email':
        return 'That email address is invalid.';
      case 'user-disabled':
        return 'This account has been disabled.';
      case 'user-not-found':
      case 'wrong-password':
      case 'invalid-credential':
        return 'Incorrect email or password.';
      case 'network-request-failed':
        return 'Network error — check your connection and try again.';
      case 'too-many-requests':
        return 'Too many attempts. Try again shortly.';
      default:
        return e.message ?? 'Sign-in failed (${e.code}).';
    }
  }
}
