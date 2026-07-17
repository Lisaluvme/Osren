const admin = require('firebase-admin');

/**
 * Lazy singleton for the Firebase Admin app.
 *
 * Initialized from service-account env vars (FIREBASE_PROJECT_ID,
 * FIREBASE_CLIENT_EMAIL, FIREBASE_PRIVATE_KEY). If those are missing we fall
 * back to Application Default Credentials so the module never crashes on
 * import — auth calls will simply surface a clear error until creds are set.
 */
let initialized = false;

function getAdmin() {
  if (initialized) return admin;

  const projectId = process.env.FIREBASE_PROJECT_ID;
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
  const privateKeyRaw = process.env.FIREBASE_PRIVATE_KEY;
  // Env vars escape newlines as literal "\n"; restore them for the PEM.
  const privateKey = privateKeyRaw ? privateKeyRaw.replace(/\\n/g, '\n') : undefined;

  if (projectId && clientEmail && privateKey) {
    admin.initializeApp({
      credential: admin.credential.cert({ projectId, clientEmail, privateKey }),
      projectId,
    });
    console.log('✅ Firebase Admin initialized from service account');
  } else {
    console.warn(
      '⚠️  Firebase service account env vars not set ' +
        '(FIREBASE_PROJECT_ID / FIREBASE_CLIENT_EMAIL / FIREBASE_PRIVATE_KEY). ' +
        'Firebase auth will fail until they are configured.'
    );
    // Relies on Application Default Credentials (e.g. on GCP). Throws on first
    // auth call if no ADC is available — preferable to crashing at import time.
    admin.initializeApp();
  }

  initialized = true;
  return admin;
}

module.exports = { admin, getAdmin };
