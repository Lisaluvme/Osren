import React, { useState, useEffect } from 'react';
import { X, Clock, RefreshCw } from 'lucide-react';
import { InventoryItem } from '../types';
import inventoryApiService, { StockMovementEntry } from '../services/api/inventoryApi';

interface StockHistoryModalProps {
  item: InventoryItem | null;
  onClose: () => void;
}

const StockHistoryModal: React.FC<StockHistoryModalProps> = ({ item, onClose }) => {
  const [movements, setMovements] = useState<StockMovementEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const load = async () => {
    if (!item) return;
    setLoading(true);
    setError('');
    try {
      const data = await inventoryApiService.getMovements(item.id);
      setMovements(data);
    } catch (e: any) {
      setError(e.message || 'Failed to load history');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (item) load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [item]);

  if (!item) return null;

  const fmtChange = (c: number | string) => {
    const n = typeof c === 'number' ? c : parseFloat(c);
    if (isNaN(n as number)) return c;
    return (n as number) > 0 ? `+${n}` : `${n}`;
  };

  const fmtDate = (ts: string) => {
    try { return new Date(ts).toLocaleString(); } catch { return ts; }
  };

  const typeColor = (t: string) => {
    switch ((t || '').toLowerCase()) {
      case 'receive':
      case 'create':
        return 'bg-green-100 text-green-700';
      case 'issue':
      case 'delete':
        return 'bg-red-100 text-red-700';
      default:
        return 'bg-slate-100 text-slate-700';
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl max-w-3xl w-full max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white border-b border-slate-200 px-6 py-4 flex items-center justify-between">
          <div>
            <h3 className="text-xl font-bold text-slate-800 flex items-center">
              <Clock className="w-5 h-5 mr-2 text-green-600" /> Stock History
            </h3>
            <p className="text-sm text-slate-500">{item.name} ({item.sku})</p>
          </div>
          <div className="flex items-center space-x-2">
            <button onClick={load} disabled={loading} className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors" title="Refresh">
              <RefreshCw className={`w-5 h-5 ${loading ? 'animate-spin' : ''}`} />
            </button>
            <button onClick={onClose} className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors">
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        <div className="p-6">
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-lg text-sm mb-4">{error}</div>
          )}

          {loading && movements.length === 0 ? (
            <div className="py-10 text-center text-slate-400">Loading history…</div>
          ) : movements.length === 0 ? (
            <div className="py-10 text-center text-slate-400">No movements recorded yet.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="text-xs text-slate-400 uppercase border-b border-slate-100">
                    <th className="px-3 py-2">Date / Time</th>
                    <th className="px-3 py-2">Type</th>
                    <th className="px-3 py-2 text-center">Change</th>
                    <th className="px-3 py-2 text-center">New Qty</th>
                    <th className="px-3 py-2">Reason</th>
                    <th className="px-3 py-2">By</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {movements.map((m, i) => (
                    <tr key={i}>
                      <td className="px-3 py-2 text-slate-600 whitespace-nowrap">{fmtDate(m.timestamp)}</td>
                      <td className="px-3 py-2">
                        <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium capitalize ${typeColor(m.type)}`}>{m.type}</span>
                      </td>
                      <td className="px-3 py-2 text-center font-semibold text-slate-800">{fmtChange(m.quantityChange)}</td>
                      <td className="px-3 py-2 text-center text-slate-600">{m.newQuantity}</td>
                      <td className="px-3 py-2 text-slate-600">{m.reason || '—'}</td>
                      <td className="px-3 py-2 text-slate-400">{m.performedBy || '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default StockHistoryModal;
