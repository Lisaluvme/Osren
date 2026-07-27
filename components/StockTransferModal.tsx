import React, { useState, useEffect } from 'react';
import { X, ArrowRight, Package, Calendar, Building2, Warehouse, FileText, CheckCircle } from 'lucide-react';
import { InventoryItem } from '../types';

interface StockTransferModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (transferData: any) => Promise<void>;
  inventory: InventoryItem[];
}

const StockTransferModal: React.FC<StockTransferModalProps> = ({
  isOpen,
  onClose,
  onSubmit,
  inventory
}) => {
  const [transferNumber, setTransferNumber] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [fromWarehouse, setFromWarehouse] = useState('Main Warehouse');
  const [toWarehouse, setToWarehouse] = useState('');
  const [selectedItemId, setSelectedItemId] = useState('');
  const [quantity, setQuantity] = useState('');
  const [remarks, setRemarks] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const warehouses = [
    'Main Warehouse',
    'Secondary Warehouse',
    'Distribution Center',
    'Retail Store'
  ];

  // Auto-generate transfer number on modal open
  useEffect(() => {
    if (isOpen) {
      const today = new Date();
      const year = today.getFullYear();
      const month = String(today.getMonth() + 1).padStart(2, '0');
      const day = String(today.getDate()).padStart(2, '0');
      const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
      setTransferNumber(`TRF-${year}${month}${day}-${random}`);

      // Reset form fields
      setDate(new Date().toISOString().split('T')[0]);
      setFromWarehouse('Main Warehouse');
      setToWarehouse('');
      setSelectedItemId('');
      setQuantity('');
      setRemarks('');
      setError('');
    }
  }, [isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    // Validation
    if (fromWarehouse === toWarehouse) {
      setError('Source and destination warehouses cannot be the same');
      return;
    }
    if (!selectedItemId) {
      setError('Please select an inventory item');
      return;
    }
    if (!quantity || parseInt(quantity) <= 0) {
      setError('Please enter a valid quantity');
      return;
    }
    if (!toWarehouse) {
      setError('Please select destination warehouse');
      return;
    }

    const selectedItem = inventory.find(item => item.id === selectedItemId);
    if (!selectedItem) {
      setError('Selected item not found');
      return;
    }

    // Check if sufficient stock is available
    if (parseInt(quantity) > selectedItem.quantity) {
      setError(`Insufficient stock in ${fromWarehouse}. Available: ${selectedItem.quantity}`);
      return;
    }

    setLoading(true);

    try {
      const transferData = {
        transferNumber,
        date,
        fromWarehouse,
        toWarehouse,
        itemId: selectedItemId,
        itemName: selectedItem.name,
        quantity: parseInt(quantity),
        remarks: remarks.trim() || undefined,
      };

      await onSubmit(transferData);
      onClose();
    } catch (error: any) {
      setError(error.message || 'Failed to create stock transfer');
    } finally {
      setLoading(false);
    }
  };

  const selectedItem = inventory.find(item => item.id === selectedItemId);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-white border-b border-slate-200 px-6 py-4 flex items-center justify-between">
          <div>
            <h3 className="text-xl font-bold text-slate-800 flex items-center">
              <ArrowRight className="w-5 h-5 mr-2 text-blue-600" />
              Stock Transfer
            </h3>
            <p className="text-sm text-slate-500">Transfer stock between warehouses</p>
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

          {/* Transfer Number */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Transfer Number (Auto-generated)
            </label>
            <input
              type="text"
              value={transferNumber}
              onChange={(e) => setTransferNumber(e.target.value)}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg bg-slate-50 text-slate-700 font-mono text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            />
          </div>

          {/* Date */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1 flex items-center">
              <Calendar className="w-4 h-4 mr-1 text-slate-400" />
              Transfer Date
            </label>
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            />
          </div>

          {/* From and To Warehouses */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1 flex items-center">
                <Warehouse className="w-4 h-4 mr-1 text-slate-400" />
                From Warehouse
              </label>
              <select
                value={fromWarehouse}
                onChange={(e) => setFromWarehouse(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              >
                {warehouses.map(warehouse => (
                  <option key={warehouse} value={warehouse}>
                    {warehouse}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1 flex items-center">
                <Warehouse className="w-4 h-4 mr-1 text-slate-400" />
                To Warehouse
              </label>
              <select
                value={toWarehouse}
                onChange={(e) => setToWarehouse(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              >
                <option value="">Select destination...</option>
                {warehouses.filter(w => w !== fromWarehouse).map(warehouse => (
                  <option key={warehouse} value={warehouse}>
                    {warehouse}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Item Selection and Quantity */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Inventory Item</label>
              <select
                value={selectedItemId}
                onChange={(e) => setSelectedItemId(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              >
                <option value="">Select an item...</option>
                {inventory
                  .filter(item => item.quantity > 0)
                  .map(item => (
                  <option key={item.id} value={item.id}>
                    {item.name} ({item.sku}) - Available: {item.quantity} units
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Quantity to Transfer</label>
              <input
                type="number"
                value={quantity}
                onChange={(e) => setQuantity(e.target.value)}
                placeholder="Enter quantity"
                min="1"
                max={selectedItem?.quantity || 0}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              />
            </div>
          </div>

          {/* Selected Item Details */}
          {selectedItem && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
              <div className="grid grid-cols-3 gap-3 text-sm">
                <div>
                  <span className="text-slate-500">SKU:</span>
                  <span className="ml-2 font-medium text-slate-800">{selectedItem.sku}</span>
                </div>
                <div>
                  <span className="text-slate-500">Available in {fromWarehouse}:</span>
                  <span className="ml-2 font-medium text-slate-800">{selectedItem.quantity} units</span>
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
              Remarks
            </label>
            <textarea
              value={remarks}
              onChange={(e) => setRemarks(e.target.value)}
              placeholder="Enter any additional notes..."
              rows={3}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
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
              className="px-6 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors disabled:opacity-50 flex items-center"
            >
              {loading ? 'Processing...' : (
                <>
                  <CheckCircle className="w-4 h-4 mr-2" />
                  Create Transfer Request
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default StockTransferModal;