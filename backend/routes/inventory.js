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

// ---------------------------------------------------------------------------
// Stock movement history — logged to a "Movements" tab in the same Google
// Sheet. Reuses the service's public `sheets` client + `spreadsheetId`
// (see backend/services/googleDriveService.js). Append pattern mirrors
// backend/routes/orders.js. This is a separate log; it does NOT change how
// add/update/delete/adjust persist the Inventory tab (still a full rewrite).
// ---------------------------------------------------------------------------
const MOVEMENTS_RANGE = 'Movements!A:I';
const MOVEMENT_HEADERS = ['Timestamp', 'ItemID', 'ItemName', 'SKU', 'Type', 'QuantityChange', 'NewQuantity', 'Reason', 'PerformedBy'];
let movementsTabReady = false;

// Create the Movements tab + header on first use; no-op afterwards. Swallows
// the "already exists" error so it is safe to call on every request.
async function ensureMovementsTab() {
  if (movementsTabReady) return;
  const sheets = googleSheetsService.sheets;
  const spreadsheetId = googleSheetsService.spreadsheetId;
  if (!sheets || !spreadsheetId) throw new Error('Google Sheets not configured');

  const writeHeader = async () => {
    const existing = await sheets.spreadsheets.values.get({ spreadsheetId, range: 'Movements!A1:I1' });
    if (!existing.data.values || existing.data.values.length === 0) {
      await sheets.spreadsheets.values.update({
        spreadsheetId, range: 'Movements!A1:I1', valueInputOption: 'RAW',
        resource: { values: [MOVEMENT_HEADERS] },
      });
    }
  };

  try {
    await sheets.spreadsheets.batchUpdate({
      spreadsheetId,
      requestBody: { requests: [{ addSheet: { properties: { title: 'Movements', gridProperties: { rowCount: 1000, columnCount: 9 } } } }] },
    });
    await sheets.spreadsheets.values.update({
      spreadsheetId, range: 'Movements!A1:I1', valueInputOption: 'RAW',
      resource: { values: [MOVEMENT_HEADERS] },
    });
  } catch (e) {
    // Tab already exists — make sure the header row is present.
    try { await writeHeader(); } catch (_) { /* ignore */ }
  }
  movementsTabReady = true;
}

// POST /api/inventory/movement-log - Append a stock movement row
router.post('/movement-log', checkServiceEnabled, async (req, res) => {
  try {
    const { itemId, itemName, sku, type, quantityChange, newQuantity, reason, performedBy } = req.body;
    if (itemId === undefined || !type) {
      return res.status(400).json({ success: false, error: 'itemId and type are required' });
    }
    const sheets = googleSheetsService.sheets;
    const spreadsheetId = googleSheetsService.spreadsheetId;
    if (!sheets || !spreadsheetId) {
      return res.status(503).json({ success: false, error: 'Google Sheets not configured' });
    }

    await ensureMovementsTab();
    const row = [
      new Date().toISOString(),
      itemId,
      itemName || '',
      sku || '',
      type,
      quantityChange !== undefined ? quantityChange : '',
      newQuantity !== undefined ? newQuantity : '',
      reason || '',
      performedBy || '',
    ];
    await sheets.spreadsheets.values.append({
      spreadsheetId, range: MOVEMENTS_RANGE, valueInputOption: 'RAW',
      resource: { values: [row] },
    });
    res.status(200).json({ success: true });
  } catch (error) {
    console.error('Error logging movement:', error);
    res.status(500).json({ success: false, error: 'Failed to log movement: ' + error.message });
  }
});

// GET /api/inventory/movement-log - Read stock movements (optional ?itemId=)
router.get('/movement-log', checkServiceEnabled, async (req, res) => {
  try {
    const sheets = googleSheetsService.sheets;
    const spreadsheetId = googleSheetsService.spreadsheetId;
    if (!sheets || !spreadsheetId) {
      return res.status(503).json({ success: false, error: 'Google Sheets not configured' });
    }

    await ensureMovementsTab();
    const result = await sheets.spreadsheets.values.get({ spreadsheetId, range: MOVEMENTS_RANGE });
    const rows = (result.data.values || []).slice(1).filter(r => r && r.length && r.some(c => c !== '' && c !== null));
    const parsed = rows.map(r => ({
      timestamp: r[0] || '',
      itemId: r[1] !== undefined ? String(r[1]) : '',
      itemName: r[2] || '',
      sku: r[3] || '',
      type: r[4] || '',
      quantityChange: r[5] !== undefined && r[5] !== '' ? Number(r[5]) : '',
      newQuantity: r[6] !== undefined && r[6] !== '' ? Number(r[6]) : '',
      reason: r[7] || '',
      performedBy: r[8] || '',
    }));

    const { itemId } = req.query;
    const filtered = itemId ? parsed.filter(m => m.itemId === String(itemId)) : parsed;
    res.status(200).json({ success: true, data: filtered.reverse() }); // newest first
  } catch (error) {
    console.error('Error reading movements:', error);
    res.status(500).json({ success: false, error: 'Failed to read movements: ' + error.message });
  }
});

module.exports = router;
