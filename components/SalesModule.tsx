import React, { useState, useEffect } from 'react';
import { InventoryItem } from '../types';
import { Package, MapPin, Sparkles } from 'lucide-react';
import EnhancedCart from './EnhancedCart';
import '../styles/shoppingAnimations.css';

// Order interface
interface Order {
  id: string;
  clientName: string;
  items: Array<{
    name: string;
    quantity: number;
    unitPrice: number;
    itemTotal: number;
  }>;
  totalItems: number;
  totalAmount: number;
  status: string;
  createdAt: string;
  deliveryAddress?: string;
  contactNumber?: string;
  notes?: string;
}

interface SalesModuleProps {
  inventory: InventoryItem[];
  onOrderPlaced?: (order: Order) => void;
}

const SalesModule: React.FC<SalesModuleProps> = ({inventory, onOrderPlaced}) => {
  const [recentOrders, setRecentOrders] = useState<Order[]>([]);
  const [ordersLoading, setOrdersLoading] = useState(false);

  // Fetch business data on component mount
  useEffect(() => {
    fetchRecentOrders();
  }, []);

  const handleOrderPlaced = async (orderData: any) => {
    const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api';

    const response = await fetch(`${API_BASE}/orders`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(orderData)
    });

    const data = await response.json();

    if (data.success) {
      // Refresh recent orders
      await fetchRecentOrders();

      // Call the callback to navigate to Distribution with the new order
      if (onOrderPlaced && data.data) {
        onOrderPlaced(data.data);
      }
    } else {
      throw new Error(data.error || 'Failed to place order');
    }
  };

  const fetchRecentOrders = async () => {
    setOrdersLoading(true);
    try {
      const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api';
      const response = await fetch(`${API_BASE}/orders?limit=5`);
      const data = await response.json();
      if (data.success) {
        setRecentOrders(data.data);
      }
    } catch (error) {
      console.error('Error fetching orders:', error);
    } finally {
      setOrdersLoading(false);
    }
  };

  return (
    <div className="space-y-6 app-container">
       {/* Modern App Header */}
       <div className="bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 rounded-2xl p-6 text-white shadow-xl animate-fade-in">
           <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
               <div>
                   <div className="flex items-center gap-3 mb-2">
                       <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center animate-pulse-soft">
                           <span className="text-2xl">🛒</span>
                       </div>
                       <div>
                           <h2 className="text-2xl font-bold">Sales & Orders</h2>
                           <p className="text-blue-100 text-sm">Manage your inventory and orders</p>
                       </div>
                   </div>
                   <div className="flex gap-4 mt-3 md:mt-0">
                       <div className="text-center">
                           <p className="text-2xl font-bold">{inventory.length}</p>
                           <p className="text-xs text-blue-200">Products</p>
                       </div>
                       <div className="text-center">
                           <p className="text-2xl font-bold">{recentOrders.length}</p>
                           <p className="text-xs text-blue-200">Recent Orders</p>
                       </div>
                   </div>
               </div>
               <button className="px-6 py-3 bg-white text-blue-600 rounded-xl font-bold hover:bg-blue-50 transition-all shadow-lg hover:scale-105 btn-press">
                   + Quick Order
               </button>
           </div>
       </div>

       {/* Product Catalog - Always Visible */}
       <div className="animate-slide-in-left stagger-1">
         <EnhancedCart
           inventory={inventory}
           onPlaceOrder={handleOrderPlaced}
           recentOrders={recentOrders}
         />
       </div>

       {/* Recent Orders Section */}
       <section className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
           <div className="flex items-center justify-between mb-4">
               <h3 className="font-bold text-slate-800 flex items-center">
                   <Package className="w-5 h-5 mr-2" /> Recent Orders
               </h3>
               <button
                   onClick={fetchRecentOrders}
                   className="text-blue-600 hover:text-blue-700 text-sm font-medium"
               >
                   Refresh
               </button>
           </div>

           {ordersLoading ? (
               <div className="text-center py-8 text-slate-400">
                   <div className="w-8 h-8 border-2 border-slate-300 border-t-blue-600 rounded-full animate-spin mx-auto mb-2"/>
                   <p className="text-sm">Loading orders...</p>
               </div>
           ) : recentOrders.length === 0 ? (
               <div className="text-center py-8 text-slate-400">
                   <Package className="w-12 h-12 mx-auto mb-2 opacity-50"/>
                   <p className="text-sm">No orders yet. Place your first order above!</p>
               </div>
           ) : (
               <div className="space-y-3">
                   {recentOrders.map((order) => (
                       <div key={order.id} className="border border-slate-100 rounded-lg p-4 hover:shadow-md transition-shadow">
                           <div className="flex justify-between items-start mb-2">
                               <div>
                                   <div className="flex items-center gap-2 mb-1">
                                       <span className="font-semibold text-slate-800">{order.clientName}</span>
                                       <span className={`text-xs px-2 py-0.5 rounded font-medium ${
                                           order.status === 'pending' ? 'bg-yellow-100 text-yellow-700' :
                                           order.status === 'completed' ? 'bg-green-100 text-green-700' :
                                           'bg-red-100 text-red-700'
                                       }`}>
                                           {order.status}
                                       </span>
                                   </div>
                                   <p className="text-xs text-slate-400">{new Date(order.createdAt).toLocaleString()}</p>
                               </div>
                               <div className="text-right">
                                   <p className="font-bold text-slate-900">RM{order.totalAmount.toFixed(2)}</p>
                                   <p className="text-xs text-slate-400">{order.totalItems} items</p>
                               </div>
                           </div>
                           <div className="text-xs text-slate-500">
                               {order.items.map((item, idx) => (
                                   <span key={idx} className="inline-block mr-2">
                                       {item.name} x{item.quantity}
                                   </span>
                               ))}
                           </div>
                           {order.deliveryAddress && (
                               <div className="mt-2 text-xs text-slate-400 flex items-center">
                                   <MapPin className="w-3 h-3 mr-1" />
                                   {order.deliveryAddress}
                               </div>
                           )}
                       </div>
                   ))}
               </div>
           )}
       </section>
    </div>
  );
};

export default SalesModule;
