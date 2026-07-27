const express = require('express');
const router = express.Router();

console.log('🔧 Finance routes initialized');

// Helper function to write to JSON file
const writeToFile = async (filePath, data) => {
  const fs = require('fs').promises;
  const path = require('path');

  try {
    // Ensure data directory exists
    const dataDir = path.join(__dirname, '../data');
    await fs.mkdir(dataDir, { recursive: true });

    // Write data to file
    await fs.writeFile(filePath, JSON.stringify(data, null, 2));
    return true;
  } catch (error) {
    console.error('Error writing to file:', error);
    throw error;
  }
};

// Helper function to read from JSON file
const readFromFile = async (filePath) => {
  const fs = require('fs').promises;
  const path = require('path');

  try {
    const fullPath = path.join(__dirname, filePath);
    const data = await fs.readFile(fullPath, 'utf8');
    return JSON.parse(data);
  } catch (error) {
    // File doesn't exist yet, return empty array
    return [];
  }
};

// Generate unique ID
const generateId = (prefix) => {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
};

// ==================== SUPPLIER INVOICE ENDPOINTS ====================

// POST /api/finance/supplier-invoice - Create supplier invoice
router.post('/supplier-invoice', async (req, res) => {
  try {
    const {
      grnId,
      grnNumber,
      supplier,
      invoiceDate,
      amount,
      remarks
    } = req.body;

    // Validate required fields
    if (!grnId || !supplier || !invoiceDate || !amount) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: grnId, supplier, invoiceDate, amount'
      });
    }

    // Generate invoice number
    const today = new Date();
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, '0');
    const day = String(today.getDate()).padStart(2, '0');
    const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
    const invoiceNumber = `SUP-INV-${year}${month}${day}-${random}`;

    // Create supplier invoice record
    const supplierInvoice = {
      id: generateId('sup-inv'),
      invoiceNumber,
      grnId,
      grnNumber,
      supplier: supplier.trim(),
      invoiceDate,
      amount: parseFloat(amount),
      paymentStatus: 'PENDING',
      remarks: remarks ? remarks.trim() : undefined,
      createdAt: new Date().toISOString()
    };

    // Store in JSON file
    const filePath = '../data/supplier-invoices.json';
    const existingInvoices = await readFromFile(filePath);
    existingInvoices.push(supplierInvoice);
    await writeToFile(path.join(__dirname, filePath), existingInvoices);

    res.status(201).json({
      success: true,
      data: supplierInvoice,
      message: `Supplier invoice ${invoiceNumber} created successfully`
    });
  } catch (error) {
    console.error('Error creating supplier invoice:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to create supplier invoice: ' + error.message
    });
  }
});

// GET /api/finance/supplier-invoices - Get all supplier invoices
router.get('/supplier-invoices', async (req, res) => {
  try {
    const invoices = await readFromFile('../data/supplier-invoices.json');

    // Sort by date descending (newest first)
    invoices.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

    res.status(200).json({
      success: true,
      data: invoices
    });
  } catch (error) {
    console.error('Error fetching supplier invoices:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch supplier invoices'
    });
  }
});

// GET /api/finance/supplier-invoices/:id - Get single supplier invoice
router.get('/supplier-invoices/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const invoices = await readFromFile('../data/supplier-invoices.json');
    const invoice = invoices.find(inv => inv.id === id);

    if (!invoice) {
      return res.status(404).json({
        success: false,
        error: 'Supplier invoice not found'
      });
    }

    res.status(200).json({
      success: true,
      data: invoice
    });
  } catch (error) {
    console.error('Error fetching supplier invoice:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch supplier invoice'
    });
  }
});

// GET /api/finance/supplier-invoices/grn/:grnId - Get invoices by GRN
router.get('/supplier-invoices/grn/:grnId', async (req, res) => {
  try {
    const { grnId } = req.params;
    const invoices = await readFromFile('../data/supplier-invoices.json');
    const grnInvoices = invoices.filter(inv => inv.grnId === grnId);

    res.status(200).json({
      success: true,
      data: grnInvoices
    });
  } catch (error) {
    console.error('Error fetching invoices by GRN:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch invoices by GRN'
    });
  }
});

// ==================== PAYMENT VOUCHER ENDPOINTS ====================

// POST /api/finance/payment-voucher - Create payment voucher
router.post('/payment-voucher', async (req, res) => {
  try {
    const {
      date,
      supplier,
      supplierInvoiceId,
      invoiceNumber,
      amountPaid,
      paymentMethod,
      remarks
    } = req.body;

    // Validate required fields
    if (!supplier || !supplierInvoiceId || !invoiceNumber || !amountPaid || !paymentMethod) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: supplier, supplierInvoiceId, invoiceNumber, amountPaid, paymentMethod'
      });
    }

    // Generate voucher number
    const today = new Date();
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, '0');
    const day = String(today.getDate()).padStart(2, '0');
    const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
    const voucherNumber = `PV-${year}${month}${day}-${random}`;

    // Get supplier invoice details for outstanding amount
    const invoiceFilePath = '../data/supplier-invoices.json';
    const invoices = await readFromFile(invoiceFilePath);
    const supplierInvoice = invoices.find(inv => inv.id === supplierInvoiceId);

    if (!supplierInvoice) {
      return res.status(404).json({
        success: false,
        error: 'Supplier invoice not found'
      });
    }

    // Calculate outstanding amount
    const existingVouchers = await readFromFile('../data/payment-vouchers.json');
    const previousPayments = existingVouchers
      .filter(v => v.supplierInvoiceId === supplierInvoiceId && v.status !== 'draft')
      .reduce((sum, v) => sum + v.amountPaid, 0);
    const outstandingAmount = supplierInvoice.amount - previousPayments;

    // Validate payment amount doesn't exceed outstanding
    if (parseFloat(amountPaid) > outstandingAmount) {
      return res.status(400).json({
        success: false,
        error: `Payment amount (${amountPaid}) cannot exceed outstanding amount (${outstandingAmount})`
      });
    }

    // Create payment voucher record with enhanced fields
    const paymentVoucher = {
      id: generateId('pv'),
      voucherNumber,
      date: date || new Date().toISOString().split('T')[0],
      supplier: supplier.trim(),
      supplierInvoiceId,
      invoiceNumber,
      invoiceAmount: supplierInvoice.amount,
      outstandingAmount: outstandingAmount - parseFloat(amountPaid),
      amountPaid: parseFloat(amountPaid),
      paymentMethod,
      bankAccountId: req.body.bankAccountId || null,
      referenceNo: req.body.referenceNo || null,
      remarks: remarks ? remarks.trim() : undefined,
      status: req.body.status || 'draft',
      attachments: req.body.attachments || [],
      createdAt: new Date().toISOString()
    };

    // Store payment voucher
    const voucherFilePath = '../data/payment-vouchers.json';
    const existingVouchers = await readFromFile(voucherFilePath);
    existingVouchers.push(paymentVoucher);
    await writeToFile(path.join(__dirname, voucherFilePath), existingVouchers);

    // Update supplier invoice status based on payment completion
    const invoiceFilePath = '../data/supplier-invoices.json';
    const invoices = await readFromFile(invoiceFilePath);
    const invoiceIndex = invoices.findIndex(inv => inv.id === supplierInvoiceId);

    if (invoiceIndex !== -1) {
      // Calculate total payments including this one
      const allVouchers = [...existingVouchers, paymentVoucher];
      const finalPayments = allVouchers.filter(v =>
        v.supplierInvoiceId === supplierInvoiceId && v.status !== 'draft'
      );
      const totalPaid = finalPayments.reduce((sum, v) => sum + v.amountPaid, 0);

      // Update status based on payment completion
      if (totalPaid >= invoices[invoiceIndex].amount) {
        invoices[invoiceIndex].paymentStatus = 'PAID';
      } else if (totalPaid > 0) {
        invoices[invoiceIndex].paymentStatus = 'PARTIAL';
      }
      invoices[invoiceIndex].updatedAt = new Date().toISOString();
      await writeToFile(path.join(__dirname, invoiceFilePath), invoices);
    }

    res.status(201).json({
      success: true,
      data: paymentVoucher,
      message: `Payment voucher ${voucherNumber} created successfully. Invoice ${invoiceNumber} marked as PAID.`
    });
  } catch (error) {
    console.error('Error creating payment voucher:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to create payment voucher: ' + error.message
    });
  }
});

// GET /api/finance/payment-vouchers - Get all payment vouchers
router.get('/payment-vouchers', async (req, res) => {
  try {
    const vouchers = await readFromFile('../data/payment-vouchers.json');

    // Sort by date descending (newest first)
    vouchers.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

    res.status(200).json({
      success: true,
      data: vouchers
    });
  } catch (error) {
    console.error('Error fetching payment vouchers:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch payment vouchers'
    });
  }
});

// GET /api/finance/payment-vouchers/:id - Get single payment voucher
router.get('/payment-vouchers/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const vouchers = await readFromFile('../data/payment-vouchers.json');
    const voucher = vouchers.find(v => v.id === id);

    if (!voucher) {
      return res.status(404).json({
        success: false,
        error: 'Payment voucher not found'
      });
    }

    res.status(200).json({
      success: true,
      data: voucher
    });
  } catch (error) {
    console.error('Error fetching payment voucher:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch payment voucher'
    });
  }
});

// PUT /api/finance/payment-vouchers/:id - Update payment voucher
router.put('/payment-vouchers/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const {
      date,
      supplier,
      supplierInvoiceId,
      invoiceNumber,
      amountPaid,
      paymentMethod,
      bankAccountId,
      referenceNo,
      remarks,
      status,
      attachments
    } = req.body;

    const voucherFilePath = '../data/payment-vouchers.json';
    const vouchers = await readFromFile(voucherFilePath);
    const voucherIndex = vouchers.findIndex(v => v.id === id);

    if (voucherIndex === -1) {
      return res.status(404).json({
        success: false,
        error: 'Payment voucher not found'
      });
    }

    // Update voucher fields
    const updatedVoucher = {
      ...vouchers[voucherIndex],
      date: date || vouchers[voucherIndex].date,
      supplier: supplier ? supplier.trim() : vouchers[voucherIndex].supplier,
      supplierInvoiceId: supplierInvoiceId || vouchers[voucherIndex].supplierInvoiceId,
      invoiceNumber: invoiceNumber || vouchers[voucherIndex].invoiceNumber,
      amountPaid: amountPaid ? parseFloat(amountPaid) : vouchers[voucherIndex].amountPaid,
      paymentMethod: paymentMethod || vouchers[voucherIndex].paymentMethod,
      bankAccountId: bankAccountId || vouchers[voucherIndex].bankAccountId,
      referenceNo: referenceNo || vouchers[voucherIndex].referenceNo,
      remarks: remarks ? remarks.trim() : vouchers[voucherIndex].remarks,
      status: status || vouchers[voucherIndex].status || 'draft',
      attachments: attachments || vouchers[voucherIndex].attachments || [],
      updatedAt: new Date().toISOString()
    };

    vouchers[voucherIndex] = updatedVoucher;
    await writeToFile(path.join(__dirname, voucherFilePath), vouchers);

    // If status is 'paid' or 'approved', update supplier invoice
    if (updatedVoucher.status === 'paid' || updatedVoucher.status === 'approved') {
      const invoiceFilePath = '../data/supplier-invoices.json';
      const invoices = await readFromFile(invoiceFilePath);
      const invoiceIndex = invoices.findIndex(inv => inv.id === supplierInvoiceId);

      if (invoiceIndex !== -1) {
        // Check if fully paid
        const allPayments = vouchers.filter(v =>
          v.supplierInvoiceId === supplierInvoiceId &&
          (v.status === 'paid' || v.status === 'approved')
        );
        const totalPaid = allPayments.reduce((sum, v) => sum + v.amountPaid, 0);

        if (totalPaid >= invoices[invoiceIndex].amount) {
          invoices[invoiceIndex].paymentStatus = 'PAID';
        } else {
          invoices[invoiceIndex].paymentStatus = 'PARTIAL';
        }
        invoices[invoiceIndex].updatedAt = new Date().toISOString();
        await writeToFile(path.join(__dirname, invoiceFilePath), invoices);
      }
    }

    res.status(200).json({
      success: true,
      data: updatedVoucher,
      message: 'Payment voucher updated successfully'
    });
  } catch (error) {
    console.error('Error updating payment voucher:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update payment voucher: ' + error.message
    });
  }
});

// DELETE /api/finance/payment-vouchers/:id - Delete payment voucher (draft only)
router.delete('/payment-vouchers/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const voucherFilePath = '../data/payment-vouchers.json';
    const vouchers = await readFromFile(voucherFilePath);
    const voucherIndex = vouchers.findIndex(v => v.id === id);

    if (voucherIndex === -1) {
      return res.status(404).json({
        success: false,
        error: 'Payment voucher not found'
      });
    }

    // Only allow deletion of draft vouchers
    if (vouchers[voucherIndex].status && vouchers[voucherIndex].status !== 'draft') {
      return res.status(400).json({
        success: false,
        error: 'Can only delete draft vouchers'
      });
    }

    vouchers.splice(voucherIndex, 1);
    await writeToFile(path.join(__dirname, voucherFilePath), vouchers);

    res.status(200).json({
      success: true,
      message: 'Payment voucher deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting payment voucher:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to delete payment voucher: ' + error.message
    });
  }
});

// GET /api/finance/payment-vouchers/draft - Get draft payment vouchers
router.get('/payment-vouchers/draft', async (req, res) => {
  try {
    const vouchers = await readFromFile('../data/payment-vouchers.json');
    const draftVouchers = vouchers.filter(v => !v.status || v.status === 'draft');

    // Sort by date descending (newest first)
    draftVouchers.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

    res.status(200).json({
      success: true,
      data: draftVouchers
    });
  } catch (error) {
    console.error('Error fetching draft payment vouchers:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch draft payment vouchers'
    });
  }
});

// ==================== RECEIPT COLLECTION ENDPOINTS ====================

// POST /api/finance/receipt-collection - Create receipt collection
router.post('/receipt-collection', async (req, res) => {
  try {
    const {
      date,
      customer,
      customerInvoiceId,
      invoiceNumber,
      amountReceived,
      paymentMethod,
      remarks
    } = req.body;

    // Validate required fields
    if (!customer || !customerInvoiceId || !invoiceNumber || !amountReceived || !paymentMethod) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: customer, customerInvoiceId, invoiceNumber, amountReceived, paymentMethod'
      });
    }

    // Get customer invoice/order details for outstanding amount
    let customerInvoice = null;
    let invoiceAmount = 0;

    try {
      const ordersResponse = await fetch(`http://localhost:5000/api/orders/${customerInvoiceId}`);
      const ordersResult = await ordersResponse.json();

      if (ordersResult.success) {
        customerInvoice = ordersResult.data;
        invoiceAmount = customerInvoice.totalAmount || 0;
      }
    } catch (error) {
      console.log('Note: Could not fetch customer invoice details');
    }

    // Calculate outstanding amount
    const existingReceipts = await readFromFile('../data/receipt-collections.json');
    const previousReceipts = existingReceipts
      .filter(r => r.customerInvoiceId === customerInvoiceId && r.status !== 'draft')
      .reduce((sum, r) => sum + r.amountReceived, 0);
    const outstandingAmount = invoiceAmount - previousReceipts;

    // Validate receipt amount doesn't exceed outstanding
    if (customerInvoice && parseFloat(amountReceived) > outstandingAmount) {
      return res.status(400).json({
        success: false,
        error: `Receipt amount (${amountReceived}) cannot exceed outstanding amount (${outstandingAmount})`
      });
    }

    // Generate receipt number
    const today = new Date();
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, '0');
    const day = String(today.getDate()).padStart(2, '0');
    const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
    const receiptNumber = `RC-${year}${month}${day}-${random}`;

    // Create receipt collection record with enhanced fields
    const receiptCollection = {
      id: generateId('rc'),
      receiptNumber,
      date: date || new Date().toISOString().split('T')[0],
      customer: customer.trim(),
      customerInvoiceId,
      invoiceNumber,
      invoiceAmount: invoiceAmount,
      outstandingAmount: outstandingAmount - parseFloat(amountReceived),
      amountReceived: parseFloat(amountReceived),
      paymentMethod,
      bankAccountId: req.body.bankAccountId || null,
      referenceNo: req.body.referenceNo || null,
      remarks: remarks ? remarks.trim() : undefined,
      status: req.body.status || 'draft',
      attachments: req.body.attachments || [],
      createdAt: new Date().toISOString()
    };

    // Store receipt collection
    const receiptFilePath = '../data/receipt-collections.json';
    const existingReceipts = await readFromFile(receiptFilePath);
    existingReceipts.push(receiptCollection);
    await writeToFile(path.join(__dirname, receiptFilePath), existingReceipts);

    // Note: Customer invoice status update would be handled by the existing order/invoice system
    // This is a placeholder for that integration

    res.status(201).json({
      success: true,
      data: receiptCollection,
      message: `Receipt collection ${receiptNumber} created successfully`
    });
  } catch (error) {
    console.error('Error creating receipt collection:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to create receipt collection: ' + error.message
    });
  }
});

// GET /api/finance/receipt-collections - Get all receipt collections
router.get('/receipt-collections', async (req, res) => {
  try {
    const receipts = await readFromFile('../data/receipt-collections.json');

    // Sort by date descending (newest first)
    receipts.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

    res.status(200).json({
      success: true,
      data: receipts
    });
  } catch (error) {
    console.error('Error fetching receipt collections:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch receipt collection'
    });
  }
});

// GET /api/finance/receipt-collections/:id - Get single receipt collection
router.get('/receipt-collections/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const receipts = await readFromFile('../data/receipt-collections.json');
    const receipt = receipts.find(r => r.id === id);

    if (!receipt) {
      return res.status(404).json({
        success: false,
        error: 'Receipt collection not found'
      });
    }

    res.status(200).json({
      success: true,
      data: receipt
    });
  } catch (error) {
    console.error('Error fetching receipt collection:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch receipt collection'
    });
  }
});

// PUT /api/finance/receipt-collections/:id - Update receipt collection
router.put('/receipt-collections/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const {
      date,
      customer,
      customerInvoiceId,
      invoiceNumber,
      amountReceived,
      paymentMethod,
      bankAccountId,
      referenceNo,
      remarks,
      status,
      attachments
    } = req.body;

    const receiptFilePath = '../data/receipt-collections.json';
    const receipts = await readFromFile(receiptFilePath);
    const receiptIndex = receipts.findIndex(r => r.id === id);

    if (receiptIndex === -1) {
      return res.status(404).json({
        success: false,
        error: 'Receipt collection not found'
      });
    }

    // Update receipt fields
    const updatedReceipt = {
      ...receipts[receiptIndex],
      date: date || receipts[receiptIndex].date,
      customer: customer ? customer.trim() : receipts[receiptIndex].customer,
      customerInvoiceId: customerInvoiceId || receipts[receiptIndex].customerInvoiceId,
      invoiceNumber: invoiceNumber || receipts[receiptIndex].invoiceNumber,
      amountReceived: amountReceived ? parseFloat(amountReceived) : receipts[receiptIndex].amountReceived,
      paymentMethod: paymentMethod || receipts[receiptIndex].paymentMethod,
      bankAccountId: bankAccountId || receipts[receiptIndex].bankAccountId,
      referenceNo: referenceNo || receipts[receiptIndex].referenceNo,
      remarks: remarks ? remarks.trim() : receipts[receiptIndex].remarks,
      status: status || receipts[receiptIndex].status || 'draft',
      attachments: attachments || receipts[receiptIndex].attachments || [],
      updatedAt: new Date().toISOString()
    };

    receipts[receiptIndex] = updatedReceipt;
    await writeToFile(path.join(__dirname, receiptFilePath), receipts);

    // If status is 'deposited' or 'approved', update customer invoice/order status
    if (updatedReceipt.status === 'deposited' || updatedReceipt.status === 'approved') {
      try {
        // Update the order status to 'paid'
        const ordersResponse = await fetch(`http://localhost:5000/api/orders/${customerInvoiceId}`);
        const ordersResult = await ordersResponse.json();

        if (ordersResult.success) {
          // Check if fully paid
          const allReceipts = receipts.filter(r =>
            r.customerInvoiceId === customerInvoiceId &&
            (r.status === 'deposited' || r.status === 'approved')
          );
          const totalReceived = allReceipts.reduce((sum, r) => sum + r.amountReceived, 0);

          if (totalReceived >= ordersResult.data.totalAmount) {
            // Update order status to paid
            await fetch(`http://localhost:5000/api/orders/${customerInvoiceId}`, {
              method: 'PATCH',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ status: 'paid' })
            });
          }
        }
      } catch (orderError) {
        console.log('Note: Could not update order status:', orderError.message);
      }
    }

    res.status(200).json({
      success: true,
      data: updatedReceipt,
      message: 'Receipt collection updated successfully'
    });
  } catch (error) {
    console.error('Error updating receipt collection:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update receipt collection: ' + error.message
    });
  }
});

// DELETE /api/finance/receipt-collections/:id - Delete receipt collection (draft only)
router.delete('/receipt-collections/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const receiptFilePath = '../data/receipt-collections.json';
    const receipts = await readFromFile(receiptFilePath);
    const receiptIndex = receipts.findIndex(r => r.id === id);

    if (receiptIndex === -1) {
      return res.status(404).json({
        success: false,
        error: 'Receipt collection not found'
      });
    }

    // Only allow deletion of draft receipts
    if (receipts[receiptIndex].status && receipts[receiptIndex].status !== 'draft') {
      return res.status(400).json({
        success: false,
        error: 'Can only delete draft receipts'
      });
    }

    receipts.splice(receiptIndex, 1);
    await writeToFile(path.join(__dirname, receiptFilePath), receipts);

    res.status(200).json({
      success: true,
      message: 'Receipt collection deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting receipt collection:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to delete receipt collection: ' + error.message
    });
  }
});

// GET /api/finance/receipt-collections/draft - Get draft receipt collections
router.get('/receipt-collections/draft', async (req, res) => {
  try {
    const receipts = await readFromFile('../data/receipt-collections.json');
    const draftReceipts = receipts.filter(r => !r.status || r.status === 'draft');

    // Sort by date descending (newest first)
    draftReceipts.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

    res.status(200).json({
      success: true,
      data: draftReceipts
    });
  } catch (error) {
    console.error('Error fetching draft receipt collections:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch draft receipt collections'
    });
  }
});

// ==================== OUTSTANDING INVOICES ENDPOINTS ====================

// GET /api/finance/supplier-invoices/outstanding - Get supplier invoices with outstanding balances
router.get('/supplier-invoices/outstanding', async (req, res) => {
  try {
    const invoices = await readFromFile('../data/supplier-invoices.json');
    const vouchers = await readFromFile('../data/payment-vouchers.json');

    // Calculate outstanding amounts for each invoice
    const outstandingInvoices = invoices.map(invoice => {
      const paidAmount = vouchers
        .filter(v => v.supplierInvoiceId === invoice.id && v.status !== 'draft')
        .reduce((sum, v) => sum + v.amountPaid, 0);

      return {
        ...invoice,
        invoiceAmount: invoice.amount,
        paidAmount: paidAmount,
        outstandingAmount: invoice.amount - paidAmount,
        paymentStatus: paidAmount >= invoice.amount ? 'PAID' :
                       paidAmount > 0 ? 'PARTIAL' : 'PENDING'
      };
    }).filter(inv => inv.paymentStatus !== 'PAID'); // Only return unpaid invoices

    // Sort by date descending
    outstandingInvoices.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

    res.status(200).json({
      success: true,
      data: outstandingInvoices
    });
  } catch (error) {
    console.error('Error fetching outstanding supplier invoices:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch outstanding supplier invoices'
    });
  }
});

// GET /api/finance/customer-invoices/outstanding - Get customer invoices with outstanding balances
router.get('/customer-invoices/outstanding', async (req, res) => {
  try {
    // Fetch customer orders
    const ordersResponse = await fetch('http://localhost:5000/api/orders');
    const ordersResult = await ordersResponse.json();
    const orders = ordersResult.success ? ordersResult.data : [];

    // Fetch receipt collections
    const receipts = await readFromFile('../data/receipt-collections.json');

    // Calculate outstanding amounts for each order
    const outstandingOrders = orders.map(order => {
      const receivedAmount = receipts
        .filter(r => r.customerInvoiceId === order.id && r.status !== 'draft')
        .reduce((sum, r) => sum + r.amountReceived, 0);

      return {
        id: order.id,
        invoiceNumber: order.id, // Use order ID as invoice number
        customer: order.clientName,
        customerInvoiceId: order.id,
        invoiceAmount: order.totalAmount || 0,
        receivedAmount: receivedAmount,
        outstandingAmount: (order.totalAmount || 0) - receivedAmount,
        paymentStatus: receivedAmount >= (order.totalAmount || 0) ? 'PAID' :
                       receivedAmount > 0 ? 'PARTIAL' : 'PENDING',
        createdAt: order.createdAt,
        items: order.items,
        deliveryAddress: order.deliveryAddress,
        contactNumber: order.contactNumber
      };
    }).filter(order => order.paymentStatus !== 'PAID'); // Only return unpaid orders

    // Sort by date descending
    outstandingOrders.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

    res.status(200).json({
      success: true,
      data: outstandingOrders
    });
  } catch (error) {
    console.error('Error fetching outstanding customer invoices:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch outstanding customer invoices'
    });
  }
});

// GET /api/finance/payment-history/:entityId/:entityType - Get payment history
router.get('/payment-history/:entityId/:entityType', async (req, res) => {
  try {
    const { entityId, entityType } = req.params;

    if (entityType === 'supplier') {
      // Get payment vouchers for supplier
      const vouchers = await readFromFile('../data/payment-vouchers.json');
      const supplierVouchers = vouchers.filter(v => v.supplierInvoiceId === entityId);

      res.status(200).json({
        success: true,
        data: supplierVouchers
      });
    } else if (entityType === 'customer') {
      // Get receipt collections for customer
      const receipts = await readFromFile('../data/receipt-collections.json');
      const customerReceipts = receipts.filter(r => r.customerInvoiceId === entityId);

      res.status(200).json({
        success: true,
        data: customerReceipts
      });
    } else {
      res.status(400).json({
        success: false,
        error: 'Invalid entity type. Use "supplier" or "customer"'
      });
    }
  } catch (error) {
    console.error('Error fetching payment history:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch payment history'
    });
  }
});

// ==================== DASHBOARD SUMMARY ENDPOINT ====================

// GET /api/finance/dashboard-summary - Get dashboard summary data
router.get('/dashboard-summary', async (req, res) => {
  try {
    // Fetch inventory data
    const inventoryResponse = await fetch('http://localhost:5000/api/inventory/list');
    const inventoryResult = await inventoryResponse.json();
    const inventory = inventoryResult.success ? inventoryResult.data : [];

    // Calculate inventory metrics
    const totalItems = inventory.length;
    const totalStockQuantity = inventory.reduce((sum, item) => sum + (item.quantity || 0), 0);
    const lowStockItems = inventory.filter(item => item.quantity <= item.minLevel).length;

    // Calculate finance metrics
    const supplierInvoices = await readFromFile('../data/supplier-invoices.json');
    const outstandingSupplierPayment = supplierInvoices
      .filter(inv => inv.paymentStatus === 'PENDING')
      .reduce((sum, inv) => sum + inv.amount, 0);

    // For customer outstanding, we'll use orders data (simplified)
    const ordersResponse = await fetch('http://localhost:5000/api/orders');
    const ordersResult = await ordersResponse.json();
    const orders = ordersResult.success ? ordersResult.data : [];
    const customerOutstandingAmount = orders
      .filter(order => ['pending', 'processing'].includes(order.status.toLowerCase()))
      .reduce((sum, order) => sum + (order.totalAmount || 0), 0);

    // Calculate total received payments
    const receiptCollections = await readFromFile('../data/receipt-collections.json');
    const totalReceivedPayment = receiptCollections.reduce((sum, rc) => sum + rc.amountReceived, 0);

    res.status(200).json({
      success: true,
      data: {
        inventory: {
          totalItems,
          totalStockQuantity,
          lowStockItems
        },
        finance: {
          outstandingSupplierPayment,
          customerOutstandingAmount,
          totalReceivedPayment
        }
      }
    });
  } catch (error) {
    console.error('Error fetching dashboard summary:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch dashboard summary: ' + error.message
    });
  }
});

module.exports = router;
