import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import '../providers/auth_provider.dart';
import '../theme/app_theme.dart';

/// Email/password sign-in against `POST /api/auth/login`.
///
/// Quick-login chips mirror the web app's demo accounts so the app is easy to
/// exercise against the backend.
class LoginScreen extends StatefulWidget {
  const LoginScreen({super.key});

  @override
  State<LoginScreen> createState() => _LoginScreenState();
}

class _LoginScreenState extends State<LoginScreen> {
  final _email = TextEditingController();
  final _password = TextEditingController();
  final _formKey = GlobalKey<FormState>();
  bool _obscure = true;

  // (email, label, password). The first entry is the real admin account in
  // the osren-becbb Firebase project; the @osren.com ones are optional demos.
  static const _demoAccounts = [
    ('sales7777.isnyc@gmail.com', 'Admin', 'sales#5796'),
    ('admin@osren.com', 'Admin (demo)', 'Password123'),
    ('sales@osren.com', 'Sales', 'Password123'),
    ('warehouse@osren.com', 'Warehouse', 'Password123'),
    ('finance@osren.com', 'Finance', 'Password123'),
    ('driver@osren.com', 'Driver', 'Password123'),
  ];

  @override
  void dispose() {
    _email.dispose();
    _password.dispose();
    super.dispose();
  }

  Future<void> _submit() async {
    if (!_formKey.currentState!.validate()) return;
    FocusScope.of(context).unfocus();
    final ok = await context.read<AuthProvider>().login(
          email: _email.text,
          password: _password.text,
        );
    if (!ok && mounted) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text('Could not sign in. Check your credentials.'),
          backgroundColor: AppTheme.danger,
        ),
      );
    }
  }

  @override
  Widget build(BuildContext context) {
    final auth = context.watch<AuthProvider>();
    return Scaffold(
      backgroundColor: AppTheme.canvas,
      body: SafeArea(
        child: SingleChildScrollView(
          child: Column(
            children: [
              _Hero(),
              Padding(
                padding: const EdgeInsets.fromLTRB(20, 28, 20, 32),
                child: ConstrainedBox(
                  constraints: const BoxConstraints(maxWidth: 440),
                  child: Form(
                    key: _formKey,
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.stretch,
                      children: [
                        Text(
                          'Welcome back',
                          style: Theme.of(context)
                              .textTheme
                              .headlineMedium
                              ?.copyWith(fontWeight: FontWeight.w700),
                        ),
                        const SizedBox(height: 4),
                        const Text(
                          'Sign in to the OSREN operations manager',
                          style: TextStyle(color: AppTheme.slate, fontSize: 14),
                        ),
                        const SizedBox(height: 22),
                        _LabeledField(
                          label: 'Email',
                          child: TextFormField(
                            controller: _email,
                            keyboardType: TextInputType.emailAddress,
                            textInputAction: TextInputAction.next,
                            decoration: const InputDecoration(
                              prefixIcon: Icon(Icons.mail_outline, size: 20),
                              hintText: 'you@company.com',
                            ),
                            validator: (v) => (v == null ||
                                    v.trim().isEmpty ||
                                    !v.contains('@'))
                                ? 'Enter a valid email'
                                : null,
                          ),
                        ),
                        const SizedBox(height: 14),
                        _LabeledField(
                          label: 'Password',
                          child: TextFormField(
                            controller: _password,
                            obscureText: _obscure,
                            textInputAction: TextInputAction.done,
                            decoration: InputDecoration(
                              prefixIcon:
                                  const Icon(Icons.lock_outline, size: 20),
                              hintText: '••••••••',
                              suffixIcon: IconButton(
                                icon: Icon(
                                  _obscure
                                      ? Icons.visibility_off_outlined
                                      : Icons.visibility_outlined,
                                  size: 20,
                                ),
                                onPressed: () =>
                                    setState(() => _obscure = !_obscure),
                              ),
                            ),
                            onFieldSubmitted: (_) => _submit(),
                            validator: (v) => (v == null || v.isEmpty)
                                ? 'Enter your password'
                                : null,
                          ),
                        ),
                        if (auth.error != null) ...[
                          const SizedBox(height: 12),
                          Container(
                            width: double.infinity,
                            padding: const EdgeInsets.symmetric(
                                horizontal: 12, vertical: 10),
                            decoration: BoxDecoration(
                              color: AppTheme.danger.withValues(alpha: 0.08),
                              borderRadius: BorderRadius.circular(10),
                            ),
                            child: Row(
                              children: [
                                const Icon(Icons.error_outline,
                                    color: AppTheme.danger, size: 18),
                                const SizedBox(width: 8),
                                Expanded(
                                  child: Text(auth.error!,
                                      style: const TextStyle(
                                          color: AppTheme.danger,
                                          fontSize: 13)),
                                ),
                              ],
                            ),
                          ),
                        ],
                        const SizedBox(height: 22),
                        FilledButton.icon(
                          style: FilledButton.styleFrom(
                            padding: const EdgeInsets.symmetric(vertical: 16),
                            backgroundColor: AppTheme.primary,
                          ),
                          onPressed: auth.busy ? null : _submit,
                          icon: auth.busy
                              ? const SizedBox(
                                  width: 18,
                                  height: 18,
                                  child: CircularProgressIndicator(
                                    strokeWidth: 2,
                                    color: Colors.white,
                                  ),
                                )
                              : const Icon(Icons.login, size: 20),
                          label: const Text('Sign in'),
                        ),
                        const SizedBox(height: 28),
                        Row(
                          children: const [
                            Expanded(child: Divider()),
                            Padding(
                              padding: EdgeInsets.symmetric(horizontal: 12),
                              child: Text('Quick demo login',
                                  style: TextStyle(
                                      color: AppTheme.slate, fontSize: 12)),
                            ),
                            Expanded(child: Divider()),
                          ],
                        ),
                        const SizedBox(height: 14),
                        Wrap(
                          spacing: 8,
                          runSpacing: 8,
                          children: [
                            for (final account in _demoAccounts)
                              ActionChip(
                                label: Text(account.$2),
                                avatar: CircleAvatar(
                                  backgroundColor:
                                      AppTheme.primaryLight,
                                  radius: 10,
                                  child: Text(
                                    account.$2.substring(0, 1),
                                    style: const TextStyle(
                                        fontSize: 10,
                                        color: AppTheme.primary,
                                        fontWeight: FontWeight.bold),
                                  ),
                                ),
                                onPressed: () {
                                  _email.text = account.$1;
                                  _password.text = account.$3;
                                },
                              ),
                          ],
                        ),
                      ],
                    ),
                  ),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

/// Blue gradient hero with the OSREN logo mark and tagline.
class _Hero extends StatelessWidget {
  @override
  Widget build(BuildContext context) {
    return Container(
      width: double.infinity,
      decoration: const BoxDecoration(gradient: AppTheme.primaryGradient),
      padding: const EdgeInsets.fromLTRB(24, 36, 24, 40),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Container(
            width: 60,
            height: 60,
            alignment: Alignment.center,
            decoration: BoxDecoration(
              color: Colors.white.withValues(alpha: 0.18),
              borderRadius: BorderRadius.circular(18),
              border: Border.all(
                  color: Colors.white.withValues(alpha: 0.35), width: 1),
            ),
            child: const Icon(Icons.inventory_2_rounded,
                color: Colors.white, size: 32),
          ),
          const SizedBox(height: 18),
          const Text(
            'OSREN Ops',
            style: TextStyle(
              color: Colors.white,
              fontSize: 26,
              fontWeight: FontWeight.w700,
              letterSpacing: -0.3,
            ),
          ),
          const SizedBox(height: 4),
          Text(
            'Integrated operations manager',
            style: TextStyle(
              color: Colors.white.withValues(alpha: 0.85),
              fontSize: 14,
            ),
          ),
        ],
      ),
    );
  }
}

class _LabeledField extends StatelessWidget {
  const _LabeledField({required this.label, required this.child});
  final String label;
  final Widget child;

  @override
  Widget build(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Padding(
          padding: const EdgeInsets.only(left: 2, bottom: 6),
          child: Text(label,
              style: const TextStyle(
                fontSize: 13,
                fontWeight: FontWeight.w600,
                color: AppTheme.ink,
              )),
        ),
        child,
      ],
    );
  }
}
