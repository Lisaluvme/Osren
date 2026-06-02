// Netlify Function for Inventory Management
// Handles all inventory operations: list, add, update, delete, adjust, search

const { createSuccessResponse, createErrorResponse, handleOptions } = require('./netlify-helpers');

// Mock data service for fallback
const mockDataService = {
  inventory: [
    {
      id: '1',
      name: 'Wireless Mouse',
      sku: 'MOUSE-001',
      category: 'Electronics',
      brand: 'Logitech',
      quantity: 45,
      minLevel: 10,
      unitCost: 8.50,
      sellingPrice: 19.99,
      supplier: 'Tech Supplies Co',
      lastMovement: '2026-05-20',
      profit: 11.49,
      stockValue: 382.50,
      lowStockFlag: 0
    },
    {
      id: '2',
      name: 'USB-C Cable (2m)',
      sku: 'CABLE-002',
      category: 'Electronics',
      brand: 'Anker',
      quantity: 8,
      minLevel: 15,
      unitCost: 3.20,
      sellingPrice: 9.99,
      supplier: 'Cable Masters',
      lastMovement: '2026-05-21',
      profit: 6.79,
      stockValue: 25.60,
      lowStockFlag: 1
    }
  ],

  async getInventory() {
    return this.inventory;
  },

  calculateDerivedFields(item) {
    const profit = (item.sellingPrice || 0) - (item.unitCost || 0);
    const stockValue = (item.quantity || 0) * (item.unitCost || 0);
    const lowStockFlag = (item.quantity || 0) < (item.minLevel || 10) ? 1 : 0;
    return { ...item, profit, stockValue, lowStockFlag };
  },

  async addItem(newItem) {
    const maxId = this.inventory.length > 0 ? Math.max(...this.inventory.map(item => parseInt(item.id) || 0)) : 0;
    newItem.id = (maxId + 1).toString();
    newItem.lastMovement = new Date().toISOString().split('T')[0];
    const calculatedItem = this.calculateDerivedFields(newItem);
    this.inventory.push(calculatedItem);
    return calculatedItem;
  },

  async updateItem(id, updateData) {
    const itemIndex = this.inventory.findIndex(item => item.id === id);
    if (itemIndex === -1) {
      throw new Error('Item not found');
    }
    const updatedItem = { ...this.inventory[itemIndex], ...updateData };
    updatedItem.lastMovement = new Date().toISOString().split('T')[0];
    this.inventory[itemIndex] = this.calculateDerivedFields(updatedItem);
    return this.inventory[itemIndex];
  },

  async deleteItem(id) {
    const itemIndex = this.inventory.findIndex(item => item.id === id);
    if (itemIndex === -1) {
      throw new Error('Item not found');
    }
    this.inventory.splice(itemIndex, 1);
    return { success: true, message: 'Item deleted successfully' };
  },

  async searchItems(query) {
    const lowerQuery = query.toLowerCase();
    return this.inventory.filter(item =>
      item.name.toLowerCase().includes(lowerQuery) ||
      item.sku.toLowerCase().includes(lowerQuery) ||
      item.category.toLowerCase().includes(lowerQuery) ||
      item.brand.toLowerCase().includes(lowerQuery)
    );
  },

  async adjustQuantity(id, adjustment) {
    const itemIndex = this.inventory.findIndex(item => item.id === id);
    if (itemIndex === -1) {
      throw new Error('Item not found');
    }
    const newQuantity = Math.max(0, this.inventory[itemIndex].quantity + adjustment);
    this.inventory[itemIndex].quantity = newQuantity;
    this.inventory[itemIndex].lastMovement = new Date().toISOString().split('T')[0];
    this.inventory[itemIndex] = this.calculateDerivedFields(this.inventory[itemIndex]);
    return this.inventory[itemIndex];
  }
};

// Handler for Netlify Function
exports.handler = async (event, context) => {
  // Handle CORS preflight
  if (event.httpMethod === 'OPTIONS') {
    return handleOptions();
  }

  try {
    const { httpMethod, body, queryStringParameters } = event;

    // Parse request body
    const requestBody = body ? JSON.parse(body) : {};

    // Route based on action parameter or HTTP method
    switch (true) {
      case httpMethod === 'GET' && event.path.endsWith('/list'):
        // GET /api/inventory/list
        const inventory = await mockDataService.getInventory();
        return createSuccessResponse(inventory);

      case httpMethod === 'GET' && event.path.endsWith('/search'):
        // GET /api/inventory/search?q=query
        const query = queryStringParameters?.q;
        if (!query) {
          return createErrorResponse(400, 'Search query is required');
        }
        const results = await mockDataService.searchItems(query);
        return createSuccessResponse(results);

      case httpMethod === 'POST':
        // POST requests for add, update, delete, adjust
        const { action } = requestBody;

        if (!action && event.path.endsWith('/add')) {
          // POST /api/inventory/add
          const newItem = await mockDataService.addItem(requestBody);
          return {
            statusCode: 201,
            headers: {
              'Content-Type': 'application/json',
              'Access-Control-Allow-Origin': '*'
            },
            body: JSON.stringify({ success: true, data: newItem })
          };
        }

        if (!action && event.path.endsWith('/update')) {
          // POST /api/inventory/update
          const { id } = requestBody;
          const updateData = { ...requestBody };
          delete updateData.id;
          const updatedItem = await mockDataService.updateItem(id, updateData);
          return createSuccessResponse(updatedItem);
        }

        if (!action && event.path.endsWith('/delete')) {
          // POST /api/inventory/delete
          const { id } = requestBody;
          const result = await mockDataService.deleteItem(id);
          return createSuccessResponse(result);
        }

        if (!action && event.path.endsWith('/adjust')) {
          // POST /api/inventory/adjust
          const { id, adjustment } = requestBody;
          if (!id || adjustment === undefined) {
            return createErrorResponse(400, 'ID and adjustment are required');
          }
          const adjustedItem = await mockDataService.adjustQuantity(id, adjustment);
          return createSuccessResponse(adjustedItem);
        }

        // Handle action-based routing
        switch (action) {
          case 'add':
            const addedItem = await mockDataService.addItem(requestBody);
            return {
              statusCode: 201,
              headers: {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*'
              },
              body: JSON.stringify({ success: true, data: addedItem })
            };

          case 'update':
            const { id: updateId } = requestBody;
            const updateData = { ...requestBody };
            delete updateData.id;
            delete updateData.action;
            const updated = await mockDataService.updateItem(updateId, updateData);
            return createSuccessResponse(updated);

          case 'delete':
            const { id: deleteId } = requestBody;
            const deleted = await mockDataService.deleteItem(deleteId);
            return createSuccessResponse(deleted);

          case 'adjust':
            const { id: adjustId, adjustment: adjValue } = requestBody;
            if (!adjustId || adjValue === undefined) {
              return createErrorResponse(400, 'ID and adjustment are required');
            }
            const adjusted = await mockDataService.adjustQuantity(adjustId, adjValue);
            return createSuccessResponse(adjusted);

          default:
            return createErrorResponse(400, 'Invalid action');
        }

      default:
        return createErrorResponse(405, 'Method not allowed');
    }
  } catch (error) {
    console.error('Error in inventory function:', error);
    return createErrorResponse(500, error.message || 'Internal server error');
  }
};
