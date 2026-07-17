/**
 * Migration 003 — Firebase Authentication support
 *
 * Adds `firebase_uid` to `users` (unique) and relaxes `password_hash` to
 * nullable so Firebase-only users (who have no local password) can exist.
 *
 * NOTE: this repo has no sequelize-cli / `db:migrate` script, so this file is
 * a convention-matching record. The change is actually applied by the runnable,
 * idempotent script `scripts/migrate-firebase-uid.js`.
 */
module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.addColumn('users', 'firebase_uid', {
      type: Sequelize.STRING(128),
      allowNull: true
    });
    await queryInterface.changeColumn('users', 'password_hash', {
      type: Sequelize.STRING(255),
      allowNull: true
    });
    await queryInterface.addIndex('users', ['firebase_uid'], {
      unique: true,
      name: 'users_firebase_uid_uidx'
    });
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.removeIndex('users', 'users_firebase_uid_uidx');
    await queryInterface.removeColumn('users', 'firebase_uid');
    await queryInterface.changeColumn('users', 'password_hash', {
      type: Sequelize.STRING(255),
      allowNull: false
    });
  }
};
