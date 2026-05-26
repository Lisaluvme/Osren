// Real data service for business operations
import { InventoryItem } from '../types';

const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api';

export const inventoryService = {
  // Fetch real inventory from backend
  async getInventory(): Promise<InventoryItem[]> {
    try {
      const response = await fetch(`${API_BASE}/inventory/list`);
      const data = await response.json();

      if (data.success) {
        return data.data;
      } else {
        console.error('Error fetching inventory:', data.error);
        return [];
      }
    } catch (error) {
      console.error('Failed to fetch inventory:', error);
      throw error;
    }
  },

  // Add item to inventory
  async addItem(item: Partial<InventoryItem>): Promise<InventoryItem> {
    try {
      const response = await fetch(`${API_BASE}/inventory/add`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(item)
      });
      const data = await response.json();

      if (data.success) {
        return data.data;
      } else {
        throw new Error(data.error);
      }
    } catch (error) {
      console.error('Failed to add item:', error);
      throw error;
    }
  },

  // Update inventory item
  async updateItem(id: string, updates: Partial<InventoryItem>): Promise<InventoryItem> {
    try {
      const response = await fetch(`${API_BASE}/inventory/update`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, ...updates })
      });
      const data = await response.json();

      if (data.success) {
        return data.data;
      } else {
        throw new Error(data.error);
      }
    } catch (error) {
      console.error('Failed to update item:', error);
      throw error;
    }
  },

  // Delete item from inventory
  async deleteItem(id: string): Promise<void> {
    try {
      const response = await fetch(`${API_BASE}/inventory/delete`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id })
      });
      const data = await response.json();

      if (!data.success) {
        throw new Error(data.error);
      }
    } catch (error) {
      console.error('Failed to delete item:', error);
      throw error;
    }
  },

  // Adjust item quantity
  async adjustQuantity(id: string, adjustment: number): Promise<InventoryItem> {
    try {
      const response = await fetch(`${API_BASE}/inventory/adjust`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, adjustment })
      });
      const data = await response.json();

      if (data.success) {
        return data.data;
      } else {
        throw new Error(data.error);
      }
    } catch (error) {
      console.error('Failed to adjust quantity:', error);
      throw error;
    }
  }
};

export default inventoryService;