export enum UserRole {
  ADMIN = 'admin',
  SALES = 'sales',
  DRIVER = 'driver',
  FINANCE = 'finance',
  WAREHOUSE = 'warehouse',
}

export interface Bill {
  id: string;
  vendor_name: string;
  invoice_ref: string | null;
  category: string | null;
  amount: number;
  issue_date: string | null;
  due_date: string;
  status: 'pending' | 'paid';
  payment_date: string | null;
  payment_method: string | null;
  notes: string | null;
}

export interface InventoryItem {
  id: string;
  name: string;
  sku: string;
  category: string;
  brand: string;
  quantity: number;
  minLevel: number;
  unitCost: number;
  sellingPrice: number;
  profit?: number; // Calculated: SellingPrice - UnitCost
  stockValue?: number; // Calculated: Quantity * UnitCost
  lowStockFlag?: number; // Calculated: IF(Quantity < MinLevel, 1, 0)
  supplier: string;
  lastMovement: string;
  imageUrl?: string; // URL to product image stored in Google Drive or cloud storage
  imageFileId?: string; // Google Drive file ID for the image
  // New product image fields
  image_url?: string; // Local upload image URL path
  image_thumbnail_url?: string; // Thumbnail image URL path
  has_image?: boolean; // Whether product has an uploaded image
}

export interface Invoice {
  id: string;
  invoiceNumber?: string; // Auto-generated invoice number (e.g., INV-2024-001)
  clientName: string;
  clientAddress?: string;
  clientContact?: string;
  clientEmail?: string;
  amount: number;
  subtotal?: number; // Before tax and discounts
  taxRate?: number; // Tax percentage (e.g., 0.06 for 6%)
  taxAmount?: number; // Calculated tax amount
  discountCode?: string; // Discount code applied
  discountAmount?: number; // Discount amount deducted
  discountPercentage?: number; // Discount percentage (e.g., 0.10 for 10%)
  shippingCharges?: number; // Shipping or delivery charges
  finalAmount?: number; // Final amount after all calculations
  dueDate: string;
  issueDate?: string; // When invoice was issued
  status: 'Pending' | 'Approved' | 'Paid' | 'Overdue' | 'Draft' | 'Cancelled';
  paymentTerms?: string; // Payment terms (e.g., 'Net 30', 'Due on Receipt')
  paymentMethod?: string; // How payment was made/will be made
  paidDate?: string; // When payment was received
  notes?: string; // Additional invoice notes
  items?: InvoiceItem[]; // Line items
  companyInfo?: CompanyInfo; // Your company details
  bankInfo?: BankInfo; // Bank details for payment
  aging?: number; // Days overdue (calculated)
  reminderSent?: boolean; // Payment reminder sent status
  reminderCount?: number; // Number of reminders sent
  createdAt?: string;
  updatedAt?: string;
}

export interface InvoiceItem {
  name: string;
  description?: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number; // quantity * unitPrice
  taxRate?: number; // Item-specific tax rate if different from invoice
  discount?: number; // Item-specific discount
  sku?: string; // Product SKU
}

export interface CompanyInfo {
  name: string;
  logo?: string; // URL to company logo
  address: string;
  contactNumber?: string;
  email?: string;
  website?: string;
  taxId?: string; // Company tax ID / registration number
  businessLicense?: string; // Business license number
}

export interface BankInfo {
  bankName: string;
  accountName: string;
  accountNumber: string;
  routingNumber?: string; // For international transfers
  swiftCode?: string; // For international transfers
  iban?: string; // International bank account number
}

export interface SalesOrder {
  id: string;
  clientName: string;
  items: { name: string; qty: number; price: number }[];
  total: number;
  status: 'SO' | 'DO' | 'Invoiced' | 'Delivered';
  signature?: string; // Data URL for signature
  date: string;
}

export interface DeliveryRoute {
  id: string;
  address: string;
  clientName: string;
  lat: number;
  lng: number;
  status: 'Pending' | 'In Transit' | 'Delivered';
  orderId: string;
}

export interface CashFlowData {
  month: string;
  revenue: number;
  expenses: number;
}

// Enhanced document types for workflow system
export interface WorkflowDocument extends Invoice {
  workflowStatus?: 'draft' | 'internal_review' | 'customer_acknowledgement' | 'approved' | 'completed' | 'rejected' | 'cancelled';
  assignedTo?: string;
  createdBy?: string;
  createdAt?: string;
  updatedAt?: string;
  approvedAt?: string;
  completedAt?: string;
  acknowledgedAt?: string;
  signatureData?: string;
}

export interface DocumentWorkflow {
  id: string;
  documentId: string;
  fromStatus: string;
  toStatus: string;
  transitionedBy: string;
  comments?: string;
  transitionedAt: string;
}

export interface CustomerAcknowledgement {
  id: string;
  documentId: string;
  customerName: string;
  action: 'approved' | 'rejected';
  signature?: string;
  comments?: string;
  timestamp: string;
}

export interface Notification {
  id: string;
  userId: string;
  type: string;
  title: string;
  message: string;
  relatedEntityType?: string;
  relatedEntityId?: string;
  isRead: boolean;
  readAt?: string;
  createdAt: string;
}

export interface AuditLog {
  id: string;
  entityType: string;
  entityId: string;
  action: string;
  performedBy: string;
  performedAt: string;
  oldValue?: any;
  newValue?: any;
  ipAddress?: string;
  metadata?: any;
}
