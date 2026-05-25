const { google } = require('googleapis');
const crypto = require('crypto');

class GoogleOAuthService {
  constructor() {
    this.oauth2Client = new google.auth.OAuth2(
      process.env.GOOGLE_OAUTH_CLIENT_ID,
      process.env.GOOGLE_OAUTH_CLIENT_SECRET,
      process.env.GOOGLE_OAUTH_REDIRECT_URI
    );

    // Store access tokens in memory (in production, use Redis or database)
    this.accessTokens = new Map();
    this.refreshTokens = new Map();

    this.scopes = [
      'https://www.googleapis.com/auth/spreadsheets',
      'https://www.googleapis.com/auth/drive.readonly'
    ];
  }

  // Generate OAuth authorization URL
  getAuthUrl(state = null) {
    const authState = state || crypto.randomBytes(16).toString('hex');
    const authUrl = this.oauth2Client.generateAuthUrl({
      access_type: 'offline',
      scope: this.scopes,
      state: authState,
      prompt: 'consent' // Force consent to get refresh token
    });
    return { authUrl, state: authState };
  }

  // Exchange authorization code for access token
  async getToken(code) {
    try {
      const { tokens } = await this.oauth2Client.getToken(code);

      if (!tokens.access_token) {
        throw new Error('No access token received');
      }

      // Store tokens
      const tokenKey = tokens.access_token.substring(0, 20); // Use part of access token as key
      this.accessTokens.set(tokenKey, tokens.access_token);
      if (tokens.refresh_token) {
        this.refreshTokens.set(tokenKey, tokens.refresh_token);
      }

      return {
        access_token: tokens.access_token,
        refresh_token: tokens.refresh_token,
        expiry_date: tokens.expiry_date,
        token_key: tokenKey
      };
    } catch (error) {
      console.error('Error getting tokens:', error);
      throw error;
    }
  }

  // Set credentials for a request
  setCredentials(tokenKey) {
    const accessToken = this.accessTokens.get(tokenKey);
    if (!accessToken) {
      throw new Error('Invalid or expired token');
    }
    this.oauth2Client.setCredentials({
      access_token: accessToken
    });
  }

  // Refresh access token
  async refreshAccessToken(tokenKey) {
    const refreshToken = this.refreshTokens.get(tokenKey);
    if (!refreshToken) {
      throw new Error('No refresh token available');
    }

    this.oauth2Client.setCredentials({
      refresh_token: refreshToken
    });

    const { credentials } = await this.oauth2Client.refreshAccessToken();

    if (credentials.access_token) {
      this.accessTokens.set(tokenKey, credentials.access_token);
    }

    return credentials.access_token;
  }

  // Get sheets API client
  getSheetsClient(tokenKey) {
    this.setCredentials(tokenKey);
    return google.sheets({ version: 'v4', auth: this.oauth2Client });
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

  // Get inventory from Google Sheets
  async getInventory(tokenKey) {
    try {
      const sheets = this.getSheetsClient(tokenKey);
      const spreadsheetId = process.env.GOOGLE_SPREADSHEET_ID;
      const range = 'Inventory!A:Z';

      const response = await sheets.spreadsheets.values.get({
        spreadsheetId,
        range,
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
          const key = header.toLowerCase().replace(/\s+/g, '');
          // Type conversion
          switch (key) {
            case 'quantity':
            case 'minlevel':
              item[key] = parseInt(value || 0);
              break;
            case 'unitcost':
            case 'sellingprice':
              item[key] = parseFloat(value || 0);
              break;
            default:
              item[key] = value || '';
          }
        });

        // Map to standard format
        return {
          id: item.id || item.id || '',
          name: item.name || '',
          sku: item.sku || '',
          category: item.category || 'Uncategorized',
          brand: item.brand || '',
          quantity: item.quantity || 0,
          minLevel: item.minlevel || 10,
          unitCost: item.unitcost || 0,
          sellingPrice: item.sellingprice || 0,
          supplier: item.supplier || '',
          lastMovement: item.lastmovement || new Date().toISOString().split('T')[0],
        };
      });

      return inventory;
    } catch (error) {
      console.error('Error getting inventory:', error);
      throw error;
    }
  }

  // Update inventory in Google Sheets
  async updateInventory(tokenKey, inventory) {
    try {
      const sheets = this.getSheetsClient(tokenKey);
      const spreadsheetId = process.env.GOOGLE_SPREADSHEET_ID;

      // Prepare data
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
      await sheets.spreadsheets.values.clear({
        spreadsheetId,
        range: 'Inventory!A2:Z1000',
      });

      await sheets.spreadsheets.values.update({
        spreadsheetId,
        range: 'Inventory!A2',
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

  // Add item to inventory
  async addItem(tokenKey, newItem) {
    try {
      const inventory = await this.getInventory(tokenKey);

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
      inventory.push(newItem);

      await this.updateInventory(tokenKey, inventory);
      return newItem;
    } catch (error) {
      console.error('Error adding item:', error);
      throw error;
    }
  }

  // Update item
  async updateItem(tokenKey, id, updateData) {
    try {
      const inventory = await this.getInventory(tokenKey);
      const itemIndex = inventory.findIndex(item => item.id === id);

      if (itemIndex === -1) {
        throw new Error('Item not found');
      }

      const updatedItem = { ...inventory[itemIndex], ...updateData };
      updatedItem.lastMovement = new Date().toISOString().split('T')[0];
      inventory[itemIndex] = updatedItem;

      await this.updateInventory(tokenKey, inventory);
      return updatedItem;
    } catch (error) {
      console.error('Error updating item:', error);
      throw error;
    }
  }

  // Adjust item quantity
  async adjustQuantity(tokenKey, id, adjustment) {
    try {
      const inventory = await this.getInventory(tokenKey);
      const item = inventory.find(i => i.id === id);

      if (!item) {
        throw new Error('Item not found');
      }

      const newQuantity = Math.max(0, item.quantity + adjustment);
      return this.updateItem(tokenKey, id, {
        quantity: newQuantity,
        lastMovement: new Date().toISOString().split('T')[0]
      });
    } catch (error) {
      console.error('Error adjusting quantity:', error);
      throw error;
    }
  }

  // Verify token is valid
  async verifyToken(tokenKey) {
    try {
      const accessToken = this.accessTokens.get(tokenKey);
      if (!accessToken) {
        return false;
      }

      this.oauth2Client.setCredentials({
        access_token: accessToken
      });

      // Test token by making a simple API call
      const sheets = google.sheets({ version: 'v4', auth: this.oauth2Client });
      const spreadsheetId = process.env.GOOGLE_SPREADSHEET_ID;

      await sheets.spreadsheets.get({
        spreadsheetId,
        ranges: ['Inventory!A1']
      });

      return true;
    } catch (error) {
      // Token might be expired, try to refresh
      try {
        await this.refreshAccessToken(tokenKey);
        return true;
      } catch (refreshError) {
        console.error('Token verification failed:', refreshError);
        return false;
      }
    }
  }
}

module.exports = new GoogleOAuthService();
