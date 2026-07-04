export interface CompanySettings {
  name: string;
  address: string;
  phone: string;
  email: string;
  website?: string;
  registrationNumber?: string;
  taxId?: string;
  logo?: string;
  footer: string;
}

export interface PDFStyleSettings {
  primaryColor: string;
  secondaryColor: string;
  accentColor: string;
  textColor: string;
  fontSize: number;
  fontFamily: string;
  showLogo: boolean;
  showSignature: boolean;
  showWatermark: boolean;
  watermarkText?: string;
}

export interface InvoiceSettings extends CompanySettings {
  prefix: string;
  startingNumber: number;
  paymentTerms: string;
  notes: string;
}

export interface DeliveryOrderSettings extends CompanySettings {
  prefix: string;
  requireSignature: boolean;
  showContactInfo: boolean;
  deliveryInstructions: string;
}

export interface ReceiptSettings extends CompanySettings {
  prefix: string;
  showPaymentMethod: boolean;
  showTransactionId: boolean;
  thankYouMessage: string;
}

export interface AppSettings {
  company: CompanySettings;
  pdfStyles: PDFStyleSettings;
  invoice: InvoiceSettings;
  deliveryOrder: DeliveryOrderSettings;
  receipt: ReceiptSettings;
  lastUpdated: string;
}

export const defaultSettings: AppSettings = {
  company: {
    name: 'GMP mobile sales app',
    address: '123 Business Street, City, Country',
    phone: '+60 12-345-6789',
    email: 'info@company.com',
    website: 'www.company.com',
    registrationNumber: '123456789-A',
    taxId: 'GST-123456789',
    footer: 'Thank you for your business!'
  },
  pdfStyles: {
    primaryColor: '#1e40af',
    secondaryColor: '#3b82f6',
    accentColor: '#10b981',
    textColor: '#1e293b',
    fontSize: 10,
    fontFamily: 'Helvetica',
    showLogo: true,
    showSignature: true,
    showWatermark: false,
    watermarkText: 'DRAFT'
  },
  invoice: {
    ...defaultCompanySettings(),
    prefix: 'INV',
    startingNumber: 1001,
    paymentTerms: 'Payment due within 30 days',
    notes: 'Thank you for your business!'
  },
  deliveryOrder: {
    ...defaultCompanySettings(),
    prefix: 'DO',
    requireSignature: true,
    showContactInfo: true,
    deliveryInstructions: 'Please verify all items and sign upon delivery.'
  },
  receipt: {
    ...defaultCompanySettings(),
    prefix: 'RCT',
    showPaymentMethod: true,
    showTransactionId: true,
    thankYouMessage: 'Thank you for your payment!'
  },
  lastUpdated: new Date().toISOString()
};

function defaultCompanySettings(): CompanySettings {
  return {
    name: 'GMP mobile sales app',
    address: '123 Business Street, City, Country',
    phone: '+60 12-345-6789',
    email: 'info@company.com',
    website: 'www.company.com',
    registrationNumber: '123456789-A',
    taxId: 'GST-123456789',
    footer: 'Thank you for your business!'
  };
}
