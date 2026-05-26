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
router.get('/health', (req, res) => {
  res.status(200).json({
    success: true,
    service: 'orders',
    googleSheetsEnabled: googleSheetsService.enabled,
    inMemoryOrdersCount: orders.length,
    status: 'operational'
  });
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

    let filteredOrders = [...orders];

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