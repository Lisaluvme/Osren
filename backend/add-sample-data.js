require('dotenv').config({ path: __dirname + '/.env' });
const googleSheetsService = require('./services/googleDriveService');

async function addSampleData() {
  console.log('Adding sample inventory data to Google Sheets...');

  if (!googleSheetsService.enabled) {
    console.log('❌ Google Sheets service is not enabled');
    return;
  }

  const sampleInventory = [
    {
      name: 'Engine Oil 5W-30',
      sku: 'OIL-5W30-001',
      category: 'Lubricants',
      brand: 'Mobil 1',
      quantity: 45,
      minLevel: 10,
      unitCost: 25.50,
      sellingPrice: 38.00,
      supplier: 'AutoParts Distributor',
      lastMovement: '2026-05-20'
    },
    {
      name: 'Brake Pads Front',
      sku: 'BRK-FRD-002',
      category: 'Brakes',
      brand: 'Bosch',
      quantity: 8,
      minLevel: 15,
      unitCost: 45.00,
      sellingPrice: 65.00,
      supplier: 'BrakeMaster Inc',
      lastMovement: '2026-05-18'
    },
    {
      name: 'Air Filter Premium',
      sku: 'FLT-AIR-003',
      category: 'Filters',
      brand: 'K&N',
      quantity: 22,
      minLevel: 8,
      unitCost: 18.00,
      sellingPrice: 32.00,
      supplier: 'FilterPro Supply',
      lastMovement: '2026-05-22'
    },
    {
      name: 'Spark Plugs Set',
      sku: 'SPK-NGK-004',
      category: 'Ignition',
      brand: 'NGK',
      quantity: 3,
      minLevel: 12,
      unitCost: 8.50,
      sellingPrice: 18.00,
      supplier: 'IgnitionParts Co',
      lastMovement: '2026-05-15'
    },
    {
      name: 'Wiper Blades 22"',
      sku: 'WIP-22-005',
      category: 'Accessories',
      brand: 'Bosch',
      quantity: 18,
      minLevel: 6,
      unitCost: 12.00,
      sellingPrice: 22.00,
      supplier: 'VisionClear Auto',
      lastMovement: '2026-05-25'
    },
    {
      name: 'Coolant Antifreeze',
      sku: 'CLT-G12-006',
      category: 'Fluids',
      brand: 'Prestone',
      quantity: 12,
      minLevel: 8,
      unitCost: 15.00,
      sellingPrice: 28.00,
      supplier: 'Fluids Distributor',
      lastMovement: '2026-05-21'
    },
    {
      name: 'Car Shampoo Premium',
      sku: 'SHM-PRM-007',
      category: 'Cleaning',
      brand: 'Meguiars',
      quantity: 35,
      minLevel: 10,
      unitCost: 12.00,
      sellingPrice: 24.00,
      supplier: 'AutoCare Supplies',
      lastMovement: '2026-05-24'
    },
    {
      name: 'Microfiber Cloths (10pk)',
      sku: 'CLT-MFB-008',
      category: 'Cleaning',
      brand: 'Chemical Guys',
      quantity: 50,
      minLevel: 20,
      unitCost: 8.00,
      sellingPrice: 15.00,
      supplier: 'DetailingPro',
      lastMovement: '2026-05-23'
    }
  ];

  try {
    // Get current inventory first
    const currentInventory = await googleSheetsService.getInventory();
    console.log(`Current inventory count: ${currentInventory.length}`);

    // Add each item
    for (const item of sampleInventory) {
      await googleSheetsService.addItem(item);
      console.log(`✅ Added: ${item.name}`);
    }

    console.log('\n📊 Sample data added successfully!');
    console.log(`Total items in inventory: ${currentInventory.length + sampleInventory.length}`);

  } catch (error) {
    console.error('❌ Error adding sample data:', error.message);
  }
}

addSampleData();