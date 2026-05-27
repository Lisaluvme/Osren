const express = require('express');
const router = express.Router();
const googleSheetsService = require('../services/googleDriveService');
const mockDataService = require('../services/mockDataService');

// Use mock data for local testing, Google Sheets for production
const useMockData = process.env.USE_MOCK_DATA === 'true' || !googleSheetsService.enabled;
const dataService = useMockData ? mockDataService : googleSheetsService;

// In-memory order storage (will be replaced with database)
let orders = [];

console.log('🔧 Order routes using:', useMockData ? 'Mock Data Service (Local Testing)' : 'Google Sheets Service');
console.log('🔧 Google Sheets enabled:', googleSheetsService.enabled);

// Health check for orders service
router.get('/health', async (req, res) => {
  try {
    const sheetsOrders = googleSheetsService.enabled ? await loadOrdersFromSheets() : [];

    res.status(200).json({
      success: true,
      service: 'orders',
      googleSheetsEnabled: googleSheetsService.enabled,
      inMemoryOrdersCount: orders.length,
      sheetsOrdersCount: sheetsOrders.length,
      spreadsheetId: process.env.GOOGLE_SPREADSHEET_ID || 'not set',
      status: 'operational'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message,
      status: 'error'
    });
  }
});

// Helper function to get order sheets service
const getOrderSheetsService = () => {
  if (!googleSheetsService.enabled) {
    return null;
  }
  return googleSheetsService;
};

// Helper function to save order to Google Sheets
const saveOrderToSheets = async (order) => {
  if (!googleSheetsService.enabled) {
    console.log('ℹ️  Google Sheets not enabled - order saved to memory only');
    return;
  }

  try {
    const sheets = googleSheetsService.sheets;
    const spreadsheetId = process.env.GOOGLE_SPREADSHEET_ID;

    // Add order to Orders sheet
    const orderData = [
      order.id,
      order.clientName,
      order.items.map(item => `${item.name} (x${item.quantity})`).join(', '),
      order.totalItems,
      order.totalAmount,
      order.status,
      order.createdAt,
      order.deliveryAddress || '',
      order.contactNumber || '',
      order.notes || ''
    ];

    await sheets.spreadsheets.values.append({
      spreadsheetId,
      range: 'Orders!A:J',
      valueInputOption: 'RAW',
      resource: {
        values: [orderData]
      }
    });

    console.log('✅ Order saved to Google Sheets:', order.id);
  } catch (error) {
    console.error('⚠️  Could not save order to Google Sheets, saved to memory only:', error.message);
    // Don't throw error - continue with in-memory storage
  }
};

// Helper function to load orders from Google Sheets
const loadOrdersFromSheets = async () => {
  if (!googleSheetsService.enabled) {
    console.log('ℹ️  Google Sheets not enabled - using in-memory orders only');
    return orders;
  }

  try {
    const sheets = googleSheetsService.sheets;
    const spreadsheetId = process.env.GOOGLE_SPREADSHEET_ID;

    console.log('🔍 Attempting to load orders from Google Sheets...');
    console.log('📝 Spreadsheet ID:', spreadsheetId);

    const response = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range: 'Orders!A:J'
    });

    const rows = response.data.values || [];
    console.log(`📊 Found ${rows.length} rows in Orders sheet`);

    if (rows.length === 0) {
      console.log('⚠️  Orders sheet is empty, creating header row...');
      // Create header row if sheet is empty
      await sheets.spreadsheets.values.update({
        spreadsheetId,
        range: 'Orders!A1:J1',
        valueInputOption: 'RAW',
        resource: {
          values: [['Order ID', 'Client Name', 'Items', 'Total Items', 'Total Amount', 'Status', 'Created At', 'Delivery Address', 'Contact Number', 'Notes']]
        }
      });
      return [];
    }

    // Skip header row, transform data to order objects
    const loadedOrders = rows.slice(1).map(row => ({
      id: row[0] || '',
      clientName: row[1] || '',
      items: parseItemsFromSheet(row[2] || ''),
      totalItems: parseInt(row[3]) || 0,
      totalAmount: parseFloat(row[4]) || 0,
      status: row[5] || 'pending',
      createdAt: row[6] || new Date().toISOString(),
      deliveryAddress: row[7] || '',
      contactNumber: row[8] || '',
      notes: row[9] || ''
    }));

    console.log(`✅ Loaded ${loadedOrders.length} orders from Google Sheets`);
    loadedOrders.forEach(order => {
      console.log(`  - ${order.id}: ${order.clientName} (${order.status})`);
    });

    return loadedOrders;
  } catch (error) {
    console.error('⚠️  Could not load orders from Google Sheets:', error.message);
    console.error('📋 Full error:', error);

    // Check if it's because the Orders sheet doesn't exist
    if (error.message && error.message.includes('Unable to parse range')) {
      console.log('🔧 Orders sheet does not exist, creating it...');
      try {
        await sheets.spreadsheets.batchUpdate({
          spreadsheetId,
          requestBody: {
            requests: [{
              addSheet: {
                properties: {
                  title: 'Orders',
                  gridProperties: {
                    rowCount: 1000,
                    columnCount: 10
                  }
                }
              }
            }]
          }
        });

        // Add header row
        await sheets.spreadsheets.values.update({
          spreadsheetId,
          range: 'Orders!A1:J1',
          valueInputOption: 'RAW',
          resource: {
            values: [['Order ID', 'Client Name', 'Items', 'Total Items', 'Total Amount', 'Status', 'Created At', 'Delivery Address', 'Contact Number', 'Notes']]
          }
        });

        console.log('✅ Orders sheet created successfully');
      } catch (createError) {
        console.error('❌ Failed to create Orders sheet:', createError.message);
      }
    }

    return orders; // Return in-memory orders as fallback
  }
};

// Helper function to parse items from sheet format
const parseItemsFromSheet = (itemsString) => {
  if (!itemsString) return [];
  try {
    // Parse "Item 1 (x2), Item 2 (x3)" format back to items array
    return itemsString.split(', ').map(itemStr => {
      const match = itemStr.match(/^(.+?) \(x(\d+)\)$/);
      if (match) {
        return {
          name: match[1],
          quantity: parseInt(match[2]),
          unitPrice: 0, // Will be calculated from inventory
          itemTotal: 0
        };
      }
      return { name: itemStr, quantity: 1, unitPrice: 0, itemTotal: 0 };
    });
  } catch (error) {
    console.error('Error parsing items from sheet:', error);
    return [];
  }
};

// Helper function to update inventory after order
const updateInventoryAfterOrder = async (items) => {
  if (!googleSheetsService.enabled) {
    console.log('ℹ️  Google Sheets not enabled - inventory not updated');
    return;
  }

  try {
    const inventory = await dataService.getInventory();

    for (const item of items) {
      const inventoryItem = inventory.find(inv => inv.name === item.name);
      if (inventoryItem) {
        const newQuantity = Math.max(0, inventoryItem.quantity - item.quantity);
        await dataService.updateItem(inventoryItem.id, {
          quantity: newQuantity,
          lastMovement: new Date().toISOString().split('T')[0]
        });
        console.log(`✅ Updated ${item.name}: ${inventoryItem.quantity} → ${newQuantity}`);
      }
    }
  } catch (error) {
    console.error('⚠️  Could not update inventory after order:', error.message);
    // Don't throw error - order is still valid
  }
};

// POST /api/orders - Create new order
router.post('/', async (req, res) => {
  try {
    const { clientName, items, deliveryAddress, contactNumber, notes } = req.body;

    // Validate request
    if (!clientName || !items || items.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'Client name and items are required'
      });
    }

    // Generate order ID
    const orderId = `ORD-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    // Calculate total items and amount (using inventory prices)
    let totalAmount = 0;
    const totalItems = items.reduce((sum, item) => sum + item.quantity, 0);

    const enrichedItems = items.map(item => {
      // Find price from inventory if available, otherwise default to 0
      const unitPrice = 0; // Will be calculated from inventory
      const itemTotal = unitPrice * item.quantity;
      totalAmount += itemTotal;

      return {
        ...item,
        unitPrice,
        itemTotal
      };
    });

    // If we have inventory service, get real prices
    if (dataService && dataService.getInventory) {
      try {
        const inventory = await dataService.getInventory();
        enrichedItems.forEach(item => {
          const inventoryItem = inventory.find(inv => inv.name === item.name);
          if (inventoryItem) {
            item.unitPrice = inventoryItem.sellingPrice;
            item.itemTotal = item.unitPrice * item.quantity;
            totalAmount += item.itemTotal - (item.unitPrice * item.quantity); // Adjust total
          }
        });
        // Recalculate total with real prices
        totalAmount = enrichedItems.reduce((sum, item) => sum + item.itemTotal, 0);
      } catch (invError) {
        console.error('Could not fetch inventory prices, using zero prices:', invError.message);
      }
    }

    // Create order object
    const order = {
      id: orderId,
      clientName,
      items: enrichedItems,
      totalItems,
      totalAmount,
      status: 'pending',
      createdAt: new Date().toISOString(),
      deliveryAddress: deliveryAddress || '',
      contactNumber: contactNumber || '',
      notes: notes || ''
    };

    // Save to in-memory storage (always works)
    orders.push(order);

    // Try to save to Google Sheets (optional, won't fail if it doesn't work)
    await saveOrderToSheets(order);

    // Try to update inventory (optional, won't fail if it doesn't work)
    await updateInventoryAfterOrder(items);

    console.log('✅ Order created successfully:', orderId);

    res.status(201).json({
      success: true,
      data: order,
      message: 'Order placed successfully'
    });
  } catch (error) {
    console.error('Error creating order:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to create order: ' + error.message
    });
  }
});

// GET /api/orders - Get all orders
router.get('/', async (req, res) => {
  try {
    const { status, client, limit = 50 } = req.query;

    // Load orders from Google Sheets if enabled, otherwise use memory
    let allOrders = googleSheetsService.enabled ? await loadOrdersFromSheets() : [...orders];

    // Also merge with any in-memory orders that might not be in Sheets yet
    if (googleSheetsService.enabled && orders.length > 0) {
      const sheetOrderIds = new Set(allOrders.map(o => o.id));
      const newMemoryOrders = orders.filter(o => !sheetOrderIds.has(o.id));
      allOrders = [...newMemoryOrders, ...allOrders];
    }

    let filteredOrders = [...allOrders];

    // Filter by status
    if (status) {
      filteredOrders = filteredOrders.filter(order => order.status === status);
    }

    // Filter by client
    if (client) {
      filteredOrders = filteredOrders.filter(order =>
        order.clientName.toLowerCase().includes(client.toLowerCase())
      );
    }

    // Sort by date (newest first)
    filteredOrders.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

    // Limit results
    filteredOrders = filteredOrders.slice(0, parseInt(limit));

    res.status(200).json({
      success: true,
      data: filteredOrders,
      total: filteredOrders.length
    });
  } catch (error) {
    console.error('Error getting orders:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve orders'
    });
  }
});

// GET /api/orders/:id - Get specific order
router.get('/:id', (req, res) => {
  try {
    const order = orders.find(o => o.id === req.params.id);

    if (!order) {
      return res.status(404).json({
        success: false,
        error: 'Order not found'
      });
    }

    res.status(200).json({
      success: true,
      data: order
    });
  } catch (error) {
    console.error('Error getting order:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve order'
    });
  }
});

// PUT /api/orders/:id - Update order status
router.put('/:id', async (req, res) => {
  try {
    const { status, deliveryAddress, contactNumber, notes } = req.body;

    const orderIndex = orders.findIndex(o => o.id === req.params.id);

    if (orderIndex === -1) {
      return res.status(404).json({
        success: false,
        error: 'Order not found'
      });
    }

    // Update order
    if (status) orders[orderIndex].status = status;
    if (deliveryAddress) orders[orderIndex].deliveryAddress = deliveryAddress;
    if (contactNumber) orders[orderIndex].contactNumber = contactNumber;
    if (notes) orders[orderIndex].notes = notes;
    orders[orderIndex].updatedAt = new Date().toISOString();

    res.status(200).json({
      success: true,
      data: orders[orderIndex],
      message: 'Order updated successfully'
    });
  } catch (error) {
    console.error('Error updating order:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update order'
    });
  }
});

// DELETE /api/orders/:id - Cancel order
router.delete('/:id', (req, res) => {
  try {
    const orderIndex = orders.findIndex(o => o.id === req.params.id);

    if (orderIndex === -1) {
      return res.status(404).json({
        success: false,
        error: 'Order not found'
      });
    }

    // Update status to cancelled instead of deleting
    orders[orderIndex].status = 'cancelled';
    orders[orderIndex].updatedAt = new Date().toISOString();

    res.status(200).json({
      success: true,
      message: 'Order cancelled successfully'
    });
  } catch (error) {
    console.error('Error cancelling order:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to cancel order'
    });
  }
});

// GET /api/orders/stats - Get order statistics
router.get('/stats', (req, res) => {
  try {
    const totalOrders = orders.length;
    const pendingOrders = orders.filter(o => o.status === 'pending').length;
    const completedOrders = orders.filter(o => o.status === 'completed').length;
    const cancelledOrders = orders.filter(o => o.status === 'cancelled').length;

    const totalRevenue = orders
      .filter(o => o.status !== 'cancelled')
      .reduce((sum, o) => sum + o.totalAmount, 0);

    res.status(200).json({
      success: true,
      data: {
        totalOrders,
        pendingOrders,
        completedOrders,
        cancelledOrders,
        totalRevenue,
        averageOrderValue: totalOrders > 0 ? totalRevenue / totalOrders : 0
      }
    });
  } catch (error) {
    console.error('Error getting order stats:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve order statistics'
    });
  }
});

module.exports = router;