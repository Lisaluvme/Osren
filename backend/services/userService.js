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
    status: u.status,
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
  // Pending users live in the approvals queue, not the main user list.
  const where = { status: { [Op.in]: ['active', 'deactivated'] } };
  if (requesterRole !== 'admin') {
    include[0].required = true;
    include[0].where = { name: requesterRole };
  }
  const users = await User.findAll({ where, include, order: [['created_at', 'DESC']] });
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
    is_active: true,
    status: 'active'
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

  if (patch.is_active !== undefined) {
    user.is_active = patch.is_active;
    user.status = patch.is_active ? 'active' : 'deactivated';
  }

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

// Departments a user may request via self-registration (admin is excluded —
// admins are seeded/created by admins only).
const SELF_REG_ROLES = ['sales', 'finance', 'warehouse', 'driver'];

/**
 * Self-registration: create a PENDING user that cannot sign in until approved.
 */
async function registerPending({ email, full_name, requestedRoleName, firebaseUid }) {
  const normalizedEmail = String(email).toLowerCase().trim();
  if (!SELF_REG_ROLES.includes(requestedRoleName)) {
    throw new AppError('Invalid requested department.', 400);
  }
  const role = await getRoleByName(requestedRoleName);
  if (!role) {
    throw new AppError('Invalid requested department.', 400);
  }

  const existing = await User.findOne({
    where: { [Op.or]: [{ firebase_uid: firebaseUid }, { email: normalizedEmail }] },
    include: [{ model: Role, as: 'role' }]
  });
  if (existing) {
    if (existing.status === 'pending') {
      throw new AppError('This email is already pending approval.', 409);
    }
    throw new AppError('This email is already registered. Please log in.', 409);
  }

  const user = await User.create({
    email: normalizedEmail,
    password_hash: null,
    firebase_uid: firebaseUid,
    full_name,
    role_id: role.id,
    is_active: false,
    status: 'pending'
  });
  const reloaded = await User.findByPk(user.id, { include: [{ model: Role, as: 'role' }] });
  return sanitizeUser(reloaded);
}

/**
 * List users awaiting approval (admin only).
 */
async function listPending() {
  const users = await User.findAll({
    where: { status: 'pending' },
    include: [{ model: Role, as: 'role' }],
    order: [['created_at', 'DESC']]
  });
  return users.map(sanitizeUser);
}

/**
 * Approve a pending user. Admin may confirm or change the department.
 */
async function approveUser(id, { role_name }) {
  const user = await User.findByPk(id, { include: [{ model: Role, as: 'role' }] });
  if (!user) throw new AppError('User not found', 404);
  if (user.status !== 'pending') {
    throw new AppError('Only pending users can be approved.', 400);
  }
  const targetRoleName = role_name || (user.role && user.role.name);
  if (!targetRoleName) throw new AppError('A department (role_name) is required.', 400);
  const role = await getRoleByName(targetRoleName);
  if (!role) throw new AppError(`Unknown role: ${targetRoleName}`, 400);

  user.role_id = role.id;
  user.status = 'active';
  user.is_active = true;
  await user.save();

  // Re-enable the Firebase account in case it had been disabled.
  if (user.firebase_uid) {
    try {
      getAdmin().auth().updateUser(user.firebase_uid, { disabled: false });
    } catch (_) {
      /* ignore */
    }
  }

  const reloaded = await User.findByPk(id, { include: [{ model: Role, as: 'role' }] });
  return sanitizeUser(reloaded);
}

/**
 * Reject a pending registration.
 */
async function rejectUser(id) {
  const user = await User.findByPk(id, { include: [{ model: Role, as: 'role' }] });
  if (!user) throw new AppError('User not found', 404);
  if (user.status !== 'pending') {
    throw new AppError('Only pending users can be rejected.', 400);
  }
  user.status = 'rejected';
  user.is_active = false;
  await user.save();
  if (user.firebase_uid) {
    try {
      getAdmin().auth().updateUser(user.firebase_uid, { disabled: true });
    } catch (_) {
      /* ignore */
    }
  }
  return sanitizeUser(user);
}

module.exports = {
  listUsers,
  createUser,
  updateUser,
  deactivateUser,
  registerPending,
  listPending,
  approveUser,
  rejectUser,
  getRoleByName,
  sanitizeUser
};
