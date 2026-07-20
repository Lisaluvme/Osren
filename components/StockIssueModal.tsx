import React, { useState, useEffect } from 'react';
import { X, LogOut } from 'lucide-react';
import { InventoryItem } from '../types';

interface StockIssueModalProps {
  item: InventoryItem | null;
  onClose: () => void;
  onSubmit: (quantity: number, reason: string) => Promise<void>;
}

const StockIssueModal: React.FC<StockIssueModalProps> = ({ item, onClose, onSubmit }) => {
  const [quantity, setQuantity] = useState('');
  const [reason, setReason] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (item) { setQuantity(''); setReason(''); setError(''); }
  }, [item]);

  if (!item) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    const qty = parseInt(quantity);
    if (!qty || qty <= 0) { setError('Enter a valid quantity to issue'); return; }
    if (qty > item.quantity) { setError(`Only ${item.quantity} in stock`); return; }

    setLoading(true);
    try {
      await onSubmit(qty, reason.trim());
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to issue stock');
    } finally {
      setLoading(false);
    }
  };

  const inputClass = "w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500";

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl max-w-lg w-full max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white border-b border-slate-200 px-6 py-4 flex items-center justify-between">
          <div>
            <h3 className="text-xl font-bold text-slate-800 flex items-center">
              <LogOut className="w-5 h-5 mr-2 text-green-600" /> Issue Stock
            </h3>
            <p className="text-sm text-slate-500">{item.name} ({item.sku}) — in stock: {item.quantity}</p>
          </div>
          <button onClick={onClose} className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-lg text-sm">{error}</div>
          )}

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Quantity to Issue *</label>
            <input type="number" min="1" max={item.quantity} value={quantity} onChange={e => setQuantity(e.target.value)} className={inputClass} required autoFocus />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Reason / Notes</label>
            <textarea rows={3} value={reason} onChange={e => setReason(e.target.value)} placeholder="e.g. Sales order, damaged, transfer out…" className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 resize-none" />
          </div>

          <div className="flex justify-end space-x-3 pt-4 border-t border-slate-200">
            <button type="button" onClick={onClose} disabled={loading} className="px-4 py-2 text-sm font-medium text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors disabled:opacity-50">Cancel</button>
            <button type="submit" disabled={loading} className="px-6 py-2 text-sm font-medium text-white bg-green-600 hover:bg-green-700 rounded-lg transition-colors disabled:opacity-50">
              {loading ? 'Processing...' : 'Issue Stock'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default StockIssueModal;
