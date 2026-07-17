const userService = require('../services/userService');
const { asyncHandler, AppError } = require('../middleware/errorHandler');

class UserController {
  list = asyncHandler(async (req, res) => {
    const users = await userService.listUsers(req.userRole);
    res.json({ success: true, data: users });
  });

  create = asyncHandler(async (req, res) => {
    const { email, password, full_name, role_name } = req.body;
    if (!email || !password || !full_name || !role_name) {
      throw new AppError('email, password, full_name and role_name are required', 400);
    }
    if (password.length < 8) {
      throw new AppError('Password must be at least 8 characters', 400);
    }
    // Non-admins may only create users within their own department.
    if (req.userRole !== 'admin' && role_name !== req.userRole) {
      throw new AppError('You can only create users within your own department.', 403);
    }
    const user = await userService.createUser({ email, password, full_name, role_name });
    res.status(201).json({ success: true, data: user });
  });

  update = asyncHandler(async (req, res) => {
    const { full_name, role_name, is_active } = req.body;
    const user = await userService.updateUser(
      req.params.id,
      { full_name, role_name, is_active },
      req.userRole
    );
    res.json({ success: true, data: user });
  });

  deactivate = asyncHandler(async (req, res) => {
    const user = await userService.deactivateUser(req.params.id, req.userRole);
    res.json({ success: true, data: user });
  });
}

module.exports = new UserController();
