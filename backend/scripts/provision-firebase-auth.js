/**
 * Provision Firebase Authentication users + role custom claims for the
 * osren-app project. Uses the service-account key at the repo root.
 *
 *   node scripts/provision-firebase-auth.js
 *
 * For each account: create it (if missing) with the given password, then set
 * a custom claim { role } that the backend reads after verifyIdToken().
 * Existing users keep their current password — only the claim is updated.
 */
const path = require('path');
const admin = require('firebase-admin');

const serviceAccount = require(path.resolve(__dirname, '../../osren-app-22f398982544.json'));

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  projectId: serviceAccount.project_id,
});

const auth = admin.auth();

// Mirror the web app's create_users.js roles, plus the real admin account.
const users = [
  { email: 'sales7777.isnyc@gmail.com', password: 'sales#5796', role: 'admin', name: 'Admin' },
  { email: 'admin@osren.com', password: 'Password123', role: 'admin', name: 'Administrator' },
  { email: 'sales@osren.com', password: 'Password123', role: 'sales', name: 'Sales' },
  { email: 'warehouse@osren.com', password: 'Password123', role: 'warehouse', name: 'Warehouse' },
  { email: 'finance@osren.com', password: 'Password123', role: 'finance', name: 'Finance' },
  { email: 'driver@osren.com', password: 'Password123', role: 'driver', name: 'Driver' },
];

async function provision(u) {
  let record;
  let created = false;
  try {
    record = await auth.getUserByEmail(u.email);
    console.log(`↻ exists : ${u.email} (uid ${record.uid})`);
  } catch (e) {
    if (e.code === 'auth/user-not-found') {
      record = await auth.createUser({
        email: u.email,
        password: u.password,
        displayName: u.name,
        emailVerified: true,
      });
      created = true;
      console.log(`+ created: ${u.email} (uid ${record.uid})`);
    } else {
      throw e;
    }
  }
  await auth.setCustomUserClaims(record.uid, { role: u.role });
  console.log(`  ★ claim set: role=${u.role}${created ? '' : ' (password unchanged — keeping existing)'}`);
}

(async () => {
  console.log(`Firebase project: ${serviceAccount.project_id}`);
  try {
    const list = await auth.listUsers(100);
    console.log(`Existing Auth users: ${list.users.length}`);
    list.users.forEach((u) =>
      console.log(`   - ${u.email}  claims=${JSON.stringify(u.customClaims || {})}`));
  } catch (e) {
    console.log(`listUsers note: ${e.message}`);
  }
  console.log('--- provisioning ---');
  for (const u of users) {
    try {
      await provision(u);
    } catch (e) {
      console.error(`✗ ${u.email}: ${e.code || e.message}`);
    }
  }
  console.log('DONE');
  await admin.app().delete();
})().catch((e) => {
  console.error('FATAL:', e.message);
  process.exit(1);
});
