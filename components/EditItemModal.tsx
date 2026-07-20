import React, { useState, useEffect } from 'react';
import { X, Package, Save } from 'lucide-react';
import { InventoryItem } from '../types';

interface EditItemModalProps {
  item: InventoryItem | null;
  onClose: () => void;
  onSubmit: (updates: Partial<InventoryItem>) => Promise<void>;
}

const EditItemModal: React.FC<EditItemModalProps> = ({ item, onClose, onSubmit }) => {
  const [form, setForm] = useState({
    name: '', sku: '', category: '', brand: '',
    unitCost: '', sellingPrice: '', minLevel: '', supplier: '',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (item) {
      setForm({
        name: item.name || '',
        sku: item.sku || '',
        category: item.category || '',
        brand: item.brand || '',
        unitCost: item.unitCost != null ? String(item.unitCost) : '',
        sellingPrice: item.sellingPrice != null ? String(item.sellingPrice) : '',
        minLevel: item.minLevel != null ? String(item.minLevel) : '',
        supplier: item.supplier || '',
      });
      setError('');
    }
  }, [item]);

  if (!item) return null;

  const handle = (field: string, value: string) => setForm(f => ({ ...f, [field]: value }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!form.name.trim()) { setError('Item name is required'); return; }
    if (!form.sku.trim()) { setError('SKU is required'); return; }

    const updates: Partial<InventoryItem> = {
      name: form.name.trim(),
      sku: form.sku.trim(),
      category: form.category.trim() || 'General',
      brand: form.brand.trim() || 'Unknown',
      unitCost: form.unitCost === '' ? 0 : parseFloat(form.unitCost),
      sellingPrice: form.sellingPrice === '' ? 0 : parseFloat(form.sellingPrice),
      minLevel: form.minLevel === '' ? 10 : parseInt(form.minLevel),
      supplier: form.supplier.trim(),
    };

    setLoading(true);
    try {
      await onSubmit(updates);
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to save item');
    } finally {
      setLoading(false);
    }
  };

  const inputClass = "w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500";

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white border-b border-slate-200 px-6 py-4 flex items-center justify-between">
          <div>
            <h3 className="text-xl font-bold text-slate-800 flex items-center">
              <Package className="w-5 h-5 mr-2 text-green-600" /> Edit Item
            </h3>
            <p className="text-sm text-slate-500">{item.name} ({item.sku})</p>
          </div>
          <button onClick={onClose} className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-lg text-sm">{error}</div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Item Name *</label>
              <input type="text" value={form.name} onChange={e => handle('name', e.target.value)} className={inputClass} required />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">SKU *</label>
              <input type="text" value={form.sku} onChange={e => handle('sku', e.target.value)} className={inputClass} required />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Category</label>
              <input type="text" value={form.category} onChange={e => handle('category', e.target.value)} className={inputClass} />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Brand</label>
              <input type="text" value={form.brand} onChange={e => handle('brand', e.target.value)} className={inputClass} />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Unit Cost (RM)</label>
              <input type="number" min="0" step="0.01" value={form.unitCost} onChange={e => handle('unitCost', e.target.value)} className={inputClass} />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Selling Price (RM)</label>
              <input type="number" min="0" step="0.01" value={form.sellingPrice} onChange={e => handle('sellingPrice', e.target.value)} className={inputClass} />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Min Stock Level</label>
              <input type="number" min="0" value={form.minLevel} onChange={e => handle('minLevel', e.target.value)} className={inputClass} />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Supplier</label>
              <input type="text" value={form.supplier} onChange={e => handle('supplier', e.target.value)} className={inputClass} />
            </div>
          </div>

          <p className="text-xs text-slate-400">Quantity is managed via Receive Stock (GRN) / Issue / +/- and isn't edited here.</p>

          <div className="flex justify-end space-x-3 pt-4 border-t border-slate-200">
            <button type="button" onClick={onClose} disabled={loading} className="px-4 py-2 text-sm font-medium text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors disabled:opacity-50">Cancel</button>
            <button type="submit" disabled={loading} className="px-6 py-2 text-sm font-medium text-white bg-green-600 hover:bg-green-700 rounded-lg transition-colors disabled:opacity-50 inline-flex items-center">
              <Save className="w-4 h-4 mr-1" /> {loading ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default EditItemModal;
