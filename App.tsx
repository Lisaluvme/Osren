import React, { useState, useEffect, useRef } from 'react';
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
import UserManagement from './components/UserManagement';
import FloatingChatbot from './components/FloatingChatbot';
import { UserRole, InventoryItem, SalesOrder } from './types';
import inventoryService from './services/inventoryService';
import { auth, onAuthStateChanged, signOut } from './services/firebase';
import { apiClient } from './services/apiClient';

type AuthStatus = 'loading' | 'authenticated' | 'unauthenticated';

/** Map a backend role name to the frontend UserRole enum. */
function mapBackendRole(name?: string | null): UserRole {
  switch (name) {
    case 'admin':
      return UserRole.ADMIN;
    case 'sales':
      return UserRole.SALES;
    case 'driver':
      return UserRole.DRIVER;
    case 'finance':
      return UserRole.FINANCE;
    case 'warehouse':
      return UserRole.WAREHOUSE;
    default:
      return UserRole.ADMIN;
  }
}

/** Landing module for a freshly-authenticated user, by role. */
function defaultModuleForRole(role: UserRole): string {
  switch (role) {
    case UserRole.DRIVER:
      return 'delivery';
    case UserRole.FINANCE:
      return 'finance';
    case UserRole.WAREHOUSE:
      return 'warehouse';
    default:
      return 'sales';
  }
}

const App: React.FC = () => {
  // Authentication state (Firebase-driven)
  const [authStatus, setAuthStatus] = useState<AuthStatus>('loading');
  const [userInfo, setUserInfo] = useState<{ name: string; email: string } | null>(null);
  const [currentUserRole, setCurrentUserRole] = useState<UserRole>(UserRole.ADMIN);
  const [loginError, setLoginError] = useState('');

  // Navigation + global data state
  const [activeModule, setActiveModule] = useState<string>('sales');
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [inventoryLoading, setInventoryLoading] = useState(true);
  const [inventoryError, setInventoryError] = useState('');
  const [newOrder, setNewOrder] = useState<SalesOrder | null>(null);

  // Avoid resetting the active module on every auth-state re-fire (e.g. token
  // refresh / re-hydration after a page reload while already signed in).
  const moduleInitedRef = useRef(false);

  // If the Firebase web config isn't set, the auth listener can't run — guard
  // against it so the app shows an actionable message instead of hanging.
  const firebaseConfigured = Boolean(import.meta.env.VITE_FIREBASE_API_KEY);

  // Load real inventory data on mount
  useEffect(() => {
    loadInventory();
  }, []);

  // Subscribe to Firebase auth state. On sign-in, hydrate the role/profile from
  // the backend; this is also what keeps the user logged in across refresh.
  useEffect(() => {
    if (!firebaseConfigured) {
      setAuthStatus('unauthenticated');
      setLoginError('Firebase is not configured. Set the VITE_FIREBASE_* values in your .env file.');
      return;
    }
    const unsubscribe = onAuthStateChanged(auth, async (fbUser) => {
      if (!fbUser) {
        moduleInitedRef.current = false;
        setUserInfo(null);
        setCurrentUserRole(UserRole.ADMIN);
        setAuthStatus('unauthenticated');
        return;
      }

      try {
        const { data } = await apiClient.get('/auth/session');
        const role = mapBackendRole(data.data.role?.name);
        setCurrentUserRole(role);
        setUserInfo({ name: data.data.full_name, email: data.data.email });
        setLoginError('');
        if (!moduleInitedRef.current) {
          setActiveModule(defaultModuleForRole(role));
          moduleInitedRef.current = true;
        }
        setAuthStatus('authenticated');
      } catch (err: any) {
        const code = err?.response?.data?.code;
        const status = err?.response?.status;
        if (code === 'ACCOUNT_NOT_PROVISIONED' || code === 'ACCOUNT_DEACTIVATED' || status === 403) {
          setLoginError(
            err?.response?.data?.error ||
              'Your account is not active yet. Contact an administrator.'
          );
          // Sign out so they return to the login screen cleanly.
          try {
            await signOut(auth);
          } catch {
            /* ignore */
          }
        } else {
          setLoginError('Could not reach the server. Please try again.');
        }
        setAuthStatus('unauthenticated');
      }
    });
    return () => unsubscribe();
  }, [firebaseConfigured]);

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

  // Handle logout — Firebase sign-out; the auth listener flips the UI back.
  const handleLogout = async () => {
    try {
      await signOut(auth);
    } catch (err) {
      console.error('Logout failed:', err);
    }
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
        return <SalesModule inventory={inventory} onOrderPlaced={handleOrderPlaced} onInventoryRefresh={loadInventory} />;
      case 'delivery':
        return <DeliveryModule />;
      case 'chatbot':
        return <ChatbotModule />;
      case 'settings':
        return <SettingsModule />;
      case 'users':
        return <UserManagement currentRole={currentUserRole} />;
      default:
        return <WarehouseModule inventory={inventory} onInventoryChange={handleInventoryChange} />;
    }
  };

  // While Firebase resolves the persisted session, show a splash instead of
  // flashing the login page on refresh.
  if (authStatus === 'loading') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin mx-auto mb-4" />
          <p className="text-slate-600">Loading…</p>
        </div>
      </div>
    );
  }

  if (authStatus === 'unauthenticated') {
    return <LoginPage serverError={loginError} />;
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
