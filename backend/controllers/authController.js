const authService = require('../services/authService');
const { asyncHandler } = require('../middleware/errorHandler');

class AuthController {
  /**
   * Register a new user
   */
  register = asyncHandler(async (req, res) => {
    const { email, password, full_name, role_name } = req.body;

    const result = await authService.register({
      email,
      password,
      full_name,
      role_name
    });

    res.status(201).json({
      success: true,
      data: result
    });
  });

  /**
   * Login user
   */
  login = asyncHandler(async (req, res) => {
    const { email, password } = req.body;

    const result = await authService.login(email, password);

    res.json({
      success: true,
      data: result
    });
  });

  /**
   * Refresh access token
   */
  refreshToken = asyncHandler(async (req, res) => {
    const { refreshToken } = req.body;

    if (!refreshToken) {
      return res.status(400).json({
        success: false,
        error: 'Refresh token is required'
      });
    }

    const result = await authService.refreshToken(refreshToken);

    res.json({
      success: true,
      data: result
    });
  });

  /**
   * Get current user
   */
  getCurrentUser = asyncHandler(async (req, res) => {
    const user = await authService.getCurrentUser(req.userId);

    res.json({
      success: true,
      data: user
    });
  });

  /**
   * Update user profile
   */
  updateProfile = asyncHandler(async (req, res) => {
    const user = await authService.updateProfile(req.userId, req.body);

    res.json({
      success: true,
      data: user
    });
  });

  /**
   * Change password
   */
  changePassword = asyncHandler(async (req, res) => {
    const { currentPassword, newPassword } = req.body;

    const result = await authService.changePassword(
      req.userId,
      currentPassword,
      newPassword
    );

    res.json({
      success: true,
      data: result
    });
  });

  /**
   * Logout (client-side token removal)
   */
  logout = asyncHandler(async (req, res) => {
    // In a stateless JWT setup, logout is handled client-side
    // by removing the token. This endpoint is for future token blacklisting.
    res.json({
      success: true,
      message: 'Logged out successfully'
    });
  });
}

module.exports = new AuthController();
