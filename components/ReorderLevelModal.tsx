import React, { useState, useEffect } from 'react';
import { X, AlertTriangle, Package, CheckCircle, TrendingUp, Save } from 'lucide-react';
import { InventoryItem } from '../types';

interface ReorderLevelModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (itemId: string, reorderLevel: number, maxLevel: number) => Promise<void>;
  inventory: InventoryItem[];
}

const ReorderLevelModal: React.FC<ReorderLevelModalProps> = ({
  isOpen,
  onClose,
  onSubmit,
  inventory
}) => {
  const [reorderLevels, setReorderLevels] = useState<Record<string, { reorderLevel: number; maxLevel: number }>>({});
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [successCount, setSuccessCount] = useState(0);

  useEffect(() => {
    if (isOpen) {
      // Initialize reorder levels from current inventory
      const levels: Record<string, { reorderLevel: number; maxLevel: number }> = {};
      inventory.forEach(item => {
        levels[item.id] = {
          reorderLevel: item.minLevel || 10,
          maxLevel: Math.max(item.minLevel * 2 || 20, item.quantity || 0)
        };
      });
      setReorderLevels(levels);
      setSuccessCount(0);
      setError('');
    }
  }, [isOpen, inventory]);

  const handleLevelChange = (itemId: string, field: 'reorderLevel' | 'maxLevel', value: number) => {
    setReorderLevels(prev => ({
      ...prev,
      [itemId]: {
        ...prev[itemId],
        [field]: Math.max(0, value)
      }
    }));
  };

  const handleSaveSingle = async (itemId: string) => {
    const levels = reorderLevels[itemId];
    if (!levels) return;

    setSaving(true);
    setError('');
    try {
      await onSubmit(itemId, levels.reorderLevel, levels.maxLevel);
      setSuccessCount(prev => prev + 1);
      setSaving(false);
    } catch (err: any) {
      setError(err.message || 'Failed to save reorder level');
      setSaving(false);
    }
  };

  const handleSaveAll = async () => {
    setSaving(true);
    setError('');
    let success = 0;
    let failed = 0;

    for (const [itemId, levels] of Object.entries(reorderLevels)) {
      try {
        await onSubmit(itemId, levels.reorderLevel, levels.maxLevel);
        success++;
      } catch (err) {
        failed++;
        console.error(`Failed to save levels for ${itemId}:`, err);
      }
    }

    setSaving(false);
    setSuccessCount(success);

    if (failed > 0) {
      setError(`${success} items updated successfully. ${failed} items failed.`);
    } else {
      setError('');
      // Close modal after short delay
      setTimeout(() => onClose(), 1000);
    }
  };

  const getStockStatus = (item: InventoryItem) => {
    const levels = reorderLevels[item.id];
    if (!levels) return null;

    const quantity = item.quantity || 0;
    const reorderLevel = levels.reorderLevel;

    if (quantity <= reorderLevel * 0.2) {
      return { status: 'critical', color: 'red', text: 'Critical' };
    } else if (quantity <= reorderLevel) {
      return { status: 'low', color: 'amber', text: 'Low Stock' };
    } else if (quantity <= levels.maxLevel) {
      return { status: 'good', color: 'green', text: 'Good' };
    } else {
      return { status: 'overstocked', color: 'blue', text: 'Overstocked' };
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl max-w-6xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-white border-b border-slate-200 px-6 py-4 flex items-center justify-between">
          <div>
            <h3 className="text-xl font-bold text-slate-800 flex items-center">
              <AlertTriangle className="w-5 h-5 mr-2 text-amber-600" />
              Reorder Level Management
            </h3>
            <p className="text-sm text-slate-500">Set minimum stock levels and automatic reorder points</p>
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
          {error && (
            <div className={`mb-4 px-4 py-3 rounded-lg text-sm ${
              error.includes('failed') ? 'bg-amber-50 border border-amber-200 text-amber-700' : 'bg-red-50 border border-red-200 text-red-600'
            }`}>
              {error}
            </div>
          )}

          {successCount > 0 && !error && (
            <div className="mb-4 bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-lg text-sm">
              {successCount} items updated successfully!
            </div>
          )}

          {/* Summary */}
          <div className="bg-slate-50 rounded-lg p-4 mb-4">
            <div className="grid grid-cols-4 gap-4 text-center">
              <div>
                <div className="text-2xl font-bold text-red-600">
                  {inventory.filter(item => {
                    const status = getStockStatus(item);
                    return status && status.status === 'critical';
                  }).length}
                </div>
                <div className="text-xs text-slate-500">Critical Stock</div>
              </div>
              <div>
                <div className="text-2xl font-bold text-amber-600">
                  {inventory.filter(item => {
                    const status = getStockStatus(item);
                    return status && status.status === 'low';
                  }).length}
                </div>
                <div className="text-xs text-slate-500">Low Stock</div>
              </div>
              <div>
                <div className="text-2xl font-bold text-green-600">
                  {inventory.filter(item => {
                    const status = getStockStatus(item);
                    return status && status.status === 'good';
                  }).length}
                </div>
                <div className="text-xs text-slate-500">Good Stock</div>
              </div>
              <div>
                <div className="text-2xl font-bold text-blue-600">
                  {inventory.filter(item => {
                    const status = getStockStatus(item);
                    return status && status.status === 'overstocked';
                  }).length}
                </div>
                <div className="text-xs text-slate-500">Overstocked</div>
              </div>
            </div>
          </div>

          {/* Save All Button */}
          <div className="flex justify-end mb-4">
            <button
              onClick={handleSaveAll}
              disabled={saving}
              className="px-6 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors disabled:opacity-50 flex items-center"
            >
              {saving ? 'Saving...' : (
                <>
                  <Save className="w-4 h-4 mr-2" />
                  Save All Levels
                </>
              )}
            </button>
          </div>

          {/* Items Table */}
          <div className="border border-slate-200 rounded-lg overflow-hidden">
            <div className="overflow-x-auto max-h-96">
              <table className="w-full">
                <thead className="sticky top-0 bg-slate-50">
                  <tr className="text-xs text-slate-400 uppercase border-b border-slate-200">
                    <th className="px-4 py-3 text-left">Item</th>
                    <th className="px-4 py-3 text-center">Current Stock</th>
                    <th className="px-4 py-3 text-center">Status</th>
                    <th className="px-4 py-3 text-right">Reorder Level</th>
                    <th className="px-4 py-3 text-right">Max Level</th>
                    <th className="px-4 py-3 text-center">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {inventory.map((item, index) => {
                    const levels = reorderLevels[item.id];
                    const status = getStockStatus(item);
                    if (!levels || !status) return null;

                    return (
                      <tr key={item.id} className={`border-b border-slate-100 transition-colors ${
                        index % 2 === 0 ? 'bg-white' : 'bg-slate-50'
                      }`}>
                        <td className="px-4 py-3">
                          <div className="font-medium text-slate-800">{item.name}</div>
                          <div className="text-xs text-slate-500">{item.sku}</div>
                        </td>
                        <td className="px-4 py-3 text-center">
                          <span className="font-semibold text-slate-700">{item.quantity}</span>
                        </td>
                        <td className="px-4 py-3 text-center">
                          <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                            status.status === 'critical' ? 'bg-red-100 text-red-700' :
                            status.status === 'low' ? 'bg-amber-100 text-amber-700' :
                            status.status === 'good' ? 'bg-green-100 text-green-700' :
                            'bg-blue-100 text-blue-700'
                          }`}>
                            {status.text}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <input
                            type="number"
                            value={levels.reorderLevel}
                            onChange={(e) => handleLevelChange(item.id, 'reorderLevel', parseInt(e.target.value) || 0)}
                            min="0"
                            className="w-20 px-2 py-1 text-sm border border-slate-300 rounded focus:outline-none focus:ring-2 focus:ring-amber-500 text-right"
                          />
                        </td>
                        <td className="px-4 py-3">
                          <input
                            type="number"
                            value={levels.maxLevel}
                            onChange={(e) => handleLevelChange(item.id, 'maxLevel', parseInt(e.target.value) || 0)}
                            min="0"
                            className="w-20 px-2 py-1 text-sm border border-slate-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500 text-right"
                          />
                        </td>
                        <td className="px-4 py-3 text-center">
                          <button
                            onClick={() => handleSaveSingle(item.id)}
                            disabled={saving}
                            className="px-3 py-1 text-xs font-medium text-green-600 bg-green-50 hover:bg-green-100 rounded border border-green-200 transition-colors disabled:opacity-50"
                          >
                            Save
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Info Box */}
          <div className="mt-4 bg-blue-50 border border-blue-200 rounded-lg p-4">
            <div className="flex items-start space-x-3">
              <AlertTriangle className="w-5 h-5 text-blue-600 mt-0.5" />
              <div className="flex-1">
                <h4 className="text-sm font-semibold text-blue-900 mb-1">Reorder Level Guide</h4>
                <ul className="text-xs text-blue-800 space-y-1">
                  <li>• <strong>Reorder Level:</strong> Minimum stock quantity before reordering</li>
                  <li>• <strong>Max Level:</strong> Optimal maximum stock quantity to avoid overstocking</li>
                  <li>• System will alert when stock reaches or falls below reorder level</li>
                  <li>• Review levels regularly based on sales patterns and seasonality</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ReorderLevelModal;