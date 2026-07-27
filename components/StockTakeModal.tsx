import React, { useState, useEffect } from 'react';
import { X, Package, Calendar, Building2, Warehouse, AlertTriangle, FileText, CheckCircle } from 'lucide-react';
import { InventoryItem } from '../types';

interface StockTakeModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (stockTakeData: any) => Promise<void>;
  inventory: InventoryItem[];
}

const StockTakeModal: React.FC<StockTakeModalProps> = ({
  isOpen,
  onClose,
  onSubmit,
  inventory
}) => {
  const [stockTakeNumber, setStockTakeNumber] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [warehouse, setWarehouse] = useState('Main Warehouse');
  const [selectedItemId, setSelectedItemId] = useState('');
  const [systemQuantity, setSystemQuantity] = useState(0);
  const [actualQuantity, setActualQuantity] = useState('');
  const [varianceReason, setVarianceReason] = useState('');
  const [remarks, setRemarks] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Auto-generate stock take number on modal open
  useEffect(() => {
    if (isOpen) {
      const today = new Date();
      const year = today.getFullYear();
      const month = String(today.getMonth() + 1).padStart(2, '0');
      const day = String(today.getDate()).padStart(2, '0');
      const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
      setStockTakeNumber(`STK-${year}${month}${day}-${random}`);

      // Reset form fields
      setDate(new Date().toISOString().split('T')[0]);
      setWarehouse('Main Warehouse');
      setSelectedItemId('');
      setSystemQuantity(0);
      setActualQuantity('');
      setVarianceReason('');
      setRemarks('');
      setError('');
    }
  }, [isOpen]);

  // Update system quantity when item is selected
  useEffect(() => {
    if (selectedItemId) {
      const item = inventory.find(i => i.id === selectedItemId);
      if (item) {
        setSystemQuantity(item.quantity);
      }
    }
  }, [selectedItemId, inventory]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    // Validation
    if (!selectedItemId) {
      setError('Please select an inventory item');
      return;
    }
    if (!actualQuantity || actualQuantity === '') {
      setError('Please enter actual quantity');
      return;
    }

    const selectedItem = inventory.find(item => item.id === selectedItemId);
    if (!selectedItem) {
      setError('Selected item not found');
      return;
    }

    const actualQty = parseInt(actualQuantity);
    const variance = actualQty - systemQuantity;

    setLoading(true);

    try {
      const stockTakeData = {
        stockTakeNumber,
        date,
        warehouse,
        itemId: selectedItemId,
        itemName: selectedItem.name,
        systemQuantity,
        actualQuantity: actualQty,
        variance,
        varianceReason: varianceReason.trim() || undefined,
        remarks: remarks.trim() || undefined,
      };

      await onSubmit(stockTakeData);
      onClose();
    } catch (error: any) {
      setError(error.message || 'Failed to create stock take');
    } finally {
      setLoading(false);
    }
  };

  const selectedItem = inventory.find(item => item.id === selectedItemId);
  const variance = actualQuantity ? parseInt(actualQuantity) - systemQuantity : 0;

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-white border-b border-slate-200 px-6 py-4 flex items-center justify-between">
          <div>
            <h3 className="text-xl font-bold text-slate-800 flex items-center">
              <Package className="w-5 h-5 mr-2 text-purple-600" />
              Stock Take & Cycle Count
            </h3>
            <p className="text-sm text-slate-500">Physical stock counting with variance tracking</p>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-lg text-sm">
              {error}
            </div>
          )}

          {/* Stock Take Number */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Stock Take Number (Auto-generated)
            </label>
            <input
              type="text"
              value={stockTakeNumber}
              onChange={(e) => setStockTakeNumber(e.target.value)}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg bg-slate-50 text-slate-700 font-mono text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
              required
            />
          </div>

          {/* Date and Warehouse */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1 flex items-center">
                <Calendar className="w-4 h-4 mr-1 text-slate-400" />
                Count Date
              </label>
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1 flex items-center">
                <Warehouse className="w-4 h-4 mr-1 text-slate-400" />
                Warehouse
              </label>
              <select
                value={warehouse}
                onChange={(e) => setWarehouse(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                required
              >
                <option value="Main Warehouse">Main Warehouse</option>
                <option value="Secondary Warehouse">Secondary Warehouse</option>
                <option value="Distribution Center">Distribution Center</option>
                <option value="Retail Store">Retail Store</option>
              </select>
            </div>
          </div>

          {/* Item Selection */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Inventory Item</label>
            <select
              value={selectedItemId}
              onChange={(e) => setSelectedItemId(e.target.value)}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
              required
            >
              <option value="">Select an item...</option>
              {inventory.map(item => (
                <option key={item.id} value={item.id}>
                  {item.name} ({item.sku}) - System: {item.quantity} units
                </option>
              ))}
            </select>
          </div>

          {/* Quantity Comparison */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">System Quantity</label>
              <input
                type="text"
                value={systemQuantity}
                disabled
                className="w-full px-3 py-2 border border-slate-300 rounded-lg bg-slate-100 text-slate-700 font-mono text-sm"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Actual Counted Quantity</label>
              <input
                type="number"
                value={actualQuantity}
                onChange={(e) => setActualQuantity(e.target.value)}
                placeholder="Enter actual count"
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 font-mono text-sm"
                required
              />
            </div>
          </div>

          {/* Variance Display */}
          {actualQuantity && (
            <div className={`border rounded-lg p-4 ${
              variance === 0
                ? 'bg-green-50 border-green-200'
                : variance > 0
                ? 'bg-blue-50 border-blue-200'
                : 'bg-amber-50 border-amber-200'
            }`}>
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  {variance === 0 ? (
                    <CheckCircle className="w-5 h-5 text-green-600" />
                  ) : (
                    <AlertTriangle className={`w-5 h-5 ${variance > 0 ? 'text-blue-600' : 'text-amber-600'}`} />
                  )}
                  <span className="font-medium text-slate-800">
                    {variance === 0
                      ? 'No Variance - System matches physical count'
                      : variance > 0
                      ? `Surplus: +${variance} units found`
                      : `Shortage: ${variance} units missing`}
                  </span>
                </div>
                <div className={`text-2xl font-bold ${
                  variance === 0
                    ? 'text-green-700'
                    : variance > 0
                    ? 'text-blue-700'
                    : 'text-amber-700'
                }`}>
                  {variance > 0 ? '+' : ''}{variance}
                </div>
              </div>
            </div>
          )}

          {/* Variance Reason (Required if there's variance) */}
          {actualQuantity && variance !== 0 && (
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1 flex items-center">
                <AlertTriangle className="w-4 h-4 mr-1 text-amber-500" />
                Variance Reason <span className="text-red-500 ml-1">*</span>
              </label>
              <select
                value={varianceReason}
                onChange={(e) => setVarianceReason(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                required
              >
                <option value="">Select a reason...</option>
                <option value="Damaged goods">Damaged goods</option>
                <option value="Theft/Loss">Theft/Loss</option>
                <option value="Data entry error">Data entry error</option>
                <option value="Returns not processed">Returns not processed</option>
                <option value="Found unrecorded stock">Found unrecorded stock</option>
                <option value="Counting error">Counting error</option>
                <option value="Other">Other (specify in remarks)</option>
              </select>
            </div>
          )}

          {/* Selected Item Details */}
          {selectedItem && (
            <div className="bg-purple-50 border border-purple-200 rounded-lg p-3">
              <div className="grid grid-cols-3 gap-3 text-sm">
                <div>
                  <span className="text-slate-500">SKU:</span>
                  <span className="ml-2 font-medium text-slate-800">{selectedItem.sku}</span>
                </div>
                <div>
                  <span className="text-slate-500">Category:</span>
                  <span className="ml-2 font-medium text-slate-800">{selectedItem.category}</span>
                </div>
                <div>
                  <span className="text-slate-500">Unit Cost:</span>
                  <span className="ml-2 font-medium text-slate-800">RM{selectedItem.unitCost?.toFixed(2) || '0.00'}</span>
                </div>
              </div>
            </div>
          )}

          {/* Remarks */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1 flex items-center">
              <FileText className="w-4 h-4 mr-1 text-slate-400" />
              Additional Remarks
            </label>
            <textarea
              value={remarks}
              onChange={(e) => setRemarks(e.target.value)}
              placeholder="Enter any additional notes..."
              rows={3}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 resize-none"
            />
          </div>

          {/* Actions */}
          <div className="flex justify-end space-x-3 pt-4 border-t border-slate-200">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="px-4 py-2 text-sm font-medium text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-6 py-2 text-sm font-medium text-white bg-purple-600 hover:bg-purple-700 rounded-lg transition-colors disabled:opacity-50 flex items-center"
            >
              {loading ? 'Processing...' : (
                <>
                  <CheckCircle className="w-4 h-4 mr-2" />
                  Record Stock Take
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default StockTakeModal;