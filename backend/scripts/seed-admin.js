/**
 * First-run bootstrap: ensures the 5 frontend roles exist and creates the
 * initial admin user (in both Firebase and the `users` table).
 *
 * Run with:  node backend/scripts/seed-admin.js
 *
 * Requires FIREBASE_* service-account env vars and SEED_ADMIN_EMAIL /
 * SEED_ADMIN_PASSWORD in backend/.env. Run migrate-firebase-uid.js first
 * (this script applies it automatically as a safety net).
 */
require('dotenv').config();
const db = require('../models');
const { getAdmin } = require('../services/firebaseAdmin');
const { applyMigration } = require('./migrate-firebase-uid');

const { Role, User, sequelize } = db;

const ROLES = [
  { name: 'admin', display_name: 'System Administrator', level: 100, description: 'Full access' },
  { name: 'finance', display_name: 'Finance Manager', level: 60, description: 'Finance & Accounts department' },
  { name: 'warehouse', display_name: 'Warehouse Manager', level: 55, description: 'Warehouse department' },
  { name: 'sales', display_name: 'Sales Representative', level: 50, description: 'Sales & Distribution department' },
  { name: 'driver', display_name: 'Delivery Driver', level: 30, description: 'Delivery only' }
];

async function run() {
  const adminEmail = (process.env.SEED_ADMIN_EMAIL || 'admin@osren.com').toLowerCase();
  const adminPassword = process.env.SEED_ADMIN_PASSWORD;

  if (!adminPassword) {
    console.error('❌ SEED_ADMIN_PASSWORD must be set in backend/.env');
    process.exitCode = 1;
    return;
  }

  await sequelize.authenticate();
  console.log('✅ DB connected');

  // Create tables from models (creates everything on a fresh SQLite DB).
  await sequelize.sync();
  console.log('✅ Tables synced');

  // On existing Postgres DBs, add the Firebase columns that predate this change.
  if (sequelize.getDialect() === 'postgres') {
    await applyMigration();
  } else {
    console.log('– SQLite: firebase_uid + status created via sync');
  }

  // 1. Roles (this also corrects the legacy admin/manager/staff/viewer mismatch).
  for (const r of ROLES) {
    await Role.findOrCreate({ where: { name: r.name }, defaults: r });
  }
  console.log('✅ Roles ensured:', ROLES.map(r => r.name).join(', '));

  // 2. Firebase admin user.
  const fbAdmin = getAdmin();
  let fbUser;
  try {
    fbUser = await fbAdmin.auth().createUser({
      email: adminEmail,
      password: adminPassword,
      displayName: 'System Administrator'
    });
    console.log(`✅ Created Firebase admin: ${adminEmail}`);
  } catch (e) {
    if (e.code === 'auth/email-already-exists') {
      fbUser = await fbAdmin.auth().getUserByEmail(adminEmail);
      console.log(`– Firebase admin already exists: ${adminEmail}`);
    } else {
      throw e;
    }
  }

  // 3. DB admin user.
  const adminRole = await Role.findOne({ where: { name: 'admin' } });
  const [user, created] = await User.findOrCreate({
    where: { email: adminEmail },
    defaults: {
      email: adminEmail,
      full_name: 'System Administrator',
      firebase_uid: fbUser.uid,
      role_id: adminRole.id,
      password_hash: null,
      is_active: true
    }
  });
  if (!created) {
    user.firebase_uid = fbUser.uid;
    user.role_id = adminRole.id;
    user.is_active = true;
    await user.save();
  }
  console.log(`✅ DB admin ${created ? 'created' : 'updated'}: ${user.email}`);

  console.log('\n========================================================');
  console.log('Bootstrap complete. Sign in with:');
  console.log(`  email:    ${adminEmail}`);
  console.log('  password: (the SEED_ADMIN_PASSWORD you set)');
  console.log('This admin can now create all other users via the UI.');
  console.log('========================================================');
}

run()
  .catch((e) => {
    console.error('❌ Seed failed:', e.message || e);
    process.exitCode = 1;
  })
  .finally(async () => {
    await sequelize.close();
  });
