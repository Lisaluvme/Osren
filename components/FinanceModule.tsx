import React, { useState, useEffect } from 'react';
import { getStockPurchaseRecommendation } from '../services/geminiService';
import { UserRole, Invoice } from '../types';
import {
  TrendingUp, TrendingDown, DollarSign, BrainCircuit,
  AlertCircle, Clock, Target, Users, Activity, CreditCard, ShoppingCart, Package, RefreshCw
} from 'lucide-react';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  BarChart, Bar, Cell
} from 'recharts';

interface FinanceModuleProps {
  currentRole: UserRole;
}

interface RealOrder {
  id: string;
  clientName: string;
  totalAmount: number;
  status: string;
  createdAt: string;
}

const FinanceModule: React.FC<FinanceModuleProps> = ({ currentRole }) => {
  const [recommendation, setRecommendation] = useState<string>('Analyzing market data...');
  const [loading, setLoading] = useState(false);
  const [orders, setOrders] = useState<RealOrder[]>([]);
  const [ordersLoading, setOrdersLoading] = useState(true);
  const [inventory, setInventory] = useState<any[]>([]);

  // Fetch real orders and inventory on component mount
  useEffect(() => {
    fetchRealData();
  }, []);

  // AI Recommendation only fetches for Admin to save tokens/resources
  useEffect(() => {
    if (currentRole === UserRole.ADMIN || currentRole === UserRole.WAREHOUSE) {
      const fetchAdvice = async () => {
        setLoading(true);
        const advice = await getStockPurchaseRecommendation(
          // Generate real cashflow from orders
          generateCashflowFromOrders(orders),
          inventory
        );
        setRecommendation(advice);
        setLoading(false);
      };
      if (orders.length > 0 || inventory.length > 0) {
        fetchAdvice();
      }
    }
  }, [currentRole, orders, inventory]);

  const fetchRealData = async () => {
    try {
      setOrdersLoading(true);
      const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api';

      // Fetch real orders
      const ordersResponse = await fetch(`${API_BASE}/orders`);
      const ordersData = await ordersResponse.json();

      // Fetch real inventory
      const inventoryResponse = await fetch(`${API_BASE}/inventory/list`);
      const inventoryData = await inventoryResponse.json();

      if (ordersData.success) {
        setOrders(ordersData.data);
      }

      if (inventoryData.success) {
        setInventory(inventoryData.data);
      }
    } catch (error) {
      console.error('Error fetching real data:', error);
    } finally {
      setOrdersLoading(false);
    }
  };

  const generateCashflowFromOrders = (realOrders: RealOrder[]) => {
    // Generate last 6 months of cashflow from real orders
    const monthlyData = [];
    const now = new Date();

    for (let i = 5; i >= 0; i--) {
      const monthDate = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const monthStr = monthDate.toLocaleString('default', { month: 'short' });

      // Calculate revenue from orders in this month
      const monthRevenue = realOrders
        .filter(order => {
          const orderDate = new Date(order.createdAt);
          return orderDate.getMonth() === monthDate.getMonth() &&
                 orderDate.getFullYear() === monthDate.getFullYear() &&
                 ['invoiced', 'delivered', 'paid'].includes(order.status.toLowerCase());
        })
        .reduce((sum, order) => sum + order.totalAmount, 0);

      // Estimate expenses as 60% of revenue
      const expenses = monthRevenue * 0.6;

      monthlyData.push({
        month: monthStr,
        revenue: Math.round(monthRevenue),
        expenses: Math.round(expenses)
      });
    }

    return monthlyData;
  };

  const calculateRealSalesMetrics = () => {
    const paidOrders = orders.filter(order =>
      ['invoiced', 'delivered', 'paid'].includes(order.status.toLowerCase())
    );

    const pendingOrders = orders.filter(order =>
      ['pending', 'processing'].includes(order.status.toLowerCase())
    );

    const totalSales = paidOrders.reduce((sum, order) => sum + order.totalAmount, 0);
    const pendingAmount = pendingOrders.reduce((sum, order) => sum + order.totalAmount, 0);

    return {
      totalSales,
      pendingAmount,
      paidOrdersCount: paidOrders.length,
      pendingOrdersCount: pendingOrders.length,
      totalOrders: orders.length
    };
  };

  const metrics = calculateRealSalesMetrics();

  // --- Render Views ---

  const renderAccountsDashboard = () => {
    const cashflowData = generateCashflowFromOrders(orders);
    const recentOrders = orders.slice(0, 5); // Get 5 most recent orders

    const chartData = [
        { name: 'Completed Sales', value: metrics.totalSales, color: '#22c55e' },
        { name: 'Pending Orders', value: metrics.pendingAmount, color: '#eab308' }
    ];

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <h2 className="text-2xl font-bold text-slate-800">Finance Dashboard</h2>
                <button
                    onClick={fetchRealData}
                    className="flex items-center space-x-2 px-3 py-2 text-sm font-medium text-slate-600 bg-white border border-slate-200 rounded-lg hover:bg-slate-50"
                    disabled={ordersLoading}
                >
                    <RefreshCw className={`w-4 h-4 ${ordersLoading ? 'animate-spin' : ''}`} />
                    <span>Refresh</span>
                </button>
            </div>

            {/* Key Metrics */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
                    <div className="flex items-center justify-between mb-2">
                        <DollarSign className="w-5 h-5 text-green-500" />
                        <span className="text-xs text-green-500 bg-green-50 px-2 py-1 rounded-full">Revenue</span>
                    </div>
                    <p className="text-2xl font-bold text-slate-800">${metrics.totalSales.toLocaleString()}</p>
                    <p className="text-sm text-slate-400 mt-1">Total completed sales</p>
                </div>

                <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
                    <div className="flex items-center justify-between mb-2">
                        <ShoppingCart className="w-5 h-5 text-blue-500" />
                        <span className="text-xs text-blue-500 bg-blue-50 px-2 py-1 rounded-full">Orders</span>
                    </div>
                    <p className="text-2xl font-bold text-slate-800">{metrics.totalOrders}</p>
                    <p className="text-sm text-slate-400 mt-1">Total orders placed</p>
                </div>

                <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
                    <div className="flex items-center justify-between mb-2">
                        <Package className="w-5 h-5 text-yellow-500" />
                        <span className="text-xs text-yellow-500 bg-yellow-50 px-2 py-1 rounded-full">Pending</span>
                    </div>
                    <p className="text-2xl font-bold text-slate-800">${metrics.pendingAmount.toLocaleString()}</p>
                    <p className="text-sm text-slate-400 mt-1">{metrics.pendingOrdersCount} pending orders</p>
                </div>

                <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
                    <div className="flex items-center justify-between mb-2">
                        <Activity className="w-5 h-5 text-purple-500" />
                        <span className="text-xs text-purple-500 bg-purple-50 px-2 py-1 rounded-full">Conversion</span>
                    </div>
                    <p className="text-2xl font-bold text-slate-800">
                        {metrics.totalOrders > 0 ? Math.round((metrics.paidOrdersCount / metrics.totalOrders) * 100) : 0}%
                    </p>
                    <p className="text-sm text-slate-400 mt-1">Order completion rate</p>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Sales Chart */}
                <div className="lg:col-span-2 bg-white p-6 rounded-xl shadow-sm border border-slate-200">
                    <h3 className="text-lg font-semibold text-slate-800 mb-4">Revenue Trend (Last 6 Months)</h3>
                    <div className="h-64 w-full">
                        <ResponsiveContainer width="100%" height={256}>
                            <AreaChart data={cashflowData}>
                                <defs>
                                    <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#22c55e" stopOpacity={0.8}/>
                                        <stop offset="95%" stopColor="#22c55e" stopOpacity={0}/>
                                    </linearGradient>
                                </defs>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                                <XAxis dataKey="month" />
                                <YAxis />
                                <Tooltip
                                    formatter={(value) => [`$${value.toLocaleString()}`, 'Revenue']}
                                    cursor={{fill: 'transparent'}}
                                />
                                <Area
                                    type="monotone"
                                    dataKey="revenue"
                                    stroke="#22c55e"
                                    fillOpacity={1}
                                    fill="url(#colorRevenue)"
                                />
                            </AreaChart>
                        </ResponsiveContainer>
                    </div>
                </div>
            </div>

            {/* Sales Summary */}
            <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
                <h3 className="text-lg font-semibold text-slate-800 mb-4">Sales Summary</h3>
                <div className="h-64 w-full">
                    <ResponsiveContainer width="100%" height={256}>
                        <BarChart data={chartData} layout="vertical">
                            <CartesianGrid strokeDasharray="3 3" />
                            <XAxis type="number" />
                            <YAxis type="category" dataKey="name" width={30} />
                            <Tooltip cursor={{fill: 'transparent'}} formatter={(value) => '$' + value.toLocaleString()} />
                            <Bar dataKey="value" radius={[0, 4, 4, 0]} barSize={40}>
                                {chartData.map((entry, index) => (
                                    <Cell key={'cell-' + index} fill={entry.color} />
                                ))}
                            </Bar>
                        </BarChart>
                    </ResponsiveContainer>
                    </div>
            </div>
            </div>

            {/* Recent Orders */}
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                <div className="p-4 border-b border-slate-100 bg-slate-50 flex justify-between items-center">
                    <h3 className="font-semibold text-slate-800 flex items-center">
                        <ShoppingCart className="w-4 h-4 mr-2 text-blue-500" />
                        Recent Orders
                    </h3>
                    <span className="text-sm text-slate-400">Last 5 orders</span>
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 text-xs uppercase tracking-wider">
                                <th className="p-4 font-semibold">Order ID</th>
                                <th className="p-4 font-semibold">Client</th>
                                <th className="p-4 font-semibold text-right">Amount</th>
                                <th className="p-4 font-semibold">Status</th>
                                <th className="p-4 font-semibold">Date</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {ordersLoading ? (
                                <tr>
                                    <td colSpan={5} className="p-8 text-center text-slate-400">
                                        <div className="flex items-center justify-center">
                                            <div className="w-6 h-6 border-2 border-blue-200 border-t-blue-600 rounded-full animate-spin mr-2"/>
                                            Loading orders...
                                        </div>
                                    </td>
                                </tr>
                            ) : orders.length === 0 ? (
                                <tr>
                                    <td colSpan={5} className="p-8 text-center text-slate-400">
                                        No orders yet. Place an order in the Sales module to get started.
                                    </td>
                                </tr>
                            ) : recentOrders.map((order) => (
                                <tr key={order.id} className="hover:bg-slate-50 transition-colors">
                                    <td className="p-4 font-medium text-slate-700">{order.id}</td>
                                    <td className="p-4 text-slate-600">{order.clientName}</td>
                                    <td className="p-4 text-right font-mono font-medium text-slate-800">
                                        ${order.totalAmount.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                                    </td>
                                    <td className="p-4">
                                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${
                                            ['invoiced', 'delivered', 'paid'].includes(order.status.toLowerCase())
                                                ? 'bg-green-100 text-green-700 border-green-200'
                                                : ['processing'].includes(order.status.toLowerCase())
                                                    ? 'bg-orange-100 text-orange-700 border-orange-200'
                                                    : 'bg-yellow-100 text-yellow-700 border-yellow-200'
                                        }`}>
                                            {order.status}
                                        </span>
                                    </td>
                                    <td className="p-4 text-slate-600">{new Date(order.createdAt).toLocaleDateString()}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        );
  };

  const renderSalesDashboard = () => {
    const salesTarget = 80000;
    const currentSales = 55000;
    const percentage = Math.min((currentSales / salesTarget) * 100, 100);

    const mockLeads = [
        { id: 1, name: 'Crystal Clear Wash', value: 5000, status: 'New' },
        { id: 2, name: 'Rapid Shine Center', value: 12000, status: 'Negotiating' },
        { id: 3, name: 'Luxury Auto Spa', value: 8500, status: 'Qualified' },
    ];

    return (
        <div className="space-y-6">
            <h2 className="text-2xl font-bold text-slate-800">Sales Performance</h2>

            <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
                <div className="flex justify-between items-center mb-2">
                    <h3 className="text-slate-500 font-medium flex items-center">
                        <Target className="w-5 h-5 mr-2 text-blue-600" /> Monthly Sales Target
                    </h3>
                    <span className="text-xs font-bold bg-blue-100 text-blue-700 px-2 py-1 rounded">
                        {Math.round(percentage)}% Achieved
                    </span>
                </div>
                <div className="flex items-end space-x-2 mb-4">
                    <span className="text-4xl font-bold text-slate-800">${currentSales.toLocaleString()}</span>
                    <span className="text-sm text-slate-400 mb-1">/ ${salesTarget.toLocaleString()}</span>
                </div>
                <div className="w-full bg-slate-100 rounded-full h-4 overflow-hidden">
                    <div 
                        className="bg-blue-600 h-full rounded-full transition-all duration-1000 ease-out relative" 
                        style={{ width: `${percentage}%` }}
                    >
                        <div className="absolute top-0 left-0 right-0 bottom-0 bg-white/20 animate-pulse"></div>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
                    <h3 className="font-bold text-slate-800 mb-4 flex items-center">
                        <Users className="w-5 h-5 mr-2 text-indigo-600" /> Recent Leads
                    </h3>
                    <div className="space-y-3">
                        {mockLeads.map(lead => (
                            <div key={lead.id} className="flex justify-between items-center p-3 bg-slate-50 rounded-lg border border-slate-100 hover:border-indigo-200 transition-colors">
                                <div>
                                    <p className="font-medium text-slate-800">{lead.name}</p>
                                    <p className="text-xs text-slate-500">Est. Value: ${lead.value.toLocaleString()}</p>
                                </div>
                                <span className={`px-2 py-1 text-xs font-medium rounded ${
                                    lead.status === 'New' ? 'bg-green-100 text-green-700' :
                                    lead.status === 'Negotiating' ? 'bg-amber-100 text-amber-700' :
                                    'bg-blue-100 text-blue-700'
                                }`}>
                                    {lead.status}
                                </span>
                            </div>
                        ))}
                    </div>
                </div>

                <div className="flex flex-col space-y-4">
                    <div className="bg-gradient-to-br from-indigo-600 to-purple-700 text-white p-6 rounded-xl shadow-lg flex-1">
                        <h3 className="font-bold mb-3 flex items-center"><Activity className="w-5 h-5 mr-2" /> Quick Actions</h3>
                        <p className="text-indigo-100 text-sm mb-6">You have 3 pending follow-ups today to meet your quota.</p>
                        <div className="space-y-2">
                            <button className="w-full bg-white/20 hover:bg-white/30 backdrop-blur-sm text-white py-2 rounded-lg text-sm font-medium transition-colors text-left px-4">
                                📅 View Today's Schedule
                            </button>
                            <button className="w-full bg-white text-indigo-700 py-2 rounded-lg text-sm font-bold transition-colors shadow-lg text-left px-4">
                                📞 Log New Call
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
  };

  const renderAdminDashboard = () => (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-slate-800">Executive Finance Dashboard</h2>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-slate-500 font-medium">Total Revenue (Oct)</h3>
            <div className="p-2 bg-green-100 rounded-lg">
              <DollarSign className="w-5 h-5 text-green-600" />
            </div>
          </div>
          <p className="text-3xl font-bold text-slate-800">$55,000</p>
          <p className="text-sm text-green-600 flex items-center mt-2">
            <TrendingUp className="w-4 h-4 mr-1" /> +12% from last month
          </p>
        </div>

        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-slate-500 font-medium">Net Profit</h3>
            <div className="p-2 bg-blue-100 rounded-lg">
              <TrendingUp className="w-5 h-5 text-blue-600" />
            </div>
          </div>
          <p className="text-3xl font-bold text-slate-800">$20,000</p>
          <p className="text-sm text-slate-400 mt-2">Before taxes</p>
        </div>

        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-slate-500 font-medium">Expenses</h3>
            <div className="p-2 bg-red-100 rounded-lg">
              <TrendingDown className="w-5 h-5 text-red-600" />
            </div>
          </div>
          <p className="text-3xl font-bold text-slate-800">$35,000</p>
          <p className="text-sm text-red-500 flex items-center mt-2">
            <TrendingDown className="w-4 h-4 mr-1" /> -5% (Cost saving)
          </p>
        </div>
      </div>

      {/* Main Chart */}
      <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 h-96">
        <h3 className="text-lg font-semibold text-slate-800 mb-6">Cash Flow Analysis</h3>
        <ResponsiveContainer width="100%" height={384}>
          <AreaChart data={MOCK_CASHFLOW}>
            <defs>
              <linearGradient id="colorRev" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.8}/>
                <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
              </linearGradient>
              <linearGradient id="colorExp" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#ef4444" stopOpacity={0.8}/>
                <stop offset="95%" stopColor="#ef4444" stopOpacity={0}/>
              </linearGradient>
            </defs>
            <XAxis dataKey="month" />
            <YAxis />
            <CartesianGrid strokeDasharray="3 3" vertical={false} />
            <Tooltip />
            <Area type="monotone" dataKey="revenue" stroke="#3b82f6" fillOpacity={1} fill="url(#colorRev)" />
            <Area type="monotone" dataKey="expenses" stroke="#ef4444" fillOpacity={1} fill="url(#colorExp)" />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      {/* AI Widget */}
      <div className="bg-gradient-to-r from-indigo-900 to-slate-900 rounded-xl p-6 text-white shadow-lg relative overflow-hidden">
        <div className="absolute top-0 right-0 p-4 opacity-10">
          <BrainCircuit className="w-32 h-32" />
        </div>
        <div className="relative z-10">
            <div className="flex items-center mb-2">
                <BrainCircuit className="w-6 h-6 mr-2 text-yellow-400" />
                <h3 className="text-lg font-semibold">AI Stock Purchase Recommendation</h3>
            </div>
            <div className="mb-4 flex gap-2">
               <span className="text-[10px] bg-indigo-800 text-indigo-200 px-2 py-0.5 rounded border border-indigo-700">Cash Flow</span>
               <span className="text-[10px] bg-indigo-800 text-indigo-200 px-2 py-0.5 rounded border border-indigo-700">Inventory Age (Last Moved)</span>
            </div>
            {loading ? (
                <div className="space-y-2 animate-pulse">
                    <div className="h-4 bg-white/10 rounded w-3/4"></div>
                    <div className="h-4 bg-white/10 rounded w-1/2"></div>
                </div>
            ) : (
                <p className="text-indigo-100 text-lg leading-relaxed">{recommendation}</p>
            )}
        </div>
      </div>
    </div>
  );

  // Main Switch Logic
  if (currentRole === UserRole.ACCOUNTS) {
    return renderAccountsDashboard();
  } else if (currentRole === UserRole.SALES) {
    return renderSalesDashboard();
  } else {
    return renderAdminDashboard();
  }
};

export default FinanceModule;