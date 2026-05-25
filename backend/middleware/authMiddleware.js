const authService = require('../services/authService');
const { User, Role } = require('../models');

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

module.exports = {
  authenticate,
  optionalAuthenticate,
  requireRole,
  requireAdmin
};
