// Lightweight smoke test — confirms the app's root widget type exists and the
// package imports compile. Full widget tests (login flow, navigation) require
// mocking SharedPreferences + http; add them as the app grows.

import 'package:flutter_test/flutter_test.dart';

import 'package:osren_ops_mobile/app.dart';

void main() {
  test('App exposes a root widget type', () {
    expect(OsrenOpsApp, isNotNull);
  });
}
