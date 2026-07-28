import 'dart:convert';

import 'package:flutter/material.dart';
import 'package:signature/signature.dart';

import '../theme/app_theme.dart';

/// Full-screen proof-of-delivery signature capture.
///
/// Pops with a `data:image/png;base64,...` string for the drawn signature, or
/// `null` if the pad is empty / the user cancels. The data URL is what the
/// backend's `signature` field on `PATCH /api/orders/:id` expects.
class SignaturePadScreen extends StatefulWidget {
  const SignaturePadScreen({super.key, this.customerName});

  /// Shown as a "Received by" caption above the pad.
  final String? customerName;

  @override
  State<SignaturePadScreen> createState() => _SignaturePadScreenState();
}

class _SignaturePadScreenState extends State<SignaturePadScreen> {
  late final SignatureController _controller;

  @override
  void initState() {
    super.initState();
    _controller = SignatureController(
      penStrokeWidth: 3,
      penColor: AppTheme.ink,
      exportPenColor: AppTheme.ink,
      exportBackgroundColor: Colors.white,
    );
  }

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  Future<void> _confirm() async {
    if (_controller.isEmpty) {
      Navigator.of(context).pop(null);
      return;
    }
    final messenger = ScaffoldMessenger.of(context);
    final bytes = await _controller.toPngBytes();
    if (bytes == null || bytes.isEmpty) {
      messenger.showSnackBar(const SnackBar(
        content: Text('Could not capture signature'),
        backgroundColor: AppTheme.danger,
      ));
      return;
    }
    if (!mounted) return;
    Navigator.of(context).pop('data:image/png;base64,${base64Encode(bytes)}');
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Customer signature'),
        actions: [
          IconButton(
            tooltip: 'Undo',
            icon: const Icon(Icons.undo),
            onPressed: () => _controller.undo(),
          ),
          IconButton(
            tooltip: 'Clear',
            icon: const Icon(Icons.delete_outline),
            onPressed: () => _controller.clear(),
          ),
        ],
      ),
      body: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            if (widget.customerName != null)
              Padding(
                padding: const EdgeInsets.only(bottom: 8),
                child: Text(
                  'Received by: ${widget.customerName}',
                  style: const TextStyle(
                      fontWeight: FontWeight.w600, color: AppTheme.ink),
                ),
              ),
            Expanded(
              child: Card(
                child: ClipRRect(
                  borderRadius: BorderRadius.circular(16),
                  child: Signature(
                    controller: _controller,
                    backgroundColor: Colors.white,
                    placeholder: const Padding(
                      padding: EdgeInsets.all(24),
                      child: Text(
                        'Sign here',
                        style: TextStyle(color: AppTheme.slate),
                      ),
                    ),
                  ),
                ),
              ),
            ),
            const SizedBox(height: 12),
            Row(
              children: [
                Expanded(
                  child: OutlinedButton(
                    onPressed: () => Navigator.of(context).pop(null),
                    child: const Text('Cancel'),
                  ),
                ),
                const SizedBox(width: 12),
                Expanded(
                  child: FilledButton.icon(
                    onPressed: _confirm,
                    icon: const Icon(Icons.check),
                    label: const Text('Confirm'),
                  ),
                ),
              ],
            ),
          ],
        ),
      ),
    );
  }
}
