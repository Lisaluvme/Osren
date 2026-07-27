import React, { useState, useMemo } from 'react';
import { X, AlertTriangle, Bell, Filter, CheckCircle, TrendingUp, ShoppingCart } from 'lucide-react';
import { InventoryItem } from '../types';

interface LowStockAlertModalProps {
  isOpen: boolean;
  onClose: () => void;
  inventory: InventoryItem[];
}

const LowStockAlertModal: React.FC<LowStockAlertModalProps> = ({
  isOpen,
  onClose,
  inventory
}) => {
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [alertSeverity, setAlertSeverity] = useState('All');

  // Calculate low stock items
  const stockAlerts = useMemo(() => {
    let alerts = inventory.map(item => {
      const quantity = item.quantity || 0;
      const minLevel = item.minLevel || 10;

      let severity: 'critical' | 'warning' | 'info';
      let urgency: number;

      if (quantity === 0) {
        severity = 'critical';
        urgency = 100;
      } else if (quantity <= minLevel * 0.2) {
        severity = 'critical';
        urgency = 80 + (1 - quantity / (minLevel * 0.2)) * 20;
      } else if (quantity <= minLevel) {
        severity = 'warning';
        urgency = 50 + (1 - quantity / minLevel) * 30;
      } else {
        severity = 'info';
        urgency = 0;
      }

      return {
        ...item,
        severity,
        urgency,
        daysUntilStockout: quantity > 0 ? Math.round(quantity / Math.max(1, minLevel / 30)) : 0
      };
    });

    // Filter out items that are not in alert status
    alerts = alerts.filter(item => item.severity !== 'info');

    // Apply filters
    if (selectedCategory !== 'All') {
      alerts = alerts.filter(item => item.category === selectedCategory);
    }
    if (alertSeverity !== 'All') {
      alerts = alerts.filter(item => item.severity === alertSeverity);
    }

    // Sort by urgency (highest first)
    alerts.sort((a, b) => b.urgency - a.urgency);

    return alerts;
  }, [inventory, selectedCategory, alertSeverity]);

  const categories = ['All', ...new Set(inventory.map(item => item.category))];

  const severityStats = useMemo(() => {
    const stats = {
      critical: inventory.filter(item => {
        const qty = item.quantity || 0;
        const min = item.minLevel || 10;
        return qty <= min * 0.2;
      }).length,
      warning: inventory.filter(item => {
        const qty = item.quantity || 0;
        const min = item.minLevel || 10;
        return qty > min * 0.2 && qty <= min;
      }).length,
      total: inventory.filter(item => {
        const qty = item.quantity || 0;
        const min = item.minLevel || 10;
        return qty <= min;
      }).length
    };
    return stats;
  }, [inventory]);

  const getSeverityBadge = (severity: string) => {
    switch (severity) {
      case 'critical':
        return (
          <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold bg-red-100 text-red-700 border border-red-200">
            <AlertTriangle className="w-3 h-3 mr-1" />
            Critical
          </span>
        );
      case 'warning':
        return (
          <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold bg-amber-100 text-amber-700 border border-amber-200">
            <AlertTriangle className="w-3 h-3 mr-1" />
            Warning
          </span>
        );
      default:
        return null;
    }
  };

  const getQuickReorderQuantity = (item: InventoryItem) => {
    const minLevel = item.minLevel || 10;
    const currentQty = item.quantity || 0;
    return Math.max(minLevel - currentQty, Math.round(minLevel * 0.5));
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl max-w-6xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-white border-b border-slate-200 px-6 py-4 flex items-center justify-between">
          <div>
            <h3 className="text-xl font-bold text-slate-800 flex items-center">
              <Bell className="w-5 h-5 mr-2 text-red-600" />
              Low Stock Alert System
            </h3>
            <p className="text-sm text-slate-500">Monitor and manage low stock items</p>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6">
          {/* Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-red-800">Critical Alerts</p>
                  <p className="text-3xl font-bold text-red-900">{severityStats.critical}</p>
                  <p className="text-xs text-red-700 mt-1">Items at 20% or below minimum</p>
                </div>
                <div className="bg-red-200 p-3 rounded-full">
                  <AlertTriangle className="w-8 h-8 text-red-700" />
                </div>
              </div>
            </div>

            <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-amber-800">Warning Alerts</p>
                  <p className="text-3xl font-bold text-amber-900">{severityStats.warning}</p>
                  <p className="text-xs text-amber-700 mt-1">Items below minimum level</p>
                </div>
                <div className="bg-amber-200 p-3 rounded-full">
                  <Bell className="w-8 h-8 text-amber-700" />
                </div>
              </div>
            </div>

            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-blue-800">Total Alerts</p>
                  <p className="text-3xl font-bold text-blue-900">{severityStats.total}</p>
                  <p className="text-xs text-blue-700 mt-1">Items requiring attention</p>
                </div>
                <div className="bg-blue-200 p-3 rounded-full">
                  <Filter className="w-8 h-8 text-blue-700" />
                </div>
              </div>
            </div>
          </div>

          {/* Filters */}
          <div className="flex items-center space-x-4 mb-4">
            <div className="flex items-center space-x-2">
              <Filter className="w-4 h-4 text-slate-400" />
              <span className="text-sm font-medium text-slate-700">Filter by:</span>
            </div>

            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500"
            >
              {categories.map(category => (
                <option key={category} value={category}>
                  {category === 'All' ? 'All Categories' : category}
                </option>
              ))}
            </select>

            <select
              value={alertSeverity}
              onChange={(e) => setAlertSeverity(e.target.value)}
              className="px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500"
            >
              <option value="All">All Severities</option>
              <option value="critical">Critical Only</option>
              <option value="warning">Warning Only</option>
            </select>
          </div>

          {/* Alerts Table */}
          <div className="border border-slate-200 rounded-lg overflow-hidden">
            <div className="overflow-x-auto max-h-96">
              <table className="w-full">
                <thead className="sticky top-0 bg-slate-50">
                  <tr className="text-xs text-slate-400 uppercase border-b border-slate-200">
                    <th className="px-4 py-3 text-left">Item</th>
                    <th className="px-4 py-3 text-center">Category</th>
                    <th className="px-4 py-3 text-center">Current Stock</th>
                    <th className="px-4 py-3 text-center">Min Level</th>
                    <th className="px-4 py-3 text-center">Status</th>
                    <th className="px-4 py-3 text-center">Est. Stockout</th>
                    <th className="px-4 py-3 text-right">Suggested Order</th>
                    <th className="px-4 py-3 text-center">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {stockAlerts.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="px-4 py-12 text-center">
                        <CheckCircle className="w-12 h-12 text-green-300 mx-auto mb-3" />
                        <p className="text-slate-500 text-lg font-medium">No Stock Alerts!</p>
                        <p className="text-slate-400 text-sm">All items are above minimum stock levels.</p>
                      </td>
                    </tr>
                  ) : (
                    stockAlerts.map((item, index) => {
                      const minLevel = item.minLevel || 10;
                      const suggestedOrder = getQuickReorderQuantity(item);

                      return (
                        <tr key={item.id} className={`border-b border-slate-100 transition-colors ${
                          index % 2 === 0 ? 'bg-white' : 'bg-slate-50'
                        } ${item.severity === 'critical' ? 'bg-red-50' : ''}`}>
                          <td className="px-4 py-3">
                            <div className="font-medium text-slate-800">{item.name}</div>
                            <div className="text-xs text-slate-500">{item.sku}</div>
                          </td>
                          <td className="px-4 py-3 text-center text-sm text-slate-600">{item.category}</td>
                          <td className="px-4 py-3 text-center">
                            <span className={`font-bold text-lg ${
                              item.quantity === 0 ? 'text-red-700' :
                              item.quantity <= minLevel * 0.2 ? 'text-red-600' :
                              'text-amber-600'
                            }`}>
                              {item.quantity}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-center text-sm text-slate-600">{minLevel}</td>
                          <td className="px-4 py-3 text-center">
                            {getSeverityBadge(item.severity)}
                          </td>
                          <td className="px-4 py-3 text-center text-sm text-slate-600">
                            {item.quantity === 0 ? (
                              <span className="text-red-700 font-medium">Now</span>
                            ) : item.daysUntilStockout <= 7 ? (
                              <span className="text-red-600 font-medium">{item.daysUntilStockout} days</span>
                            ) : item.daysUntilStockout <= 30 ? (
                              <span className="text-amber-600">{item.daysUntilStockout} days</span>
                            ) : (
                              <span className="text-slate-500">{item.daysUntilStockout} days</span>
                            )}
                          </td>
                          <td className="px-4 py-3 text-right">
                            <span className="font-semibold text-green-700">
                              {suggestedOrder} units
                            </span>
                          </td>
                          <td className="px-4 py-3 text-center">
                            <button className="px-3 py-1 text-xs font-medium text-green-600 bg-green-50 hover:bg-green-100 rounded border border-green-200 transition-colors flex items-center">
                              <ShoppingCart className="w-3 h-3 mr-1" />
                              Quick Reorder
                            </button>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Recommendations */}
          {stockAlerts.length > 0 && (
            <div className="mt-4 bg-blue-50 border border-blue-200 rounded-lg p-4">
              <div className="flex items-start space-x-3">
                <TrendingUp className="w-5 h-5 text-blue-600 mt-0.5" />
                <div className="flex-1">
                  <h4 className="text-sm font-semibold text-blue-900 mb-2">Recommendations</h4>
                  <ul className="text-xs text-blue-800 space-y-1">
                    <li>• <strong>Priority:</strong> Order critical items (0-20% of min level) immediately</li>
                    <li>• <strong>Planning:</strong> Review warning items and schedule orders within 7 days</li>
                    <li>• <strong>Prevention:</strong> Analyze sales patterns to adjust reorder levels</li>
                    <li>• <strong>Budget:</strong> Total estimated reorder cost: RM
                      {stockAlerts.reduce((sum, item) => {
                        const cost = item.unitCost || 0;
                        const qty = getQuickReorderQuantity(item);
                        return sum + (cost * qty);
                      }, 0).toLocaleString('en-MY', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </li>
                  </ul>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default LowStockAlertModal;