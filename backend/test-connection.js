require('dotenv').config();
const googleSheetsService = require('./services/googleDriveService');

async function testConnection() {
  console.log('Testing Google Sheets connection...');

  // Check environment variables
  console.log('Environment variables:');
  console.log('GOOGLE_CLIENT_EMAIL:', process.env.GOOGLE_CLIENT_EMAIL ? '✅ Set' : '❌ Not set');
  console.log('GOOGLE_PRIVATE_KEY:', process.env.GOOGLE_PRIVATE_KEY ? '✅ Set (length: ' + process.env.GOOGLE_PRIVATE_KEY.length + ')' : '❌ Not set');
  console.log('GOOGLE_SPREADSHEET_ID:', process.env.GOOGLE_SPREADSHEET_ID ? '✅ Set' : '❌ Not set');

  if (!googleSheetsService.enabled) {
    console.log('❌ Google Sheets service is not enabled');
    console.log('Please check your environment variables');
    return;
  }

  console.log('✅ Google Sheets service is enabled');

  try {
    console.log('Attempting to read inventory from Google Sheets...');
    const inventory = await googleSheetsService.getInventory();
    console.log('✅ Successfully connected to Google Sheets!');
    console.log(`📊 Found ${inventory.length} items in inventory`);

    if (inventory.length > 0) {
      console.log('Sample item:', inventory[0]);
    }
  } catch (error) {
    console.log('❌ Failed to connect to Google Sheets');
    console.error('Error:', error.message);
  }
}

testConnection();