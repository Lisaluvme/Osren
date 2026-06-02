// Netlify Function for Orders Management
// Handles order operations: create, list, get, update, delete, stats

const { createSuccessResponse, createErrorResponse, handleOptions } = require('./netlify-helpers');

// In-memory order storage (for demo purposes)
let orders = [
  {
    id: 'ORD-1716452345678-abc123',
    clientName: 'ABC Corporation',
    items: [
      { name: 'Wireless Mouse', quantity: 10, unitPrice: 19.99, itemTotal: 199.90 },
      { name: 'USB-C Cable (2m)', quantity: 5, unitPrice: 9.99, itemTotal: 49.95 }
    ],
    totalItems: 15,
    totalAmount: 249.85,
    status: 'pending',
    createdAt: '2026-05-25T10:30:00Z',
    deliveryAddress: '123 Business Park, Kuala Lumpur',
    contactNumber: '+60123456789',
    notes: 'Please deliver before 2pm'
  },
  {
    id: 'ORD-1716453456789-def456',
    clientName: 'XYZ Trading',
    items: [
      { name: 'Mechanical Keyboard', quantity: 2, unitPrice: 89.99, itemTotal: 179.98 }
    ],
    totalItems: 2,
    totalAmount: 179.98,
    status: 'completed',
    createdAt: '2026-05-24T14:20:00Z',
    deliveryAddress: '456 Commerce Street, Penang',
    contactNumber: '+60198765432',
    notes: ''
  }
];

// Handler for Netlify Function
exports.handler = async (event, context) => {
  // Handle CORS preflight
  if (event.httpMethod === 'OPTIONS') {
    return handleOptions();
  }

  try {
    const { httpMethod, path, body, queryStringParameters } = event;

    // Parse request body for POST/PUT/PATCH
    const requestBody = body ? JSON.parse(body) : {};

    // Route based on path and HTTP method
    switch (true) {
      // POST /api/orders - Create new order
      case httpMethod === 'POST' && path.endsWith('/orders'):
        return await createOrder(requestBody);

      // GET /api/orders - Get all orders
      case httpMethod === 'GET' && path.endsWith('/orders'):
        return await getOrders(queryStringParameters);

      // GET /api/orders/stats - Get order statistics
      case httpMethod === 'GET' && path.endsWith('/orders/stats'):
        return getOrderStats();

      // GET /api/orders/health - Health check
      case httpMethod === 'GET' && path.endsWith('/orders/health'):
        return getHealthCheck();

      // GET /api/orders/:id - Get specific order
      case httpMethod === 'GET' && path.match(/\/orders\/[^/]+$/):
        const orderId = path.split('/').pop();
        return getOrder(orderId);

      // PUT /api/orders/:id - Update order
      case httpMethod === 'PUT' && path.match(/\/orders\/[^/]+$/):
        const updateOrderId = path.split('/').pop();
        return updateOrder(updateOrderId, requestBody);

      // PATCH /api/orders/:id - Update order status
      case httpMethod === 'PATCH' && path.match(/\/orders\/[^/]+$/):
        const patchOrderId = path.split('/').pop();
        return updateOrderStatus(patchOrderId, requestBody);

      // DELETE /api/orders/:id - Cancel order
      case httpMethod === 'DELETE' && path.match(/\/orders\/[^/]+$/):
        const deleteOrderId = path.split('/').pop();
        return cancelOrder(deleteOrderId);

      default:
        return createErrorResponse(405, 'Method not allowed');
    }
  } catch (error) {
    console.error('Error in orders function:', error);
    return createErrorResponse(500, error.message || 'Internal server error');
  }
};

// Create new order
async function createOrder(orderData) {
  try {
    const { clientName, items, deliveryAddress, contactNumber, notes } = orderData;

    // Validate request
    if (!clientName || !items || items.length === 0) {
      return createErrorResponse(400, 'Client name and items are required');
    }

    // Generate order ID
    const orderId = `ORD-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    // Calculate total items and amount
    let totalAmount = 0;
    const enrichedItems = items.map(item => {
      const unitPrice = item.unitPrice || 0;
      const itemTotal = unitPrice * item.quantity;
      totalAmount += itemTotal;
      return {
        ...item,
        unitPrice,
        itemTotal
      };
    });

    const totalItems = items.reduce((sum, item) => sum + item.quantity, 0);

    // Create order object
    const newOrder = {
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

    // Save to storage
    orders.push(newOrder);

    console.log('✅ Order created successfully:', orderId);

    return {
      statusCode: 201,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      },
      body: JSON.stringify({
        success: true,
        data: newOrder,
        message: 'Order placed successfully'
      })
    };
  } catch (error) {
    console.error('Error creating order:', error);
    return createErrorResponse(500, 'Failed to create order: ' + error.message);
  }
}

// Get all orders with optional filtering
async function getOrders(queryParams) {
  try {
    const { status, client, limit = 50 } = queryParams || {};

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

    return createSuccessResponse(filteredOrders);
  } catch (error) {
    console.error('Error getting orders:', error);
    return createErrorResponse(500, 'Failed to retrieve orders');
  }
}

// Get specific order
async function getOrder(orderId) {
  try {
    const order = orders.find(o => o.id === orderId);

    if (!order) {
      return createErrorResponse(404, 'Order not found');
    }

    return createSuccessResponse(order);
  } catch (error) {
    console.error('Error getting order:', error);
    return createErrorResponse(500, 'Failed to retrieve order');
  }
}

// Update order
async function updateOrder(orderId, updateData) {
  try {
    const { status, deliveryAddress, contactNumber, notes } = updateData;

    const orderIndex = orders.findIndex(o => o.id === orderId);

    if (orderIndex === -1) {
      return createErrorResponse(404, 'Order not found');
    }

    // Update order
    if (status) orders[orderIndex].status = status;
    if (deliveryAddress) orders[orderIndex].deliveryAddress = deliveryAddress;
    if (contactNumber) orders[orderIndex].contactNumber = contactNumber;
    if (notes) orders[orderIndex].notes = notes;
    orders[orderIndex].updatedAt = new Date().toISOString();

    return createSuccessResponse(orders[orderIndex]);
  } catch (error) {
    console.error('Error updating order:', error);
    return createErrorResponse(500, 'Failed to update order');
  }
}

// Update order status
async function updateOrderStatus(orderId, updateData) {
  try {
    const { status } = updateData;

    if (!status) {
      return createErrorResponse(400, 'Status is required');
    }

    const orderIndex = orders.findIndex(o => o.id === orderId);

    if (orderIndex === -1) {
      return createErrorResponse(404, 'Order not found');
    }

    // Update status
    orders[orderIndex].status = status;
    orders[orderIndex].updatedAt = new Date().toISOString();

    return createSuccessResponse(orders[orderIndex]);
  } catch (error) {
    console.error('Error updating order status:', error);
    return createErrorResponse(500, 'Failed to update order status');
  }
}

// Cancel order
async function cancelOrder(orderId) {
  try {
    const orderIndex = orders.findIndex(o => o.id === orderId);

    if (orderIndex === -1) {
      return createErrorResponse(404, 'Order not found');
    }

    // Update status to cancelled instead of deleting
    orders[orderIndex].status = 'cancelled';
    orders[orderIndex].updatedAt = new Date().toISOString();

    return createSuccessResponse({ message: 'Order cancelled successfully' });
  } catch (error) {
    console.error('Error cancelling order:', error);
    return createErrorResponse(500, 'Failed to cancel order');
  }
}

// Get order statistics
async function getOrderStats() {
  try {
    const totalOrders = orders.length;
    const pendingOrders = orders.filter(o => o.status === 'pending').length;
    const completedOrders = orders.filter(o => o.status === 'completed').length;
    const cancelledOrders = orders.filter(o => o.status === 'cancelled').length;

    const totalRevenue = orders
      .filter(o => o.status !== 'cancelled')
      .reduce((sum, o) => sum + o.totalAmount, 0);

    const stats = {
      totalOrders,
      pendingOrders,
      completedOrders,
      cancelledOrders,
      totalRevenue,
      averageOrderValue: totalOrders > 0 ? totalRevenue / totalOrders : 0
    };

    return createSuccessResponse(stats);
  } catch (error) {
    console.error('Error getting order stats:', error);
    return createErrorResponse(500, 'Failed to retrieve order statistics');
  }
}

// Health check
async function getHealthCheck() {
  try {
    return createSuccessResponse({
      service: 'orders',
      status: 'operational',
      inMemoryOrdersCount: orders.length,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error in health check:', error);
    return createErrorResponse(500, 'Health check failed');
  }
}
