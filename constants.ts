import { InventoryItem, Invoice, SalesOrder, DeliveryRoute, CashFlowData, UserRole } from './types';

export const MOCK_INVENTORY: InventoryItem[] = [
  { id: '1', name: 'Bubble & Wax Shampoo', sku: 'OS-BW-500', category: 'Cleaning', brand: 'OSREN', quantity: 120, minLevel: 50, unitCost: 5.00, sellingPrice: 8.50, supplier: 'Supplier A', lastMovement: '2023-10-25' },
  { id: '2', name: 'Luminous Paintwork Polish', sku: 'OS-LP-200', category: 'Polishing', brand: 'OSREN', quantity: 15, minLevel: 40, unitCost: 12.00, sellingPrice: 18.00, supplier: 'Supplier B', lastMovement: '2023-10-20' },
  { id: '3', name: 'Tire Shine Gel', sku: 'OS-TS-100', category: 'Wheels', brand: 'OSREN', quantity: 200, minLevel: 50, unitCost: 3.50, sellingPrice: 6.00, supplier: 'Supplier C', lastMovement: '2023-10-26' },
  { id: '4', name: 'Microfiber Towel (Blue)', sku: 'OS-MF-BLU', category: 'Accessories', brand: 'OSREN', quantity: 5, minLevel: 100, unitCost: 1.20, sellingPrice: 2.50, supplier: 'Supplier A', lastMovement: '2023-10-15' },
  { id: '5', name: 'Ceramic Coating Kit', sku: 'OS-CC-PRO', category: 'Protection', brand: 'OSREN', quantity: 8, minLevel: 10, unitCost: 45.00, sellingPrice: 75.00, supplier: 'Supplier D', lastMovement: '2023-10-10' },
];

export const MOCK_INVOICES: Invoice[] = [
  { id: 'INV-001', clientName: 'AutoSpa Elite', amount: 1250.00, dueDate: '2023-10-15', status: 'Overdue' },
  { id: 'INV-002', clientName: 'Detailing Bros', amount: 450.50, dueDate: '2023-10-28', status: 'Pending' },
  { id: 'INV-003', clientName: 'City Motors Service', amount: 3200.00, dueDate: '2023-10-01', status: 'Paid' },
  { id: 'INV-004', clientName: 'Luxury Rides', amount: 890.00, dueDate: '2023-10-30', status: 'Approved' },
];

export const MOCK_ORDERS: SalesOrder[] = [
  { id: 'SO-101', clientName: 'AutoSpa Elite', items: [{ name: 'Bubble & Wax', qty: 10, price: 25 }], total: 250, status: 'SO', date: '2023-10-26' },
  { id: 'SO-102', clientName: 'Detailing Bros', items: [{ name: 'Tire Shine', qty: 5, price: 15 }], total: 75, status: 'DO', date: '2023-10-25' },
];

export const MOCK_DELIVERIES: DeliveryRoute[] = [
  { id: 'DEL-01', clientName: 'AutoSpa Elite', address: '123 Shine Ave', lat: 3.1390, lng: 101.6869, status: 'Pending', orderId: 'SO-101' },
  { id: 'DEL-02', clientName: 'Detailing Bros', address: '45 Polish St', lat: 3.1579, lng: 101.7116, status: 'In Transit', orderId: 'SO-102' },
  { id: 'DEL-03', clientName: 'City Motors', address: '88 Engine Rd', lat: 3.0738, lng: 101.5183, status: 'Pending', orderId: 'SO-103' },
];

export const MOCK_CASHFLOW: CashFlowData[] = [
  { month: 'Jun', revenue: 45000, expenses: 30000 },
  { month: 'Jul', revenue: 52000, expenses: 32000 },
  { month: 'Aug', revenue: 48000, expenses: 28000 },
  { month: 'Sep', revenue: 61000, expenses: 40000 },
  { month: 'Oct', revenue: 55000, expenses: 35000 },
];

export const MENU_ITEMS = [
  { id: 'finance', label: 'Finance & Dashboard', icon: 'PieChart', roles: [UserRole.ADMIN, UserRole.FINANCE] },
  { id: 'accounts', label: 'Accounts (AP/AR)', icon: 'FileText', roles: [UserRole.ADMIN, UserRole.FINANCE] },
  { id: 'distribution', label: 'Distribution', icon: 'Workflow', roles: [UserRole.ADMIN, UserRole.SALES] },
  { id: 'warehouse', label: 'Warehouse', icon: 'Package', roles: [UserRole.ADMIN, UserRole.WAREHOUSE] },
  { id: 'sales', label: 'Sales & CRM', icon: 'Briefcase', roles: [UserRole.ADMIN, UserRole.SALES] },
  { id: 'delivery', label: 'Delivery', icon: 'Truck', roles: [UserRole.ADMIN, UserRole.DRIVER] },
  { id: 'chatbot', label: 'AI Assistant', icon: 'MessageSquare', roles: [UserRole.ADMIN, UserRole.SALES, UserRole.DRIVER, UserRole.FINANCE, UserRole.WAREHOUSE] },
  { id: 'settings', label: 'Settings', icon: 'Settings', roles: [UserRole.ADMIN] },
];
