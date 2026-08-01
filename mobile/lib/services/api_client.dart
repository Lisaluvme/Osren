import 'dart:convert';
import 'dart:io';
import 'dart:typed_data';

import 'package:http/http.dart' as http;

import '../config/config.dart';

/// Raised for any non-2xx API response. Carries the HTTP status and a parsed
/// message so the UI can show something useful.
class ApiException implements Exception {
  final int statusCode;
  final String message;

  ApiException(this.statusCode, this.message);

  factory ApiException.fromResponse(http.Response res) {
    String message = res.reasonPhrase ?? 'Request failed';
    try {
      final body = jsonDecode(res.body) as Map<String, dynamic>;
      message =
          (body['error'] ?? body['message'] ?? message).toString();
    } catch (_) {
      // Body wasn't JSON; fall back to the status phrase.
    }
    return ApiException(res.statusCode, message);
  }

  /// HTTP 401 — token missing/invalid/expired. Signals the caller to sign the
  /// user out and return to the login screen.
  bool get isUnauthorized => statusCode == 401;

  @override
  String toString() => 'ApiException($statusCode): $message';
}

/// Network layer for the OSREN Ops backend.
///
/// Wraps [http.Client] and centralises:
///   * the configurable base URL (persisted, see [setBaseUrl]),
///   * the `Authorization: Bearer <token>` header,
///   * the standard `{success, data}` envelope the Express API returns.
class ApiClient {
  ApiClient({http.Client? client})
      : _client = client ?? http.Client();

  final http.Client _client;
  String _baseUrl = AppConfig.defaultApiBaseUrl;
  String? _accessToken;

  /// Current API base URL (no trailing slash).
  String get baseUrl => _baseUrl;

  /// The access token used for every authenticated request. Set by the auth
  /// provider after a successful login or session restore.
  String? get accessToken => _accessToken;
  set accessToken(String? token) => _accessToken = token;

  /// Override the backend target at runtime (Settings screen).
  void setBaseUrl(String url) {
    final trimmed = url.trim();
    _baseUrl = trimmed.endsWith('/')
        ? trimmed.substring(0, trimmed.length - 1)
        : trimmed;
  }

  /// GET — returns the decoded `data` payload (or the whole body when the
  /// endpoint doesn't use the envelope).
  Future<dynamic> get(String path, {Map<String, String>? query}) async {
    final uri = _uri(path, query);
    final res = await _client.get(uri, headers: _headers());
    return _decode(res);
  }

  /// POST — [body] is JSON-encoded. Returns the decoded `data` payload.
  Future<dynamic> post(String path, {Map<String, dynamic>? body}) async {
    final uri = _uri(path);
    final res = await _client.post(
      uri,
      headers: _headers(json: true),
      body: body == null ? null : jsonEncode(body),
    );
    return _decode(res);
  }

  /// Multipart POST — uploads [bytes] as a file (default field name `file`)
  /// alongside string [fields]. Used by the documents upload endpoint. Returns
  /// the decoded `data` payload.
  Future<dynamic> multipartPost(
    String path, {
    required Uint8List bytes,
    required String filename,
    String fileField = 'file',
    Map<String, String> fields = const {},
    Map<String, String> query = const {},
  }) async {
    final uri = _uri(path, query.isNotEmpty ? query : null);
    final req = http.MultipartRequest('POST', uri)
      ..headers.addAll(_headers())
      ..fields.addAll(fields);
    req.files.add(
      http.MultipartFile.fromBytes(fileField, bytes, filename: filename),
    );
    final streamed = await _client.send(req);
    final res = await http.Response.fromStream(streamed);
    return _decode(res);
  }

  /// PUT — same envelope semantics as [post].
  Future<dynamic> put(String path, {Map<String, dynamic>? body}) async {
    final uri = _uri(path);
    final res = await _client.put(
      uri,
      headers: _headers(json: true),
      body: body == null ? null : jsonEncode(body),
    );
    return _decode(res);
  }

  /// PATCH — used by `/api/orders/:id` for status + signature updates.
  Future<dynamic> patch(String path, {Map<String, dynamic>? body}) async {
    final uri = _uri(path);
    final res = await _client.patch(
      uri,
      headers: _headers(json: true),
      body: body == null ? null : jsonEncode(body),
    );
    return _decode(res);
  }

  /// DELETE — used by `/api/orders/:id` (soft-cancel) and notification dismiss.
  Future<dynamic> delete(String path) async {
    final uri = _uri(path);
    final res = await _client.delete(uri, headers: _headers());
    return _decode(res);
  }

  Uri _uri(String path, [Map<String, String>? query]) {
    final cleaned = path.startsWith('/') ? path : '/$path';
    return Uri.parse('$_baseUrl$cleaned').replace(queryParameters: query);
  }

  Map<String, String> _headers({bool json = false}) {
    final headers = <String, String>{
      HttpHeaders.acceptHeader: 'application/json',
    };
    if (json) headers[HttpHeaders.contentTypeHeader] = 'application/json';
    final token = _accessToken;
    if (token != null && token.isNotEmpty) {
      headers[HttpHeaders.authorizationHeader] = 'Bearer $token';
    }
    return headers;
  }

  /// Unwrap the Express `{success, data}` envelope, or fall back to the raw
  /// decoded body for endpoints that return arrays/scalars directly.
  dynamic _decode(http.Response res) {
    if (res.statusCode < 200 || res.statusCode >= 300) {
      throw ApiException.fromResponse(res);
    }
    if (res.body.isEmpty) return null;
    final decoded = jsonDecode(res.body);
    if (decoded is Map<String, dynamic> && decoded.containsKey('data')) {
      return decoded['data'];
    }
    if (decoded is Map<String, dynamic> && decoded.containsKey('success')) {
      // Envelope without a `data` node (e.g. logout). Return the whole map.
      return decoded;
    }
    return decoded;
  }
}
