/**
 * Product Routes
 * API endpoints for product image management
 */

const express = require('express');
const router = express.Router();
const productController = require('../controllers/productController');

// Middleware to serve static images is handled in server.js

/**
 * Upload product image
 * POST /api/products/:id/image
 */
router.post(
  '/:id/image',
  productController.getUploadMiddleware(),
  productController.uploadProductImage
);

/**
 * Delete product image
 * DELETE /api/products/:id/image
 */
router.delete(
  '/:id/image',
  productController.deleteProductImage
);

/**
 * Get product with image
 * GET /api/products/:id
 */
router.get(
  '/:id',
  productController.getProductWithImage
);

module.exports = router;