import React, { useState, useEffect } from 'react';
import { MOCK_CASHFLOW, MOCK_INVENTORY, MOCK_INVOICES } from '../constants';
import { getStockPurchaseRecommendation } from '../services/geminiService';
import { UserRole } from '../types';
import { 
  TrendingUp, TrendingDown, DollarSign, BrainCircuit, 
  AlertCircle, Clock, Target, Users, Activity, CreditCard
} from 'lucide-react';
import { 
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, 
  BarChart, Bar, Cell 
} from 'recharts';

interface FinanceModuleProps {
  currentRole: UserRole;
}

const FinanceModule: React.FC<FinanceModuleProps> = ({ currentRole }) => {
  const [recommendation, setRecommendation] = useState<string>('Analyzing market data...');
  const [loading, setLoading] = useState(false);

  // AI Recommendation only fetches for Admin to save tokens/resources
  useEffect(() => {
    if (currentRole === UserRole.ADMIN || currentRole === UserRole.WAREHOUSE) {
        const fetchAdvice = async () => {
          setLoading(true);
          const advice = await getStockPurchaseRecommendation(MOCK_CASHFLOW, MOCK_INVENTORY);
          setRecommendation(advice);
          setLoading(false);
        };
        fetchAdvice();
    }
  }, [currentRole]);

  // --- Render Views ---

  const renderAccountsDashboard = () => {
    const pendingTotal = MOCK_INVOICES.filter(i => i.status === 'Pending').reduce((acc, curr) => acc + curr.amount, 0);
    const overdueTotal = MOCK_INVOICES.filter(i => i.status === 'Overdue').reduce((acc, curr) => acc + curr.amount, 0);
    const paidTotal = MOCK_INVOICES.filter(i => i.status === 'Paid').reduce((acc, curr) => acc + curr.amount, 0);

    const chartData = [
        { name: 'Paid', value: paidTotal, color: '#22c55e' },
        { name: 'Pending', value: pendingTotal, color: '#eab308' },
        { name: 'Overdue', value: overdueTotal, color: '#ef4444' }
    ];

    return (
        <div className="space-y-6">
            <h2 className="text-2xl font-bold text-slate-800">Accounts & Finance Overview</h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="bg-white p-6 rounded-xl shadow-sm border-l-4 border-l-yellow-400 border border-slate-200">
                    <div className="flex justify-between items-center mb-4">
                        <h3 className="text-slate-500 font-medium">Pending Invoices</h3>
                        <div className="p-2 bg-yellow-50 rounded-lg">
                            <Clock className="w-6 h-6 text-yellow-500" />
                        </div>
                    </div>
                    <p className="text-3xl font-bold text-slate-800">${pendingTotal.toLocaleString()}</p>
                    <p className="text-sm text-slate-400 mt-2">Requires approval or payment</p>
                </div>

                <div className="bg-white p-6 rounded-xl shadow-sm border-l-4 border-l-red-500 border border-slate-200">
                    <div className="flex justify-between items-center mb-4">
                        <h3 className="text-slate-500 font-medium">Overdue Amount</h3>
                        <div className="p-2 bg-red-50 rounded-lg">
                            <AlertCircle className="w-6 h-6 text-red-500" />
                        </div>
                    </div>
                    <p className="text-3xl font-bold text-slate-800">${overdueTotal.toLocaleString()}</p>
                    <p className="text-sm text-red-600 mt-2 font-medium">Immediate attention needed</p>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
                    <h3 className="text-lg font-semibold text-slate-800 mb-4">Payment Status Summary</h3>
                    <div className="h-64 w-full">
                        <ResponsiveContainer width="100%" height={256}>
                            <BarChart data={chartData}>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                                <XAxis dataKey="name" />
                                <YAxis />
                                <Tooltip cursor={{fill: 'transparent'}} />
                                <Bar dataKey="value" radius={[4, 4, 0, 0]} barSize={50}>
                                    {chartData.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={entry.color} />
                                    ))}
                                </Bar>
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                    <div className="p-4 border-b border-slate-100 bg-slate-50">
                        <h3 className="font-semibold text-slate-800 flex items-center">
                            <AlertCircle className="w-4 h-4 mr-2 text-red-500" /> Urgent: Overdue Items
                        </h3>
                    </div>
                    <div className="overflow-y-auto max-h-64">
                        <table className="w-full text-left text-sm">
                            <thead className="bg-slate-50 text-slate-500 sticky top-0">
                                <tr>
                                    <th className="p-3 font-medium">Client</th>
                                    <th className="p-3 font-medium">Due</th>
                                    <th className="p-3 font-medium text-right">Amount</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {MOCK_INVOICES.filter(i => i.status === 'Overdue').map(inv => (
                                    <tr key={inv.id}>
                                        <td className="p-3 font-medium text-slate-700">{inv.clientName}</td>
                                        <td className="p-3 text-red-500">{inv.dueDate}</td>
                                        <td className="p-3 text-right font-mono">${inv.amount.toLocaleString()}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
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