// This script helps format the Google private key correctly for environment variables
const fs = require('fs');

// Read the service account JSON file
const serviceAccountPath = process.env.GOOGLE_CREDENTIALS_PATH || './osren-app-22f398982544.json';

if (fs.existsSync(serviceAccountPath)) {
  const serviceAccount = JSON.parse(fs.readFileSync(serviceAccountPath, 'utf8'));

  console.log('=== GOOGLE SHEETS CREDENTIALS FOR RENDER ===\n');
  console.log('GOOGLE_CLIENT_EMAIL=' + serviceAccount.client_email);
  console.log('\nGOOGLE_PRIVATE_KEY=' + JSON.stringify(serviceAccount.private_key));
  console.log('\nGOOGLE_SPREADSHEET_ID=1EzXFasyQxlhhDUCwTbhSc_Zxdm077xNNVvzznw0gwgk');
  console.log('\nUSE_MOCK_DATA=false');
  console.log('\n=== INSTRUCTIONS ===');
  console.log('1. Copy each variable above into Render environment variables');
  console.log('2. For GOOGLE_PRIVATE_KEY, copy the ENTIRE line including quotes');
  console.log('3. Make sure there are no line breaks within the key itself');
} else {
  console.error('Service account file not found at:', serviceAccountPath);
}