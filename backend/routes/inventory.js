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

      // Record stock movement
      await recordStockMovement({
        itemId: id,
        itemName: result.name,
        movementType: 'ADJUSTMENT',
        quantity: adjustment,
        date: new Date().toISOString().split('T')[0],
        remarks: adjustment > 0 ? 'Manual stock increase' : 'Manual stock decrease'
      });

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

      // Record stock movement
      await recordStockMovement({
        itemId: id,
        itemName: item.name,
        movementType: 'ADJUSTMENT',
        quantity: adjustment,
        date: new Date().toISOString().split('T')[0],
        remarks: adjustment > 0 ? 'Manual stock increase' : 'Manual stock decrease'
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

// Helper function to record stock movements
async function recordStockMovement(movementData) {
  try {
    const fs = require('fs').promises;
    const path = require('path');
    const movementFilePath = path.join(__dirname, '../data/stock-movements.json');

    // Ensure data directory exists
    const dataDir = path.join(__dirname, '../data');
    try {
      await fs.mkdir(dataDir, { recursive: true });
    } catch (err) {
      // Directory might already exist
    }

    // Load existing movements
    let movements = [];
    try {
      const existingData = await fs.readFile(movementFilePath, 'utf8');
      movements = JSON.parse(existingData);
    } catch (err) {
      // File doesn't exist yet, start with empty array
    }

    // Create movement record
    const movement = {
      id: `mov-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      ...movementData,
      createdAt: new Date().toISOString()
    };

    // Add new movement
    movements.push(movement);
    await fs.writeFile(movementFilePath, JSON.stringify(movements, null, 2));

    return movement;
  } catch (error) {
    console.error('Error recording stock movement:', error);
    throw error;
  }
}

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

// POST /api/inventory/grn - Create Goods Received Note
router.post('/grn', checkServiceEnabled, async (req, res) => {
  try {
    const {
      grnNumber,
      date,
      supplier,
      itemType,
      itemId,
      itemName,
      newItemData,
      quantityReceived,
      unitCost,
      totalCost,
      remarks
    } = req.body;

    // Validate required fields
    if (!grnNumber || !date || !supplier || !quantityReceived) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields'
      });
    }

    let finalItemId = itemId;
    let finalItemName = itemName;

    // Handle new item creation
    if (itemType === 'new' && newItemData) {
      try {
        // Create new item first
        const newItem = {
          id: `item-${Date.now()}`,
          name: newItemData.name,
          sku: newItemData.sku,
          category: newItemData.category || 'General',
          brand: newItemData.brand || 'Unknown',
          quantity: 0, // Will be updated by GRN
          unitCost: newItemData.unitCost || 0,
          sellingPrice: newItemData.sellingPrice,
          minLevel: newItemData.minLevel || 10,
          supplier: supplier,
          lastMovement: new Date().toISOString().split('T')[0]
        };

        const createdItem = await dataService.createItem(newItem);
        finalItemId = createdItem.id;
        finalItemName = createdItem.name;

        console.log('✅ New item created:', finalItemId);
      } catch (error) {
        console.error('❌ Failed to create new item:', error);
        return res.status(500).json({
          success: false,
          error: 'Failed to create new item: ' + error.message
        });
      }
    } else if (!itemId) {
      return res.status(400).json({
        success: false,
        error: 'Item ID is required for existing items'
      });
    }

    // Get current item (for existing items or after creating new item)
    const inventory = await dataService.getInventory();
    const item = inventory.find(i => i.id === finalItemId);

    if (!item) {
      return res.status(404).json({
        success: false,
        error: 'Item not found'
      });
    }

    // Calculate new quantity
    const currentQuantity = item.quantity || 0;
    const newQuantity = currentQuantity + quantityReceived;

    // Update item quantity and last movement date
    const updatedItem = await dataService.updateItem(itemId, {
      quantity: newQuantity,
      lastMovement: new Date().toISOString().split('T')[0]
    });

    // Create GRN record
    const grnData = {
      id: `grn-${Date.now()}`,
      grnNumber,
      date,
      supplier,
      itemId: finalItemId,
      itemName: finalItemName,
      quantityReceived,
      unitCost,
      totalCost,
      remarks,
      createdAt: new Date().toISOString()
    };

    // Create stock movement record
    const movementData = {
      id: `mov-${Date.now()}`,
      itemId: finalItemId,
      itemName: finalItemName,
      movementType: itemType === 'new' ? 'NEW_ITEM' : 'GRN',
      quantity: quantityReceived,
      referenceNumber: grnNumber,
      date,
      remarks: remarks || (itemType === 'new' ? `New item created via GRN from ${supplier}` : `GRN from ${supplier}`),
      createdAt: new Date().toISOString()
    };

    // Store GRN and movement (in a real system, these would go to a database)
    // For now, we'll use a simple in-memory storage or append to a file
    const fs = require('fs').promises;
    const path = require('path');

    try {
      // Try to load existing GRN and movement records
      const grnFilePath = path.join(__dirname, '../data/grn.json');
      const movementFilePath = path.join(__dirname, '../data/stock-movements.json');

      // Ensure data directory exists
      const dataDir = path.join(__dirname, '../data');
      try {
        await fs.mkdir(dataDir, { recursive: true });
      } catch (err) {
        // Directory might already exist
      }

      // Load existing GRNs
      let grns = [];
      try {
        const grnData = await fs.readFile(grnFilePath, 'utf8');
        grns = JSON.parse(grnData);
      } catch (err) {
        // File doesn't exist yet, start with empty array
      }

      // Add new GRN
      grns.push(grnData);
      await fs.writeFile(grnFilePath, JSON.stringify(grns, null, 2));

      // Load existing movements
      let movements = [];
      try {
        const movementData = await fs.readFile(movementFilePath, 'utf8');
        movements = JSON.parse(movementData);
      } catch (err) {
        // File doesn't exist yet, start with empty array
      }

      // Add new movement
      movements.push(movementData);
      await fs.writeFile(movementFilePath, JSON.stringify(movements, null, 2));

    } catch (error) {
      console.error('Error saving GRN/Movement data:', error);
      // Continue even if saving fails - the inventory is still updated
    }

    res.status(201).json({
      success: true,
      data: {
        grn: grnData,
        movement: movementData,
        updatedItem: updatedItem
      },
      message: `GRN ${grnNumber} created successfully. Stock updated for ${itemName}.`
    });
  } catch (error) {
    console.error('Error creating GRN:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to create GRN: ' + error.message
    });
  }
});

// GET /api/inventory/stock-history/:itemId - Get stock movement history for an item
router.get('/stock-history/:itemId', checkServiceEnabled, async (req, res) => {
  try {
    const { itemId } = req.params;

    // Load stock movements from file
    const fs = require('fs').promises;
    const path = require('path');
    const movementFilePath = path.join(__dirname, '../data/stock-movements.json');

    let movements = [];
    try {
      const movementData = await fs.readFile(movementFilePath, 'utf8');
      movements = JSON.parse(movementData);
    } catch (err) {
      // File doesn't exist yet
      movements = [];
    }

    // Filter movements for this item
    const itemMovements = movements.filter(m => m.itemId === itemId);

    // Sort by date descending (newest first)
    itemMovements.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

    res.status(200).json({
      success: true,
      data: itemMovements
    });
  } catch (error) {
    console.error('Error fetching stock history:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch stock history'
    });
  }
});

// POST /api/inventory/stock-transfer - Create stock transfer request
router.post('/stock-transfer', checkServiceEnabled, async (req, res) => {
  try {
    const {
      transferNumber,
      date,
      fromWarehouse,
      toWarehouse,
      itemId,
      itemName,
      quantity,
      remarks
    } = req.body;

    // Validate required fields
    if (!transferNumber || !date || !fromWarehouse || !toWarehouse || !itemId || !quantity) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields'
      });
    }

    // Validate warehouses are different
    if (fromWarehouse === toWarehouse) {
      return res.status(400).json({
        success: false,
        error: 'Source and destination warehouses cannot be the same'
      });
    }

    // Get current item
    const inventory = await dataService.getInventory();
    const item = inventory.find(i => i.id === itemId);

    if (!item) {
      return res.status(404).json({
        success: false,
        error: 'Item not found'
      });
    }

    // Check if sufficient stock is available
    if (quantity > item.quantity) {
      return res.status(400).json({
        success: false,
        error: `Insufficient stock in ${fromWarehouse}. Available: ${item.quantity}`
      });
    }

    // Create transfer record
    const transferData = {
      id: `trf-${Date.now()}`,
      transferNumber,
      date,
      fromWarehouse,
      toWarehouse,
      itemId,
      itemName,
      quantity,
      remarks,
      status: 'PENDING',
      requestedBy: 'System User',
      createdAt: new Date().toISOString()
    };

    // Store transfer record
    const fs = require('fs').promises;
    const path = require('path');
    const transferFilePath = path.join(__dirname, '../data/stock-transfers.json');

    // Ensure data directory exists
    const dataDir = path.join(__dirname, '../data');
    try {
      await fs.mkdir(dataDir, { recursive: true });
    } catch (err) {
      // Directory might already exist
    }

    // Load existing transfers
    let transfers = [];
    try {
      const existingData = await fs.readFile(transferFilePath, 'utf8');
      transfers = JSON.parse(existingData);
    } catch (err) {
      // File doesn't exist yet, start with empty array
    }

    // Add new transfer
    transfers.push(transferData);
    await fs.writeFile(transferFilePath, JSON.stringify(transfers, null, 2));

    res.status(201).json({
      success: true,
      data: transferData,
      message: `Stock transfer request ${transferNumber} created successfully and is pending approval.`
    });
  } catch (error) {
    console.error('Error creating stock transfer:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to create stock transfer: ' + error.message
    });
  }
});

// GET /api/inventory/transfer-history - Get all stock transfer history
router.get('/transfer-history', checkServiceEnabled, async (req, res) => {
  try {
    // Load transfers from file
    const fs = require('fs').promises;
    const path = require('path');
    const transferFilePath = path.join(__dirname, '../data/stock-transfers.json');

    let transfers = [];
    try {
      const transferData = await fs.readFile(transferFilePath, 'utf8');
      transfers = JSON.parse(transferData);
    } catch (err) {
      // File doesn't exist yet
      transfers = [];
    }

    // Sort by date descending (newest first)
    transfers.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    res.status(200).json({
      success: true,
      data: transfers
    });
  } catch (error) {
    console.error('Error fetching transfer history:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch transfer history'
    });
  }
});

// POST /api/inventory/stock-transfer/approve - Approve stock transfer
router.post('/stock-transfer/approve', checkServiceEnabled, async (req, res) => {
  try {
    const { transferId } = req.body;

    if (!transferId) {
      return res.status(400).json({
        success: false,
        error: 'Transfer ID is required'
      });
    }

    // Load transfers
    const fs = require('fs').promises;
    const path = require('path');
    const transferFilePath = path.join(__dirname, '../data/stock-transfers.json');

    let transfers = [];
    try {
      const transferData = await fs.readFile(transferFilePath, 'utf8');
      transfers = JSON.parse(transferData);
    } catch (err) {
      return res.status(404).json({
        success: false,
        error: 'Transfer not found'
      });
    }

    // Find and update transfer
    const transferIndex = transfers.findIndex(t => t.id === transferId);
    if (transferIndex === -1) {
      return res.status(404).json({
        success: false,
        error: 'Transfer not found'
      });
    }

    const transfer = transfers[transferIndex];
    if (transfer.status !== 'PENDING') {
      return res.status(400).json({
        success: false,
        error: 'Only pending transfers can be approved'
      });
    }

    // Update transfer status
    transfers[transferIndex].status = 'APPROVED';
    transfers[transferIndex].approvedBy = 'System User';
    transfers[transferIndex].approvedAt = new Date().toISOString();
    transfers[transferIndex].updatedAt = new Date().toISOString();

    // Save updated transfers
    await fs.writeFile(transferFilePath, JSON.stringify(transfers, null, 2));

    res.status(200).json({
      success: true,
      data: transfers[transferIndex],
      message: 'Stock transfer approved successfully'
    });
  } catch (error) {
    console.error('Error approving stock transfer:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to approve stock transfer'
    });
  }
});

// POST /api/inventory/stock-transfer/reject - Reject stock transfer
router.post('/stock-transfer/reject', checkServiceEnabled, async (req, res) => {
  try {
    const { transferId } = req.body;

    if (!transferId) {
      return res.status(400).json({
        success: false,
        error: 'Transfer ID is required'
      });
    }

    // Load transfers
    const fs = require('fs').promises;
    const path = require('path');
    const transferFilePath = path.join(__dirname, '../data/stock-transfers.json');

    let transfers = [];
    try {
      const transferData = await fs.readFile(transferFilePath, 'utf8');
      transfers = JSON.parse(transferData);
    } catch (err) {
      return res.status(404).json({
        success: false,
        error: 'Transfer not found'
      });
    }

    // Find and update transfer
    const transferIndex = transfers.findIndex(t => t.id === transferId);
    if (transferIndex === -1) {
      return res.status(404).json({
        success: false,
        error: 'Transfer not found'
      });
    }

    const transfer = transfers[transferIndex];
    if (transfer.status !== 'PENDING') {
      return res.status(400).json({
        success: false,
        error: 'Only pending transfers can be rejected'
      });
    }

    // Update transfer status
    transfers[transferIndex].status = 'REJECTED';
    transfers[transferIndex].updatedAt = new Date().toISOString();

    // Save updated transfers
    await fs.writeFile(transferFilePath, JSON.stringify(transfers, null, 2));

    res.status(200).json({
      success: true,
      data: transfers[transferIndex],
      message: 'Stock transfer rejected successfully'
    });
  } catch (error) {
    console.error('Error rejecting stock transfer:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to reject stock transfer'
    });
  }
});

// POST /api/inventory/stock-transfer/complete - Complete approved stock transfer
router.post('/stock-transfer/complete', checkServiceEnabled, async (req, res) => {
  try {
    const { transferId } = req.body;

    if (!transferId) {
      return res.status(400).json({
        success: false,
        error: 'Transfer ID is required'
      });
    }

    // Load transfers
    const fs = require('fs').promises;
    const path = require('path');
    const transferFilePath = path.join(__dirname, '../data/stock-transfers.json');

    let transfers = [];
    try {
      const transferData = await fs.readFile(transferFilePath, 'utf8');
      transfers = JSON.parse(transferData);
    } catch (err) {
      return res.status(404).json({
        success: false,
        error: 'Transfer not found'
      });
    }

    // Find transfer
    const transferIndex = transfers.findIndex(t => t.id === transferId);
    if (transferIndex === -1) {
      return res.status(404).json({
        success: false,
        error: 'Transfer not found'
      });
    }

    const transfer = transfers[transferIndex];
    if (transfer.status !== 'APPROVED') {
      return res.status(400).json({
        success: false,
        error: 'Only approved transfers can be completed'
      });
    }

    // Get inventory and update quantities
    const inventory = await dataService.getInventory();
    const item = inventory.find(i => i.id === transfer.itemId);

    if (!item) {
      return res.status(404).json({
        success: false,
        error: 'Item not found in inventory'
      });
    }

    // Check if sufficient stock is still available
    if (transfer.quantity > item.quantity) {
      return res.status(400).json({
        success: false,
        error: `Insufficient stock. Available: ${item.quantity}, Required: ${transfer.quantity}`
      });
    }

    // Deduct from source warehouse
    const newQuantity = item.quantity - transfer.quantity;
    await dataService.updateItem(transfer.itemId, {
      quantity: newQuantity,
      lastMovement: new Date().toISOString().split('T')[0]
    });

    // Record stock movement for source warehouse
    await recordStockMovement({
      itemId: transfer.itemId,
      itemName: transfer.itemName,
      movementType: 'TRANSFER',
      quantity: -transfer.quantity,
      referenceNumber: transfer.transferNumber,
      date: transfer.date,
      remarks: `Transfer from ${transfer.fromWarehouse} to ${transfer.toWarehouse}`
    });

    // Add to destination warehouse (create movement record)
    await recordStockMovement({
      itemId: transfer.itemId,
      itemName: transfer.itemName,
      movementType: 'TRANSFER',
      quantity: transfer.quantity,
      referenceNumber: transfer.transferNumber,
      date: transfer.date,
      remarks: `Transfer from ${transfer.fromWarehouse} to ${transfer.toWarehouse} (received)`
    });

    // Update transfer status
    transfers[transferIndex].status = 'COMPLETED';
    transfers[transferIndex].completedAt = new Date().toISOString();
    transfers[transferIndex].updatedAt = new Date().toISOString();

    // Save updated transfers
    await fs.writeFile(transferFilePath, JSON.stringify(transfers, null, 2));

    res.status(200).json({
      success: true,
      data: transfers[transferIndex],
      message: `Stock transfer completed successfully. ${transfer.quantity} units moved from ${transfer.fromWarehouse} to ${transfer.toWarehouse}.`
    });
  } catch (error) {
    console.error('Error completing stock transfer:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to complete stock transfer: ' + error.message
    });
  }
});

// POST /api/inventory/stock-take - Create stock take record
router.post('/stock-take', checkServiceEnabled, async (req, res) => {
  try {
    const {
      stockTakeNumber,
      date,
      warehouse,
      itemId,
      itemName,
      systemQuantity,
      actualQuantity,
      variance,
      varianceReason,
      remarks
    } = req.body;

    // Validate required fields
    if (!stockTakeNumber || !date || !warehouse || !itemId || !actualQuantity) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields'
      });
    }

    // Create stock take record
    const stockTakeData = {
      id: `stk-${Date.now()}`,
      stockTakeNumber,
      date,
      warehouse,
      itemId,
      itemName,
      systemQuantity,
      actualQuantity,
      variance,
      varianceReason,
      remarks,
      status: 'SUBMITTED',
      performedBy: 'System User',
      createdAt: new Date().toISOString()
    };

    // Store stock take record
    const fs = require('fs').promises;
    const path = require('path');
    const stockTakeFilePath = path.join(__dirname, '../data/stock-takes.json');

    // Ensure data directory exists
    const dataDir = path.join(__dirname, '../data');
    try {
      await fs.mkdir(dataDir, { recursive: true });
    } catch (err) {
      // Directory might already exist
    }

    // Load existing stock takes
    let stockTakes = [];
    try {
      const existingData = await fs.readFile(stockTakeFilePath, 'utf8');
      stockTakes = JSON.parse(existingData);
    } catch (err) {
      // File doesn't exist yet, start with empty array
    }

    // Add new stock take
    stockTakes.push(stockTakeData);
    await fs.writeFile(stockTakeFilePath, JSON.stringify(stockTakes, null, 2));

    res.status(201).json({
      success: true,
      data: stockTakeData,
      message: `Stock take ${stockTakeNumber} recorded successfully and is pending approval.`
    });
  } catch (error) {
    console.error('Error creating stock take:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to create stock take: ' + error.message
    });
  }
});

// GET /api/inventory/stock-take-history - Get all stock take history
router.get('/stock-take-history', checkServiceEnabled, async (req, res) => {
  try {
    // Load stock takes from file
    const fs = require('fs').promises;
    const path = require('path');
    const stockTakeFilePath = path.join(__dirname, '../data/stock-takes.json');

    let stockTakes = [];
    try {
      const stockTakeData = await fs.readFile(stockTakeFilePath, 'utf8');
      stockTakes = JSON.parse(stockTakeData);
    } catch (err) {
      // File doesn't exist yet
      stockTakes = [];
    }

    // Sort by date descending (newest first)
    stockTakes.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    res.status(200).json({
      success: true,
      data: stockTakes
    });
  } catch (error) {
    console.error('Error fetching stock take history:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch stock take history'
    });
  }
});

// POST /api/inventory/stock-take/approve - Approve stock take and adjust inventory
router.post('/stock-take/approve', checkServiceEnabled, async (req, res) => {
  try {
    const { stockTakeId } = req.body;

    if (!stockTakeId) {
      return res.status(400).json({
        success: false,
        error: 'Stock take ID is required'
      });
    }

    // Load stock takes
    const fs = require('fs').promises;
    const path = require('path');
    const stockTakeFilePath = path.join(__dirname, '../data/stock-takes.json');

    let stockTakes = [];
    try {
      const stockTakeData = await fs.readFile(stockTakeFilePath, 'utf8');
      stockTakes = JSON.parse(stockTakeData);
    } catch (err) {
      return res.status(404).json({
        success: false,
        error: 'Stock take not found'
      });
    }

    // Find and update stock take
    const stockTakeIndex = stockTakes.findIndex(st => st.id === stockTakeId);
    if (stockTakeIndex === -1) {
      return res.status(404).json({
        success: false,
        error: 'Stock take not found'
      });
    }

    const stockTake = stockTakes[stockTakeIndex];
    if (stockTake.status !== 'SUBMITTED') {
      return res.status(400).json({
        success: false,
        error: 'Only submitted stock takes can be approved'
      });
    }

    // Update inventory to actual quantity
    const inventory = await dataService.getInventory();
    const item = inventory.find(i => i.id === stockTake.itemId);

    if (!item) {
      return res.status(404).json({
        success: false,
        error: 'Item not found in inventory'
      });
    }

    // Update item quantity to actual counted quantity
    await dataService.updateItem(stockTake.itemId, {
      quantity: stockTake.actualQuantity,
      lastMovement: new Date().toISOString().split('T')[0]
    });

    // Record stock movement for adjustment
    await recordStockMovement({
      itemId: stockTake.itemId,
      itemName: stockTake.itemName,
      movementType: 'ADJUSTMENT',
      quantity: stockTake.variance,
      referenceNumber: stockTake.stockTakeNumber,
      date: stockTake.date,
      remarks: `Stock take adjustment: ${stockTake.varianceReason || 'Physical count correction'}`
    });

    // Update stock take status
    stockTakes[stockTakeIndex].status = 'APPROVED';
    stockTakes[stockTakeIndex].approvedBy = 'System User';
    stockTakes[stockTakeIndex].approvedAt = new Date().toISOString();
    stockTakes[stockTakeIndex].updatedAt = new Date().toISOString();

    // Save updated stock takes
    await fs.writeFile(stockTakeFilePath, JSON.stringify(stockTakes, null, 2));

    res.status(200).json({
      success: true,
      data: stockTakes[stockTakeIndex],
      message: `Stock take approved. Inventory adjusted for ${stockTake.itemName} from ${stockTake.systemQuantity} to ${stockTake.actualQuantity} units.`
    });
  } catch (error) {
    console.error('Error approving stock take:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to approve stock take: ' + error.message
    });
  }
});

// POST /api/inventory/batch - Create batch record
router.post('/batch', checkServiceEnabled, async (req, res) => {
  try {
    const {
      itemId,
      itemName,
      batchNumber,
      expiryDate,
      quantity,
      manufacturingDate,
      cost,
      supplier
    } = req.body;

    // Validate required fields
    if (!itemId || !batchNumber || !quantity) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields'
      });
    }

    // Create batch record
    const batchData = {
      id: `batch-${Date.now()}`,
      itemId,
      itemName,
      batchNumber,
      expiryDate,
      quantity,
      manufacturingDate,
      cost,
      supplier,
      receivedDate: new Date().toISOString().split('T')[0],
      status: 'ACTIVE',
      createdAt: new Date().toISOString()
    };

    // Check if batch should be marked as expired
    if (expiryDate) {
      const today = new Date();
      const expiry = new Date(expiryDate);
      if (expiry < today) {
        batchData.status = 'EXPIRED';
      }
    }

    // Store batch record
    const fs = require('fs').promises;
    const path = require('path');
    const batchFilePath = path.join(__dirname, '../data/batches.json');

    // Ensure data directory exists
    const dataDir = path.join(__dirname, '../data');
    try {
      await fs.mkdir(dataDir, { recursive: true });
    } catch (err) {
      // Directory might already exist
    }

    // Load existing batches
    let batches = [];
    try {
      const existingData = await fs.readFile(batchFilePath, 'utf8');
      batches = JSON.parse(existingData);
    } catch (err) {
      // File doesn't exist yet, start with empty array
    }

    // Add new batch
    batches.push(batchData);
    await fs.writeFile(batchFilePath, JSON.stringify(batches, null, 2));

    res.status(201).json({
      success: true,
      data: batchData,
      message: `Batch ${batchNumber} created successfully.`
    });
  } catch (error) {
    console.error('Error creating batch:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to create batch: ' + error.message
    });
  }
});

// GET /api/inventory/batches/:itemId - Get batches for an item
router.get('/batches/:itemId', checkServiceEnabled, async (req, res) => {
  try {
    const { itemId } = req.params;

    // Load batches from file
    const fs = require('fs').promises;
    const path = require('path');
    const batchFilePath = path.join(__dirname, '../data/batches.json');

    let batches = [];
    try {
      const batchData = await fs.readFile(batchFilePath, 'utf8');
      batches = JSON.parse(batchData);
    } catch (err) {
      // File doesn't exist yet
      batches = [];
    }

    // Filter batches for this item
    const itemBatches = batches.filter(b => b.itemId === itemId);

    // Sort by received date descending (newest first)
    itemBatches.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    res.status(200).json({
      success: true,
      data: itemBatches
    });
  } catch (error) {
    console.error('Error fetching batches:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch batches'
    });
  }
});

// POST /api/inventory/serial - Create serial number record
router.post('/serial', checkServiceEnabled, async (req, res) => {
  try {
    const {
      itemId,
      itemName,
      serialNumber,
      batchNumber,
      warehouse,
      location,
      remarks
    } = req.body;

    // Validate required fields
    if (!itemId || !serialNumber || !warehouse) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields'
      });
    }

    // Create serial number record
    const serialData = {
      id: `serial-${Date.now()}`,
      itemId,
      itemName,
      serialNumber,
      batchNumber,
      status: 'INSTOCK',
      warehouse,
      location,
      remarks,
      createdAt: new Date().toISOString()
    };

    // Store serial number record
    const fs = require('fs').promises;
    const path = require('path');
    const serialFilePath = path.join(__dirname, '../data/serial-numbers.json');

    // Ensure data directory exists
    const dataDir = path.join(__dirname, '../data');
    try {
      await fs.mkdir(dataDir, { recursive: true });
    } catch (err) {
      // Directory might already exist
    }

    // Load existing serial numbers
    let serials = [];
    try {
      const existingData = await fs.readFile(serialFilePath, 'utf8');
      serials = JSON.parse(existingData);
    } catch (err) {
      // File doesn't exist yet, start with empty array
    }

    // Check if serial number already exists
    const existingSerial = serials.find(s => s.serialNumber === serialNumber && s.itemId === itemId);
    if (existingSerial) {
      return res.status(400).json({
        success: false,
        error: 'Serial number already exists for this item'
      });
    }

    // Add new serial number
    serials.push(serialData);
    await fs.writeFile(serialFilePath, JSON.stringify(serials, null, 2));

    res.status(201).json({
      success: true,
      data: serialData,
      message: `Serial number ${serialNumber} added successfully.`
    });
  } catch (error) {
    console.error('Error adding serial number:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to add serial number: ' + error.message
    });
  }
});

// GET /api/inventory/serials/:itemId - Get serial numbers for an item
router.get('/serials/:itemId', checkServiceEnabled, async (req, res) => {
  try {
    const { itemId } = req.params;

    // Load serial numbers from file
    const fs = require('fs').promises;
    const path = require('path');
    const serialFilePath = path.join(__dirname, '../data/serial-numbers.json');

    let serials = [];
    try {
      const serialData = await fs.readFile(serialFilePath, 'utf8');
      serials = JSON.parse(serialData);
    } catch (err) {
      // File doesn't exist yet
      serials = [];
    }

    // Filter serial numbers for this item
    const itemSerials = serials.filter(s => s.itemId === itemId);

    // Sort by creation date descending (newest first)
    itemSerials.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    res.status(200).json({
      success: true,
      data: itemSerials
    });
  } catch (error) {
    console.error('Error fetching serial numbers:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch serial numbers'
    });
  }
});

// POST /api/inventory/reorder-level - Update reorder levels
router.post('/reorder-level', checkServiceEnabled, async (req, res) => {
  try {
    const { itemId, reorderLevel, maxLevel } = req.body;

    // Validate required fields
    if (!itemId || reorderLevel === undefined || maxLevel === undefined) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields'
      });
    }

    // Update item with new reorder levels
    const updatedItem = await dataService.updateItem(itemId, {
      minLevel: reorderLevel,
      // Could add maxLevel to item schema if needed
    });

    res.status(200).json({
      success: true,
      data: updatedItem,
      message: 'Reorder levels updated successfully'
    });
  } catch (error) {
    console.error('Error updating reorder levels:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update reorder levels: ' + error.message
    });
  }
});

// GET /api/inventory/calculated-quantity/:itemId - Calculate stock from transactions
router.get('/calculated-quantity/:itemId', checkServiceEnabled, async (req, res) => {
  try {
    const { itemId } = req.params;

    // Load stock movements from file
    const fs = require('fs').promises;
    const path = require('path');
    const movementFilePath = path.join(__dirname, '../data/stock-movements.json');

    let movements = [];
    try {
      const movementData = await fs.readFile(movementFilePath, 'utf8');
      movements = JSON.parse(movementData);
    } catch (err) {
      // File doesn't exist yet
      movements = [];
    }

    // Filter movements for this item
    const itemMovements = movements.filter(m => m.itemId === itemId);

    // Calculate quantities by transaction type
    let openingStock = 0;
    let totalReceived = 0;
    let totalIssued = 0;
    const transactionBreakdown = {
      OPENING_STOCK: 0,
      GRN: 0,
      TRANSFER_IN: 0,
      TRANSFER_OUT: 0,
      SALE: 0,
      RETURN: 0,
      ADJUSTMENT: 0
    };

    let lastTransactionDate = null;
    let transactionCount = itemMovements.length;

    itemMovements.forEach(mov => {
      // Track last transaction date
      if (!lastTransactionDate || new Date(mov.date) > new Date(lastTransactionDate)) {
        lastTransactionDate = mov.date;
      }

      // Update transaction breakdown
      if (transactionBreakdown[mov.movementType] !== undefined) {
        transactionBreakdown[mov.movementType] += Math.abs(mov.quantity);
      }

      // Calculate totals based on movement type
      switch(mov.movementType) {
        case 'OPENING_STOCK':
          openingStock += mov.quantity;
          break;
        case 'GRN':
        case 'RETURN':
          totalReceived += mov.quantity;
          transactionBreakdown.GRN += mov.quantity; // Ensure RETURN is counted in GRN for now
          break;
        case 'SALE':
          totalIssued += Math.abs(mov.quantity);
          break;
        case 'TRANSFER':
          // TRANSFER can be positive (received) or negative (issued)
          if (mov.quantity > 0) {
            totalReceived += mov.quantity;
            transactionBreakdown.TRANSFER_IN += mov.quantity;
          } else {
            totalIssued += Math.abs(mov.quantity);
            transactionBreakdown.TRANSFER_OUT += Math.abs(mov.quantity);
          }
          break;
        case 'ADJUSTMENT':
          if (mov.quantity > 0) {
            totalReceived += mov.quantity;
          } else {
            totalIssued += Math.abs(mov.quantity);
          }
          break;
      }
    });

    const currentStock = openingStock + totalReceived - totalIssued;

    // Get item details
    const inventory = await dataService.getInventory();
    const item = inventory.find(i => i.id === itemId);

    res.status(200).json({
      success: true,
      data: {
        itemId,
        itemName: item ? item.name : 'Unknown',
        currentStock,
        openingStock,
        totalReceived,
        totalIssued,
        lastTransactionDate,
        transactionCount,
        transactionBreakdown
      }
    });
  } catch (error) {
    console.error('Error calculating stock quantity:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to calculate stock quantity: ' + error.message
    });
  }
});

// GET /api/inventory/summary - Get inventory summary statistics
router.get('/summary', checkServiceEnabled, async (req, res) => {
  try {
    // Get inventory data
    const inventory = await dataService.getInventory();

    // Calculate basic statistics
    const totalSKU = inventory.length;
    const totalStockQuantity = inventory.reduce((sum, item) => sum + (item.quantity || 0), 0);
    const totalInventoryValue = inventory.reduce((sum, item) =>
      sum + ((item.quantity || 0) * (item.unitCost || 0)), 0);

    const lowStockItems = inventory.filter(item => item.quantity <= item.minLevel).length;
    const outOfStockItems = inventory.filter(item => item.quantity === 0).length;
    const criticalItems = inventory.filter(item => item.quantity <= item.minLevel * 0.25).length;

    // Load pending counts from JSON files
    const fs = require('fs').promises;
    const path = require('path');

    // Count pending GRNs
    let pendingGRN = 0;
    try {
      const grnData = await fs.readFile(path.join(__dirname, '../data/grn.json'), 'utf8');
      const grns = JSON.parse(grnData);
      pendingGRN = grns.filter(grn => new Date(grn.date) > new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)).length;
    } catch (err) {
      // File doesn't exist
    }

    // Count pending transfers
    let pendingTransfers = 0;
    try {
      const transferData = await fs.readFile(path.join(__dirname, '../data/stock-transfers.json'), 'utf8');
      const transfers = JSON.parse(transferData);
      pendingTransfers = transfers.filter(t => t.status === 'PENDING').length;
    } catch (err) {
      // File doesn't exist
    }

    // Count pending stock takes
    let pendingStockTakes = 0;
    try {
      const stockTakeData = await fs.readFile(path.join(__dirname, '../data/stock-takes.json'), 'utf8');
      const stockTakes = JSON.parse(stockTakeData);
      pendingStockTakes = stockTakes.filter(st => st.status === 'SUBMITTED').length;
    } catch (err) {
      // File doesn't exist
    }

    // Calculate category breakdown
    const categoryBreakdown = {};
    inventory.forEach(item => {
      const category = item.category || 'Uncategorized';
      if (!categoryBreakdown[category]) {
        categoryBreakdown[category] = {
          itemCount: 0,
          totalQuantity: 0,
          totalValue: 0,
          lowStockCount: 0
        };
      }
      categoryBreakdown[category].itemCount += 1;
      categoryBreakdown[category].totalQuantity += (item.quantity || 0);
      categoryBreakdown[category].totalValue += ((item.quantity || 0) * (item.unitCost || 0));
      if (item.quantity <= item.minLevel) {
        categoryBreakdown[category].lowStockCount += 1;
      }
    });

    // Calculate warehouse breakdown (basic - can be enhanced with multi-location support)
    const warehouseBreakdown = {
      'Main Warehouse': {
        itemCount: totalSKU,
        totalValue: totalInventoryValue
      }
    };

    res.status(200).json({
      success: true,
      data: {
        totalSKU,
        totalStockQuantity,
        totalInventoryValue,
        lowStockItems,
        outOfStockItems,
        criticalItems,
        pendingGRN,
        pendingTransfers,
        pendingStockTakes,
        categoryBreakdown,
        warehouseBreakdown
      }
    });
  } catch (error) {
    console.error('Error getting inventory summary:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get inventory summary: ' + error.message
    });
  }
});

// GET /api/inventory/usage-analysis/:itemId - Get usage analysis for reorder recommendations
router.get('/usage-analysis/:itemId', checkServiceEnabled, async (req, res) => {
  try {
    const { itemId } = req.params;

    // Load stock movements from file
    const fs = require('fs').promises;
    const path = require('path');
    const movementFilePath = path.join(__dirname, '../data/stock-movements.json');

    let movements = [];
    try {
      const movementData = await fs.readFile(movementFilePath, 'utf8');
      movements = JSON.parse(movementData);
    } catch (err) {
      // File doesn't exist yet
      movements = [];
    }

    // Filter movements for this item
    const itemMovements = movements.filter(m => m.itemId === itemId);

    // Get item details
    const inventory = await dataService.getInventory();
    const item = inventory.find(i => i.id === itemId);

    if (!item) {
      return res.status(404).json({
        success: false,
        error: 'Item not found'
      });
    }

    // Calculate usage statistics
    const currentStock = item.quantity || 0;
    const minLevel = item.minLevel || 10;

    // Calculate average monthly usage from SALE and TRANSFER_OUT transactions
    const salesMovements = itemMovements.filter(m =>
      m.movementType === 'SALE' || (m.movementType === 'TRANSFER' && m.quantity < 0)
    );

    let totalSold = 0;
    let oldestSaleDate = null;
    let newestSaleDate = null;
    let daysOutOfStock = 0;

    salesMovements.forEach(mov => {
      const saleQty = Math.abs(mov.quantity);
      totalSold += saleQty;

      const movDate = new Date(mov.date);
      if (!oldestSaleDate || movDate < oldestSaleDate) {
        oldestSaleDate = movDate;
      }
      if (!newestSaleDate || movDate > newestSaleDate) {
        newestSaleDate = movDate;
      }
    });

    // Calculate average monthly usage
    let avgMonthlyUsage = 0;
    if (oldestSaleDate && newestSaleDate) {
      const daysDiff = Math.max(1, Math.ceil((newestSaleDate - oldestSaleDate) / (1000 * 60 * 60 * 24)));
      const monthsDiff = daysDiff / 30.44; // Average days per month
      avgMonthlyUsage = monthsDiff > 0 ? Math.round(totalSold / monthsDiff) : 0;
    }

    // Calculate days until stockout
    let daysUntilStockout = 0;
    if (avgMonthlyUsage > 0) {
      const dailyUsage = avgMonthlyUsage / 30.44;
      daysUntilStockout = dailyUsage > 0 ? Math.floor(currentStock / dailyUsage) : 0;
    }

    // Calculate reorder recommendation
    let reorderRecommendation = 0;
    let reason = '';

    if (currentStock === 0) {
      reorderRecommendation = Math.max(avgMonthlyUsage, minLevel * 2);
      reason = 'Item is out of stock. Order immediately.';
    } else if (currentStock <= minLevel) {
      // Lead time assumption: 30 days, Safety stock: 50% of monthly usage
      const leadTimeDemand = Math.round(avgMonthlyUsage * (30 / 30.44)); // ~1 month
      const safetyStock = Math.round(avgMonthlyUsage * 0.5);
      reorderRecommendation = leadTimeDemand + safetyStock - currentStock + minLevel;
      reason = `Stock below minimum. Order to reach ${minLevel} + safety stock.`;
    } else if (avgMonthlyUsage > 0) {
      // Calculate when reorder is needed
      const dailyUsage = avgMonthlyUsage / 30.44;
      const daysUntilReorder = Math.floor((currentStock - minLevel) / dailyUsage);

      if (daysUntilReorder <= 30) {
        // Reorder within 30 days
        const leadTimeDemand = Math.round(avgMonthlyUsage * (30 / 30.44));
        const safetyStock = Math.round(avgMonthlyUsage * 0.5);
        reorderRecommendation = leadTimeDemand + safetyStock;
        reason = `Reorder needed in ${daysUntilReorder} days. Plan ahead.`;
      } else {
        reorderRecommendation = 0;
        reason = `Sufficient stock. Reorder in ${daysUntilReorder} days.`;
      }
    } else {
      reorderRecommendation = minLevel;
      reason = 'No usage history found. Order minimum level.';
    }

    // Ensure minimum order quantity
    if (reorderRecommendation > 0 && reorderRecommendation < minLevel) {
      reorderRecommendation = minLevel;
    }

    // Calculate urgency
    let urgency = 'LOW';
    if (currentStock === 0) {
      urgency = 'HIGH';
    } else if (currentStock <= minLevel * 0.5) {
      urgency = 'HIGH';
    } else if (currentStock <= minLevel) {
      urgency = 'MEDIUM';
    }

    res.status(200).json({
      success: true,
      data: {
        itemId,
        itemName: item.name,
        currentStock,
        minLevel,
        avgMonthlyUsage,
        daysOutOfStock,
        lastSaleDate: newestSaleDate ? newestSaleDate.toISOString().split('T')[0] : null,
        reorderRecommendation,
        urgency,
        reason,
        estimatedCost: reorderRecommendation * (item.unitCost || 0)
      }
    });
  } catch (error) {
    console.error('Error calculating usage analysis:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to calculate usage analysis: ' + error.message
    });
  }
});

module.exports = router;
