import React, { useState, useMemo } from 'react';
import { X, DollarSign, Package, Building2, TrendingUp, Download, Filter } from 'lucide-react';
import { InventoryItem } from '../types';

interface InventoryValuationReportProps {
  isOpen: boolean;
  onClose: () => void;
  inventory: InventoryItem[];
}

const InventoryValuationReport: React.FC<InventoryValuationReportProps> = ({
  isOpen,
  onClose,
  inventory
}) => {
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [selectedWarehouse, setSelectedWarehouse] = useState('All');

  // Calculate inventory valuation
  const valuationData = useMemo(() => {
    let filteredItems = inventory;

    if (selectedCategory !== 'All') {
      filteredItems = filteredItems.filter(item => item.category === selectedCategory);
    }

    // Calculate item values
    const itemsWithValue = filteredItems.map(item => {
      const unitCost = item.unitCost || 0;
      const quantity = item.quantity || 0;
      const stockValue = unitCost * quantity;

      // Calculate potential revenue (if all sold at selling price)
      const sellingPrice = item.sellingPrice || 0;
      const potentialRevenue = sellingPrice * quantity;

      // Calculate potential profit
      const potentialProfit = potentialRevenue - stockValue;

      return {
        ...item,
        stockValue,
        potentialRevenue,
        potentialProfit,
        profitMargin: stockValue > 0 ? (potentialProfit / stockValue) * 100 : 0
      };
    });

    // Calculate totals
    const totalStockValue = itemsWithValue.reduce((sum, item) => sum + item.stockValue, 0);
    const totalPotentialRevenue = itemsWithValue.reduce((sum, item) => sum + item.potentialRevenue, 0);
    const totalPotentialProfit = itemsWithValue.reduce((sum, item) => sum + item.potentialProfit, 0);

    // Calculate category breakdown
    const categoryBreakdown = itemsWithValue.reduce((acc, item) => {
      const category = item.category || 'Uncategorized';
      if (!acc[category]) {
        acc[category] = {
          category,
          totalValue: 0,
          itemCount: 0,
          totalQuantity: 0
        };
      }
      acc[category].totalValue += item.stockValue;
      acc[category].itemCount += 1;
      acc[category].totalQuantity += item.quantity || 0;
      return acc;
    }, {} as Record<string, any>);

    // Get high value items (top 10)
    const highValueItems = [...itemsWithValue]
      .sort((a, b) => b.stockValue - a.stockValue)
      .slice(0, 10);

    // Get low stock high value items (risk items)
    const riskItems = itemsWithValue.filter(item => {
      const isLowStock = item.quantity <= item.minLevel;
      const isHighValue = item.stockValue > 1000; // More than RM1000 in value
      return isLowStock && isHighValue;
    });

    return {
      itemsWithValue,
      totalStockValue,
      totalPotentialRevenue,
      totalPotentialProfit,
      categoryBreakdown: Object.values(categoryBreakdown).sort((a, b) => b.totalValue - a.totalValue),
      highValueItems,
      riskItems,
      averageProfitMargin: itemsWithValue.length > 0
        ? itemsWithValue.reduce((sum, item) => sum + item.profitMargin, 0) / itemsWithValue.length
        : 0
    };
  }, [inventory, selectedCategory]);

  const categories = ['All', ...new Set(inventory.map(item => item.category))];

  const handleExport = () => {
    // Create export data
    const exportData = valuationData.itemsWithValue.map(item => ({
      'Item Name': item.name,
      'SKU': item.sku,
      'Category': item.category,
      'Quantity': item.quantity,
      'Unit Cost': `RM${(item.unitCost || 0).toFixed(2)}`,
      'Stock Value': `RM${item.stockValue.toFixed(2)}`,
      'Selling Price': `RM${(item.sellingPrice || 0).toFixed(2)}`,
      'Potential Revenue': `RM${item.potentialRevenue.toFixed(2)}`,
      'Potential Profit': `RM${item.potentialProfit.toFixed(2)}`,
      'Profit Margin': `${item.profitMargin.toFixed(1)}%`,
      'Last Movement': item.lastMovement
    }));

    // Create CSV content
    const headers = Object.keys(exportData[0]);
    const csvContent = [
      headers.join(','),
      ...exportData.map(row => headers.map(header => `"${row[header]}"`).join(','))
    ].join('\n');

    // Download file
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `inventory-valuation-${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl max-w-7xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-white border-b border-slate-200 px-6 py-4 flex items-center justify-between">
          <div>
            <h3 className="text-xl font-bold text-slate-800 flex items-center">
              <DollarSign className="w-5 h-5 mr-2 text-green-600" />
              Inventory Valuation Report
            </h3>
            <p className="text-sm text-slate-500">Complete inventory value analysis and breakdown</p>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="bg-gradient-to-br from-green-50 to-green-100 border border-green-200 rounded-lg p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-green-800">Total Stock Value</p>
                  <p className="text-2xl font-bold text-green-900">
                    RM{valuationData.totalStockValue.toLocaleString('en-MY', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </p>
                </div>
                <div className="bg-green-200 p-3 rounded-full">
                  <DollarSign className="w-6 h-6 text-green-700" />
                </div>
              </div>
            </div>

            <div className="bg-gradient-to-br from-blue-50 to-blue-100 border border-blue-200 rounded-lg p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-blue-800">Potential Revenue</p>
                  <p className="text-2xl font-bold text-blue-900">
                    RM{valuationData.totalPotentialRevenue.toLocaleString('en-MY', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </p>
                </div>
                <div className="bg-blue-200 p-3 rounded-full">
                  <TrendingUp className="w-6 h-6 text-blue-700" />
                </div>
              </div>
            </div>

            <div className="bg-gradient-to-br from-purple-50 to-purple-100 border border-purple-200 rounded-lg p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-purple-800">Potential Profit</p>
                  <p className="text-2xl font-bold text-purple-900">
                    RM{valuationData.totalPotentialProfit.toLocaleString('en-MY', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </p>
                </div>
                <div className="bg-purple-200 p-3 rounded-full">
                  <Package className="w-6 h-6 text-purple-700" />
                </div>
              </div>
            </div>

            <div className="bg-gradient-to-br from-amber-50 to-amber-100 border border-amber-200 rounded-lg p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-amber-800">Avg Profit Margin</p>
                  <p className="text-2xl font-bold text-amber-900">
                    {valuationData.averageProfitMargin.toFixed(1)}%
                  </p>
                </div>
                <div className="bg-amber-200 p-3 rounded-full">
                  <TrendingUp className="w-6 h-6 text-amber-700" />
                </div>
              </div>
            </div>
          </div>

          {/* Filters */}
          <div className="flex items-center justify-between bg-slate-50 rounded-lg p-4">
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-2">
                <Filter className="w-4 h-4 text-slate-400" />
                <span className="text-sm font-medium text-slate-700">Filter by:</span>
              </div>

              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
              >
                {categories.map(category => (
                  <option key={category} value={category}>
                    {category === 'All' ? 'All Categories' : category}
                  </option>
                ))}
              </select>
            </div>

            <button
              onClick={handleExport}
              className="flex items-center px-4 py-2 text-sm font-medium text-green-600 bg-green-50 hover:bg-green-100 rounded-lg border border-green-300 transition-colors"
            >
              <Download className="w-4 h-4 mr-2" />
              Export to CSV
            </button>
          </div>

          {/* Category Breakdown */}
          <div className="bg-white border border-slate-200 rounded-lg p-4">
            <h4 className="text-lg font-semibold text-slate-800 mb-4 flex items-center">
              <Building2 className="w-5 h-5 mr-2 text-blue-600" />
              Value by Category
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {valuationData.categoryBreakdown.map((cat, index) => (
                <div key={index} className="bg-slate-50 rounded-lg p-3">
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-medium text-slate-800">{cat.category}</span>
                    <span className="text-sm text-slate-500">{cat.itemCount} items</span>
                  </div>
                  <div className="text-lg font-bold text-green-700">
                    RM{cat.totalValue.toLocaleString('en-MY', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </div>
                  <div className="text-xs text-slate-500">
                    {cat.totalQuantity.toLocaleString()} units total
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* High Value Items */}
          <div className="bg-white border border-slate-200 rounded-lg p-4">
            <h4 className="text-lg font-semibold text-slate-800 mb-4">Top 10 High-Value Items</h4>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="text-xs text-slate-400 uppercase border-b border-slate-100">
                    <th className="px-4 py-2 text-left">Item</th>
                    <th className="px-4 py-2 text-right">Quantity</th>
                    <th className="px-4 py-2 text-right">Unit Cost</th>
                    <th className="px-4 py-2 text-right">Stock Value</th>
                    <th className="px-4 py-2 text-right">Potential Profit</th>
                  </tr>
                </thead>
                <tbody>
                  {valuationData.highValueItems.map((item, index) => (
                    <tr key={item.id} className={`border-b border-slate-50 ${index % 2 === 0 ? 'bg-white' : 'bg-slate-50'}`}>
                      <td className="px-4 py-3">
                        <div className="font-medium text-slate-800">{item.name}</div>
                        <div className="text-xs text-slate-500">{item.sku}</div>
                      </td>
                      <td className="px-4 py-3 text-right text-sm text-slate-600">{item.quantity}</td>
                      <td className="px-4 py-3 text-right text-sm text-slate-600">
                        RM{(item.unitCost || 0).toFixed(2)}
                      </td>
                      <td className="px-4 py-3 text-right font-semibold text-green-700">
                        RM{item.stockValue.toFixed(2)}
                      </td>
                      <td className="px-4 py-3 text-right text-sm text-purple-700">
                        RM{item.potentialProfit.toFixed(2)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Risk Items Alert */}
          {valuationData.riskItems.length > 0 && (
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
              <h4 className="text-lg font-semibold text-amber-900 mb-3 flex items-center">
                <Package className="w-5 h-5 mr-2" />
                Low Stock - High Value Items ({valuationData.riskItems.length})
              </h4>
              <p className="text-sm text-amber-700 mb-3">
                These items are below minimum stock level but have high value (over RM1,000). Consider reordering soon.
              </p>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                {valuationData.riskItems.map((item, index) => (
                  <div key={index} className="bg-white border border-amber-300 rounded-lg p-3">
                    <div className="font-medium text-slate-800">{item.name}</div>
                    <div className="text-xs text-slate-500 mb-1">{item.sku}</div>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-amber-700 font-medium">{item.quantity} / {item.minLevel} units</span>
                      <span className="text-green-700 font-semibold">
                        RM{item.stockValue.toFixed(0)}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Detailed Table */}
          <div className="bg-white border border-slate-200 rounded-lg overflow-hidden">
            <div className="bg-slate-50 px-4 py-3 border-b border-slate-200">
              <h4 className="text-lg font-semibold text-slate-800">Detailed Valuation</h4>
            </div>
            <div className="overflow-x-auto max-h-96">
              <table className="w-full">
                <thead className="sticky top-0 bg-white">
                  <tr className="text-xs text-slate-400 uppercase border-b border-slate-200">
                    <th className="px-4 py-3 text-left">Item</th>
                    <th className="px-4 py-3 text-center">Category</th>
                    <th className="px-4 py-3 text-right">Quantity</th>
                    <th className="px-4 py-3 text-right">Unit Cost</th>
                    <th className="px-4 py-3 text-right">Stock Value</th>
                    <th className="px-4 py-3 text-right">Selling Price</th>
                    <th className="px-4 py-3 text-right">Potential Revenue</th>
                    <th className="px-4 py-3 text-right">Potential Profit</th>
                    <th className="px-4 py-3 text-right">Profit Margin</th>
                  </tr>
                </thead>
                <tbody>
                  {valuationData.itemsWithValue.map((item, index) => (
                    <tr key={item.id} className={`border-b border-slate-100 transition-colors ${
                      index % 2 === 0 ? 'bg-white' : 'bg-slate-50'
                    }`}>
                      <td className="px-4 py-3">
                        <div className="font-medium text-slate-800">{item.name}</div>
                        <div className="text-xs text-slate-500">{item.sku}</div>
                      </td>
                      <td className="px-4 py-3 text-center text-sm text-slate-600">{item.category}</td>
                      <td className="px-4 py-3 text-right text-sm text-slate-600">{item.quantity}</td>
                      <td className="px-4 py-3 text-right text-sm text-slate-600">
                        RM{(item.unitCost || 0).toFixed(2)}
                      </td>
                      <td className="px-4 py-3 text-right font-semibold text-green-700">
                        RM{item.stockValue.toFixed(2)}
                      </td>
                      <td className="px-4 py-3 text-right text-sm text-slate-600">
                        RM{(item.sellingPrice || 0).toFixed(2)}
                      </td>
                      <td className="px-4 py-3 text-right text-sm text-blue-700">
                        RM{item.potentialRevenue.toFixed(2)}
                      </td>
                      <td className="px-4 py-3 text-right text-sm text-purple-700">
                        RM{item.potentialProfit.toFixed(2)}
                      </td>
                      <td className="px-4 py-3 text-right text-sm">
                        <span className={`font-medium ${
                          item.profitMargin >= 50 ? 'text-green-700' :
                          item.profitMargin >= 30 ? 'text-amber-700' :
                          'text-red-700'
                        }`}>
                          {item.profitMargin.toFixed(1)}%
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default InventoryValuationReport;