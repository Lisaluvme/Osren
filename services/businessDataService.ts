// Real business data service for operations
const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api';

export interface SalesData {
  period: string;
  revenue: number;
  orders: number;
  clients: number;
}

export interface InventoryMetrics {
  totalItems: number;
  lowStockItems: number;
  totalValue: number;
  outOfStock: number;
}

export interface BusinessMetrics {
  sales: SalesData[];
  inventory: InventoryMetrics;
  recentOrders: any[];
  revenue: number;
  expenses: number;
}

export const businessDataService = {
  // Get real business metrics from Google Sheets data
  async getBusinessMetrics(): Promise<BusinessMetrics> {
    try {
      // Fetch real inventory data
      const inventoryResponse = await fetch(`${API_BASE}/inventory/list`);
      const inventoryData = await inventoryResponse.json();

      // Fetch real orders data
      const ordersResponse = await fetch(`${API_BASE}/orders?limit=50`);
      const ordersData = await ordersResponse.json();

      if (!inventoryData.success || !ordersData.success) {
        throw new Error('Failed to fetch business data');
      }

      const inventory = inventoryData.data;
      const orders = ordersData.data;

      // Calculate real metrics from your data
      const totalValue = inventory.reduce((sum: number, item: any) =>
        sum + (item.quantity * item.unitCost), 0
      );

      const lowStockItems = inventory.filter((item: any) =>
        item.quantity < item.minLevel
      ).length;

      const outOfStock = inventory.filter((item: any) =>
        item.quantity === 0
      ).length;

      // Calculate real sales data from orders
      const monthlySales = this.calculateMonthlySales(orders);

      // Calculate real revenue/expenses
      const totalRevenue = orders
        .filter((order: any) => order.status !== 'cancelled')
        .reduce((sum: number, order: any) => sum + order.totalAmount, 0);

      const totalCost = orders.reduce((sum: number, order: any) => {
        const orderCost = order.items.reduce((itemSum: number, item: any) => {
          const inventoryItem = inventory.find((inv: any) => inv.name === item.name);
          return itemSum + (inventoryItem ? inventoryItem.unitCost * item.quantity : 0);
        }, 0);
        return sum + orderCost;
      }, 0);

      return {
        sales: monthlySales,
        inventory: {
          totalItems: inventory.length,
          lowStockItems,
          totalValue,
          outOfStock
        },
        recentOrders: orders.slice(0, 10),
        revenue: totalRevenue,
        expenses: totalCost
      };
    } catch (error) {
      console.error('Failed to fetch business metrics:', error);
      throw error;
    }
  },

  // Calculate real sales data from orders
  calculateMonthlySales(orders: any[]): SalesData[] {
    const monthlyData = new Map<string, { revenue: number; orders: number; clients: Set<string> }>();

    orders.forEach(order => {
      if (order.status === 'cancelled') return;

      const date = new Date(order.createdAt);
      const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;

      if (!monthlyData.has(monthKey)) {
        monthlyData.set(monthKey, { revenue: 0, orders: 0, clients: new Set() });
      }

      const data = monthlyData.get(monthKey)!;
      data.revenue += order.totalAmount;
      data.orders += 1;
      data.clients.add(order.clientName);
    });

    // Convert to array and format
    return Array.from(monthlyData.entries())
      .map(([period, data]) => ({
        period,
        revenue: data.revenue,
        orders: data.orders,
        clients: data.clients.size
      }))
      .sort((a, b) => a.period.localeCompare(b.period))
      .slice(-6); // Last 6 months
  },

  // Get real regional sales data from orders
  async getRegionalSales(): Promise<any[]> {
    try {
      const ordersResponse = await fetch(`${API_BASE}/orders?limit=100`);
      const ordersData = await ordersResponse.json();

      if (!ordersData.success) return [];

      const orders = ordersData.data;
      const regionalData = new Map<string, number>();

      // Extract postcode from delivery address and aggregate sales
      orders.forEach(order => {
        if (order.status === 'cancelled' || !order.deliveryAddress) return;

        // Extract postcode (assuming Malaysian format)
        const postcodeMatch = order.deliveryAddress.match(/\b(\d{5})\b/);
        if (postcodeMatch) {
          const postcode = postcodeMatch[1];
          regionalData.set(postcode, (regionalData.get(postcode) || 0) + order.totalAmount);
        }
      });

      return Array.from(regionalData.entries())
        .map(([region, sales]) => ({ region, sales }))
        .sort((a, b) => b.sales - a.sales)
        .slice(0, 10);
    } catch (error) {
      console.error('Failed to fetch regional sales:', error);
      return [];
    }
  },

  // Get real product mix from inventory and orders
  async getProductMix(): Promise<any[]> {
    try {
      const inventoryResponse = await fetch(`${API_BASE}/inventory/list`);
      const inventoryData = await inventoryResponse.json();

      if (!inventoryData.success) return [];

      const inventory = inventoryData.data;

      // Calculate product mix by category
      const categoryData = new Map<string, { value: number; count: number }>();

      inventory.forEach(item => {
        const category = item.category || 'Other';
        const value = item.quantity * item.unitCost;

        if (!categoryData.has(category)) {
          categoryData.set(category, { value: 0, count: 0 });
        }

        const data = categoryData.get(category)!;
        data.value += value;
        data.count += 1;
      });

      return Array.from(categoryData.entries())
        .map(([name, data]) => ({
          name,
          value: data.value,
          count: data.count
        }))
        .sort((a, b) => b.value - a.value);
    } catch (error) {
      console.error('Failed to fetch product mix:', error);
      return [];
    }
  }
};

export default businessDataService;