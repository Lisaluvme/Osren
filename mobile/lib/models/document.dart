import 'package:flutter/foundation.dart';

/// A generated business document (DO / Invoice / Receipt) recorded in Supabase
/// via `/api/documents`. The PDF bytes live in Supabase Storage; this record
/// holds the reference and the public download URL.
@immutable
class DocRecord {
  final String id;
  final String docType; // DO | INVOICE | RECEIPT
  final String refId;
  final String docNumber;
  final String publicUrl;
  final String? storagePath;
  final String createdAt;

  const DocRecord({
    required this.id,
    required this.docType,
    required this.refId,
    required this.docNumber,
    required this.publicUrl,
    this.storagePath,
    required this.createdAt,
  });

  factory DocRecord.fromJson(Map<String, dynamic> json) {
    return DocRecord(
      id: (json['id'] ?? '').toString(),
      docType: (json['doc_type'] ?? json['docType'] ?? '').toString(),
      refId: (json['ref_id'] ?? json['refId'] ?? '').toString(),
      docNumber: (json['doc_number'] ?? json['docNumber'] ?? '').toString(),
      publicUrl: (json['public_url'] ?? json['publicUrl'] ?? '').toString(),
      storagePath: (json['storage_path'] ?? json['storagePath'])?.toString(),
      createdAt: (json['created_at'] ?? json['createdAt'] ?? '').toString(),
    );
  }
}
