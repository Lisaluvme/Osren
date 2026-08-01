import 'dart:typed_data';

import 'package:http/http.dart' as http;

import '../models/document.dart';
import 'api_client.dart';

/// Documents service — uploads generated PDF bytes to `/api/pdfs`
/// (backend → Supabase Storage), lists recorded documents, and downloads a
/// recorded PDF's bytes by its public URL for in-app viewing.
class DocumentsService {
  DocumentsService(this._api);

  final ApiClient _api;
  final http.Client _http = http.Client();

  /// `POST /api/pdfs` (multipart) — upload a generated PDF so it is
  /// recorded and downloadable. [docType] is `DO`, `INVOICE`, or `RECEIPT`.
  Future<DocRecord> upload({
    required Uint8List bytes,
    required String docType,
    required String refId,
    required String docNumber,
  }) async {
    final data = await _api.multipartPost(
      '/pdfs',
      bytes: bytes,
      filename: '${docNumber.replaceAll(RegExp(r'[^A-Za-z0-9_-]'), '_')}.pdf',
      fields: {
        'doc_type': docType,
        'ref_id': refId,
        'doc_number': docNumber,
      },
    );
    return DocRecord.fromJson(data as Map<String, dynamic>);
  }

  /// `GET /api/pdfs?type=&refId=` — recorded documents, newest first.
  Future<List<DocRecord>> list({String? type, String? refId}) async {
    final query = <String, String>{};
    if (type != null && type.isNotEmpty) query['type'] = type;
    if (refId != null && refId.isNotEmpty) query['refId'] = refId;
    final data = await _api.get('/pdfs', query: query.isNotEmpty ? query : null);
    return _asList(data).map(DocRecord.fromJson).toList();
  }

  /// Download a recorded PDF's bytes by its public URL (Supabase Storage —
  /// public bucket, so no auth header needed). Used by the in-app viewer.
  Future<Uint8List> downloadBytes(String url) async {
    final res = await _http.get(Uri.parse(url));
    if (res.statusCode < 200 || res.statusCode >= 300) {
      throw ApiException(res.statusCode, 'Download failed (${res.statusCode})');
    }
    return res.bodyBytes;
  }

  List<Map<String, dynamic>> _asList(dynamic data) {
    if (data is List) return data.cast<Map<String, dynamic>>();
    if (data is Map<String, dynamic> && data['data'] is List) {
      return (data['data'] as List).cast<Map<String, dynamic>>();
    }
    return const [];
  }
}
