// FlutterFire configuration for the osren-becbb Firebase project.
//
// Values are taken from google-services.json. We initialise Firebase with
// these explicitly (see main.dart) instead of relying on the google-services
// Gradle plugin, which doesn't emit config under the current AGP template.
//
// NOTE: the Firebase API key is a public identifier (it ships inside any
// Firebase Android app) — security is enforced by Firebase Security Rules and
// Authentication, not by keeping this value secret.
import 'package:firebase_core/firebase_core.dart';
import 'package:flutter/foundation.dart'
    show defaultTargetPlatform, kIsWeb, TargetPlatform;

class DefaultFirebaseOptions {
  static FirebaseOptions get currentPlatform {
    if (kIsWeb) {
      throw UnsupportedError(
          'Web configuration is not set. Add a web FirebaseOptions.');
    }
    switch (defaultTargetPlatform) {
      case TargetPlatform.android:
        return android;
      case TargetPlatform.iOS:
        throw UnsupportedError(
            'iOS configuration is not set. Add an iOS FirebaseOptions.');
      default:
        throw UnsupportedError(
            'DefaultFirebaseOptions are not configured for this platform.');
    }
  }

  static const FirebaseOptions android = FirebaseOptions(
    apiKey: 'AIzaSyC-letMUlunZjUAcVYn_TVSqiO3M2Qi2eQ',
    appId: '1:386064708059:android:711600792aaa9de2dbb7fe',
    messagingSenderId: '386064708059',
    projectId: 'osren-becbb',
    storageBucket: 'osren-becbb.firebasestorage.app',
  );
}
