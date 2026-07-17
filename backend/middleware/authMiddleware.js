const authService = require('../services/authService');
const { User, Role } = require('../models');
const { getAdmin } = require('../services/firebaseAdmin');

/**
 * Authentication middleware - verifies JWT token
 */
async function authenticate(req, res, next) {
  try {
    // Get token from header
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        success: false,
        error: 'Access token is required'
      });
    }

    const token = authHeader.substring(7);

    // Verify token
    const decoded = authService.verifyAccessToken(token);

    // Get user with role
    const user = await User.findByPk(decoded.userId, {
      include: [{ model: Role, as: 'role' }]
    });

    if (!user || !user.is_active) {
      return res.status(401).json({
        success: false,
        error: 'User not found or inactive'
      });
    }

    // Attach user to request
    req.user = user;
    req.userId = user.id;
    req.userRole = user.role ? user.role.name : 'viewer';

    next();
  } catch (error) {
    return res.status(401).json({
      success: false,
      error: error.message || 'Authentication failed'
    });
  }
}

/**
 * Optional authentication - doesn't fail if no token
 */
async function optionalAuthenticate(req, res, next) {
  try {
    const authHeader = req.headers.authorization;

    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.substring(7);
      const decoded = authService.verifyAccessToken(token);

      const user = await User.findByPk(decoded.userId, {
        include: [{ model: Role, as: 'role' }]
      });

      if (user && user.is_active) {
        req.user = user;
        req.userId = user.id;
        req.userRole = user.role ? user.role.name : 'viewer';
      }
    }

    next();
  } catch (error) {
    // Continue without authentication
    next();
  }
}

/**
 * Require specific role
 */
function requireRole(...allowedRoles) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        error: 'Authentication required'
      });
    }

    const userRole = req.userRole || 'viewer';

    if (!allowedRoles.includes(userRole)) {
      return res.status(403).json({
        success: false,
        error: 'Insufficient permissions'
      });
    }

    next();
  };
}

/**
 * Require admin role
 */
function requireAdmin(req, res, next) {
  return requireRole('admin')(req, res, next);
}

/**
 * Firebase Authentication middleware — verifies a Firebase ID token
 * (Authorization: Bearer <idToken>) and resolves the matching `users` row.
 *
 * Resolution order: firebase_uid → email (linking the uid if matched).
 * Produces the same `req.user / req.userId / req.userRole` contract as
 * `authenticate`, so requireRole/requireAdmin compose on top unchanged.
 */
async function authenticateFirebase(req, res, next) {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        success: false,
        error: 'Firebase ID token is required'
      });
    }

    const idToken = authHeader.substring(7);
    const admin = getAdmin();
    const decoded = await admin.auth().verifyIdToken(idToken);

    // 1. Match by Firebase UID
    let user = await User.findOne({
      where: { firebase_uid: decoded.uid },
      include: [{ model: Role, as: 'role' }]
    });

    // 2. Fallback: match by email and link the UID (handles users provisioned
    //    in the DB before the Firebase user existed, or vice-versa)
    if (!user && decoded.email) {
      user = await User.findOne({
        where: { email: String(decoded.email).toLowerCase() },
        include: [{ model: Role, as: 'role' }]
      });
      if (user) {
        user.firebase_uid = decoded.uid;
        await user.save();
      }
    }

    if (!user) {
      return res.status(403).json({
        success: false,
        code: 'ACCOUNT_NOT_PROVISIONED',
        error: 'Your account has not been given a role yet. Contact an administrator.'
      });
    }

    if (!user.is_active) {
      return res.status(403).json({
        success: false,
        code: 'ACCOUNT_DEACTIVATED',
        error: 'Your account has been deactivated.'
      });
    }

    req.user = user;
    req.userId = user.id;
    req.userRole = user.role ? user.role.name : 'viewer';

    // Throttle last_login writes to once per ~5 minutes.
    try {
      const fiveMinAgo = new Date(Date.now() - 5 * 60 * 1000);
      if (!user.last_login || new Date(user.last_login) < fiveMinAgo) {
        await User.update({ last_login: new Date() }, { where: { id: user.id } });
      }
    } catch (_) {
      // Non-critical — ignore background update failures.
    }

    next();
  } catch (error) {
    return res.status(401).json({
      success: false,
      error: error.message || 'Firebase authentication failed'
    });
  }
}

module.exports = {
  authenticate,
  optionalAuthenticate,
  authenticateFirebase,
  requireRole,
  requireAdmin
};
