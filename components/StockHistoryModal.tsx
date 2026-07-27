import React, { useState, useEffect } from 'react';
import { X, History, Package, ArrowUpCircle, ArrowDownCircle, ArrowRightCircle, RefreshCw } from 'lucide-react';
import { StockMovement } from '../types';

interface StockHistoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  itemId: string;
  itemName: string;
  fetchHistory: (itemId: string) => Promise<StockMovement[]>;
}

const StockHistoryModal: React.FC<StockHistoryModalProps> = ({
  isOpen,
  onClose,
  itemId,
  itemName,
  fetchHistory
}) => {
  const [movements, setMovements] = useState<StockMovement[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (isOpen && itemId) {
      loadHistory();
    }
  }, [isOpen, itemId]);

  const loadHistory = async () => {
    setLoading(true);
    setError('');
    try {
      const history = await fetchHistory(itemId);
      setMovements(history);
    } catch (err: any) {
      setError(err.message || 'Failed to load stock movement history');
    } finally {
      setLoading(false);
    }
  };

  const getMovementIcon = (type: string) => {
    switch (type) {
      case 'GRN':
        return <ArrowUpCircle className="w-5 h-5 text-green-600" />;
      case 'SALE':
        return <ArrowDownCircle className="w-5 h-5 text-red-600" />;
      case 'TRANSFER':
        return <ArrowRightCircle className="w-5 h-5 text-blue-600" />;
      case 'RETURN':
        return <RefreshCw className="w-5 h-5 text-purple-600" />;
      default:
        return <Package className="w-5 h-5 text-slate-600" />;
    }
  };

  const getMovementBadgeColor = (type: string) => {
    switch (type) {
      case 'GRN':
        return 'bg-green-100 text-green-700 border-green-200';
      case 'SALE':
        return 'bg-red-100 text-red-700 border-red-200';
      case 'TRANSFER':
        return 'bg-blue-100 text-blue-700 border-blue-200';
      case 'RETURN':
        return 'bg-purple-100 text-purple-700 border-purple-200';
      case 'ADJUSTMENT':
        return 'bg-amber-100 text-amber-700 border-amber-200';
      default:
        return 'bg-slate-100 text-slate-700 border-slate-200';
    }
  };

  const getQuantityDisplay = (movement: StockMovement) => {
    const isPositive = movement.quantity > 0;
    const sign = isPositive ? '+' : '';
    const colorClass = isPositive ? 'text-green-600' : 'text-red-600';
    return (
      <span className={`font-mono font-bold ${colorClass}`}>
        {sign}{movement.quantity}
      </span>
    );
  };

  // Calculate running balance and summary statistics
  const calculateSummary = () => {
    if (movements.length === 0) {
      return {
        openingBalance: 0,
        closingBalance: 0,
        netChange: 0,
        transactionBreakdown: {},
        totalTransactions: 0
      };
    }

    // Sort movements by date (oldest first for running balance)
    const sortedMovements = [...movements].sort((a, b) =>
      new Date(a.date).getTime() - new Date(b.date).getTime()
    );

    // Calculate running balance
    let runningBalance = 0;
    const movementsWithBalance = sortedMovements.map(movement => {
      runningBalance += movement.quantity;
      return {
        ...movement,
        runningBalance
      };
    });

    // Calculate summary statistics
    const openingBalance = movementsWithBalance[0]?.runningBalance - movementsWithBalance[0]?.quantity || 0;
    const closingBalance = runningBalance;
    const netChange = closingBalance - openingBalance;

    // Transaction type breakdown
    const transactionBreakdown = movements.reduce((acc, movement) => {
      acc[movement.movementType] = (acc[movement.movementType] || 0) + Math.abs(movement.quantity);
      return acc;
    }, {} as Record<string, number>);

    return {
      openingBalance,
      closingBalance,
      netChange,
      transactionBreakdown,
      totalTransactions: movements.length,
      movementsWithBalance
    };
  };

  const summary = calculateSummary();

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl max-w-3xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-white border-b border-slate-200 px-6 py-4 flex items-center justify-between">
          <div>
            <h3 className="text-xl font-bold text-slate-800 flex items-center">
              <History className="w-5 h-5 mr-2 text-blue-600" />
              Stock Movement History
            </h3>
            <p className="text-sm text-slate-500">{itemName}</p>
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
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="text-center">
                <div className="w-12 h-12 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin mx-auto mb-4" />
                <p className="text-slate-600">Loading stock movement history...</p>
              </div>
            </div>
          ) : error ? (
            <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-lg text-sm">
              {error}
            </div>
          ) : movements.length === 0 ? (
            <div className="text-center py-12">
              <History className="w-16 h-16 text-slate-300 mx-auto mb-4" />
              <p className="text-slate-500 text-lg font-medium mb-2">No Stock Movements Found</p>
              <p className="text-slate-400 text-sm">This item has no recorded stock movements yet.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {/* Enhanced Summary */}
              <div className="bg-gradient-to-br from-slate-50 to-slate-100 border border-slate-200 rounded-lg p-4 mb-4">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
                  <div className="bg-white rounded-lg p-3 border border-slate-200">
                    <div className="text-lg font-bold text-blue-600">{summary.openingBalance}</div>
                    <div className="text-xs text-slate-500">Opening Balance</div>
                  </div>
                  <div className="bg-white rounded-lg p-3 border border-slate-200">
                    <div className="text-lg font-bold text-green-600">{summary.closingBalance}</div>
                    <div className="text-xs text-slate-500">Closing Balance</div>
                  </div>
                  <div className="bg-white rounded-lg p-3 border border-slate-200">
                    <div className={`text-lg font-bold ${summary.netChange >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                      {summary.netChange >= 0 ? '+' : ''}{summary.netChange}
                    </div>
                    <div className="text-xs text-slate-500">Net Change</div>
                  </div>
                  <div className="bg-white rounded-lg p-3 border border-slate-200">
                    <div className="text-lg font-bold text-slate-800">{summary.totalTransactions}</div>
                    <div className="text-xs text-slate-500">Total Transactions</div>
                  </div>
                </div>

                {/* Transaction Type Breakdown */}
                <div className="mt-3 pt-3 border-t border-slate-200">
                  <div className="text-xs font-medium text-slate-600 mb-2">Transaction Breakdown:</div>
                  <div className="flex flex-wrap gap-2">
                    {Object.entries(summary.transactionBreakdown).map(([type, quantity]) => (
                      <div key={type} className="text-xs bg-white border border-slate-200 rounded px-2 py-1">
                        <span className={`font-medium ${getMovementBadgeColor(type)}`}>{type}</span>
                        <span className="ml-1 text-slate-600">({Math.abs(quantity)})</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Movement List with Running Balance */}
              <div className="bg-white border border-slate-200 rounded-lg overflow-hidden">
                <table className="w-full">
                  <thead className="bg-slate-50 border-b border-slate-200">
                    <tr>
                      <th className="px-4 py-2 text-left text-xs font-medium text-slate-600">Type</th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-slate-600">Ref</th>
                      <th className="px-4 py-2 text-right text-xs font-medium text-slate-600">Quantity</th>
                      <th className="px-4 py-2 text-right text-xs font-medium text-slate-600">Balance</th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-slate-600">Date</th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-slate-600">User</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {summary.movementsWithBalance.map((movement, index) => (
                      <tr key={movement.id} className="hover:bg-slate-50">
                        <td className="px-4 py-3">
                          <div className="flex items-center space-x-2">
                            {getMovementIcon(movement.movementType)}
                            <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-bold border ${getMovementBadgeColor(movement.movementType)}`}>
                              {movement.movementType}
                            </span>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-sm text-slate-600 font-mono">
                          {movement.referenceNumber || '-'}
                        </td>
                        <td className="px-4 py-3 text-right">
                          {getQuantityDisplay(movement)}
                        </td>
                        <td className="px-4 py-3 text-right">
                          <span className="font-mono font-bold text-slate-800">
                            {movement.runningBalance}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-sm text-slate-600">
                          {new Date(movement.date).toLocaleDateString()}
                        </td>
                        <td className="px-4 py-3 text-sm text-slate-600">
                          {movement.performedBy || '-'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default StockHistoryModal;