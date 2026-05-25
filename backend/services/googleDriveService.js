const { google } = require('googleapis');

class GoogleSheetsService {
  constructor() {
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

          // Remove quotes if present
          if (privateKey.startsWith('"') && privateKey.endsWith('"')) {
            privateKey = privateKey.slice(1, -1);
          }

          // Convert literal \n to actual newlines
          privateKey = privateKey.replace(/\\n/g, '\n');

          console.log('Private key loaded, length:', privateKey.length);
          console.log('First 50 chars:', privateKey.substring(0, 50));

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

        this.sheets = google.sheets({ version: 'v4', auth: this.auth });
        this.drive = google.drive({ version: 'v3', auth: this.auth });
        this.spreadsheetId = process.env.GOOGLE_SPREADSHEET_ID;
        this.range = 'Inventory!A:Z'; // Adjust range as needed
      } catch (error) {
        console.error('Failed to initialize GoogleSheetsService:', error.message);
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
          // Type conversion based on header
          switch (header.toLowerCase()) {
            case 'quantity':
            case 'minlevel':
              item[header] = parseInt(value || 0);
              break;
            case 'unitcost':
            case 'sellingprice':
            case 'profit':
            case 'stockvalue':
              item[header] = parseFloat(value || 0);
              break;
            case 'lowstockflag':
              item[header] = parseInt(value || 0);
              break;
            default:
              item[header] = value || '';
          }
        });

        // Map to standard format
        const inventoryItem = {
          id: item['ID'] || item['id'] || '',
          name: item['Name'] || item['name'] || '',
          sku: item['SKU'] || item['sku'] || '',
          category: item['Category'] || item['category'] || '',
          brand: item['Brand'] || item['brand'] || '',
          quantity: item['Quantity'] || item['quantity'] || 0,
          minLevel: item['MinLevel'] || item['minLevel'] || 10,
          unitCost: item['UnitCost'] || item['unitCost'] || 0,
          sellingPrice: item['SellingPrice'] || item['sellingPrice'] || 0,
          supplier: item['Supplier'] || item['supplier'] || '',
          lastMovement: item['LastMovement'] || item['lastMovement'] || '',
        };

        return this.calculateDerivedFields(inventoryItem);
      });

      return inventory;
    } catch (error) {
      console.error('Error getting inventory:', error);
      throw error;
    }
  }

  async updateInventory(inventory) {
    try {
      // Prepare data with calculated fields
      const rows = inventory.map(item => {
        const calculated = this.calculateDerivedFields(item);
        return [
          calculated.id,
          calculated.name,
          calculated.sku,
          calculated.category,
          calculated.brand,
          calculated.quantity,
          calculated.minLevel,
          calculated.unitCost,
          calculated.sellingPrice,
          calculated.profit,
          calculated.stockValue,
          calculated.lowStockFlag,
          calculated.supplier,
          calculated.lastMovement,
        ];
      });

      // Clear existing data (except headers) and write new data
      const clearRange = 'Inventory!A2:Z1000'; // Adjust range as needed
      await this.sheets.spreadsheets.values.clear({
        spreadsheetId: this.spreadsheetId,
        range: clearRange,
      });

      // Write updated data
      const dataRange = 'Inventory!A2:Z';
      await this.sheets.spreadsheets.values.update({
        spreadsheetId: this.spreadsheetId,
        range: dataRange,
        valueInputOption: 'RAW',
        resource: {
          values: rows,
        },
      });

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
}

module.exports = new GoogleSheetsService();
