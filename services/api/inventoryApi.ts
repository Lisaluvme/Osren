const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api';

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
  supplier: string;
  lastMovement: string;
  profit?: number;
  stockValue?: number;
  lowStockFlag?: number;
}

class InventoryApiService {
  private async request(endpoint: string, options?: RequestInit): Promise<any> {
    const url = `${API_BASE_URL}${endpoint}`;

    const headers = {
      'Content-Type': 'application/json',
      ...(options?.headers || {}),
    };

    const config: RequestInit = {
      ...options,
      headers,
    };

    const response = await fetch(url, config);
    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || `HTTP error! status: ${response.status}`);
    }

    return data;
  }

  async getInventory(): Promise<InventoryItem[]> {
    const response = await this.request('/inventory/list');
    return response.data;
  }

  async addItem(item: Omit<InventoryItem, 'id'>): Promise<InventoryItem> {
    const response = await this.request('/inventory/add', {
      method: 'POST',
      body: JSON.stringify(item),
    });
    return response.data;
  }

  async updateItem(id: string, updates: Partial<InventoryItem>): Promise<InventoryItem> {
    const response = await this.request('/inventory/update', {
      method: 'POST',
      body: JSON.stringify({ id, ...updates }),
    });
    return response.data;
  }

  async deleteItem(id: string): Promise<{ success: boolean; message: string }> {
    return this.request('/inventory/delete', {
      method: 'POST',
      body: JSON.stringify({ id }),
    });
  }

  async adjustQuantity(id: string, adjustment: number): Promise<InventoryItem> {
    const response = await this.request('/inventory/adjust', {
      method: 'POST',
      body: JSON.stringify({ id, adjustment }),
    });
    return response.data;
  }

  async searchItems(query: string): Promise<InventoryItem[]> {
    const response = await this.request(`/inventory/search?q=${encodeURIComponent(query)}`);
    return response.data;
  }

  isConnected(): boolean {
    // Service account is always connected
    return true;
  }
}

const inventoryApiService = new InventoryApiService();
export default inventoryApiService;
export type { InventoryItem };
