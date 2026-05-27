const express = require('express');
const router = express.Router();
const googleSheetsService = require('../services/googleDriveService');
const mockDataService = require('../services/mockDataService');

// Use mock data for local testing, Google Sheets for production
const useMockData = process.env.USE_MOCK_DATA === 'true' || !googleSheetsService.enabled;
const dataService = useMockData ? mockDataService : googleSheetsService;

console.log('🔧 Inventory routes using:', useMockData ? 'Mock Data Service (Local Testing)' : 'Google Sheets Service');

// Check if service is enabled
const checkServiceEnabled = (req, res, next) => {
  // Mock data service is always enabled
  if (useMockData) {
    return next();
  }

  // Check Google Sheets service
  if (!dataService.enabled) {
    return res.status(500).json({
      success: false,
      error: 'Google Sheets service is not configured. Please set up service account credentials in .env file.'
    });
  }
  next();
};

// GET /api/inventory/list - Get all inventory items
router.get('/list', checkServiceEnabled, async (req, res) => {
  try {
    const inventory = await dataService.getInventory();
    res.status(200).json({
      success: true,
      data: inventory,
    });
  } catch (error) {
    console.error('Error getting inventory:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve inventory: ' + error.message,
    });
  }
});

// POST /api/inventory/add - Add new inventory item
router.post('/add', checkServiceEnabled, async (req, res) => {
  try {
    const newItem = req.body;
    const result = await dataService.addItem(newItem);
    res.status(201).json({
      success: true,
      data: result,
    });
  } catch (error) {
    console.error('Error adding item:', error);
    res.status(400).json({
      success: false,
      error: error.message,
    });
  }
});

// POST /api/inventory/update - Update inventory item
router.post('/update', checkServiceEnabled, async (req, res) => {
  try {
    const { id } = req.body;
    const updateData = req.body;
    delete updateData.id; // Remove id from update data

    const result = await dataService.updateItem(id, updateData);
    res.status(200).json({
      success: true,
      data: result,
    });
  } catch (error) {
    console.error('Error updating item:', error);
    if (error.message === 'Item not found') {
      res.status(404).json({
        success: false,
        error: error.message,
      });
    } else {
      res.status(500).json({
        success: false,
        error: 'Failed to update item',
      });
    }
  }
});

// POST /api/inventory/adjust - Adjust item quantity
router.post('/adjust', checkServiceEnabled, async (req, res) => {
  try {
    const { id, adjustment } = req.body;

    if (!id || adjustment === undefined) {
      return res.status(400).json({
        success: false,
        error: 'ID and adjustment are required'
      });
    }

    // Use optimized adjustQuantity method if available (Google Sheets)
    if (dataService.adjustQuantity) {
      const result = await dataService.adjustQuantity(id, adjustment);
      res.status(200).json({
        success: true,
        data: result,
      });
    } else {
      // Fallback for mock data service
      const inventory = await dataService.getInventory();
      const item = inventory.find(i => i.id === id);

      if (!item) {
        return res.status(404).json({
          success: false,
          error: 'Item not found'
        });
      }

      const newQuantity = Math.max(0, item.quantity + adjustment);
      const result = await dataService.updateItem(id, {
        quantity: newQuantity,
        lastMovement: new Date().toISOString().split('T')[0]
      });

      res.status(200).json({
        success: true,
        data: result,
      });
    }
  } catch (error) {
    console.error('Error adjusting quantity:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to adjust quantity',
    });
  }
});

// POST /api/inventory/delete - Delete inventory item
router.post('/delete', checkServiceEnabled, async (req, res) => {
  try {
    const { id } = req.body;
    const result = await dataService.deleteItem(id);
    res.status(200).json(result);
  } catch (error) {
    console.error('Error deleting item:', error);
    if (error.message === 'Item not found') {
      res.status(404).json({
        success: false,
        error: error.message,
      });
    } else {
      res.status(500).json({
        success: false,
        error: 'Failed to delete item',
      });
    }
  }
});

// GET /api/inventory/search - Search inventory items
router.get('/search', checkServiceEnabled, async (req, res) => {
  try {
    const { q } = req.query;
    if (!q) {
      return res.status(400).json({
        success: false,
        error: 'Search query is required'
      });
    }

    const results = await dataService.searchItems(q);
    res.status(200).json({
      success: true,
      data: results,
    });
  } catch (error) {
    console.error('Error searching items:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to search items',
    });
  }
});

module.exports = router;
