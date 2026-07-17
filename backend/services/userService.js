const { Op } = require('sequelize');
const { getAdmin } = require('./firebaseAdmin');
const { User, Role } = require('../models');
const { AppError } = require('../middleware/errorHandler');

async function getRoleByName(name) {
  return Role.findOne({ where: { name } });
}

function sanitizeUser(user) {
  const u = user.toJSON ? user.toJSON() : { ...user };
  return {
    id: u.id,
    email: u.email,
    full_name: u.full_name,
    firebase_uid: u.firebase_uid,
    is_active: u.is_active,
    last_login: u.last_login,
    role: u.role ? { id: u.role.id, name: u.role.name, display_name: u.role.display_name } : null
  };
}

/**
 * List users. Admins see everyone; department managers see only users in
 * their own role ("department" = role name).
 */
async function listUsers(requesterRole) {
  const include = [{ model: Role, as: 'role' }];
  if (requesterRole !== 'admin') {
    include[0].required = true;
    include[0].where = { name: requesterRole };
  }
  const users = await User.findAll({ include, order: [['created_at', 'DESC']] });
  return users.map(sanitizeUser);
}

/**
 * Create a user: provisions the Firebase account (or links an existing one)
 * and inserts the `users` row with the assigned role.
 */
async function createUser({ email, password, full_name, role_name }) {
  const admin = getAdmin();
  const role = await getRoleByName(role_name);
  if (!role) {
    throw new AppError(`Unknown role: ${role_name}`, 400);
  }

  const normalizedEmail = String(email).toLowerCase().trim();

  let firebaseUser;
  try {
    firebaseUser = await admin.auth().createUser({
      email: normalizedEmail,
      password,
      displayName: full_name
    });
  } catch (e) {
    if (e.code === 'auth/email-already-exists') {
      // Link an existing Firebase account so it can be re-provisioned.
      firebaseUser = await admin.auth().getUserByEmail(normalizedEmail);
    } else {
      throw new AppError(e.message, 400);
    }
  }

  const existing = await User.findOne({
    where: { [Op.or]: [{ firebase_uid: firebaseUser.uid }, { email: normalizedEmail }] }
  });
  if (existing) {
    throw new AppError('A user with this email already exists.', 409);
  }

  const user = await User.create({
    email: normalizedEmail,
    password_hash: null,
    firebase_uid: firebaseUser.uid,
    full_name,
    role_id: role.id,
    is_active: true
  });

  const reloaded = await User.findByPk(user.id, { include: [{ model: Role, as: 'role' }] });
  return sanitizeUser(reloaded);
}

/**
 * Update a user. Non-admin requesters may only touch users in their own
 * department and may only keep/assign their own role.
 */
async function updateUser(id, patch, requesterRole) {
  const admin = getAdmin();
  const user = await User.findByPk(id, { include: [{ model: Role, as: 'role' }] });
  if (!user) {
    throw new AppError('User not found', 404);
  }

  const targetRoleName = user.role ? user.role.name : null;
  if (requesterRole !== 'admin') {
    if (targetRoleName !== requesterRole) {
      throw new AppError('You can only manage users within your own department.', 403);
    }
    if (patch.role_name !== undefined && patch.role_name !== requesterRole) {
      throw new AppError('You can only assign users to your own department.', 403);
    }
  }

  if (patch.full_name !== undefined) user.full_name = patch.full_name;

  if (patch.role_name !== undefined) {
    const role = await getRoleByName(patch.role_name);
    if (!role) {
      throw new AppError(`Unknown role: ${patch.role_name}`, 400);
    }
    user.role_id = role.id;
  }

  if (patch.is_active !== undefined) user.is_active = patch.is_active;

  await user.save();

  // Sync display name + disabled state to Firebase (best-effort).
  if (user.firebase_uid) {
    try {
      const updates = {};
      if (patch.full_name !== undefined) updates.displayName = patch.full_name;
      if (patch.is_active !== undefined) updates.disabled = !patch.is_active;
      if (Object.keys(updates).length) {
        await admin.auth().updateUser(user.firebase_uid, updates);
      }
    } catch (e) {
      console.warn('Firebase sync failed during user update:', e.message);
    }
  }

  const reloaded = await User.findByPk(id, { include: [{ model: Role, as: 'role' }] });
  return sanitizeUser(reloaded);
}

async function deactivateUser(id, requesterRole) {
  return updateUser(id, { is_active: false }, requesterRole);
}

module.exports = {
  listUsers,
  createUser,
  updateUser,
  deactivateUser,
  getRoleByName,
  sanitizeUser
};
