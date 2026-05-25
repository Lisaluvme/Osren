// Mock data service for local testing
// Simulates Google Sheets functionality with in-memory data

class MockDataService {
  constructor() {
    // Initialize with sample inventory data
    this.inventory = [
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
      },
      {
        id: '3',
        name: 'Mechanical Keyboard',
        sku: 'KEYB-003',
        category: 'Electronics',
        brand: 'Keychron',
        quantity: 3,
        minLevel: 5,
        unitCost: 45.00,
        sellingPrice: 89.99,
        supplier: 'Keyboard World',
        lastMovement: '2026-05-22',
        profit: 44.99,
        stockValue: 135.00,
        lowStockFlag: 1
      },
      {
        id: '4',
        name: 'Monitor Stand',
        sku: 'STAND-004',
        category: 'Accessories',
        brand: 'Amazon Basics',
        quantity: 22,
        minLevel: 8,
        unitCost: 15.00,
        sellingPrice: 29.99,
        supplier: 'Office Supplies Inc',
        lastMovement: '2026-05-19',
        profit: 14.99,
        stockValue: 330.00,
        lowStockFlag: 0
      },
      {
        id: '5',
        name: 'Webcam HD 1080p',
        sku: 'CAM-005',
        category: 'Electronics',
        brand: 'Logitech',
        quantity: 12,
        minLevel: 6,
        unitCost: 35.00,
        sellingPrice: 69.99,
        supplier: 'Tech Supplies Co',
        lastMovement: '2026-05-18',
        profit: 34.99,
        stockValue: 420.00,
        lowStockFlag: 0
      },
      {
        id: '6',
        name: 'Office Chair',
        sku: 'CHAIR-006',
        category: 'Furniture',
        brand: 'Herman Miller',
        quantity: 0,
        minLevel: 3,
        unitCost: 250.00,
        sellingPrice: 499.99,
        supplier: 'Furniture Direct',
        lastMovement: '2026-05-15',
        profit: 249.99,
        stockValue: 0.00,
        lowStockFlag: 1
      }
    ];

    this.enabled = true;
    console.log('Mock Data Service initialized with', this.inventory.length, 'items');
  }

  // Calculate derived fields
  calculateDerivedFields(item) {
    const profit = (item.sellingPrice || 0) - (item.unitCost || 0);
    const stockValue = (item.quantity || 0) * (item.unitCost || 0);
    const lowStockFlag = (item.quantity || 0) < (item.minLevel || 10) ? 1 : 0;

    return {
      ...item,
      profit,
      stockValue,
      lowStockFlag,
    };
  }

  async getInventory() {
    // Simulate network delay
    await this.delay(300);
    return this.inventory;
  }

  async getItemById(id) {
    const item = this.inventory.find(i => i.id === id);
    if (!item) {
      throw new Error('Item not found');
    }
    return item;
  }

  async addItem(newItem) {
    // Simulate network delay
    await this.delay(300);

    // Check for duplicate SKU
    const existingItem = this.inventory.find(item => item.sku === newItem.sku);
    if (existingItem) {
      throw new Error('Item with this SKU already exists');
    }

    // Generate new ID
    const maxId = this.inventory.length > 0 ? Math.max(...this.inventory.map(item => parseInt(item.id) || 0)) : 0;
    newItem.id = (maxId + 1).toString();
    newItem.lastMovement = new Date().toISOString().split('T')[0];

    // Add calculated fields
    const calculatedItem = this.calculateDerivedFields(newItem);
    this.inventory.push(calculatedItem);

    console.log('Added new item:', calculatedItem.name);
    return calculatedItem;
  }

  async updateItem(id, updateData) {
    // Simulate network delay
    await this.delay(300);

    const itemIndex = this.inventory.findIndex(item => item.id === id);
    if (itemIndex === -1) {
      throw new Error('Item not found');
    }

    // Update item
    const updatedItem = { ...this.inventory[itemIndex], ...updateData };
    updatedItem.lastMovement = new Date().toISOString().split('T')[0];

    // Recalculate derived fields
    this.inventory[itemIndex] = this.calculateDerivedFields(updatedItem);

    console.log('Updated item:', updatedItem.name);
    return this.inventory[itemIndex];
  }

  async deleteItem(id) {
    // Simulate network delay
    await this.delay(300);

    const itemIndex = this.inventory.findIndex(item => item.id === id);
    if (itemIndex === -1) {
      throw new Error('Item not found');
    }

    const deletedItem = this.inventory.splice(itemIndex, 1)[0];
    console.log('Deleted item:', deletedItem.name);

    return { success: true, message: 'Item deleted successfully' };
  }

  async searchItems(query) {
    // Simulate network delay
    await this.delay(200);

    const lowerQuery = query.toLowerCase();
    return this.inventory.filter(item =>
      item.name.toLowerCase().includes(lowerQuery) ||
      item.sku.toLowerCase().includes(lowerQuery) ||
      item.category.toLowerCase().includes(lowerQuery) ||
      item.brand.toLowerCase().includes(lowerQuery)
    );
  }

  // Helper method to simulate network delay
  delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

module.exports = new MockDataService();