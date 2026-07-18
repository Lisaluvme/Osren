/**
 * Runnable, idempotent migration that applies migration 003.
 *
 * Run with:  node backend/scripts/migrate-firebase-uid.js
 *
 * Adds users.firebase_uid (unique), makes users.password_hash nullable, and
 * creates the unique index — each guarded so re-running is safe.
 */
require('dotenv').config();
const db = require('../models');
const { DataTypes } = require('sequelize');

const { sequelize } = db;

async function applyMigration() {
  const qi = sequelize.getQueryInterface();
  const table = await qi.describeTable('users');

  if (!table.firebase_uid) {
    await qi.addColumn('users', 'firebase_uid', {
      type: DataTypes.STRING(128),
      allowNull: true
    });
    console.log('✅ Added column users.firebase_uid');
  } else {
    console.log('– users.firebase_uid already exists');
  }

  // Relax password_hash so Firebase-only users can have NULL.
  await qi.changeColumn('users', 'password_hash', {
    type: DataTypes.STRING(255),
    allowNull: true
  });
  console.log('✅ users.password_hash is now nullable');

  // status column for the registration-approval workflow.
  if (!table.status) {
    await qi.addColumn('users', 'status', {
      type: DataTypes.STRING(20),
      allowNull: false,
      defaultValue: 'active'
    });
    console.log('✅ Added column users.status (default active)');
  } else {
    console.log('– users.status already exists');
  }
  // Backfill any legacy/NULL rows to active.
  try {
    await sequelize.query("UPDATE users SET status = 'active' WHERE status IS NULL");
  } catch (_) {
    /* ignore */
  }

  // Unique index on firebase_uid (idempotent).
  try {
    await qi.addIndex('users', ['firebase_uid'], {
      unique: true,
      name: 'users_firebase_uid_uidx'
    });
    console.log('✅ Added unique index on users.firebase_uid');
  } catch (e) {
    if (/already exists/i.test(e.message || '')) {
      console.log('– unique index on users.firebase_uid already exists');
    } else {
      throw e;
    }
  }
}

async function run() {
  try {
    await sequelize.authenticate();
    console.log('✅ DB connected');
    await applyMigration();
    console.log('\n✅ Firebase-uid migration complete');
  } catch (e) {
    console.error('❌ Migration failed:', e.message);
    process.exitCode = 1;
  } finally {
    await sequelize.close();
  }
}

module.exports = { applyMigration };

if (require.main === module) {
  run();
}
