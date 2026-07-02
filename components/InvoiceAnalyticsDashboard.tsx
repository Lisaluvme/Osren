import React, { useState, useEffect } from 'react';
import { Invoice } from '../types';
import { calculateInvoiceAnalytics, generateAgingReport, generatePaymentPerformanceReport, InvoiceAnalytics } from '../lib/invoiceAnalytics';
import { TrendingUp, TrendingDown, DollarSign, Clock, AlertCircle, CheckCircle, BarChart3, PieChart } from 'lucide-react';

interface InvoiceAnalyticsDashboardProps {
  invoices: Invoice[];
  refreshTrigger?: number;
}

const InvoiceAnalyticsDashboard: React.FC<InvoiceAnalyticsDashboardProps> = ({ invoices, refreshTrigger = 0 }) => {
  const [analytics, setAnalytics] = useState<InvoiceAnalytics | null>(null);
  const [agingReport, setAgingReport] = useState<any>(null);
  const [performanceReport, setPerformanceReport] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [selectedView, setSelectedView] = useState<'overview' | 'aging' | 'trends' | 'performance'>('overview');

  useEffect(() => {
    loadAnalytics();
  }, [invoices, refreshTrigger]);

  const loadAnalytics = () => {
    setLoading(true);
    try {
      const analyticsData = calculateInvoiceAnalytics(invoices);
      const agingData = generateAgingReport(invoices);
      const performanceData = generatePaymentPerformanceReport(invoices);

      setAnalytics(analyticsData);
      setAgingReport(agingData);
      setPerformanceReport(performanceData);
    } catch (error) {
      console.error('Error loading analytics:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-8 flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin mx-auto mb-4"/>
          <p className="text-slate-600">Loading analytics...</p>
        </div>
      </div>
    );
  }

  if (!analytics) {
    return (
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-8">
        <p className="text-center text-slate-500">No analytics data available</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-slate-800">Invoice Analytics Dashboard</h2>
        <div className="flex gap-2">
          <button
            onClick={() => setSelectedView('overview')}
            className={`px-4 py-2 rounded-lg font-semibold transition-colors ${
              selectedView === 'overview' ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            Overview
          </button>
          <button
            onClick={() => setSelectedView('aging')}
            className={`px-4 py-2 rounded-lg font-semibold transition-colors ${
              selectedView === 'aging' ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            Aging Report
          </button>
          <button
            onClick={() => setSelectedView('trends')}
            className={`px-4 py-2 rounded-lg font-semibold transition-colors ${
              selectedView === 'trends' ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            Trends
          </button>
          <button
            onClick={() => setSelectedView('performance')}
            className={`px-4 py-2 rounded-lg font-semibold transition-colors ${
              selectedView === 'performance' ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            Performance
          </button>
        </div>
      </div>

      {/* Overview View */}
      {selectedView === 'overview' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {/* Total Revenue */}
          <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl p-6 text-white">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-blue-100 text-sm font-medium">Total Revenue</p>
                <p className="text-3xl font-bold mt-2">RM {analytics.overview.totalRevenue.toFixed(2)}</p>
              </div>
              <div className="bg-blue-400 p-3 rounded-lg">
                <DollarSign className="w-6 h-6" />
              </div>
            </div>
          </div>

          {/* Total Paid */}
          <div className="bg-gradient-to-br from-green-500 to-green-600 rounded-xl p-6 text-white">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-green-100 text-sm font-medium">Total Paid</p>
                <p className="text-3xl font-bold mt-2">RM {analytics.overview.totalPaid.toFixed(2)}</p>
              </div>
              <div className="bg-green-400 p-3 rounded-lg">
                <CheckCircle className="w-6 h-6" />
              </div>
            </div>
          </div>

          {/* Total Outstanding */}
          <div className="bg-gradient-to-br from-orange-500 to-orange-600 rounded-xl p-6 text-white">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-orange-100 text-sm font-medium">Outstanding</p>
                <p className="text-3xl font-bold mt-2">RM {analytics.overview.totalOutstanding.toFixed(2)}</p>
              </div>
              <div className="bg-orange-400 p-3 rounded-lg">
                <Clock className="w-6 h-6" />
              </div>
            </div>
          </div>

          {/* Total Overdue */}
          <div className="bg-gradient-to-br from-red-500 to-red-600 rounded-xl p-6 text-white">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-red-100 text-sm font-medium">Overdue</p>
                <p className="text-3xl font-bold mt-2">RM {analytics.overview.totalOverdue.toFixed(2)}</p>
              </div>
              <div className="bg-red-400 p-3 rounded-lg">
                <AlertCircle className="w-6 h-6" />
              </div>
            </div>
          </div>

          {/* Payment Rate */}
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-slate-500 text-sm font-medium">Payment Rate</p>
                <p className="text-2xl font-bold text-slate-800 mt-2">{analytics.overview.paymentRate.toFixed(1)}%</p>
              </div>
              <div className="bg-blue-100 p-3 rounded-lg">
                <PieChart className="w-6 h-6 text-blue-600" />
              </div>
            </div>
          </div>

          {/* Average Invoice Value */}
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-slate-500 text-sm font-medium">Avg Invoice Value</p>
                <p className="text-2xl font-bold text-slate-800 mt-2">RM {analytics.overview.averageInvoiceValue.toFixed(2)}</p>
              </div>
              <div className="bg-green-100 p-3 rounded-lg">
                <TrendingUp className="w-6 h-6 text-green-600" />
              </div>
            </div>
          </div>

          {/* Next Month Forecast */}
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-slate-500 text-sm font-medium">Next Month Forecast</p>
                <p className="text-2xl font-bold text-slate-800 mt-2">RM {analytics.forecasts.nextMonthRevenue.toFixed(2)}</p>
              </div>
              <div className="bg-purple-100 p-3 rounded-lg">
                <BarChart3 className="w-6 h-6 text-purple-600" />
              </div>
            </div>
          </div>

          {/* Outstanding Collection Potential */}
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-slate-500 text-sm font-medium">Collection Potential</p>
                <p className="text-2xl font-bold text-slate-800 mt-2">RM {analytics.forecasts.outstandingCollection.toFixed(2)}</p>
              </div>
              <div className="bg-indigo-100 p-3 rounded-lg">
                <TrendingUp className="w-6 h-6 text-indigo-600" />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Aging Report View */}
      {selectedView === 'aging' && agingReport && (
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
          <div className="p-6 border-b border-slate-200">
            <h3 className="text-lg font-bold text-slate-800">Accounts Receivable Aging Report</h3>
            <p className="text-slate-500 text-sm mt-1">
              Total Outstanding: RM {agingReport.summary.totalOutstanding.toFixed(2)} |
              Overdue: RM {agingReport.summary.totalOverdue.toFixed(2)} ({agingReport.summary.overduePercentage.toFixed(1)}%)
            </p>
          </div>

          <div className="p-6">
            {/* Aging Categories */}
            <div className="space-y-4">
              {agingReport.categories.map((category: any) => (
                <div key={category.name} className="flex items-center">
                  <div className="w-40 text-sm font-medium text-slate-700">{category.name}</div>
                  <div className="flex-1 mx-4">
                    <div className="bg-slate-100 rounded-full h-6 overflow-hidden">
                      <div
                        className={`h-full rounded-full ${
                          category.name === 'Current' ? 'bg-green-500' :
                          category.name === '1-30 Days' ? 'bg-yellow-500' :
                          category.name === '31-60 Days' ? 'bg-orange-500' :
                          category.name === '61-90 Days' ? 'bg-red-500' :
                          'bg-red-700'
                        }`}
                        style={{ width: `${Math.min(category.percentage, 100)}%` }}
                      />
                    </div>
                  </div>
                  <div className="w-24 text-right">
                    <p className="text-sm font-semibold text-slate-800">{category.count} invoices</p>
                    <p className="text-xs text-slate-500">RM {category.amount.toFixed(2)}</p>
                  </div>
                  <div className="w-16 text-right text-sm font-semibold text-slate-600">
                    {category.percentage.toFixed(1)}%
                  </div>
                </div>
              ))}
            </div>

            {/* Risk Assessment */}
            <div className="mt-8 pt-6 border-t border-slate-200">
              <h4 className="text-sm font-bold text-slate-700 mb-4">Risk Assessment</h4>
              <div className="grid grid-cols-4 gap-4">
                <div className="bg-green-50 border border-green-200 rounded-lg p-4 text-center">
                  <p className="text-green-600 text-2xl font-bold">RM {agingReport.riskAssessment.low.toFixed(2)}</p>
                  <p className="text-green-700 text-xs mt-1">Low Risk</p>
                </div>
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 text-center">
                  <p className="text-yellow-600 text-2xl font-bold">RM {agingReport.riskAssessment.medium.toFixed(2)}</p>
                  <p className="text-yellow-700 text-xs mt-1">Medium Risk</p>
                </div>
                <div className="bg-orange-50 border border-orange-200 rounded-lg p-4 text-center">
                  <p className="text-orange-600 text-2xl font-bold">RM {agingReport.riskAssessment.high.toFixed(2)}</p>
                  <p className="text-orange-700 text-xs mt-1">High Risk</p>
                </div>
                <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-center">
                  <p className="text-red-600 text-2xl font-bold">RM {agingReport.riskAssessment.critical.toFixed(2)}</p>
                  <p className="text-red-700 text-xs mt-1">Critical Risk</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Trends View */}
      {selectedView === 'trends' && (
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
          <div className="p-6 border-b border-slate-200">
            <h3 className="text-lg font-bold text-slate-800">Monthly Revenue Trends</h3>
          </div>

          <div className="p-6">
            <table className="w-full">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200">
                  <th className="p-3 text-left text-xs font-semibold text-slate-700 uppercase">Month</th>
                  <th className="p-3 text-right text-xs font-semibold text-slate-700 uppercase">Revenue</th>
                  <th className="p-3 text-center text-xs font-semibold text-slate-700 uppercase">Paid</th>
                  <th className="p-3 text-center text-xs font-semibold text-slate-700 uppercase">Outstanding</th>
                </tr>
              </thead>
              <tbody>
                {analytics.monthlyTrends.map((trend, index) => (
                  <tr key={index} className="border-b border-slate-100 hover:bg-slate-50">
                    <td className="p-3 text-slate-800 font-medium">{trend.month}</td>
                    <td className="p-3 text-right text-green-600 font-semibold">RM {trend.revenue.toFixed(2)}</td>
                    <td className="p-3 text-center text-slate-600">{trend.invoicesPaid}</td>
                    <td className="p-3 text-center text-slate-600">{trend.invoicesOutstanding}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Performance View */}
      {selectedView === 'performance' && performanceReport && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
            <h4 className="text-lg font-bold text-slate-800 mb-4">Payment Performance</h4>
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <span className="text-slate-600">Total Invoices</span>
                <span className="font-semibold text-slate-800">{performanceReport.totalInvoices}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-600">Paid Invoices</span>
                <span className="font-semibold text-green-600">{performanceReport.paidInvoices}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-600">Payment Rate</span>
                <span className="font-semibold text-blue-600">{performanceReport.paymentRate.toFixed(1)}%</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-600">Average Payment Time</span>
                <span className="font-semibold text-slate-800">{performanceReport.averagePaymentTime.toFixed(0)} days</span>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
            <h4 className="text-lg font-bold text-slate-800 mb-4">On-Time vs Late Payments</h4>
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <span className="text-slate-600">On-Time Payments</span>
                <span className="font-semibold text-green-600">{performanceReport.onTimePayments}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-600">Late Payments</span>
                <span className="font-semibold text-red-600">{performanceReport.latePayments}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-600">On-Time Rate</span>
                <span className="font-semibold text-blue-600">{performanceReport.onTimePaymentRate.toFixed(1)}%</span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default InvoiceAnalyticsDashboard;