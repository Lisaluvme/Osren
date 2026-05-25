const express = require('express');
const router = express.Router();
const documentController = require('../controllers/documentController');
const { authenticate } = require('../middleware/authMiddleware');
const { requirePermission } = require('../middleware/permissionMiddleware');
const { auditMiddleware } = require('../middleware/auditMiddleware');

// All document routes require authentication
router.use(authenticate);

// Document CRUD
router.get(
  '/',
  documentController.getDocuments
);

router.get(
  '/:id',
  documentController.getDocument
);

router.post(
  '/',
  requirePermission('create:document'),
  documentController.createDocument
);

router.put(
  '/:id',
  requirePermission('update:document'),
  documentController.updateDocument
);

router.delete(
  '/:id',
  requirePermission('delete:document'),
  documentController.deleteDocument
);

// Workflow operations
router.post(
  '/:id/transition',
  requirePermission('transition:workflow'),
  documentController.transitionDocument
);

router.get(
  '/:id/workflow',
  documentController.getDocumentWorkflow
);

// Customer acknowledgement
router.post(
  '/:id/acknowledge',
  documentController.customerAcknowledgement
);

// File attachments
router.get(
  '/:id/files',
  documentController.getDocumentFiles
);

module.exports = router;
