const express = require('express');
const router = express.Router();
const billController = require('../controllers/billController');
const { authenticateFirebase, requireRole } = require('../middleware/authMiddleware');

// Accounts Payable is a finance concern.
router.use(authenticateFirebase);
router.use(requireRole('admin', 'finance'));

router.get('/', billController.list);
router.post('/', billController.create);
router.patch('/:id', billController.update);
router.delete('/:id', billController.remove);

module.exports = router;
