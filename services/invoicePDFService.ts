/**
 * Invoice PDF Service
 * Handles PDF generation logic using jsPDF library
 */

import jsPDF from 'jspdf';
import { CompanyInfo, formatCurrency, formatDate, generateInvoiceNumber } from '../constants/invoiceTemplate';

// Enhanced invoice interface
export interface EnhancedInvoice {
  id: string;
  invoiceNumber?: string;
  clientName: string;
  clientAddress?: string;
  clientContact?: string;
  clientEmail?: string;
  amount: number;
  subtotal?: number;
  taxRate?: number;
  taxAmount?: number;
  discountAmount?: number;
  discountPercentage?: number;
  shippingCharges?: number;
  finalAmount?: number;
  dueDate: string;
  issueDate?: string;
  paidDate?: string;
  status: 'Pending' | 'Approved' | 'Paid' | 'Overdue' | 'Cancelled';
  paymentTerms?: string;
  items: Array<{
    name: string;
    description?: string;
    sku?: string;
    quantity: number;
    unitPrice: number;
    totalPrice?: number;
    discount?: number;
  }>;
  notes?: string;
  signature?: string; // Base64 signature data
  bankInfo?: {
    bankName: string;
    accountNumber: string;
    accountName: string;
    swiftCode?: string;
  };
  companyInfo?: CompanyInfo;
}

// Interface for totals calculation
interface Totals {
  subtotal: number;
  taxAmount: number;
  discountAmount: number;
  shippingCharges: number;
  finalAmount: number;
}

/**
 * Main PDF generation function
 */
export const generateInvoicePDF = async (
  invoice: EnhancedInvoice,
  companyInfo?: CompanyInfo
): Promise<void> => {
  try {
    const doc = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4'
    });

    const company = companyInfo || {
      name: 'GMP mobile sales app',
      address: '123 Business Street, City, Country',
      phone: '+60 12-345-6789',
      email: 'info@company.com',
      terms: ['Payment due within 30 days.'],
      footer: 'Thank you for your business!'
    };

    // Generate invoice number if not provided
    const invoiceNumber = invoice.invoiceNumber || generateInvoiceNumber(invoice.id, invoice.issueDate ? new Date(invoice.issueDate) : undefined);

    // Build PDF sequentially
    addHeader(doc, company);
    addInvoiceTitle(doc, invoiceNumber, invoice.status);
    addClientInfo(doc, invoice);
    addItemsTable(doc, invoice.items);
    addTotals(doc, invoice);
    addPaymentInfo(doc, invoice, company);
    addFooter(doc, company);

    // Save PDF
    doc.save(`Invoice-${invoiceNumber}.pdf`);
    console.log('✅ PDF generated successfully');
  } catch (error) {
    console.error('❌ Error generating PDF:', error);
    throw error;
  }
};

/**
 * Add company header to PDF
 */
const addHeader = (doc: jsPDF, companyInfo: CompanyInfo): void => {
  let yPos = 15;

  // Company name
  doc.setFontSize(20);
  doc.setTextColor(30, 64, 175); // blue-800
  doc.text(companyInfo.name, 15, yPos);
  yPos += 8;

  // Company address
  doc.setFontSize(10);
  doc.setTextColor(100, 116, 139); // slate-500
  companyInfo.address.split('\n').forEach(line => {
    doc.text(line, 15, yPos);
    yPos += 4;
  });
  yPos += 2;

  // Contact information
  if (companyInfo.phone) {
    doc.text(`Phone: ${companyInfo.phone}`, 15, yPos);
    yPos += 4;
  }
  if (companyInfo.email) {
    doc.text(`Email: ${companyInfo.email}`, 15, yPos);
    yPos += 4;
  }
  if (companyInfo.website) {
    doc.text(`Website: ${companyInfo.website}`, 15, yPos);
  }

  // Divider line
  doc.setDrawColor(226, 232, 240); // slate-200
  doc.setLineWidth(0.5);
  doc.line(15, yPos + 5, 195, yPos + 5);
};

/**
 * Add invoice title and number
 */
const addInvoiceTitle = (doc: jsPDF, invoiceNumber: string, status: string): void => {
  const yPos = 45;

  // INVOICE title
  doc.setFontSize(28);
  doc.setTextColor(30, 64, 175); // blue-800
  doc.text('INVOICE', 15, yPos);

  // Invoice number
  doc.setFontSize(12);
  doc.setTextColor(100, 116, 139); // slate-500
  doc.text(`#${invoiceNumber}`, 15, yPos + 8);

  // Status badge on the right side
  const statusColor = getStatusColor(status);
  doc.setTextColor(statusColor.r, statusColor.g, statusColor.b);
  doc.setFontSize(10);
  doc.text(status.toUpperCase(), 195, yPos, { align: 'right' });
};

/**
 * Add client information section
 */
const addClientInfo = (doc: jsPDF, invoice: EnhancedInvoice): void => {
  let yPos = 65;

  // Client information header
  doc.setFontSize(11);
  doc.setTextColor(30, 41, 59); // slate-800
  doc.text('Bill To:', 15, yPos);
  yPos += 6;

  // Client name
  doc.setFontSize(12);
  doc.setTextColor(15, 23, 42); // slate-900
  doc.text(invoice.clientName, 15, yPos);
  yPos += 6;

  // Client address
  doc.setFontSize(10);
  doc.setTextColor(100, 116, 139); // slate-500
  if (invoice.clientAddress) {
    invoice.clientAddress.split('\n').forEach(line => {
      doc.text(line, 15, yPos);
      yPos += 4;
    });
  }

  // Contact information
  yPos += 2;
  if (invoice.clientContact) {
    doc.text(`Phone: ${invoice.clientContact}`, 15, yPos);
    yPos += 4;
  }
  if (invoice.clientEmail) {
    doc.text(`Email: ${invoice.clientEmail}`, 15, yPos);
  }

  // Invoice dates on the right side
  yPos = 65;
  const rightColX = 120;

  // Issue date
  doc.setFontSize(10);
  doc.setTextColor(148, 163, 184); // slate-400
  doc.text('Issue Date:', rightColX, yPos);
  doc.setTextColor(15, 23, 42); // slate-900
  doc.text(invoice.issueDate ? formatDate(invoice.issueDate) : 'N/A', rightColX + 25, yPos);
  yPos += 6;

  // Due date
  doc.setTextColor(148, 163, 184); // slate-400
  doc.text('Due Date:', rightColX, yPos);
  doc.setTextColor(15, 23, 42); // slate-900
  doc.text(formatDate(invoice.dueDate), rightColX + 25, yPos);
  yPos += 6;

  // Payment terms
  if (invoice.paymentTerms) {
    doc.setTextColor(148, 163, 184); // slate-400
    doc.text('Payment Terms:', rightColX, yPos);
    doc.setTextColor(15, 23, 42); // slate-900
    doc.text(invoice.paymentTerms, rightColX + 25, yPos);
  }
};

/**
 * Add items table
 */
const addItemsTable = (doc: jsPDF, items: any[]): void => {
  const tableTop = 95;
  const rowHeight = 8;
  const colWidths = {
    description: 90,
    quantity: 20,
    unitPrice: 30,
    total: 35
  };

  // Table header
  let yPos = tableTop;
  doc.setFillColor(248, 250, 252); // slate-50
  doc.rect(15, yPos - 4, 180, rowHeight, 'F');
  yPos += rowHeight - 2;

  doc.setFontSize(10);
  doc.setTextColor(71, 85, 105); // slate-600
  doc.text('Description', 15, yPos);
  doc.text('Qty', 105, yPos, { align: 'center' });
  doc.text('Unit Price', 125, yPos, { align: 'right' });
  doc.text('Total', 155, yPos, { align: 'right' });

  // Divider line
  doc.setDrawColor(226, 232, 240); // slate-200
  doc.setLineWidth(0.3);
  doc.line(15, yPos + 2, 195, yPos + 2);
  yPos += 6;

  // Table rows
  doc.setTextColor(15, 23, 42); // slate-900
  items.forEach((item, index) => {
    // Check if we need a new page
    if (yPos > 250) {
      doc.addPage();
      yPos = 20;
    }

    // Item name
    doc.setFontSize(10);
    doc.text(item.name || 'Item', 15, yPos);

    // Quantity
    doc.text(String(item.quantity || 0), 105, yPos, { align: 'center' });

    // Unit price
    doc.text(formatCurrency(item.unitPrice || 0), 125, yPos, { align: 'right' });

    // Total price
    doc.setFontSize(10);
    doc.text(formatCurrency(item.totalPrice || (item.quantity * item.unitPrice)), 155, yPos, { align: 'right' });

    // Item description (if exists)
    if (item.description) {
      yPos += 4;
      doc.setFontSize(8);
      doc.setTextColor(100, 116, 139); // slate-500
      doc.text(item.description, 15, yPos);
      doc.setTextColor(15, 23, 42); // slate-900
    }

    // Divider line
    doc.setDrawColor(241, 245, 249); // slate-100
    doc.line(15, yPos + 2, 195, yPos + 2);
    yPos += rowHeight;
  });

  return yPos + 5;
};

/**
 * Add totals section
 */
const addTotals = (doc: jsPDF, invoice: EnhancedInvoice): void => {
  let yPos = 180;
  const rightColX = 140;

  // Calculate totals
  const subtotal = invoice.subtotal || invoice.amount;
  const taxAmount = invoice.taxAmount || 0;
  const discountAmount = invoice.discountAmount || 0;
  const shippingCharges = invoice.shippingCharges || 0;
  const finalAmount = invoice.finalAmount || invoice.amount;

  // Background for totals section
  doc.setFillColor(248, 250, 252); // slate-50
  doc.rect(120, yPos - 5, 75, 40, 'F');

  // Subtotal
  doc.setFontSize(10);
  doc.setTextColor(71, 85, 105); // slate-600
  doc.text('Subtotal:', rightColX, yPos);
  doc.setTextColor(15, 23, 42); // slate-900
  doc.text(formatCurrency(subtotal), 195, yPos, { align: 'right' });
  yPos += 6;

  // Tax
  if (taxAmount > 0) {
    doc.setTextColor(71, 85, 105); // slate-600
    doc.text(`Tax (${(invoice.taxRate! * 100).toFixed(0)}%):`, rightColX, yPos);
    doc.setTextColor(15, 23, 42); // slate-900
    doc.text(formatCurrency(taxAmount), 195, yPos, { align: 'right' });
    yPos += 6;
  }

  // Discount
  if (discountAmount > 0) {
    doc.setTextColor(34, 197, 94); // green-500
    doc.text('Discount:', rightColX, yPos);
    doc.text(`-${formatCurrency(discountAmount)}`, 195, yPos, { align: 'right' });
    yPos += 6;
  }

  // Shipping
  if (shippingCharges > 0) {
    doc.setTextColor(71, 85, 105); // slate-600
    doc.text('Shipping:', rightColX, yPos);
    doc.setTextColor(15, 23, 42); // slate-900
    doc.text(formatCurrency(shippingCharges), 195, yPos, { align: 'right' });
    yPos += 6;
  }

  // Total line
  doc.setDrawColor(30, 64, 175); // blue-800
  doc.setLineWidth(0.5);
  doc.line(138, yPos, 195, yPos);
  yPos += 6;

  doc.setFontSize(12);
  doc.setTextColor(30, 64, 175); // blue-800
  doc.setFont(undefined, 'bold');
  doc.text('TOTAL:', rightColX, yPos);
  doc.setFont(undefined, 'normal');
  doc.text(formatCurrency(finalAmount), 195, yPos, { align: 'right' });
};

/**
 * Add payment information section
 */
const addPaymentInfo = (doc: jsPDF, invoice: EnhancedInvoice, companyInfo: CompanyInfo): void => {
  let yPos = 230;

  // Payment information header
  doc.setFontSize(11);
  doc.setTextColor(30, 41, 59); // slate-800
  doc.text('Payment Information:', 15, yPos);

  // Bank details
  if (invoice.bankInfo || companyInfo.bankDetails) {
    yPos += 6;
    doc.setFontSize(10);
    doc.setTextColor(100, 116, 139); // slate-500

    const bankInfo = invoice.bankInfo || companyInfo.bankDetails!;
    doc.text(`Bank: ${bankInfo.bankName}`, 15, yPos);
    yPos += 4;
    doc.text(`Account Name: ${bankInfo.accountName}`, 15, yPos);
    yPos += 4;
    doc.text(`Account Number: ${bankInfo.accountNumber}`, 15, yPos);

    if (bankInfo.swiftCode) {
      yPos += 4;
      doc.text(`SWIFT Code: ${bankInfo.swiftCode}`, 15, yPos);
    }
  }

  // Signature (if exists)
  if (invoice.signature) {
    yPos = 230;
    doc.setFontSize(11);
    doc.setTextColor(30, 41, 59); // slate-800
    doc.text('Customer Signature:', 120, yPos);

    // Add signature image
    try {
      doc.addImage(invoice.signature, 'JPEG', 120, yPos + 5, 40, 20);
    } catch (error) {
      console.error('Error adding signature to PDF:', error);
      doc.setFontSize(9);
      doc.setTextColor(148, 163, 184); // slate-400
      doc.text('Signature available', 120, yPos + 10);
    }
  }
};

/**
 * Add footer section
 */
const addFooter = (doc: jsPDF, companyInfo: CompanyInfo): void => {
  const yPos = 280;

  // Terms and conditions
  if (companyInfo.terms && companyInfo.terms.length > 0) {
    doc.setFontSize(9);
    doc.setTextColor(100, 116, 139); // slate-500
    companyInfo.terms.forEach((term, index) => {
      doc.text(term, 15, yPos + (index * 3.5));
    });
  }

  // Footer text
  doc.setFontSize(9);
  doc.setTextColor(148, 163, 184); // slate-400
  doc.text(companyInfo.footer || 'Thank you for your business!', 15, 292);

  // Page border
  doc.setDrawColor(226, 232, 240); // slate-200
  doc.setLineWidth(0.5);
  doc.rect(10, 10, 190, 277);
};

/**
 * Get color for status badge
 */
const getStatusColor = (status: string): { r: number; g: number; b: number } => {
  switch (status.toLowerCase()) {
    case 'paid':
      return { r: 16, g: 185, b: 129 }; // green-500
    case 'approved':
      return { r: 59, g: 130, b: 246 }; // blue-500
    case 'overdue':
      return { r: 239, g: 68, b: 68 }; // red-500
    case 'cancelled':
      return { r: 107, g: 114, b: 128 }; // gray-500
    default:
      return { r: 245, g: 158, b: 11 }; // amber-500
  }
};

/**
 * Calculate totals from invoice items
 */
export const calculateTotals = (items: any[]): Totals => {
  const subtotal = items.reduce((sum, item) => sum + (item.totalPrice || item.quantity * item.unitPrice), 0);
  return {
    subtotal,
    taxAmount: 0,
    discountAmount: 0,
    shippingCharges: 0,
    finalAmount: subtotal
  };
};