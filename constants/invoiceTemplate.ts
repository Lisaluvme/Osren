/**
 * Invoice Template Constants and Default Company Information
 * This file provides the default company information and template settings
 * for PDF invoice generation and printing.
 */

export interface CompanyInfo {
  name: string;
  logo?: string; // Base64 or URL
  address: string;
  phone: string;
  email: string;
  website?: string;
  registrationNumber?: string;
  taxId?: string;
  bankDetails?: {
    bankName: string;
    accountNumber: string;
    accountName: string;
  };
  terms: string[];
  footer: string;
}

// Default company info (can be overridden by user later)
export const DEFAULT_COMPANY_INFO: CompanyInfo = {
  name: 'GMP mobile sales app',
  address: '123 Business Street, City, Country',
  phone: '+60 12-345-6789',
  email: 'info@company.com',
  website: 'www.company.com',
  registrationNumber: '123456789-A',
  taxId: 'GST-123456789',
  bankDetails: {
    bankName: 'Example Bank',
    accountNumber: '1234567890',
    accountName: 'GMP mobile sales app'
  },
  terms: [
    '1. Payment is due within 30 days from the invoice date.',
    '2. Late payments may incur interest charges of 1.5% per month.',
    '3. Goods remain the property of the company until full payment is received.',
    '4. Please quote invoice number when making payment.',
    '5. Returns accepted within 14 days with original packaging.'
  ],
  footer: 'Thank you for your business!'
};

// Invoice template settings
export const INVOICE_TEMPLATE_SETTINGS = {
  // Page dimensions (A4)
  pageWidth: 210, // mm
  pageHeight: 297, // mm
  margin: 15, // mm

  // Font settings
  fontSize: {
    title: 24,
    heading: 16,
    body: 12,
    small: 10
  },

  // Colors
  colors: {
    primary: '#1e40af', // blue-800
    secondary: '#64748b', // slate-500
    accent: '#3b82f6', // blue-500
    success: '#10b981', // green-500
    warning: '#f59e0b', // amber-500
    error: '#ef4444' // red-500
  },

  // Layout settings
  table: {
    headerHeight: 8, // mm
    rowHeight: 7, // mm
    maxWidth: 180 // mm
  },

  // Section spacing
  spacing: {
    section: 10, // mm
    subsection: 5, // mm
    element: 2 // mm
  }
};

// Payment terms options
export const PAYMENT_TERMS_OPTIONS = [
  { value: 'Net 15', label: 'Net 15 Days', days: 15 },
  { value: 'Net 30', label: 'Net 30 Days', days: 30 },
  { value: 'Net 45', label: 'Net 45 Days', days: 45 },
  { value: 'Net 60', label: 'Net 60 Days', days: 60 },
  { value: 'Due on Receipt', label: 'Due on Receipt', days: 0 },
  { value: 'End of Month', label: 'End of Month (EOM)', days: 0 }
];

// Tax rates by region
export const TAX_RATES = [
  { value: 0.00, label: '0% - No Tax' },
  { value: 0.06, label: '6% - SST (Malaysia)' },
  { value: 0.08, label: '8% - SST (Malaysia)' },
  { value: 0.10, label: '10% - GST' },
  { value: 0.20, label: '20% - VAT' }
];

// Helper function to format currency
export const formatCurrency = (amount: number, currency: string = 'RM'): string => {
  return `${currency} ${amount.toFixed(2)}`;
};

// Helper function to format date
export const formatDate = (dateString: string): string => {
  const date = new Date(dateString);
  return date.toLocaleDateString('en-MY', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });
};

// Helper function to generate invoice number
export const generateInvoiceNumber = (invoiceId: string, date?: Date): string => {
  const invoiceDate = date || new Date();
  const year = invoiceDate.getFullYear();
  const month = String(invoiceDate.getMonth() + 1).padStart(2, '0');

  // Extract last 6 characters from ID for unique identifier
  const uniqueId = invoiceId.slice(-6).toUpperCase();

  return `INV-${year}-${month}-${uniqueId}`;
};