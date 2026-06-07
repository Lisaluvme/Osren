require('dotenv').config({ path: __dirname + '/.env' });
const googleSheetsService = require('./services/googleDriveService');

async function addMoreProducts() {
  console.log('Adding more products with selling prices to Google Sheets...');

  if (!googleSheetsService.enabled) {
    console.log('❌ Google Sheets service is not enabled');
    return;
  }

  const moreProducts = [
    {
      name: 'Synthetic Motor Oil 10W-40',
      sku: 'OIL-10W40-101',
      category: 'Lubricants',
      brand: 'Castrol',
      quantity: 28,
      minLevel: 12,
      unitCost: 32.00,
      sellingPrice: 48.00,
      supplier: 'AutoParts Distributor',
      lastMovement: '2026-06-01'
    },
    {
      name: 'Brake Pads Rear Ceramic',
      sku: 'BRK-RR-CER-102',
      category: 'Brakes',
      brand: 'Brembo',
      quantity: 14,
      minLevel: 8,
      unitCost: 55.00,
      sellingPrice: 85.00,
      supplier: 'BrakeMaster Inc',
      lastMovement: '2026-06-02'
    },
    {
      name: 'Oil Filter Synthetic',
      sku: 'FLT-OIL-SYN-103',
      category: 'Filters',
      brand: 'Bosch',
      quantity: 42,
      minLevel: 15,
      unitCost: 14.50,
      sellingPrice: 28.00,
      supplier: 'FilterPro Supply',
      lastMovement: '2026-06-03'
    },
    {
      name: 'Fuel Injector Cleaner',
      sku: 'FLD-INJ-CLN-104',
      category: 'Fluids',
      brand: 'STP',
      quantity: 65,
      minLevel: 20,
      unitCost: 6.50,
      sellingPrice: 12.00,
      supplier: 'Fluids Distributor',
      lastMovement: '2026-06-04'
    },
    {
      name: 'LED Headlight Kit H11',
      sku: 'LGT-LED-H11-105',
      category: 'Lighting',
      brand: 'Philips',
      quantity: 8,
      minLevel: 6,
      unitCost: 45.00,
      sellingPrice: 79.00,
      supplier: 'LightingPro Inc',
      lastMovement: '2026-06-05'
    },
    {
      name: 'Car Battery 12V 60Ah',
      sku: 'BAT-12V-60AH-106',
      category: 'Electrical',
      brand: 'Varta',
      quantity: 5,
      minLevel: 4,
      unitCost: 85.00,
      sellingPrice: 145.00,
      supplier: 'BatteryWorld',
      lastMovement: '2026-06-06'
    },
    {
      name: 'Tire Inflator Digital',
      sku: 'ACC-TIR-INF-107',
      category: 'Accessories',
      brand: 'EPAuto',
      quantity: 18,
      minLevel: 8,
      unitCost: 22.00,
      sellingPrice: 38.00,
      supplier: 'AutoCare Supplies',
      lastMovement: '2026-06-07'
    },
    {
      name: 'Leather Conditioner',
      sku: 'CLT-LEA-CON-108',
      category: 'Cleaning',
      brand: 'Chemical Guys',
      quantity: 24,
      minLevel: 10,
      unitCost: 16.00,
      sellingPrice: 32.00,
      supplier: 'DetailingPro',
      lastMovement: '2026-06-07'
    },
    {
      name: 'Windshield Washer Fluid',
      sku: 'FLD-WSH-1GL-109',
      category: 'Fluids',
      brand: 'Rain-X',
      quantity: 85,
      minLevel: 25,
      unitCost: 3.50,
      sellingPrice: 8.00,
      supplier: 'Fluids Distributor',
      lastMovement: '2026-06-07'
    },
    {
      name: 'Car Wax Spray',
      sku: 'CLT-WAX-SPR-110',
      category: 'Cleaning',
      brand: 'Meguiars',
      quantity: 32,
      minLevel: 12,
      unitCost: 18.00,
      sellingPrice: 35.00,
      supplier: 'AutoCare Supplies',
      lastMovement: '2026-06-07'
    },
    {
      name: 'Floor Mats Universal',
      sku: 'ACC-MAT-UNV-111',
      category: 'Accessories',
      brand: 'WeatherTech',
      quantity: 15,
      minLevel: 6,
      unitCost: 28.00,
      sellingPrice: 55.00,
      supplier: 'InteriorPro',
      lastMovement: '2026-06-07'
    },
    {
      name: 'Transmission Fluid ATF',
      sku: 'FLD-ATF-DW-112',
      category: 'Fluids',
      brand: 'Valvoline',
      quantity: 22,
      minLevel: 10,
      unitCost: 12.00,
      sellingPrice: 24.00,
      supplier: 'Fluids Distributor',
      lastMovement: '2026-06-07'
    },
    {
      name: 'Spark Plug Wires Set',
      sku: 'IGN-WIRE-SET-113',
      category: 'Ignition',
      brand: 'NGK',
      quantity: 12,
      minLevel: 6,
      unitCost: 35.00,
      sellingPrice: 58.00,
      supplier: 'IgnitionParts Co',
      lastMovement: '2026-06-07'
    },
    {
      name: 'Car Cover Waterproof',
      sku: 'ACC-COV-H2O-114',
      category: 'Accessories',
      brand: 'Covercraft',
      quantity: 7,
      minLevel: 4,
      unitCost: 65.00,
      sellingPrice: 120.00,
      supplier: 'ExteriorPro',
      lastMovement: '2026-06-07'
    },
    {
      name: 'Brake Fluid DOT 4',
      sku: 'FLD-BRK-D4-115',
      category: 'Fluids',
      brand: 'Castrol',
      quantity: 38,
      minLevel: 15,
      unitCost: 8.50,
      sellingPrice: 18.00,
      supplier: 'Fluids Distributor',
      lastMovement: '2026-06-07'
    }
  ];

  try {
    // Get current inventory first
    const currentInventory = await googleSheetsService.getInventory();
    console.log(`Current inventory count: ${currentInventory.length}`);

    // Add each item
    let addedCount = 0;
    let skippedCount = 0;

    for (const item of moreProducts) {
      try {
        await googleSheetsService.addItem(item);
        console.log(`✅ Added: ${item.name} - $${item.sellingPrice}`);
        addedCount++;
      } catch (error) {
        if (error.message.includes('already exists')) {
          console.log(`⏭️  Skipped (already exists): ${item.name}`);
          skippedCount++;
        } else {
          console.log(`❌ Error adding ${item.name}: ${error.message}`);
        }
      }
    }

    console.log('\n📊 Summary:');
    console.log(`✅ Successfully added: ${addedCount} products`);
    console.log(`⏭️  Skipped (duplicates): ${skippedCount} products`);

    const finalInventory = await googleSheetsService.getInventory();
    console.log(`📦 Total items in inventory: ${finalInventory.length}`);

  } catch (error) {
    console.error('❌ Error adding products:', error.message);
  }
}

addMoreProducts();
