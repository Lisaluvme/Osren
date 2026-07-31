import 'package:flutter/material.dart';

import '../theme/app_theme.dart';

/// A compact metric tile used on dashboards and list headers.
class StatCard extends StatelessWidget {
  const StatCard({
    super.key,
    required this.label,
    required this.value,
    this.icon,
    this.accentColor,
    this.subtitle,
  });

  final String label;
  final String value;
  final IconData? icon;
  final Color? accentColor;
  final String? subtitle;

  @override
  Widget build(BuildContext context) {
    final color = accentColor ?? AppTheme.primary;
    return Card(
      child: Padding(
        padding: const EdgeInsets.fromLTRB(14, 14, 14, 14),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          mainAxisSize: MainAxisSize.min,
          children: [
            if (icon != null)
              Container(
                width: 34,
                height: 34,
                alignment: Alignment.center,
                decoration: BoxDecoration(
                  color: color.withValues(alpha: 0.12),
                  borderRadius: BorderRadius.circular(10),
                ),
                child: Icon(icon, size: 18, color: color),
              )
            else
              const SizedBox(height: 34),
            const SizedBox(height: 12),
            Text(
              value,
              style: TextStyle(
                fontSize: 22,
                fontWeight: FontWeight.w700,
                color: AppTheme.ink,
                letterSpacing: -0.3,
              ),
            ),
            const SizedBox(height: 2),
            Text(
              label,
              style: const TextStyle(
                fontSize: 12,
                color: AppTheme.slate,
                fontWeight: FontWeight.w500,
              ),
            ),
            if (subtitle != null) ...[
              const SizedBox(height: 2),
              Text(
                subtitle!,
                style: TextStyle(fontSize: 11, color: AppTheme.slate),
              ),
            ],
          ],
        ),
      ),
    );
  }
}

/// Colored pill for status strings (Pending/Approved/Low stock/etc.).
class StatusChip extends StatelessWidget {
  const StatusChip(this.label, {super.key, this.tone = StatusTone.neutral});

  final String label;
  final StatusTone tone;

  factory StatusChip.auto(String label) {
    final lower = label.toLowerCase();
    final StatusTone tone;
    if ([
      'paid',
      'completed',
      'delivered',
      'approved',
      'active',
      'instock',
    ].contains(lower)) {
      tone = StatusTone.success;
    } else if ([
      'pending',
      'pending invoice',
      'draft',
      'in transit',
      'submitted',
      'unpaid',
      'partial paid',
    ].contains(lower)) {
      tone = StatusTone.warning;
    } else if ([
      'overdue',
      'cancelled',
      'rejected',
      'expired',
      'defective',
    ].contains(lower)) {
      tone = StatusTone.danger;
    } else {
      tone = StatusTone.neutral;
    }
    return StatusChip(label, tone: tone);
  }

  @override
  Widget build(BuildContext context) {
    final colors = switch (tone) {
      StatusTone.success =>
        (fg: AppTheme.success, bg: AppTheme.success.withValues(alpha: 0.12)),
      StatusTone.warning =>
        (fg: AppTheme.warning, bg: AppTheme.warning.withValues(alpha: 0.12)),
      StatusTone.danger =>
        (fg: AppTheme.danger, bg: AppTheme.danger.withValues(alpha: 0.12)),
      StatusTone.neutral =>
        (fg: AppTheme.slate, bg: AppTheme.slate.withValues(alpha: 0.12)),
    };
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
      decoration: BoxDecoration(
        color: colors.bg,
        borderRadius: BorderRadius.circular(999),
      ),
      child: Text(
        label,
        style: TextStyle(
          color: colors.fg,
          fontSize: 12,
          fontWeight: FontWeight.w600,
        ),
      ),
    );
  }
}

enum StatusTone { success, warning, danger, neutral }

/// Centered placeholder for empty lists.
class EmptyState extends StatelessWidget {
  const EmptyState({
    super.key,
    required this.message,
    this.icon = Icons.inbox_outlined,
    this.action,
  });

  final String message;
  final IconData icon;
  final Widget? action;

  @override
  Widget build(BuildContext context) {
    return Center(
      child: Padding(
        padding: const EdgeInsets.all(32),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Icon(icon, size: 56, color: AppTheme.slate.withValues(alpha: 0.5)),
            const SizedBox(height: 12),
            Text(
              message,
              textAlign: TextAlign.center,
              style: TextStyle(color: AppTheme.slate),
            ),
            if (action != null) ...[
              const SizedBox(height: 16),
              action!,
            ],
          ],
        ),
      ),
    );
  }
}

/// Inline error banner with an optional retry button.
class ErrorBanner extends StatelessWidget {
  const ErrorBanner({
    super.key,
    required this.message,
    this.onRetry,
  });

  final String message;
  final VoidCallback? onRetry;

  @override
  Widget build(BuildContext context) {
    return Container(
      width: double.infinity,
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        color: AppTheme.danger.withValues(alpha: 0.08),
        borderRadius: BorderRadius.circular(10),
      ),
      child: Row(
        children: [
          const Icon(Icons.error_outline, color: AppTheme.danger, size: 20),
          const SizedBox(width: 8),
          Expanded(
            child: Text(
              message,
              style: const TextStyle(color: AppTheme.danger, fontSize: 13),
            ),
          ),
          if (onRetry != null)
            TextButton(onPressed: onRetry, child: const Text('Retry')),
        ],
      ),
    );
  }
}

/// Format money. [currency] defaults to MYR — the web app's Stripe currency.
String formatMoney(num value, {String currency = 'RM'}) {
  final formatted = value.toStringAsFixed(2);
  return '$currency $formatted';
}
