import 'dart:typed_data';

import 'package:flutter/material.dart';
import 'package:printing/printing.dart';
import 'package:provider/provider.dart';

import '../services/services.dart';
import '../theme/app_theme.dart';

/// In-app PDF viewer. Renders a PDF from in-memory [bytes] or a downloadable
/// [url] (e.g. a recorded document's public URL) by rasterizing each page with
/// the `printing` package — no extra dependencies. A share action hands the PDF
/// to the OS print/share sheet.
class PdfViewerScreen extends StatefulWidget {
  const PdfViewerScreen({
    super.key,
    this.bytes,
    this.url,
    this.title,
    this.shareFilename,
  });

  final Uint8List? bytes;
  final String? url;
  final String? title;
  final String? shareFilename;

  @override
  State<PdfViewerScreen> createState() => _PdfViewerScreenState();
}

class _PdfViewerScreenState extends State<PdfViewerScreen> {
  final _pages = <PdfRaster>[];
  Uint8List? _bytes;
  String? _error;
  bool _loading = true;

  @override
  void initState() {
    super.initState();
    // Defer so Provider (AppServices) is available via context.read.
    WidgetsBinding.instance.addPostFrameCallback((_) => _load());
  }

  Future<void> _load() async {
    try {
      Uint8List? data = widget.bytes;
      if (data == null && widget.url != null) {
        data = await context.read<AppServices>().documents.downloadBytes(widget.url!);
      }
      _bytes = data;
      if (data == null || data.isEmpty) {
        if (!mounted) return;
        setState(() {
          _loading = false;
          _error = 'No document to display.';
        });
        return;
      }
      // Rasterize each page to an image we can show in a scrolling list.
      await for (final page in Printing.raster(data, dpi: 150)) {
        _pages.add(page);
        if (mounted) setState(() {});
      }
      if (mounted) setState(() => _loading = false);
    } catch (e) {
      if (mounted) {
        setState(() {
          _loading = false;
          _error = 'Could not load PDF: $e';
        });
      }
    }
  }

  Future<void> _share() async {
    final bytes = _bytes;
    if (bytes == null) return;
    await Printing.sharePdf(
      bytes: bytes,
      filename: widget.shareFilename ?? 'document.pdf',
    );
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: Text(widget.title ?? 'Document'),
        actions: [
          if (_bytes != null)
            IconButton(
              tooltip: 'Share / print',
              icon: const Icon(Icons.share_outlined),
              onPressed: _share,
            ),
        ],
      ),
      body: _loading
          ? const Center(child: CircularProgressIndicator())
          : _error != null
              ? Center(
                  child: Padding(
                    padding: const EdgeInsets.all(24),
                    child: Text(
                      _error!,
                      textAlign: TextAlign.center,
                      style: const TextStyle(color: AppTheme.danger),
                    ),
                  ),
                )
              : _pages.isEmpty
                  ? const Center(child: Text('Empty document.'))
                  : ListView.builder(
                      padding: const EdgeInsets.symmetric(vertical: 12),
                      itemCount: _pages.length,
                      itemBuilder: (_, i) => Padding(
                        padding:
                            const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
                        child: Image(image: PdfRasterImage(_pages[i])),
                      ),
                    ),
    );
  }
}
