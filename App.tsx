import React, { useState, useEffect } from 'react';
import Layout from './components/Layout';
import FinanceModule from './components/FinanceModule';
import AccountsModule from './components/AccountsModule';
import DistributionModule from './components/DistributionModule';
import WarehouseModule from './components/WarehouseModule';
import SalesModule from './components/SalesModule';
import DeliveryModule from './components/DeliveryModule';
import { UserRole, InventoryItem, SalesOrder } from './types';
import inventoryService from './services/inventoryService';

const App: React.FC = () => {
  // State for global user context and navigation
  const [currentUserRole, setCurrentUserRole] = useState<UserRole>(UserRole.ADMIN);
  const [activeModule, setActiveModule] = useState<string>('warehouse'); // Start with warehouse to show real data
  // Global inventory state - loads real data from Google Sheets
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [inventoryLoading, setInventoryLoading] = useState(true);
  const [inventoryError, setInventoryError] = useState('');
  // State for new order to pass to Distribution module
  const [newOrder, setNewOrder] = useState<SalesOrder | null>(null);

  // Load real inventory data on mount
  useEffect(() => {
    loadInventory();
  }, []);

  // Clear newOrder when switching to sales or warehouse (placing new orders)
  useEffect(() => {
    if (activeModule === 'sales' || activeModule === 'warehouse') {
      setNewOrder(null);
    }
  }, [activeModule]);

  const loadInventory = async () => {
    setInventoryLoading(true);
    setInventoryError('');

    try {
      const realInventory = await inventoryService.getInventory();
      setInventory(realInventory);
    } catch (error) {
      console.error('Failed to load inventory:', error);
      setInventoryError('Failed to load inventory. Using cached data.');
      // Keep existing inventory as fallback
    } finally {
      setInventoryLoading(false);
    }
  };

  // Handle inventory updates from child components
  const handleInventoryChange = (newInventory: InventoryItem[]) => {
    setInventory(newInventory);
  };

  // Handle order placement - navigate to Distribution with new order
  const handleOrderPlaced = (order: any) => {
    // Transform order to match DistributionModule's expected SalesOrder format
    const transformedOrder: SalesOrder = {
      id: order.id,
      clientName: order.clientName,
      items: order.items.map((item: any) => ({
        name: item.name,
        qty: item.quantity,
        price: item.unitPrice || 0
      })),
      total: order.totalAmount || 0,
      status: 'SO', // New orders start as Sales Order
      date: order.createdAt || new Date().toISOString()
    };

    setNewOrder(transformedOrder);
    // Navigate to Distribution (not Accounts, since Distribution is the workflow)
    setActiveModule('distribution');
  };

  // Route renderer
  const renderModule = () => {
    if (inventoryLoading) {
      return (
        <div className="flex items-center justify-center h-full">
          <div className="text-center">
            <div className="w-16 h-16 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin mx-auto mb-4"/>
            <p className="text-slate-600">Loading real business data...</p>
          </div>
        </div>
      );
    }

    if (inventoryError) {
      return (
        <div className="flex items-center justify-center h-full">
          <div className="text-center bg-red-50 p-6 rounded-lg border border-red-200">
            <p className="text-red-600 mb-4">{inventoryError}</p>
            <button
              onClick={loadInventory}
              className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
            >
              Retry Loading Data
            </button>
          </div>
        </div>
      );
    }

    switch (activeModule) {
      case 'finance':
        return <FinanceModule currentRole={currentUserRole} />;
      case 'accounts':
        return <AccountsModule newOrder={newOrder} />;
      case 'distribution':
        return <DistributionModule newOrder={newOrder} />;
      case 'warehouse':
        return <WarehouseModule inventory={inventory} onInventoryChange={handleInventoryChange} />;
      case 'sales':
        return <SalesModule inventory={inventory} onOrderPlaced={handleOrderPlaced} />;
      case 'delivery':
        return <DeliveryModule />;
      default:
        return <WarehouseModule inventory={inventory} onInventoryChange={handleInventoryChange} />;
    }
  };

  return (
    <Layout
      currentRole={currentUserRole}
      onRoleChange={setCurrentUserRole}
      activeModule={activeModule}
      onModuleChange={setActiveModule}
    >
      {renderModule()}
    </Layout>
  );
};

export default App;
