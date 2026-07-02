/**
 * Product Image Controller
 * Handles product image upload, deletion, and retrieval
 */

const multer = require('multer');
const path = require('path');
const fs = require('fs').promises;
const { Product } = require('../models');

// Configure multer for image uploads
const storage = multer.diskStorage({
  destination: async (req, file, cb) => {
    const uploadDir = path.join(__dirname, '../../uploads/products');
    try {
      await fs.mkdir(uploadDir, { recursive: true });
      cb(null, uploadDir);
    } catch (error) {
      cb(error);
    }
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const safeFileName = 'product-' + uniqueSuffix + path.extname(file.originalname);
    cb(null, safeFileName);
  }
});

// File filter for image validation
const fileFilter = (req, file, cb) => {
  const allowedTypes = /jpeg|jpg|png|gif|webp/;
  const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
  const mimetype = allowedTypes.test(file.mimetype);

  if (extname && mimetype) {
    return cb(null, true);
  }
  cb(new Error('Only image files (jpeg, jpg, png, gif, webp) are allowed'));
};

// Configure multer upload
const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
  fileFilter
});

class ProductController {
  /**
   * Upload product image
   * POST /api/products/:id/image
   */
  uploadProductImage = async (req, res) => {
    try {
      const { id } = req.params;

      if (!req.file) {
        return res.status(400).json({
          success: false,
          error: 'No file uploaded'
        });
      }

      // Find product
      const product = await Product.findByPk(id);
      if (!product) {
        // Clean up uploaded file if product not found
        await fs.unlink(req.file.path).catch(() => {});
        return res.status(404).json({
          success: false,
          error: 'Product not found'
        });
      }

      // Delete old image if exists
      if (product.image_url) {
        try {
          const oldImagePath = path.join(__dirname, '../../uploads/products', path.basename(product.image_url));
          await fs.unlink(oldImagePath).catch(() => {});
          console.log('✅ Deleted old product image:', oldImagePath);
        } catch (error) {
          console.warn('⚠️ Could not delete old image:', error.message);
        }
      }

      const imageUrl = `/api/uploads/products/${req.file.filename}`;

      // Update product with new image
      await product.update({
        image_url: imageUrl,
        has_image: true
      });

      console.log('✅ Product image uploaded successfully:', {
        productId: product.id,
        productName: product.name,
        imageUrl
      });

      res.json({
        success: true,
        data: {
          imageUrl,
          product: {
            id: product.id,
            name: product.name,
            image_url: product.image_url,
            has_image: product.has_image
          }
        }
      });
    } catch (error) {
      console.error('❌ Error uploading product image:', error);

      // Clean up uploaded file if error occurs
      if (req.file) {
        await fs.unlink(req.file.path).catch(() => {});
      }

      res.status(500).json({
        success: false,
        error: error.message || 'Failed to upload product image'
      });
    }
  };

  /**
   * Delete product image
   * DELETE /api/products/:id/image
   */
  deleteProductImage = async (req, res) => {
    try {
      const { id } = req.params;

      // Find product
      const product = await Product.findByPk(id);
      if (!product) {
        return res.status(404).json({
          success: false,
          error: 'Product not found'
        });
      }

      if (!product.image_url) {
        return res.status(400).json({
          success: false,
          error: 'Product has no image to delete'
        });
      }

      // Delete image file
      try {
        const imagePath = path.join(__dirname, '../../uploads/products', path.basename(product.image_url));
        await fs.unlink(imagePath);
        console.log('✅ Deleted product image file:', imagePath);
      } catch (error) {
        console.warn('⚠️ Could not delete image file:', error.message);
      }

      const oldImageUrl = product.image_url;

      // Update product to remove image
      await product.update({
        image_url: null,
        has_image: false
      });

      console.log('✅ Product image deleted successfully:', {
        productId: product.id,
        productName: product.name
      });

      res.json({
        success: true,
        message: 'Product image deleted successfully',
        data: {
          id: product.id,
          name: product.name,
          has_image: false
        }
      });
    } catch (error) {
      console.error('❌ Error deleting product image:', error);
      res.status(500).json({
        success: false,
        error: error.message || 'Failed to delete product image'
      });
    }
  };

  /**
   * Get product with image
   * GET /api/products/:id
   */
  getProductWithImage = async (req, res) => {
    try {
      const { id } = req.params;

      const product = await Product.findByPk(id);

      if (!product) {
        return res.status(404).json({
          success: false,
          error: 'Product not found'
        });
      }

      res.json({
        success: true,
        data: product
      });
    } catch (error) {
      console.error('❌ Error fetching product:', error);
      res.status(500).json({
        success: false,
        error: error.message || 'Failed to fetch product'
      });
    }
  };

  /**
   * Get multer upload middleware
   */
  getUploadMiddleware() {
    return upload.single('image');
  }
}

module.exports = new ProductController();