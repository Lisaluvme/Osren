require('dotenv').config({ path: __dirname + '/.env' });
const { google } = require('googleapis');

async function debugGoogleSheets() {
  try {
    // Read credentials from environment
    const privateKey = process.env.GOOGLE_PRIVATE_KEY.replace(/\\n/g, '\n');

    const auth = new google.auth.GoogleAuth({
      credentials: {
        client_email: process.env.GOOGLE_CLIENT_EMAIL,
        private_key: privateKey,
      },
      scopes: ['https://www.googleapis.com/auth/spreadsheets'],
    });

    const sheets = google.sheets({ version: 'v4', auth });
    const spreadsheetId = process.env.GOOGLE_SPREADSHEET_ID;

    console.log('🔍 Debugging Google Sheets...');
    console.log('Spreadsheet ID:', spreadsheetId);

    // Get sheet metadata
    const spreadsheet = await sheets.spreadsheets.get({
      spreadsheetId,
    });

    console.log('\n📋 Sheets in spreadsheet:');
    spreadsheet.data.sheets.forEach(sheet => {
      console.log(`  - ${sheet.properties.title} (ID: ${sheet.properties.sheetId})`);
    });

    // Get Inventory data
    console.log('\n📊 Reading Inventory sheet...');
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range: 'Inventory!A:Z',
    });

    const rows = response.data.values || [];
    console.log(`\nTotal rows: ${rows.length}`);

    if (rows.length > 0) {
      console.log('\n📝 Headers (Row 1):');
      console.log(JSON.stringify(rows[0], null, 2));

      if (rows.length > 1) {
        console.log('\n📦 Sample Data Row 2:');
        console.log(JSON.stringify(rows[1], null, 2));

        console.log('\n📦 Sample Data Row 3:');
        if (rows.length > 2) {
          console.log(JSON.stringify(rows[2], null, 2));
        }
      }
    }

  } catch (error) {
    console.error('❌ Error:', error.message);
    if (error.response) {
      console.error('Response data:', error.response.data);
    }
  }
}

debugGoogleSheets();