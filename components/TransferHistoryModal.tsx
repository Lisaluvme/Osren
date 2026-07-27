import React, { useState, useEffect } from 'react';
import { X, ArrowRight, Package, Clock, CheckCircle, XCircle, AlertCircle } from 'lucide-react';
import { StockTransfer } from '../types';

interface TransferHistoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  fetchHistory: () => Promise<StockTransfer[]>;
  onApprove?: (transferId: string) => Promise<void>;
  onReject?: (transferId: string) => Promise<void>;
  onComplete?: (transferId: string) => Promise<void>;
  canApprove?: boolean;
}

const TransferHistoryModal: React.FC<TransferHistoryModalProps> = ({
  isOpen,
  onClose,
  fetchHistory,
  onApprove,
  onReject,
  onComplete,
  canApprove = false
}) => {
  const [transfers, setTransfers] = useState<StockTransfer[]>([]);
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
      setTransfers(history);
    } catch (err: any) {
      setError(err.message || 'Failed to load transfer history');
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (transferId: string) => {
    if (!onApprove) return;
    setActionLoading(transferId);
    try {
      await onApprove(transferId);
      await loadHistory();
    } catch (err: any) {
      setError(err.message || 'Failed to approve transfer');
    } finally {
      setActionLoading(null);
    }
  };

  const handleReject = async (transferId: string) => {
    if (!onReject) return;
    setActionLoading(transferId);
    try {
      await onReject(transferId);
      await loadHistory();
    } catch (err: any) {
      setError(err.message || 'Failed to reject transfer');
    } finally {
      setActionLoading(null);
    }
  };

  const handleComplete = async (transferId: string) => {
    if (!onComplete) return;
    setActionLoading(transferId);
    try {
      await onComplete(transferId);
      await loadHistory();
    } catch (err: any) {
      setError(err.message || 'Failed to complete transfer');
    } finally {
      setActionLoading(null);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'PENDING':
        return (
          <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold bg-amber-100 text-amber-700 border border-amber-200">
            <Clock className="w-3 h-3 mr-1" />
            Pending
          </span>
        );
      case 'APPROVED':
        return (
          <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold bg-blue-100 text-blue-700 border border-blue-200">
            <CheckCircle className="w-3 h-3 mr-1" />
            Approved
          </span>
        );
      case 'REJECTED':
        return (
          <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold bg-red-100 text-red-700 border border-red-200">
            <XCircle className="w-3 h-3 mr-1" />
            Rejected
          </span>
        );
      case 'COMPLETED':
        return (
          <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold bg-green-100 text-green-700 border border-green-200">
            <CheckCircle className="w-3 h-3 mr-1" />
            Completed
          </span>
        );
      case 'CANCELLED':
        return (
          <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold bg-slate-100 text-slate-700 border border-slate-200">
            <XCircle className="w-3 h-3 mr-1" />
            Cancelled
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold bg-slate-100 text-slate-700 border border-slate-200">
            <AlertCircle className="w-3 h-3 mr-1" />
            {status}
          </span>
        );
    }
  };

  const getActionsForStatus = (transfer: StockTransfer) => {
    if (transfer.status === 'PENDING' && canApprove) {
      return (
        <div className="flex space-x-2">
          <button
            onClick={() => handleApprove(transfer.id)}
            disabled={actionLoading === transfer.id}
            className="px-3 py-1 text-xs font-medium text-green-600 bg-green-50 hover:bg-green-100 rounded border border-green-200 transition-colors disabled:opacity-50"
          >
            Approve
          </button>
          <button
            onClick={() => handleReject(transfer.id)}
            disabled={actionLoading === transfer.id}
            className="px-3 py-1 text-xs font-medium text-red-600 bg-red-50 hover:bg-red-100 rounded border border-red-200 transition-colors disabled:opacity-50"
          >
            Reject
          </button>
        </div>
      );
    }
    if (transfer.status === 'APPROVED' && canApprove) {
      return (
        <button
          onClick={() => handleComplete(transfer.id)}
          disabled={actionLoading === transfer.id}
          className="px-3 py-1 text-xs font-medium text-blue-600 bg-blue-50 hover:bg-blue-100 rounded border border-blue-200 transition-colors disabled:opacity-50"
        >
          Complete Transfer
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
              <ArrowRight className="w-5 h-5 mr-2 text-blue-600" />
              Stock Transfer History
            </h3>
            <p className="text-sm text-slate-500">View and manage transfer requests</p>
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
                <p className="text-slate-600">Loading transfer history...</p>
              </div>
            </div>
          ) : error ? (
            <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-lg text-sm">
              {error}
            </div>
          ) : transfers.length === 0 ? (
            <div className="text-center py-12">
              <ArrowRight className="w-16 h-16 text-slate-300 mx-auto mb-4" />
              <p className="text-slate-500 text-lg font-medium mb-2">No Transfer Records Found</p>
              <p className="text-slate-400 text-sm">No stock transfers have been created yet.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {/* Summary */}
              <div className="bg-slate-50 rounded-lg p-4 mb-4">
                <div className="grid grid-cols-5 gap-4 text-center">
                  <div>
                    <div className="text-2xl font-bold text-slate-800">{transfers.length}</div>
                    <div className="text-xs text-slate-500">Total Transfers</div>
                  </div>
                  <div>
                    <div className="text-2xl font-bold text-amber-600">
                      {transfers.filter(t => t.status === 'PENDING').length}
                    </div>
                    <div className="text-xs text-slate-500">Pending</div>
                  </div>
                  <div>
                    <div className="text-2xl font-bold text-blue-600">
                      {transfers.filter(t => t.status === 'APPROVED').length}
                    </div>
                    <div className="text-xs text-slate-500">Approved</div>
                  </div>
                  <div>
                    <div className="text-2xl font-bold text-green-600">
                      {transfers.filter(t => t.status === 'COMPLETED').length}
                    </div>
                    <div className="text-xs text-slate-500">Completed</div>
                  </div>
                  <div>
                    <div className="text-2xl font-bold text-red-600">
                      {transfers.filter(t => t.status === 'REJECTED').length}
                    </div>
                    <div className="text-xs text-slate-500">Rejected</div>
                  </div>
                </div>
              </div>

              {/* Transfer List */}
              {transfers.map((transfer, index) => (
                <div
                  key={transfer.id}
                  className={`border rounded-lg p-4 transition-colors ${
                    index % 2 === 0 ? 'bg-white border-slate-200' : 'bg-slate-50 border-slate-200'
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex items-start space-x-3 flex-1">
                      {/* Icon */}
                      <div className="flex-shrink-0 mt-1">
                        <Package className="w-5 h-5 text-blue-600" />
                      </div>

                      {/* Details */}
                      <div className="flex-1">
                        <div className="flex items-center space-x-2 mb-2">
                          <span className="font-mono text-sm font-semibold text-slate-800">
                            {transfer.transferNumber}
                          </span>
                          {getStatusBadge(transfer.status)}
                        </div>

                        <div className="grid grid-cols-2 gap-2 text-sm mb-2">
                          <div className="flex items-center space-x-2">
                            <span className="text-slate-500">From:</span>
                            <span className="font-medium text-slate-800">{transfer.fromWarehouse}</span>
                            <ArrowRight className="w-4 h-4 text-slate-400" />
                            <span className="text-slate-500">To:</span>
                            <span className="font-medium text-slate-800">{transfer.toWarehouse}</span>
                          </div>
                          <div>
                            <span className="text-slate-500">Date:</span>
                            <span className="ml-2 text-slate-800">{transfer.date}</span>
                          </div>
                        </div>

                        <div className="grid grid-cols-3 gap-2 text-sm">
                          <div>
                            <span className="text-slate-500">Item:</span>
                            <span className="ml-2 font-medium text-slate-800">{transfer.itemName}</span>
                          </div>
                          <div>
                            <span className="text-slate-500">Quantity:</span>
                            <span className="ml-2 font-bold text-blue-600">{transfer.quantity} units</span>
                          </div>
                          <div>
                            <span className="text-slate-500">Requested by:</span>
                            <span className="ml-2 text-slate-800">{transfer.requestedBy || 'System'}</span>
                          </div>
                        </div>

                        {transfer.remarks && (
                          <div className="mt-2 text-sm">
                            <span className="text-slate-500">Remarks:</span>
                            <span className="ml-2 text-slate-800">{transfer.remarks}</span>
                          </div>
                        )}

                        {transfer.status === 'APPROVED' && transfer.approvedBy && (
                          <div className="mt-2 text-xs text-slate-500">
                            Approved by {transfer.approvedBy} on {new Date(transfer.approvedAt || '').toLocaleDateString()}
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex-shrink-0 ml-4">
                      {getActionsForStatus(transfer)}
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

export default TransferHistoryModal;