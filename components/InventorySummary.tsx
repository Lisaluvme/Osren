import React from 'react';
import { Package, Boxes, DollarSign, AlertTriangle, AlertCircle, Clock } from 'lucide-react';

interface InventorySummaryData {
  totalSKU: number;
  totalStockQuantity: number;
  totalInventoryValue: number;
  lowStockItems: number;
  outOfStockItems: number;
  criticalItems: number;
  pendingGRN: number;
  pendingTransfers: number;
  pendingStockTakes: number;
}

interface InventorySummaryProps {
  summary: InventorySummaryData;
  onLowStockClick?: () => void;
  onOutOfStockClick?: () => void;
  onPendingActionsClick?: () => void;
}

const InventorySummary: React.FC<InventorySummaryProps> = ({
  summary,
  onLowStockClick,
  onOutOfStockClick,
  onPendingActionsClick
}) => {
  const pendingTotal = summary.pendingGRN + summary.pendingTransfers + summary.pendingStockTakes;

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4 mb-6">
      {/* Total SKU Card */}
      <div className="bg-gradient-to-br from-blue-50 to-blue-100 border border-blue-200 rounded-lg p-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-blue-800">Total SKU</p>
            <p className="text-2xl font-bold text-blue-900">{summary.totalSKU}</p>
          </div>
          <div className="bg-blue-200 p-3 rounded-full">
            <Package className="w-6 h-6 text-blue-700" />
          </div>
        </div>
      </div>

      {/* Total Stock Quantity Card */}
      <div className="bg-gradient-to-br from-green-50 to-green-100 border border-green-200 rounded-lg p-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-green-800">Stock Quantity</p>
            <p className="text-2xl font-bold text-green-900">{summary.totalStockQuantity.toLocaleString()}</p>
          </div>
          <div className="bg-green-200 p-3 rounded-full">
            <Boxes className="w-6 h-6 text-green-700" />
          </div>
        </div>
      </div>

      {/* Total Inventory Value Card */}
      <div className="bg-gradient-to-br from-purple-50 to-purple-100 border border-purple-200 rounded-lg p-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-purple-800">Stock Value</p>
            <p className="text-2xl font-bold text-purple-900">
              RM{summary.totalInventoryValue.toLocaleString('en-MY', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
            </p>
          </div>
          <div className="bg-purple-200 p-3 rounded-full">
            <DollarSign className="w-6 h-6 text-purple-700" />
          </div>
        </div>
      </div>

      {/* Low Stock Items Card */}
      <div
        className={`bg-gradient-to-br border rounded-lg p-4 transition-colors cursor-pointer ${
          summary.lowStockItems > 0
            ? 'from-amber-50 to-amber-100 border-amber-200 hover:from-amber-100 hover:to-amber-200'
            : 'from-slate-50 to-slate-100 border-slate-200'
        }`}
        onClick={summary.lowStockItems > 0 ? onLowStockClick : undefined}
      >
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-amber-800">Low Stock Items</p>
            <p className={`text-2xl font-bold ${summary.lowStockItems > 0 ? 'text-amber-900' : 'text-slate-600'}`}>
              {summary.lowStockItems}
            </p>
          </div>
          <div className={`p-3 rounded-full ${summary.lowStockItems > 0 ? 'bg-amber-200' : 'bg-slate-200'}`}>
            <AlertTriangle className={`w-6 h-6 ${summary.lowStockItems > 0 ? 'text-amber-700' : 'text-slate-500'}`} />
          </div>
        </div>
      </div>

      {/* Out of Stock Items Card */}
      <div
        className={`bg-gradient-to-br border rounded-lg p-4 transition-colors cursor-pointer ${
          summary.outOfStockItems > 0
            ? 'from-red-50 to-red-100 border-red-200 hover:from-red-100 hover:to-red-200'
            : 'from-slate-50 to-slate-100 border-slate-200'
        }`}
        onClick={summary.outOfStockItems > 0 ? onOutOfStockClick : undefined}
      >
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-red-800">Out of Stock</p>
            <p className={`text-2xl font-bold ${summary.outOfStockItems > 0 ? 'text-red-900' : 'text-slate-600'}`}>
              {summary.outOfStockItems}
            </p>
          </div>
          <div className={`p-3 rounded-full ${summary.outOfStockItems > 0 ? 'bg-red-200' : 'bg-slate-200'}`}>
            <AlertCircle className={`w-6 h-6 ${summary.outOfStockItems > 0 ? 'text-red-700' : 'text-slate-500'}`} />
          </div>
        </div>
      </div>

      {/* Pending Actions Card */}
      <div
        className={`bg-gradient-to-br border rounded-lg p-4 transition-colors cursor-pointer ${
          pendingTotal > 0
            ? 'from-slate-50 to-slate-100 border-slate-200 hover:from-slate-100 hover:to-slate-200'
            : 'from-slate-50 to-slate-100 border-slate-200'
        }`}
        onClick={pendingTotal > 0 ? onPendingActionsClick : undefined}
      >
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-slate-700">Pending Actions</p>
            <p className="text-2xl font-bold text-slate-900">{pendingTotal}</p>
            {pendingTotal > 0 && (
              <p className="text-xs text-slate-500">
                {summary.pendingGRN} GRN, {summary.pendingTransfers} Transfers, {summary.pendingStockTakes} Stock Takes
              </p>
            )}
          </div>
          <div className="bg-slate-200 p-3 rounded-full">
            <Clock className="w-6 h-6 text-slate-700" />
          </div>
        </div>
      </div>
    </div>
  );
};

export default InventorySummary;