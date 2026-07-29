import React, { useState, useEffect } from 'react';
import LoginPage from './components/LoginPage';
import Layout from './components/Layout';
import FinanceModule from './components/FinanceModule';
import AccountsModule from './components/AccountsModule';
import DistributionModule from './components/DistributionModule';
import WarehouseModule from './components/WarehouseModule';
import SalesModule from './components/SalesModule';
import DeliveryModule from './components/DeliveryModule';
import ChatbotModule from './components/ChatbotModule';
import SettingsModule from './components/SettingsModule';
import FloatingChatbot from './components/FloatingChatbot';
import { UserRole, InventoryItem, SalesOrder } from './types';
import inventoryService from './services/inventoryService';

const App: React.FC = () => {
  // Authentication state
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [userInfo, setUserInfo] = useState<{ name: string; email: string } | null>(null);

  // State for global user context and navigation
  const [currentUserRole, setCurrentUserRole] = useState<UserRole>(UserRole.ADMIN);
  const [activeModule, setActiveModule] = useState<string>('sales'); // Start with sales for admin
  // Global inventory state - loads real data from Google Sheets
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [inventoryLoading, setInventoryLoading] = useState(true);
  const [inventoryError, setInventoryError] = useState('');
  // State for new order to pass to Distribution module
  const [newOrder, setNewOrder] = useState<SalesOrder | null>(null);
  // State for a just-signed delivery order to pass to the Accounts module
  const [signedOrder, setSignedOrder] = useState<SalesOrder | null>(null);

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
  // Handle login
  const handleLogin = (role: UserRole, user: { name: string; email: string }) => {
    setCurrentUserRole(role);
    setUserInfo(user);
    setIsAuthenticated(true);

    // Set first module based on role
    let firstModule = 'sales'; // Default for admin
    if (role === UserRole.SALES) {
      firstModule = 'sales';
    } else if (role === UserRole.DRIVER) {
      firstModule = 'delivery';
    } else if (role === UserRole.FINANCE) {
      firstModule = 'finance'; // Finance users start with Finance module
    } else if (role === UserRole.WAREHOUSE) {
      firstModule = 'warehouse'; // Warehouse users start with Warehouse module
    } else if (role === UserRole.ADMIN) {
      firstModule = 'sales'; // Admin starts with sales too
    }

    setActiveModule(firstModule);
    console.log('User logged in:', { role, user, firstModule });
  };

  // Handle logout
  const handleLogout = () => {
    setIsAuthenticated(false);
    setUserInfo(null);
    setCurrentUserRole(UserRole.ADMIN);
    setActiveModule('sales'); // Reset to sales
  };

  // Handle order placement - navigate to Distribution with new order
  const handleOrderPlaced = async (order: any) => {
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

    // Refresh inventory to show updated stock levels after order placement
    await loadInventory();

    // Navigate to Distribution (not Accounts, since Distribution is the workflow)
    setActiveModule('distribution');
  };

  // Handle delivery sign-off - send the signed order to the Accounts tab
  // for invoicing/receipt. Reuses newOrder as the Accounts refetch trigger
  // (AccountsModule refetches whenever newOrder changes).
  const handleDeliverySigned = (order: any) => {
    const transformedOrder: SalesOrder = {
      id: order.id,
      clientName: order.clientName,
      items: (order.items || []).map((item: any) => ({
        name: item.name,
        qty: item.quantity,
        price: 0
      })),
      total: order.totalAmount || 0,
      status: 'Invoiced', // Signed delivery => invoiced, ready for Accounts
      date: order.createdAt || new Date().toISOString()
    };

    setSignedOrder(transformedOrder);
    setActiveModule('accounts');
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
        return <AccountsModule newOrder={newOrder} signedOrder={signedOrder} />;
      case 'distribution':
        return <DistributionModule newOrder={newOrder} />;
      case 'warehouse':
        return <WarehouseModule inventory={inventory} onInventoryChange={handleInventoryChange} />;
      case 'sales':
        return <SalesModule inventory={inventory} onOrderPlaced={handleOrderPlaced} onInventoryRefresh={loadInventory} />;
      case 'delivery':
        return <DeliveryModule onSigned={handleDeliverySigned} />;
      case 'chatbot':
        return <ChatbotModule />;
      case 'settings':
        return <SettingsModule />;
      default:
        return <WarehouseModule inventory={inventory} onInventoryChange={handleInventoryChange} />;
    }
  };

  // Show login page if not authenticated
  if (!isAuthenticated) {
    return <LoginPage onLogin={handleLogin} />;
  }

  return (
    <>
      <Layout
        currentRole={currentUserRole}
        activeModule={activeModule}
        onModuleChange={setActiveModule}
        userInfo={userInfo}
        onLogout={handleLogout}
      >
        {renderModule()}
      </Layout>
      <FloatingChatbot />
    </>
  );
};

export default App;
