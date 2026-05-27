const { google } = require('googleapis');

// Configure SSL for Google APIs
process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

class GoogleSheetsService {
  constructor() {
    // Cache configuration
    this.cache = {
      inventory: null,
      timestamp: 0,
      ttl: 30000 // 30 seconds cache
    };

    // Check if we should even try to initialize Google Sheets
    // Don't initialize if USE_MOCK_DATA is true
    this.enabled = !(
      process.env.USE_MOCK_DATA === 'true'
    );

    // Try to use GOOGLE_APPLICATION_CREDENTIALS environment variable first
    // Otherwise fall back to individual environment variables
    const credentialsPath = process.env.GOOGLE_APPLICATION_CREDENTIALS;

    this.enabled = this.enabled && !!(
      credentialsPath ||
      (process.env.GOOGLE_CLIENT_EMAIL && process.env.GOOGLE_PRIVATE_KEY)
    );

    if (this.enabled) {
      try {
        if (credentialsPath) {
          // Use credentials file (more compatible with Node.js v22)
          console.log('Using credentials file:', credentialsPath);
          this.auth = new google.auth.GoogleAuth({
            keyFile: credentialsPath,
            scopes: [
              'https://www.googleapis.com/auth/spreadsheets',
              'https://www.googleapis.com/auth/drive'
            ],
          });
        } else {
          // Fallback to environment variables
          console.log('Using environment variables for credentials');

          // Handle different private key formats
          let privateKey = process.env.GOOGLE_PRIVATE_KEY;

          if (!privateKey) {
            throw new Error('GOOGLE_PRIVATE_KEY is not set');
          }

          // Remove quotes if present
          if (privateKey.startsWith('"') && privateKey.endsWith('"')) {
            privateKey = privateKey.slice(1, -1);
          }

          // Convert literal \n to actual newlines
          privateKey = privateKey.replace(/\\n/g, '\n');

          console.log('Private key loaded, length:', privateKey.length);
          console.log('First 50 chars:', privateKey.substring(0, 50));

          // Validate private key format
          if (!privateKey.includes('BEGIN PRIVATE KEY') || !privateKey.includes('END PRIVATE KEY')) {
            throw new Error('Invalid private key format');
          }

          this.auth = new google.auth.GoogleAuth({
            credentials: {
              client_email: process.env.GOOGLE_CLIENT_EMAIL,
              private_key: privateKey,
            },
            scopes: [
              'https://www.googleapis.com/auth/spreadsheets',
              'https://www.googleapis.com/auth/drive'
            ],
          });
        }

        this.sheets = google.sheets({
          version: 'v4',
          auth: this.auth,
          httpOptions: {
            headers: {
              'User-Agent': 'osren-inventory-manager/1.0'
            }
          }
        });
        this.drive = google.drive({ version: 'v3', auth: this.auth });
        this.spreadsheetId = process.env.GOOGLE_SPREADSHEET_ID;
        this.range = 'Inventory!A:Z'; // Adjust range as needed

        console.log('Google Sheets service initialized successfully');
      } catch (error) {
        console.error('Failed to initialize GoogleSheetsService:', error.message);
        console.error('Full error details:', error);
        this.enabled = false;
      }
    } else {
      console.log('Google Sheets service disabled (Mock data mode enabled)');
    }
  }

  // Calculate derived fields
  calculateDerivedFields(item) {
    const profit = item.sellingPrice - item.unitCost;
    const stockValue = item.quantity * item.unitCost;
    const lowStockFlag = item.quantity < item.minLevel ? 1 : 0;

    return {
      ...item,
      profit,
      stockValue,
      lowStockFlag,
    };
  }

  async getInventory() {
    // Check cache first
    const now = Date.now();
    if (this.cache.inventory && (now - this.cache.timestamp) < this.cache.ttl) {
      console.log('Returning cached inventory');
      return this.cache.inventory;
    }

    try {
      const response = await this.sheets.spreadsheets.values.get({
        spreadsheetId: this.spreadsheetId,
        range: this.range,
      });

      const rows = response.data.values || [];
      if (rows.length === 0) {
        return [];
      }

      const headers = rows[0];
      const dataRows = rows.slice(1);

      const inventory = dataRows.map(row => {
        const item = {};
        headers.forEach((header, index) => {
          const value = row[index];
          const normalizedHeader = header.toLowerCase().trim();
          // Type conversion based on header
          switch (normalizedHeader) {
            case 'quantity':
            case 'minlevel':
              item[normalizedHeader] = parseInt(value || 0);
              break;
            case 'unitcost':
            case 'sellingprice':
            case 'profit':
            case 'stockvalue':
              item[normalizedHeader] = parseFloat(value || 0);
              break;
            case 'lowstockflag':
              item[normalizedHeader] = parseInt(value || 0);
              break;
            default:
              item[normalizedHeader] = value || '';
          }
        });

        // Map to standard format
        const inventoryItem = {
          id: item['id'] || '',
          name: item['name'] || '',
          sku: item['sku'] || '',
          category: item['category'] || '',
          brand: item['brand'] || '',
          quantity: item['quantity'] || 0,
          minLevel: item['minlevel'] || 10,
          unitCost: item['unitcost'] || 0,
          sellingPrice: item['sellingprice'] || 0,
          supplier: item['supplier'] || '',
          lastMovement: item['lastmovement'] || '',
        };

        return this.calculateDerivedFields(inventoryItem);
      });

      // Update cache
      this.cache.inventory = inventory;
      this.cache.timestamp = now;

      return inventory;
    } catch (error) {
      console.error('Error getting inventory:', error);
      throw error;
    }
  }

  // Invalidate cache when data changes
  invalidateCache() {
    this.cache.inventory = null;
    this.cache.timestamp = 0;
    console.log('Cache invalidated');
  }

  async updateInventory(inventory) {
    try {
      // Define headers
      const headers = [
        'ID', 'Name', 'SKU', 'Category', 'Brand', 'Quantity', 'MinLevel',
        'UnitCost', 'SellingPrice', 'Supplier', 'LastMovement'
      ];

      // Prepare data with core fields only (no calculated fields)
      const rows = inventory.map(item => {
        return [
          item.id || '',
          item.name || '',
          item.sku || '',
          item.category || '',
          item.brand || '',
          item.quantity || 0,
          item.minLevel || 10,
          item.unitCost || 0,
          item.sellingPrice || 0,
          item.supplier || '',
          item.lastMovement || '',
        ];
      });

      // Write headers and data
      const allData = [headers, ...rows];

      // Clear entire sheet and write fresh data with headers
      const clearRange = 'Inventory!A:Z';
      await this.sheets.spreadsheets.values.clear({
        spreadsheetId: this.spreadsheetId,
        range: clearRange,
      });

      // Write updated data with headers
      const dataRange = 'Inventory!A1:Z';
      await this.sheets.spreadsheets.values.update({
        spreadsheetId: this.spreadsheetId,
        range: dataRange,
        valueInputOption: 'RAW',
        resource: {
          values: allData,
        },
      });

      // Update cache with new data
      this.cache.inventory = inventory;
      this.cache.timestamp = Date.now();

      return { success: true, message: 'Inventory updated successfully' };
    } catch (error) {
      console.error('Error updating inventory:', error);
      throw error;
    }
  }

  async addItem(newItem) {
    try {
      const inventory = await this.getInventory();

      // Check for duplicate SKU
      const existingItem = inventory.find(item => item.sku === newItem.sku);
      if (existingItem) {
        throw new Error('Item with this SKU already exists');
      }

      // Generate new ID if not provided
      if (!newItem.id) {
        const maxId = inventory.length > 0 ? Math.max(...inventory.map(item => parseInt(item.id) || 0)) : 0;
        newItem.id = (maxId + 1).toString();
      }

      newItem.lastMovement = new Date().toISOString().split('T')[0];
      inventory.push(this.calculateDerivedFields(newItem));

      await this.updateInventory(inventory);
      return newItem;
    } catch (error) {
      console.error('Error adding item:', error);
      throw error;
    }
  }

  async updateItem(id, updateData) {
    try {
      const inventory = await this.getInventory();
      const itemIndex = inventory.findIndex(item => item.id === id);

      if (itemIndex === -1) {
        throw new Error('Item not found');
      }

      // Update item
      const updatedItem = { ...inventory[itemIndex], ...updateData };
      updatedItem.lastMovement = new Date().toISOString().split('T')[0];
      inventory[itemIndex] = this.calculateDerivedFields(updatedItem);

      await this.updateInventory(inventory);
      return inventory[itemIndex];
    } catch (error) {
      console.error('Error updating item:', error);
      throw error;
    }
  }

  async deleteItem(id) {
    try {
      const inventory = await this.getInventory();
      const filteredInventory = inventory.filter(item => item.id !== id);

      if (filteredInventory.length === inventory.length) {
        throw new Error('Item not found');
      }

      await this.updateInventory(filteredInventory);
      return { success: true, message: 'Item deleted successfully' };
    } catch (error) {
      console.error('Error deleting item:', error);
      throw error;
    }
  }

  async searchItems(query) {
    try {
      const inventory = await this.getInventory();

      const filteredItems = inventory.filter(item =>
        item.name.toLowerCase().includes(query.toLowerCase()) ||
        item.sku.toLowerCase().includes(query.toLowerCase()) ||
        item.category.toLowerCase().includes(query.toLowerCase()) ||
        item.brand.toLowerCase().includes(query.toLowerCase())
      );

      return filteredItems;
    } catch (error) {
      console.error('Error searching items:', error);
      throw error;
    }
  }

  // Optimized method to adjust quantity without full re-read
  async adjustQuantity(id, adjustment) {
    try {
      // Use cached inventory to avoid extra Google Sheets read
      let inventory = this.cache.inventory;

      // If cache is empty or stale, fetch fresh data
      if (!inventory || (Date.now() - this.cache.timestamp) >= this.cache.ttl) {
        inventory = await this.getInventory();
      }

      const itemIndex = inventory.findIndex(item => item.id === id);

      if (itemIndex === -1) {
        throw new Error('Item not found');
      }

      // Update quantity
      const newQuantity = Math.max(0, inventory[itemIndex].quantity + adjustment);
      inventory[itemIndex].quantity = newQuantity;
      inventory[itemIndex].lastMovement = new Date().toISOString().split('T')[0];
      inventory[itemIndex] = this.calculateDerivedFields(inventory[itemIndex]);

      // Update the sheet
      await this.updateInventory(inventory);

      return inventory[itemIndex];
    } catch (error) {
      console.error('Error adjusting quantity:', error);
      throw error;
    }
  }
}

module.exports = new GoogleSheetsService();
