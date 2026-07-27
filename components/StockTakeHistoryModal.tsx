import React, { useState, useEffect } from 'react';
import { X, Package, Clock, CheckCircle, AlertTriangle, Calendar } from 'lucide-react';
import { StockTake } from '../types';

interface StockTakeHistoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  fetchHistory: () => Promise<StockTake[]>;
  onApprove?: (stockTakeId: string) => Promise<void>;
  canApprove?: boolean;
}

const StockTakeHistoryModal: React.FC<StockTakeHistoryModalProps> = ({
  isOpen,
  onClose,
  fetchHistory,
  onApprove,
  canApprove = false
}) => {
  const [stockTakes, setStockTakes] = useState<StockTake[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      loadHistory();
    }
  }, [isOpen]);

  const loadHistory = async () => {
    setLoading(true);
    setError('');
    try {
      const history = await fetchHistory();
      // Sort by date descending (newest first)
      history.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      setStockTakes(history);
    } catch (err: any) {
      setError(err.message || 'Failed to load stock take history');
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (stockTakeId: string) => {
    if (!onApprove) return;
    setActionLoading(stockTakeId);
    try {
      await onApprove(stockTakeId);
      await loadHistory();
    } catch (err: any) {
      setError(err.message || 'Failed to approve stock take');
    } finally {
      setActionLoading(null);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'DRAFT':
        return (
          <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold bg-slate-100 text-slate-700 border border-slate-200">
            <Clock className="w-3 h-3 mr-1" />
            Draft
          </span>
        );
      case 'SUBMITTED':
        return (
          <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold bg-amber-100 text-amber-700 border border-amber-200">
            <Clock className="w-3 h-3 mr-1" />
            Submitted
          </span>
        );
      case 'APPROVED':
        return (
          <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold bg-green-100 text-green-700 border border-green-200">
            <CheckCircle className="w-3 h-3 mr-1" />
            Approved
          </span>
        );
      case 'REJECTED':
        return (
          <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold bg-red-100 text-red-700 border border-red-200">
            <AlertTriangle className="w-3 h-3 mr-1" />
            Rejected
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold bg-slate-100 text-slate-700 border border-slate-200">
            {status}
          </span>
        );
    }
  };

  const getVarianceBadge = (variance: number) => {
    if (variance === 0) {
      return (
        <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold bg-green-100 text-green-700 border border-green-200">
          <CheckCircle className="w-3 h-3 mr-1" />
          Perfect Match
        </span>
      );
    } else if (variance > 0) {
      return (
        <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold bg-blue-100 text-blue-700 border border-blue-200">
          Surplus (+{variance})
        </span>
      );
    } else {
      return (
        <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold bg-amber-100 text-amber-700 border border-amber-200">
          Shortage ({variance})
        </span>
      );
    }
  };

  const getActionsForStatus = (stockTake: StockTake) => {
    if (stockTake.status === 'SUBMITTED' && canApprove) {
      return (
        <button
          onClick={() => handleApprove(stockTake.id)}
          disabled={actionLoading === stockTake.id}
          className="px-3 py-1 text-xs font-medium text-green-600 bg-green-50 hover:bg-green-100 rounded border border-green-200 transition-colors disabled:opacity-50"
        >
          Approve & Adjust
        </button>
      );
    }
    return null;
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-white border-b border-slate-200 px-6 py-4 flex items-center justify-between">
          <div>
            <h3 className="text-xl font-bold text-slate-800 flex items-center">
              <Package className="w-5 h-5 mr-2 text-purple-600" />
              Stock Take History
            </h3>
            <p className="text-sm text-slate-500">View and manage physical count records</p>
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
                <div className="w-12 h-12 border-4 border-purple-200 border-t-purple-600 rounded-full animate-spin mx-auto mb-4" />
                <p className="text-slate-600">Loading stock take history...</p>
              </div>
            </div>
          ) : error ? (
            <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-lg text-sm">
              {error}
            </div>
          ) : stockTakes.length === 0 ? (
            <div className="text-center py-12">
              <Package className="w-16 h-16 text-slate-300 mx-auto mb-4" />
              <p className="text-slate-500 text-lg font-medium mb-2">No Stock Take Records Found</p>
              <p className="text-slate-400 text-sm">No physical stock counts have been performed yet.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {/* Summary */}
              <div className="bg-slate-50 rounded-lg p-4 mb-4">
                <div className="grid grid-cols-4 gap-4 text-center">
                  <div>
                    <div className="text-2xl font-bold text-slate-800">{stockTakes.length}</div>
                    <div className="text-xs text-slate-500">Total Counts</div>
                  </div>
                  <div>
                    <div className="text-2xl font-bold text-green-600">
                      {stockTakes.filter(st => st.variance === 0).length}
                    </div>
                    <div className="text-xs text-slate-500">Perfect Matches</div>
                  </div>
                  <div>
                    <div className="text-2xl font-bold text-blue-600">
                      {stockTakes.filter(st => st.variance > 0).length}
                    </div>
                    <div className="text-xs text-slate-500">Surplus</div>
                  </div>
                  <div>
                    <div className="text-2xl font-bold text-amber-600">
                      {stockTakes.filter(st => st.variance < 0).length}
                    </div>
                    <div className="text-xs text-slate-500">Shortages</div>
                  </div>
                </div>
              </div>

              {/* Stock Take List */}
              {stockTakes.map((stockTake, index) => (
                <div
                  key={stockTake.id}
                  className={`border rounded-lg p-4 transition-colors ${
                    index % 2 === 0 ? 'bg-white border-slate-200' : 'bg-slate-50 border-slate-200'
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex items-start space-x-3 flex-1">
                      {/* Icon */}
                      <div className="flex-shrink-0 mt-1">
                        <Package className="w-5 h-5 text-purple-600" />
                      </div>

                      {/* Details */}
                      <div className="flex-1">
                        <div className="flex items-center space-x-2 mb-2">
                          <span className="font-mono text-sm font-semibold text-slate-800">
                            {stockTake.stockTakeNumber}
                          </span>
                          {getStatusBadge(stockTake.status)}
                          {getVarianceBadge(stockTake.variance)}
                        </div>

                        <div className="grid grid-cols-2 gap-2 text-sm mb-2">
                          <div className="flex items-center space-x-2">
                            <Calendar className="w-4 h-4 text-slate-400" />
                            <span className="text-slate-500">Date:</span>
                            <span className="text-slate-800">{stockTake.date}</span>
                          </div>
                          <div>
                            <span className="text-slate-500">Warehouse:</span>
                            <span className="ml-2 text-slate-800">{stockTake.warehouse}</span>
                          </div>
                        </div>

                        <div className="grid grid-cols-3 gap-2 text-sm mb-2">
                          <div>
                            <span className="text-slate-500">Item:</span>
                            <span className="ml-2 font-medium text-slate-800">{stockTake.itemName}</span>
                          </div>
                          <div>
                            <span className="text-slate-500">System:</span>
                            <span className="ml-2 text-slate-800">{stockTake.systemQuantity}</span>
                          </div>
                          <div>
                            <span className="text-slate-500">Actual:</span>
                            <span className="ml-2 font-bold text-slate-800">{stockTake.actualQuantity}</span>
                          </div>
                        </div>

                        {stockTake.varianceReason && (
                          <div className="mt-2 text-sm">
                            <span className="text-slate-500">Reason:</span>
                            <span className="ml-2 text-amber-700 font-medium">{stockTake.varianceReason}</span>
                          </div>
                        )}

                        {stockTake.remarks && (
                          <div className="mt-2 text-sm">
                            <span className="text-slate-500">Remarks:</span>
                            <span className="ml-2 text-slate-800">{stockTake.remarks}</span>
                          </div>
                        )}

                        {stockTake.performedBy && (
                          <div className="mt-2 text-xs text-slate-500">
                            Performed by {stockTake.performedBy} on {new Date(stockTake.createdAt).toLocaleString()}
                          </div>
                        )}

                        {stockTake.status === 'APPROVED' && stockTake.approvedBy && (
                          <div className="mt-2 text-xs text-slate-500">
                            Approved by {stockTake.approvedBy} on {new Date(stockTake.approvedAt || '').toLocaleString()}
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex-shrink-0 ml-4">
                      {getActionsForStatus(stockTake)}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default StockTakeHistoryModal;