const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const { authenticate } = require('../middleware/authMiddleware');
const { validateBody, validateEmailField, validatePasswordField } = require('../middleware/validationMiddleware');

// Public routes
router.post(
  '/register',
  validateBody(['email', 'password', 'full_name']),
  validateEmailField('email'),
  validatePasswordField('password'),
  authController.register
);

router.post(
  '/login',
  validateBody(['email', 'password']),
  authController.login
);

router.post(
  '/refresh',
  validateBody(['refreshToken']),
  authController.refreshToken
);

router.post('/logout', authController.logout);

// Protected routes
router.get('/me', authenticate, authController.getCurrentUser);

router.put(
  '/me',
  authenticate,
  validateBody(['full_name']),
  authController.updateProfile
);

router.put(
  '/me/password',
  authenticate,
  validateBody(['currentPassword', 'newPassword']),
  validatePasswordField('newPassword'),
  authController.changePassword
);

module.exports = router;
