const express = require('express');
const router = express.Router();
const auditController = require('../controllers/auditController');
const { authenticate } = require('../middleware/authMiddleware');
const { requirePermission } = require('../middleware/permissionMiddleware');

// All audit routes require authentication and view:audit permission
router.use(authenticate);
router.use(requirePermission('view:audit'));

router.get(
  '/',
  auditController.getAuditLogs
);

router.get(
  '/export',
  auditController.exportAuditLogs
);

router.get(
  '/entity/:type/:id',
  auditController.getEntityAuditLogs
);

module.exports = router;
