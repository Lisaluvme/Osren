import 'package:firebase_core/firebase_core.dart';
import 'package:flutter/material.dart';

import 'app.dart';
import 'firebase_options.dart';

/// Entry point. Firebase is initialised with explicit options for the
/// osren-becbb project (see firebase_options.dart) before the app runs, so
/// [AuthProvider] can use firebase_auth immediately.
void main() async {
  WidgetsFlutterBinding.ensureInitialized();
  await Firebase.initializeApp(options: DefaultFirebaseOptions.currentPlatform);
  runApp(const OsrenOpsApp());
}
