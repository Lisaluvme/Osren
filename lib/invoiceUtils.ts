import { Invoice, InvoiceItem } from '../types';

/**
 * Calculate line item total price
 */
export const calculateItemTotal = (item: InvoiceItem): number => {
  const subtotal = item.quantity * item.unitPrice;
  const itemDiscount = item.discount || 0;
  return subtotal - itemDiscount;
};

/**
 * Calculate invoice subtotal (sum of all line items)
 */
export const calculateSubtotal = (items: InvoiceItem[]): number => {
  return items.reduce((sum, item) => sum + calculateItemTotal(item), 0);
};

/**
 * Calculate tax amount based on subtotal and tax rate
 */
export const calculateTaxAmount = (subtotal: number, taxRate: number): number => {
  return subtotal * taxRate;
};

/**
 * Calculate discount amount
 */
export const calculateDiscountAmount = (subtotal: number, discountPercentage: number): number => {
  return subtotal * discountPercentage;
};

/**
 * Calculate final invoice amount
 */
export const calculateFinalAmount = (
  subtotal: number,
  taxAmount: number,
  discountAmount: number,
  shippingCharges: number = 0
): number => {
  return subtotal + taxAmount - discountAmount + shippingCharges;
};

/**
 * Format currency for display
 */
export const formatCurrency = (amount: number, currency: string = 'RM'): string => {
  return `${currency} ${amount.toFixed(2)}`;
};

/**
 * Format date for display
 */
export const formatDate = (dateString: string): string => {
  const date = new Date(dateString);
  return date.toLocaleDateString('en-MY', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });
};

/**
 * Generate invoice number
 */
export const generateInvoiceNumber = (invoiceId: string, date?: Date): string => {
  const invoiceDate = date || new Date();
  const year = invoiceDate.getFullYear();
  const month = String(invoiceDate.getMonth() + 1).padStart(2, '0');

  // Extract last 6 characters from ID for unique identifier
  const uniqueId = invoiceId.slice(-6).toUpperCase();

  return `INV-${year}-${month}-${uniqueId}`;
};

/**
 * Calculate aging (days overdue)
 */
export const calculateAging = (dueDate: string, status: string): number => {
  if (status === 'Paid' || status === 'Draft' || status === 'Cancelled') {
    return 0;
  }

  const today = new Date();
  const due = new Date(dueDate);
  const diffTime = today.getTime() - due.getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

  return diffDays > 0 ? diffDays : 0;
};

/**
 * Get aging category for reports
 */
export const getAgingCategory = (daysOverdue: number): string => {
  if (daysOverdue === 0) return 'Current';
  if (daysOverdue <= 30) return '1-30 Days';
  if (daysOverdue <= 60) return '31-60 Days';
  if (daysOverdue <= 90) return '61-90 Days';
  return '90+ Days';
};

/**
 * Check if invoice is overdue
 */
export const isOverdue = (dueDate: string, status: string): boolean => {
  if (status === 'Paid' || status === 'Draft' || status === 'Cancelled') {
    return false;
  }

  const today = new Date();
  const due = new Date(dueDate);
  return today > due;
};

/**
 * Calculate payment terms date
 */
export const calculatePaymentDueDate = (issueDate: string, terms: string): string => {
  const issue = new Date(issueDate);
  let daysToAdd = 30; // Default: Net 30

  // Parse payment terms
  const match = terms.match(/net\s*(\d+)/i);
  if (match) {
    daysToAdd = parseInt(match[1]);
  }

  const dueDate = new Date(issue);
  dueDate.setDate(dueDate.getDate() + daysToAdd);

  return dueDate.toISOString().split('T')[0];
};

/**
 * Standard payment terms
 */
export const PAYMENT_TERMS = [
  { value: 'Net 15', label: 'Net 15 Days', days: 15 },
  { value: 'Net 30', label: 'Net 30 Days', days: 30 },
  { value: 'Net 45', label: 'Net 45 Days', days: 45 },
  { value: 'Net 60', label: 'Net 60 Days', days: 60 },
  { value: 'Due on Receipt', label: 'Due on Receipt', days: 0 },
  { value: 'End of Month', label: 'End of Month (EOM)', days: 0 }
];

/**
 * Tax rates by region
 */
export const TAX_RATES = [
  { value: 0.00, label: '0% - No Tax' },
  { value: 0.06, label: '6% - SST (Malaysia)' },
  { value: 0.08, label: '8% - SST (Malaysia)' },
  { value: 0.10, label: '10% - GST' },
  { value: 0.20, label: '20% - VAT' }
];

/**
 * Complete invoice calculation
 */
export const calculateInvoice = (partialInvoice: Partial<Invoice>): Invoice => {
  const items = partialInvoice.items || [];
  const taxRate = partialInvoice.taxRate || 0;
  const discountPercentage = partialInvoice.discountPercentage || 0;
  const shippingCharges = partialInvoice.shippingCharges || 0;

  // Calculate all components
  const subtotal = calculateSubtotal(items);
  const taxAmount = calculateTaxAmount(subtotal, taxRate);
  const discountAmount = calculateDiscountAmount(subtotal, discountPercentage);
  const finalAmount = calculateFinalAmount(subtotal, taxAmount, discountAmount, shippingCharges);

  // Generate invoice number if not provided
  const invoiceNumber = partialInvoice.invoiceNumber ||
    generateInvoiceNumber(partialInvoice.id || '', partialInvoice.issueDate ? new Date(partialInvoice.issueDate) : undefined);

  // Calculate aging
  const dueDate = partialInvoice.dueDate || '';
  const status = partialInvoice.status || 'Pending';
  const aging = calculateAging(dueDate, status);

  return {
    ...partialInvoice,
    invoiceNumber,
    subtotal,
    taxRate,
    taxAmount,
    discountAmount,
    shippingCharges,
    finalAmount,
    aging,
    items: items.map(item => ({
      ...item,
      totalPrice: calculateItemTotal(item)
    }))
  } as Invoice;
};

/**
 * Calculate monthly revenue from invoices
 */
export const calculateMonthlyRevenue = (invoices: Invoice[], month: number, year: number): number => {
  return invoices
    .filter(inv => {
      if (!inv.paidDate) return false;
      const paidDate = new Date(inv.paidDate);
      return paidDate.getMonth() === month && paidDate.getFullYear() === year;
    })
    .reduce((sum, inv) => sum + (inv.finalAmount || inv.amount), 0);
};

/**
 * Calculate outstanding revenue (pending payments)
 */
export const calculateOutstandingRevenue = (invoices: Invoice[]): number => {
  return invoices
    .filter(inv => inv.status === 'Pending' || inv.status === 'Approved' || inv.status === 'Overdue')
    .reduce((sum, inv) => sum + (inv.finalAmount || inv.amount), 0);
};

/**
 * Calculate aging breakdown for reports
 */
export const calculateAgingBreakdown = (invoices: Invoice[]): Record<string, { count: number; amount: number }> => {
  const breakdown: Record<string, { count: number; amount: number }> = {
    'Current': { count: 0, amount: 0 },
    '1-30 Days': { count: 0, amount: 0 },
    '31-60 Days': { count: 0, amount: 0 },
    '61-90 Days': { count: 0, amount: 0 },
    '90+ Days': { count: 0, amount: 0 }
  };

  invoices.forEach(inv => {
    if (inv.status === 'Paid' || inv.status === 'Draft' || inv.status === 'Cancelled') return;

    const category = getAgingCategory(inv.aging || 0);
    const amount = inv.finalAmount || inv.amount;

    breakdown[category].count += 1;
    breakdown[category].amount += amount;
  });

  return breakdown;
};