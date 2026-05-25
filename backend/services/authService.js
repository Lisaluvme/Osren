const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { User, Role } = require('../models');
const { Role: RoleEnum } = require('../../lib/permissions.cjs');

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '24h';
const REFRESH_TOKEN_EXPIRES_IN = process.env.REFRESH_TOKEN_EXPIRES_IN || '7d';

class AuthService {
  /**
   * Register a new user
   */
  async register(userData) {
    const { email, password, full_name, role_name } = userData;

    // Check if user already exists
    const existingUser = await User.findOne({ where: { email } });
    if (existingUser) {
      throw new Error('User with this email already exists');
    }

    // Hash password
    const password_hash = await bcrypt.hash(password, 10);

    // Get role
    const role = await Role.findOne({ where: { name: role_name } });
    if (!role) {
      throw new Error('Invalid role specified');
    }

    // Create user
    const user = await User.create({
      email,
      password_hash,
      full_name,
      role_id: role.id
    });

    // Generate tokens
    const tokens = this.generateTokens(user);

    return {
      user: this.sanitizeUser(user),
      ...tokens
    };
  }

  /**
   * Login user
   */
  async login(email, password) {
    // Find user with role
    const user = await User.findOne({
      where: { email },
      include: [{ model: Role, as: 'role' }]
    });

    if (!user) {
      throw new Error('Invalid email or password');
    }

    if (!user.is_active) {
      throw new Error('User account is inactive');
    }

    // Verify password
    const isValidPassword = await bcrypt.compare(password, user.password_hash);
    if (!isValidPassword) {
      throw new Error('Invalid email or password');
    }

    // Update last login
    await user.update({ last_login: new Date() });

    // Generate tokens
    const tokens = this.generateTokens(user);

    return {
      user: this.sanitizeUser(user),
      ...tokens
    };
  }

  /**
   * Refresh access token
   */
  async refreshToken(refreshToken) {
    try {
      // Verify refresh token
      const decoded = jwt.verify(refreshToken, JWT_SECRET);

      // Get user
      const user = await User.findByPk(decoded.userId, {
        include: [{ model: Role, as: 'role' }]
      });

      if (!user || !user.is_active) {
        throw new Error('Invalid refresh token');
      }

      // Generate new tokens
      const tokens = this.generateTokens(user);

      return tokens;
    } catch (error) {
      throw new Error('Invalid or expired refresh token');
    }
  }

  /**
   * Get current user by ID
   */
  async getCurrentUser(userId) {
    const user = await User.findByPk(userId, {
      include: [{ model: Role, as: 'role' }]
    });

    if (!user || !user.is_active) {
      throw new Error('User not found');
    }

    return this.sanitizeUser(user);
  }

  /**
   * Update user profile
   */
  async updateProfile(userId, updates) {
    const user = await User.findByPk(userId);

    if (!user) {
      throw new Error('User not found');
    }

    // Allowed fields to update
    const allowedUpdates = ['full_name'];
    const filteredUpdates = {};

    Object.keys(updates).forEach(key => {
      if (allowedUpdates.includes(key)) {
        filteredUpdates[key] = updates[key];
      }
    });

    await user.update(filteredUpdates);

    return this.sanitizeUser(user);
  }

  /**
   * Change password
   */
  async changePassword(userId, currentPassword, newPassword) {
    const user = await User.findByPk(userId);

    if (!user) {
      throw new Error('User not found');
    }

    // Verify current password
    const isValidPassword = await bcrypt.compare(currentPassword, user.password_hash);
    if (!isValidPassword) {
      throw new Error('Current password is incorrect');
    }

    // Hash new password
    const password_hash = await bcrypt.hash(newPassword, 10);

    await user.update({ password_hash });

    return { success: true };
  }

  /**
   * Generate access and refresh tokens
   */
  generateTokens(user) {
    const payload = {
      userId: user.id,
      email: user.email,
      role: user.role ? user.role.name : RoleEnum.VIEWER
    };

    const accessToken = jwt.sign(payload, JWT_SECRET, {
      expiresIn: JWT_EXPIRES_IN
    });

    const refreshToken = jwt.sign({ userId: user.id }, JWT_SECRET, {
      expiresIn: REFRESH_TOKEN_EXPIRES_IN
    });

    return {
      accessToken,
      refreshToken,
      expiresIn: JWT_EXPIRES_IN
    };
  }

  /**
   * Verify access token
   */
  verifyAccessToken(token) {
    try {
      return jwt.verify(token, JWT_SECRET);
    } catch (error) {
      throw new Error('Invalid or expired token');
    }
  }

  /**
   * Sanitize user object (remove sensitive data)
   */
  sanitizeUser(user) {
    const userJson = user.toJSON ? user.toJSON() : user;
    delete userJson.password_hash;
    return userJson;
  }

  /**
   * Hash password
   */
  async hashPassword(password) {
    return bcrypt.hash(password, 10);
  }

  /**
   * Compare password with hash
   */
  async comparePassword(password, hash) {
    return bcrypt.compare(password, hash);
  }
}

module.exports = new AuthService();
