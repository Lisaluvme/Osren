const express = require('express');
const router = express.Router();
const userController = require('../controllers/userController');
const { authenticateFirebase, requireRole } = require('../middleware/authMiddleware');

// Every user-management route requires a verified Firebase session and a
// manager-level role. The same-department restriction for non-admins is
// enforced inside the controllers/service.
router.use(authenticateFirebase);
router.use(requireRole('admin', 'sales', 'finance', 'warehouse'));

router.get('/', userController.list);
router.post('/', userController.create);
router.patch('/:id', userController.update);
router.delete('/:id', userController.deactivate);

module.exports = router;
