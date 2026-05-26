// Google Sheets Business Setup Script
// This script helps set up your Google Sheets with proper tabs for real business operations

const { google } = require('googleapis');
require('dotenv').config();

async function setupBusinessSheets() {
  try {
    // Authenticate with Google
    const auth = new google.auth.GoogleAuth({
      credentials: {
        client_email: process.env.GOOGLE_CLIENT_EMAIL,
        private_key: process.env.GOOGLE_PRIVATE_KEY.replace(/\\n/g, '\n'),
      },
      scopes: ['https://www.googleapis.com/auth/spreadsheets', 'https://www.googleapis.com/auth/drive']
    });

    const sheets = google.sheets({ version: 'v4', auth });
    const spreadsheetId = process.env.GOOGLE_SPREADSHEET_ID;

    console.log('🔧 Setting up your business Google Sheets...');
    console.log('📊 Spreadsheet ID:', spreadsheetId);

    // Get current sheets
    const spreadsheetInfo = await sheets.spreadsheets.get({
      spreadsheetId
    });

    console.log('📋 Current tabs:', spreadsheetInfo.data.sheets.map(s => s.properties.title).join(', '));

    // Required tabs for business operations
    const requiredTabs = [
      {
        name: 'Inventory',
        headers: ['ID', 'Name', 'SKU', 'Category', 'Brand', 'Quantity', 'MinLevel', 'UnitCost', 'SellingPrice', 'Supplier', 'LastMovement'],
        sampleData: [
          ['1', 'Bubble & Wax Shampoo', 'OS-BW-500', 'Cleaning', 'OSREN', 120, 50, 5.00, 8.50, 'Supplier A', '2025-01-15'],
          ['2', 'Luminous Paintwork Polish', 'OS-LP-200', 'Polishing', 'OSREN', 15, 40, 12.00, 18.00, 'Supplier B', '2025-01-10'],
          ['3', 'Tire Shine Gel', 'OS-TS-100', 'Wheels', 'OSREN', 200, 50, 3.50, 6.00, 'Supplier C', '2025-01-16']
        ]
      },
      {
        name: 'Orders',
        headers: ['OrderID', 'ClientName', 'Items', 'TotalItems', 'TotalAmount', 'Status', 'CreatedAt', 'DeliveryAddress', 'ContactNumber', 'Notes'],
        sampleData: [
          ['ORD-SAMPLE-001', 'Walk-in Customer', 'Bubble & Wax Shampoo (x2)', 2, 17.00, 'completed', '2025-01-15T10:30:00Z', 'Pickup at store', '012-3456789', '']
        ]
      }
    ];

    // Create missing tabs
    for (const tab of requiredTabs) {
      const existingTab = spreadsheetInfo.data.sheets.find(s => s.properties.title === tab.name);

      if (!existingTab) {
        console.log(`✅ Creating tab: ${tab.name}`);

        // Add new sheet
        await sheets.spreadsheets.batchUpdate({
          spreadsheetId,
          resource: {
            requests: [
              {
                addSheet: {
                  properties: {
                    title: tab.name,
                    gridProperties: {
                      rowCount: 1000,
                      columnCount: 20
                    }
                  }
                }
              }
            ]
          }
        });

        // Add headers
        await sheets.spreadsheets.values.update({
          spreadsheetId,
          range: `${tab.name}!A1:${String.fromCharCode(65 + tab.headers.length - 1)}1`,
          valueInputOption: 'RAW',
          resource: {
            values: [tab.headers]
          }
        });

        // Add sample data if Inventory tab
        if (tab.name === 'Inventory') {
          await sheets.spreadsheets.values.append({
            spreadsheetId,
            range: `${tab.name}!A:A`,
            valueInputOption: 'RAW',
            resource: {
              values: tab.sampleData
            }
          });
        }

        console.log(`✅ ${tab.name} tab created with headers`);
      } else {
        console.log(`ℹ️  ${tab.name} tab already exists`);
      }
    }

    // Give permission to service account (you need to do this manually in Google Sheets UI)
    console.log('\n📋 FINAL SETUP STEPS:');
    console.log('1. Open your Google Sheet:', `https://docs.google.com/spreadsheets/d/${spreadsheetId}`);
    console.log('2. Click "Share" button');
    console.log('3. Add this email as Editor:', process.env.GOOGLE_CLIENT_EMAIL);
    console.log('4. Make sure both "Inventory" and "Orders" tabs have data');
    console.log('\n✅ Your business Google Sheets is now ready for real operations!');

    console.log('\n📊 BUSINESS TABS CREATED:');
    console.log('• Inventory - Track your real products, stock levels, costs');
    console.log('• Orders - Track all customer orders automatically');
    console.log('\n💡 The app will now use REAL data for all business operations!');

  } catch (error) {
    console.error('❌ Error setting up Google Sheets:', error.message);
    console.error('Make sure your GOOGLE_PRIVATE_KEY is formatted correctly in .env file');
    process.exit(1);
  }
}

setupBusinessSheets();