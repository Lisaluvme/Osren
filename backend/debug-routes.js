const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');

// Load environment variables
dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json());

// Health check with detailed info
app.get('/api/health', (req, res) => {
  const envInfo = {
    googleClientEmail: !!process.env.GOOGLE_CLIENT_EMAIL,
    googlePrivateKey: !!process.env.GOOGLE_PRIVATE_KEY,
    googleSpreadsheetId: !!process.env.GOOGLE_SPREADSHEET_ID,
    useMockData: process.env.USE_MOCK_DATA
  };

  res.status(200).json({
    status: 'OK',
    message: 'Server is running',
    environment: envInfo
  });
});

// Simple inventory test endpoint
app.get('/api/inventory', async (req, res) => {
  try {
    const googleSheetsService = require('./services/googleDriveService');
    console.log('Google Sheets service enabled:', googleSheetsService.enabled);

    if (googleSheetsService.enabled) {
      const inventory = await googleSheetsService.getInventory();
      res.json({
        success: true,
        count: inventory.length,
        data: inventory
      });
    } else {
      res.status(503).json({
        error: 'Google Sheets service not enabled',
        message: 'Please check environment variables'
      });
    }
  } catch (error) {
    console.error('Error:', error.message);
    res.status(500).json({
      error: 'Failed to fetch inventory',
      message: error.message
    });
  }
});

app.listen(PORT, () => {
  console.log(`Debug server running on port ${PORT}`);
});