export enum UserRole {
  ADMIN = 'Admin/Management',
  ACCOUNTS = 'Accounts Officer',
  SALES = 'Sales Rep',
  WAREHOUSE = 'Warehouse Manager',
  DRIVER = 'Logistics/Driver',
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
}

export interface Invoice {
  id: string;
  clientName: string;
  amount: number;
  dueDate: string;
  status: 'Pending' | 'Approved' | 'Paid' | 'Overdue';
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
