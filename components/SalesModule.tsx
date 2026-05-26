import React, { useState, useEffect } from 'react';
import { InventoryItem } from '../types';
import { getSalesForecast, SalesRecommendation } from '../services/geminiService';
import { ShoppingCart, Sparkles, Plus, TrendingUp, Map, PieChart as PieChartIcon, Calendar, Package, User, Phone, MapPin, FileText } from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  LineChart, Line, PieChart, Pie, Cell, Legend
} from 'recharts';

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

// --- Mock Data for Analytics ---
const REGIONAL_SALES = [
  { region: '47500', sales: 12500, label: 'Subang' },
  { region: '50480', sales: 18200, label: 'KL City' },
  { region: '40150', sales: 9800, label: 'Shah Alam' },
  { region: '68100', sales: 14500, label: 'Batu Caves' },
  { region: '47100', sales: 11000, label: 'Puchong' },
];

const PRODUCT_MIX = [
  { name: 'Cleaning', value: 45000 },
  { name: 'Polishing', value: 25000 },
  { name: 'Coating', value: 35000 },
  { name: 'Access.', value: 15000 },
];

const SEASONAL_TRENDS = [
  { month: 'Jan', sales: 42000 },
  { month: 'Feb', sales: 48000 },
  { month: 'Mar', sales: 55000 },
  { month: 'Apr', sales: 51000 },
  { month: 'May', sales: 62000 },
  { month: 'Jun', sales: 68000 },
];

const COLORS = ['#3b82f6', '#8b5cf6', '#ec4899', '#f59e0b'];

const SalesModule = ({inventory}: {inventory: InventoryItem[]}) => {
  const [clientName, setClientName] = useState('AutoSpa Elite');
  const [recommendations, setRecommendations] = useState<SalesRecommendation[]>([]);
  const [loading, setLoading] = useState(false);
  const [cart, setCart] = useState<{name: string, qty: number}[]>([]);
  const [orderLoading, setOrderLoading] = useState(false);
  const [orderSuccess, setOrderSuccess] = useState(false);
  const [orderError, setOrderError] = useState('');
  const [showOrderForm, setShowOrderForm] = useState(false);

  // Order form state
  const [orderFormData, setOrderFormData] = useState({
    deliveryAddress: '',
    contactNumber: '',
    notes: ''
  });

  const [recentOrders, setRecentOrders] = useState<Order[]>([]);
  const [ordersLoading, setOrdersLoading] = useState(false);

  // Fetch recent orders on component mount
  useEffect(() => {
    fetchRecentOrders();
  }, []);

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

  const handleForecast = async () => {
    setLoading(true);
    // Pass inventory to give context to the AI
    const results = await getSalesForecast(clientName, inventory);
    setRecommendations(results);
    setLoading(false);
  };

  const addToCart = (name: string) => {
      setCart(prev => {
          const existing = prev.find(i => i.name === name);
          if (existing) {
              return prev.map(i => i.name === name ? { ...i, qty: i.qty + 1} : i);
          }
          return [...prev, { name, qty: 1}];
      });
  };

  const removeFromCart = (name: string) => {
      setCart(prev => {
          const existing = prev.find(i => i.name === name);
          if (existing && existing.qty > 1) {
              return prev.map(i => i.name === name ? { ...i, qty: i.qty - 1} : i);
          }
          return prev.filter(i => i.name !== name);
      });
  };

  const handlePlaceOrder = async () => {
    if (cart.length === 0) {
        setOrderError('Cart is empty. Please add items to your order.');
        setTimeout(() => setOrderError(''), 3000);
        return;
    }

    // Show order form if not shown yet
    if (!showOrderForm) {
        setShowOrderForm(true);
        return;
    }

    setOrderLoading(true);
    setOrderError('');

    try {
        const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api';

        const response = await fetch(`${API_BASE}/orders`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                clientName,
                items: cart.map(item => ({
                    name: item.name,
                    quantity: item.qty
                })),
                deliveryAddress: orderFormData.deliveryAddress,
                contactNumber: orderFormData.contactNumber,
                notes: orderFormData.notes
            })
        });

        const data = await response.json();

        if (data.success) {
            // Show success message
            setOrderSuccess(true);

            // Refresh recent orders
            await fetchRecentOrders();

            // Clear cart and form after successful order
            setTimeout(() => {
                setCart([]);
                setOrderSuccess(false);
                setShowOrderForm(false);
                setOrderFormData({
                    deliveryAddress: '',
                    contactNumber: '',
                    notes: ''
                });
            }, 2000);
        } else {
            setOrderError(data.error || 'Failed to place order. Please try again.');
            setTimeout(() => setOrderError(''), 3000);
        }

    } catch (error) {
        console.error('Order placement failed:', error);
        setOrderError('Failed to place order. Please try again.');
        setTimeout(() => setOrderError(''), 3000);
    } finally {
        setOrderLoading(false);
    }
  };

  const getOrderTotal = () => {
      return cart.reduce((total, item) => {
          const inventoryItem = inventory.find(inv => inv.name === item.name);
          const price = inventoryItem ? inventoryItem.sellingPrice : 0;
          return total + (price * item.qty);
      }, 0);
  };

  return (
    <div className="space-y-8">
       <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
           <h2 className="text-2xl font-bold text-slate-800">Sales Intelligence & CRM</h2>
           <div className="flex items-center space-x-2 bg-white p-2 rounded-lg border border-slate-200 shadow-sm">
               <label className="text-xs text-slate-500 font-medium ml-1">Client:</label>
               <select
                 value={clientName}
                 onChange={(e) => {
                     setClientName(e.target.value);
                     setRecommendations([]);
                 }}
                 className="bg-transparent text-sm font-bold text-slate-800 focus:outline-none cursor-pointer"
               >
                   <option>AutoSpa Elite</option>
                   <option>Detailing Bros</option>
                   <option>City Motors Service</option>
                   <option>Platinum Wash</option>
               </select>
           </div>
       </div>

       {/* AI Recommendation Section */}
       <section className="bg-gradient-to-r from-indigo-50 to-blue-50 p-6 rounded-2xl border border-indigo-100">
           <div className="flex justify-between items-start mb-6">
               <div>
                    <h3 className="text-lg font-bold text-indigo-900 flex items-center">
                        <Sparkles className="w-5 h-5 mr-2 text-indigo-600" />
                        AI Smart Recommendations
                    </h3>
                    <p className="text-sm text-indigo-700 mt-1">
                        Personalized upsell opportunities for <span className="font-semibold">{clientName}</span> based on catalog data.
                    </p>
               </div>
               <button
                onClick={handleForecast}
                disabled={loading}
                className="px-5 py-2.5 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 flex items-center shadow-lg shadow-indigo-200 transition-all active:scale-95 disabled:opacity-70 disabled:cursor-not-allowed"
               >
                   {loading ? (
                       <span className="flex items-center"><div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin mr-2"/> Analyzing...</span>
                   ) : (
                       <>Generate Insights</>
                   )}
               </button>
           </div>

           {recommendations.length > 0 ? (
               <div className="grid md:grid-cols-3 gap-6">
                   {recommendations.map((rec, idx) => (
                       <div key={idx} className="bg-white p-5 rounded-xl shadow-sm border border-indigo-100 hover:shadow-md transition-shadow relative overflow-hidden group">
                           <div className="absolute top-0 right-0 bg-green-100 text-green-700 text-[10px] font-bold px-2 py-1 rounded-bl-lg">
                               Margin: {rec.estimatedMargin}
                           </div>
                           <h4 className="font-bold text-slate-800 mb-2 mt-1">{rec.productName}</h4>
                           <p className="text-xs text-slate-500 mb-4 leading-relaxed">{rec.reasoning}</p>
                           <button
                                onClick={() => addToCart(rec.productName)}
                                className="w-full py-2 bg-slate-50 hover:bg-indigo-50 text-indigo-600 text-xs font-bold rounded border border-slate-200 hover:border-indigo-200 transition-colors flex items-center justify-center"
                           >
                               <Plus className="w-3 h-3 mr-1" /> Add to Order
                           </button>
                       </div>
                   ))}
               </div>
           ) : (
               !loading && (
                   <div className="text-center py-8 text-indigo-300 border-2 border-dashed border-indigo-200 rounded-xl">
                       <Sparkles className="w-8 h-8 mx-auto mb-2 opacity-50" />
                       <p className="text-sm">Click "Generate Insights" to analyze sales potential.</p>
                   </div>
               )
           )}
       </section>

       {/* Analytics Dashboard Grid */}
       <section className="grid grid-cols-1 lg:grid-cols-3 gap-6">
           {/* Regional Analysis */}
           <div className="bg-white p-5 rounded-xl shadow-sm border border-slate-200">
               <div className="flex items-center justify-between mb-4">
                   <h3 className="font-bold text-slate-700 flex items-center"><Map className="w-4 h-4 mr-2" /> Sales by Postcode</h3>
               </div>
               <div className="h-48 text-xs w-full">
                   <ResponsiveContainer width="100%" height={192}>
                       <BarChart data={REGIONAL_SALES} layout="vertical">
                           <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} />
                           <XAxis type="number" hide />
                           <YAxis dataKey="label" type="category" width={70} tick={{fontSize: 10}} />
                           <Tooltip cursor={{fill: '#f1f5f9'}} />
                           <Bar dataKey="sales" fill="#3b82f6" radius={[0, 4, 4, 0]} barSize={15} />
                       </BarChart>
                   </ResponsiveContainer>
               </div>
           </div>

           {/* Product Mix */}
           <div className="bg-white p-5 rounded-xl shadow-sm border border-slate-200">
               <div className="flex items-center justify-between mb-4">
                   <h3 className="font-bold text-slate-700 flex items-center"><PieChartIcon className="w-4 h-4 mr-2" /> Product Lines</h3>
               </div>
               <div className="h-48 text-xs w-full">
                   <ResponsiveContainer width="100%" height={192}>
                       <PieChart>
                           <Pie
                               data={PRODUCT_MIX}
                               cx="50%"
                               cy="50%"
                               innerRadius={40}
                               outerRadius={70}
                               paddingAngle={5}
                               dataKey="value"
                           >
                               {PRODUCT_MIX.map((entry, index) => (
                                   <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                               ))}
                           </Pie>
                           <Tooltip />
                           <Legend layout="vertical" verticalAlign="middle" align="right" iconSize={8} />
                       </PieChart>
                   </ResponsiveContainer>
               </div>
           </div>

           {/* Seasonal Trends */}
           <div className="bg-white p-5 rounded-xl shadow-sm border border-slate-200">
               <div className="flex items-center justify-between mb-4">
                   <h3 className="font-bold text-slate-700 flex items-center"><Calendar className="w-4 h-4 mr-2" /> Seasonal Peaks</h3>
               </div>
               <div className="h-48 text-xs w-full">
                   <ResponsiveContainer width="100%" height={192}>
                       <LineChart data={SEASONAL_TRENDS}>
                           <CartesianGrid strokeDasharray="3 3" vertical={false} />
                           <XAxis dataKey="month" tick={{fontSize: 10}} />
                           <YAxis hide />
                           <Tooltip />
                           <Line type="monotone" dataKey="sales" stroke="#10b981" strokeWidth={2} dot={{r: 3}} activeDot={{r: 5}} />
                       </LineChart>
                   </ResponsiveContainer>
               </div>
           </div>
       </section>

       {/* Order Management Section */}
       <section className="grid md:grid-cols-3 gap-6">
           {/* Product Catalog */}
           <div className="md:col-span-2 bg-white p-6 rounded-xl shadow-sm border border-slate-200">
               <h3 className="font-bold text-slate-800 mb-4">Full Product Catalog</h3>
               <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-80 overflow-y-auto pr-2">
                   {inventory.map(item => (
                       <div key={item.id} className="flex justify-between items-center p-3 border border-slate-100 rounded-lg hover:bg-slate-50 group transition-colors">
                           <div>
                               <p className="font-medium text-slate-800 text-sm">{item.name}</p>
                               <p className="text-xs text-slate-400">Stock: {item.quantity}</p>
                           </div>
                           <button
                            onClick={() => addToCart(item.name)}
                            className="p-1.5 bg-slate-100 text-slate-500 rounded hover:bg-blue-600 hover:text-white transition-colors"
                           >
                               <Plus className="w-4 h-4" />
                           </button>
                       </div>
                   ))}
               </div>
           </div>

           {/* Current Cart & Order Form */}
           <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 flex flex-col h-full">
               <h3 className="font-bold text-slate-800 mb-4 flex items-center">
                   <ShoppingCart className="w-5 h-5 mr-2" /> Current Order
               </h3>

               {/* Cart Items */}
               <div className="flex-1 bg-slate-50 rounded-lg p-4 mb-4 overflow-y-auto min-h-[150px]">
                   {cart.length === 0 ? (
                       <div className="h-full flex flex-col items-center justify-center text-slate-400">
                           <ShoppingCart className="w-8 h-8 mb-2 opacity-50"/>
                           <p className="text-xs">Cart is empty</p>
                       </div>
                   ) : (
                       <div className="space-y-3">
                           {cart.map((item, idx) => {
                               const inventoryItem = inventory.find(inv => inv.name === item.name);
                               const price = inventoryItem ? inventoryItem.sellingPrice : 0;
                               return (
                                   <div key={idx} className="bg-white p-2 rounded border border-slate-100">
                                       <div className="flex justify-between text-sm items-center mb-1">
                                           <span className="text-slate-700 font-medium">{item.name}</span>
                                           <span className="text-slate-900 font-bold">RM{(price * item.qty).toFixed(2)}</span>
                                       </div>
                                       <div className="flex justify-between items-center">
                                           <span className="text-xs text-slate-400">RM{price.toFixed(2)} each</span>
                                           <div className="flex items-center gap-2">
                                               <button
                                                   onClick={() => removeFromCart(item.name)}
                                                   className="text-slate-400 hover:text-red-500 transition-colors text-xs w-6 h-6 rounded flex items-center justify-center"
                                               >
                                                   −
                                               </button>
                                               <span className="bg-blue-100 text-blue-700 px-2 py-0.5 rounded text-xs font-bold">x{item.qty}</span>
                                               <button
                                                   onClick={() => addToCart(item.name)}
                                                   className="text-slate-400 hover:text-green-500 transition-colors text-xs w-6 h-6 rounded flex items-center justify-center"
                                               >
                                                   +
                                               </button>
                                           </div>
                                       </div>
                                   </div>
                               );
                           })}
                       </div>
                   )}
               </div>

               {/* Order Summary */}
               {cart.length > 0 && (
                   <div className="bg-slate-50 rounded-lg p-4 mb-4">
                       <div className="flex justify-between text-sm text-slate-600 mb-2">
                           <span>Total Items</span>
                           <span className="font-medium">{cart.reduce((a, b) => a + b.qty, 0)}</span>
                       </div>
                       <div className="flex justify-between text-sm font-bold text-slate-900">
                           <span>Order Total</span>
                           <span>RM{getOrderTotal().toFixed(2)}</span>
                       </div>
                   </div>
               )}

               {/* Order Form */}
               {showOrderForm && (
                   <div className="bg-blue-50 rounded-lg p-4 mb-4 border border-blue-100">
                       <h4 className="font-semibold text-blue-900 mb-3 text-sm flex items-center">
                           <FileText className="w-4 h-4 mr-2" /> Order Details
                       </h4>
                       <div className="space-y-3">
                           <div>
                               <label className="block text-xs font-medium text-slate-700 mb-1">Delivery Address</label>
                               <input
                                   type="text"
                                   value={orderFormData.deliveryAddress}
                                   onChange={(e) => setOrderFormData({...orderFormData, deliveryAddress: e.target.value})}
                                   className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                   placeholder="Enter delivery address"
                               />
                           </div>
                           <div>
                               <label className="block text-xs font-medium text-slate-700 mb-1">Contact Number</label>
                               <input
                                   type="tel"
                                   value={orderFormData.contactNumber}
                                   onChange={(e) => setOrderFormData({...orderFormData, contactNumber: e.target.value})}
                                   className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                   placeholder="Enter contact number"
                               />
                           </div>
                           <div>
                               <label className="block text-xs font-medium text-slate-700 mb-1">Notes (Optional)</label>
                               <textarea
                                   value={orderFormData.notes}
                                   onChange={(e) => setOrderFormData({...orderFormData, notes: e.target.value})}
                                   className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                   placeholder="Any special instructions..."
                                   rows={2}
                               />
                           </div>
                       </div>
                   </div>
               )}

               {/* Error Message */}
               {orderError && (
                   <div className="mb-3 bg-red-50 border border-red-200 text-red-600 px-3 py-2 rounded text-xs">
                       {orderError}
                   </div>
               )}

               {/* Success Message */}
               {orderSuccess && (
                   <div className="mb-3 bg-green-50 border border-green-200 text-green-600 px-3 py-2 rounded text-xs flex items-center">
                       <svg className="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 20 20">
                           <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                       </svg>
                       Order placed successfully!
                   </div>
               )}

               <button
                   onClick={handlePlaceOrder}
                   disabled={orderLoading || cart.length === 0}
                   className={`w-full py-3 rounded-lg font-medium shadow-lg shadow-slate-200 transition-transform active:scale-[0.98] ${
                       orderLoading || cart.length === 0
                           ? 'bg-slate-400 text-slate-200 cursor-not-allowed'
                           : 'bg-slate-900 text-white hover:bg-slate-800'
                   }`}
               >
                   {orderLoading ? (
                       <span className="flex items-center justify-center">
                           <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin mr-2"/>
                           Processing...
                       </span>
                   ) : showOrderForm ? (
                       'Confirm Order'
                   ) : (
                       'Place Order'
                   )}
               </button>
           </div>
       </section>

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
