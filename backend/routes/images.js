const express = require('express');
const router = express.Router();
const multer = require('multer');
const localImageService = require('../services/localImageService');
const googleDriveService = require('../services/googleDriveService');

// Configure multer for memory storage (for handling file uploads)
const storage = multer.memoryStorage();

// File filter to accept only images
const fileFilter = (req, file, cb) => {
  const allowedMimeTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
  if (allowedMimeTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Invalid file type. Only JPEG, PNG, GIF, and WebP images are allowed.'), false);
  }
};

const upload = multer({
  storage: storage,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB limit
  },
  fileFilter: fileFilter,
});

// Upload image for inventory item - Local storage with Google Drive backup
router.post('/upload/:itemId', upload.single('image'), async (req, res) => {
  try {
    console.log('=== Image Upload Started ===');
    console.log('Item ID:', req.params.itemId);

    if (!req.file) {
      return res.status(400).json({ success: false, error: 'No file uploaded' });
    }

    const { itemId } = req.params;
    const fileName = req.file.originalname;
    const mimeType = req.file.mimetype;
    const fileBuffer = req.file.buffer;

    console.log('File details:', { fileName, mimeType, bufferSize: fileBuffer.length });

    // Step 1: Save locally (always works)
    console.log('Step 1: Saving locally...');
    const localUploadResult = await localImageService.saveImage(fileBuffer, fileName, itemId);
    console.log('✅ Local upload successful:', localUploadResult);

    if (!localUploadResult.success) {
      return res.status(500).json({ success: false, error: 'Failed to save locally' });
    }

    // Step 2: Try Google Drive backup (optional)
    try {
      console.log('Step 2: Trying Google Drive backup...');
      const googleDriveResult = await googleDriveService.uploadImage(fileBuffer, fileName, mimeType, itemId);
      console.log('✅ Google Drive backup successful:', googleDriveResult);
    } catch (googleError) {
      console.log('⚠️  Google Drive backup failed (using local only):', googleError.message);
    }

    // Step 3: Update inventory with local URL
    console.log('Step 3: Updating inventory...');
    const inventory = await googleDriveService.getInventory();
    const itemIndex = inventory.findIndex(item => item.id === itemId);

    if (itemIndex === -1) {
      return res.status(404).json({ success: false, error: 'Item not found' });
    }

    // Update with local URL (always works)
    inventory[itemIndex].imageUrl = localUploadResult.imageUrl;
    inventory[itemIndex].imageFileId = localUploadResult.filename;

    await googleDriveService.updateInventory(inventory);
    console.log('✅ Inventory updated');

    const updatedItem = inventory[itemIndex];

    res.status(200).json({
      success: true,
      message: 'Image uploaded successfully',
      data: {
        fileId: localUploadResult.filename,
        imageUrl: localUploadResult.imageUrl,
        item: updatedItem,
      },
    });
  } catch (error) {
    console.error('=== Image Upload Failed ===');
    console.error('Error:', error.message);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Delete image from inventory item - Google Drive only
router.delete('/delete/:itemId', async (req, res) => {
  try {
    const { itemId } = req.params;

    // Get current inventory item
    const inventory = await googleDriveService.getInventory();
    const item = inventory.find(i => i.id === itemId);

    if (!item) {
      return res.status(404).json({ success: false, error: 'Item not found' });
    }

    // Delete image from Google Drive if file ID exists
    if (item.imageFileId) {
      await googleDriveService.deleteImage(item.imageFileId);
    }

    // Update item to remove image information
    const updatedItem = await googleDriveService.updateItemImage(itemId, '', '');

    res.status(200).json({
      success: true,
      message: 'Image deleted from Google Drive successfully',
      data: updatedItem,
    });
  } catch (error) {
    console.error('Error deleting image:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Get image URL by item ID - Google Drive only
router.get('/url/:itemId', async (req, res) => {
  try {
    const { itemId } = req.params;

    // Get inventory item
    const inventory = await googleDriveService.getInventory();
    const item = inventory.find(i => i.id === itemId);

    if (!item) {
      return res.status(404).json({ success: false, error: 'Item not found' });
    }

    res.status(200).json({
      success: true,
      data: {
        imageUrl: item.imageUrl || '',
        imageFileId: item.imageFileId || '',
      },
    });
  } catch (error) {
    console.error('Error getting image URL:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

module.exports = router;