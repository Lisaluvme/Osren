const { Bill } = require('../models');
const { asyncHandler, AppError } = require('../middleware/errorHandler');

function today() {
  return new Date().toISOString().split('T')[0];
}

function sanitize(b) {
  return {
    id: b.id,
    vendor_name: b.vendor_name,
    invoice_ref: b.invoice_ref,
    category: b.category,
    amount: Number(b.amount),
    issue_date: b.issue_date,
    due_date: b.due_date,
    status: b.status,
    payment_date: b.payment_date,
    payment_method: b.payment_method,
    notes: b.notes,
    created_by: b.created_by
  };
}

class BillController {
  list = asyncHandler(async (req, res) => {
    const bills = await Bill.findAll({ order: [['due_date', 'ASC']] });
    res.json({ success: true, data: bills.map(sanitize) });
  });

  create = asyncHandler(async (req, res) => {
    const { vendor_name, invoice_ref, category, amount, issue_date, due_date, notes } = req.body;
    if (!vendor_name || amount == null || !due_date) {
      throw new AppError('vendor_name, amount and due_date are required', 400);
    }
    const bill = await Bill.create({
      vendor_name,
      invoice_ref: invoice_ref || null,
      category: category || null,
      amount,
      issue_date: issue_date || null,
      due_date,
      notes: notes || null,
      status: 'pending',
      created_by: req.userId || null
    });
    res.status(201).json({ success: true, data: sanitize(bill) });
  });

  update = asyncHandler(async (req, res) => {
    const bill = await Bill.findByPk(req.params.id);
    if (!bill) throw new AppError('Bill not found', 404);

    const fields = [
      'vendor_name',
      'invoice_ref',
      'category',
      'amount',
      'issue_date',
      'due_date',
      'status',
      'payment_date',
      'payment_method',
      'notes'
    ];
    fields.forEach((f) => {
      if (req.body[f] !== undefined) bill[f] = req.body[f];
    });

    // Keep payment_date in sync with status.
    if (bill.status === 'paid' && !bill.payment_date) {
      bill.payment_date = req.body.payment_date || today();
    }
    if (bill.status === 'pending') {
      bill.payment_date = null;
    }

    await bill.save();
    res.json({ success: true, data: sanitize(bill) });
  });

  remove = asyncHandler(async (req, res) => {
    const bill = await Bill.findByPk(req.params.id);
    if (!bill) throw new AppError('Bill not found', 404);
    await bill.destroy();
    res.json({ success: true, data: { id: req.params.id } });
  });
}

module.exports = new BillController();
