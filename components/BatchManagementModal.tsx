import React, { useState, useEffect } from 'react';
import { X, Package, Calendar, Hash, DollarSign, Building2, AlertCircle, CheckCircle } from 'lucide-react';
import { InventoryItem, BatchInfo } from '../types';

interface BatchManagementModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (batchData: any) => Promise<void>;
  inventory: InventoryItem[];
  fetchBatches?: (itemId: string) => Promise<BatchInfo[]>;
  itemId?: string;
}

const BatchManagementModal: React.FC<BatchManagementModalProps> = ({
  isOpen,
  onClose,
  onSubmit,
  inventory,
  fetchBatches,
  itemId: propItemId
}) => {
  const [itemId, setItemId] = useState(propItemId || '');
  const [batchNumber, setBatchNumber] = useState('');
  const [expiryDate, setExpiryDate] = useState('');
  const [quantity, setQuantity] = useState('');
  const [manufacturingDate, setManufacturingDate] = useState('');
  const [cost, setCost] = useState('');
  const [supplier, setSupplier] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [batches, setBatches] = useState<BatchInfo[]>([]);
  const [showHistory, setShowHistory] = useState(false);

  const selectedItem = inventory.find(item => item.id === itemId);

  useEffect(() => {
    if (isOpen) {
      if (propItemId) {
        setItemId(propItemId);
        loadBatches(propItemId);
      }
      // Reset form fields
      setBatchNumber('');
      setExpiryDate('');
      setQuantity('');
      setManufacturingDate('');
      setCost('');
      setSupplier('');
      setError('');
    }
  }, [isOpen, propItemId]);

  const loadBatches = async (id: string) => {
    if (!fetchBatches) return;
    try {
      const batchData = await fetchBatches(id);
      setBatches(batchData);
    } catch (err) {
      console.error('Failed to load batches:', err);
    }
  };

  const handleItemChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newItemId = e.target.value;
    setItemId(newItemId);
    setBatches([]);
    if (newItemId && fetchBatches) {
      loadBatches(newItemId);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    // Validation
    if (!itemId) {
      setError('Please select an inventory item');
      return;
    }
    if (!batchNumber.trim()) {
      setError('Please enter batch number');
      return;
    }
    if (!quantity || parseInt(quantity) <= 0) {
      setError('Please enter a valid quantity');
      return;
    }

    setLoading(true);

    try {
      const batchData = {
        itemId,
        itemName: selectedItem?.name || '',
        batchNumber: batchNumber.trim(),
        expiryDate: expiryDate || undefined,
        quantity: parseInt(quantity),
        manufacturingDate: manufacturingDate || undefined,
        cost: cost ? parseFloat(cost) : undefined,
        supplier: supplier.trim() || undefined,
      };

      await onSubmit(batchData);

      // Reload batches for this item
      if (itemId && fetchBatches) {
        await loadBatches(itemId);
      }

      // Reset form
      setBatchNumber('');
      setExpiryDate('');
      setQuantity('');
      setManufacturingDate('');
      setCost('');
      setSupplier('');

      setLoading(false);
    } catch (error: any) {
      setError(error.message || 'Failed to create batch');
      setLoading(false);
    }
  };

  const getExpiryStatus = (batch: BatchInfo) => {
    if (!batch.expiryDate) return null;

    const today = new Date();
    const expiry = new Date(batch.expiryDate);
    const daysUntilExpiry = Math.ceil((expiry.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

    if (daysUntilExpiry < 0) {
      return { status: 'EXPIRED', color: 'red', text: `Expired ${Math.abs(daysUntilExpiry)} days ago` };
    } else if (daysUntilExpiry <= 30) {
      return { status: 'EXPIRING', color: 'amber', text: `Expires in ${daysUntilExpiry} days` };
    } else if (daysUntilExpiry <= 90) {
      return { status: 'SOON', color: 'yellow', text: `Expires in ${daysUntilExpiry} days` };
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
              <Hash className="w-5 h-5 mr-2 text-teal-600" />
              Batch Management
            </h3>
            <p className="text-sm text-slate-500">Track item batches and expiry dates</p>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6">
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-lg text-sm mb-4">
              {error}
            </div>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Left Column - Add New Batch Form */}
            <div>
              <h4 className="text-lg font-semibold text-slate-800 mb-4">Add New Batch</h4>
              <form onSubmit={handleSubmit} className="space-y-4">
                {/* Item Selection */}
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Inventory Item</label>
                  <select
                    value={itemId}
                    onChange={handleItemChange}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500"
                    required
                  >
                    <option value="">Select an item...</option>
                    {inventory.map(item => (
                      <option key={item.id} value={item.id}>
                        {item.name} ({item.sku})
                      </option>
                    ))}
                  </select>
                </div>

                {/* Batch Number */}
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1 flex items-center">
                    <Hash className="w-4 h-4 mr-1 text-slate-400" />
                    Batch Number
                  </label>
                  <input
                    type="text"
                    value={batchNumber}
                    onChange={(e) => setBatchNumber(e.target.value)}
                    placeholder="e.g., BATCH-2024-001"
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 font-mono"
                    required
                  />
                </div>

                {/* Quantity and Cost */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Quantity</label>
                    <input
                      type="number"
                      value={quantity}
                      onChange={(e) => setQuantity(e.target.value)}
                      placeholder="Enter quantity"
                      min="1"
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1 flex items-center">
                      <DollarSign className="w-4 h-4 mr-1 text-slate-400" />
                      Unit Cost (Optional)
                    </label>
                    <input
                      type="number"
                      value={cost}
                      onChange={(e) => setCost(e.target.value)}
                      placeholder="0.00"
                      min="0"
                      step="0.01"
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500"
                    />
                  </div>
                </div>

                {/* Dates */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1 flex items-center">
                      <Calendar className="w-4 h-4 mr-1 text-slate-400" />
                      Expiry Date (Optional)
                    </label>
                    <input
                      type="date"
                      value={expiryDate}
                      onChange={(e) => setExpiryDate(e.target.value)}
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Manufacturing Date (Optional)</label>
                    <input
                      type="date"
                      value={manufacturingDate}
                      onChange={(e) => setManufacturingDate(e.target.value)}
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500"
                    />
                  </div>
                </div>

                {/* Supplier */}
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1 flex items-center">
                    <Building2 className="w-4 h-4 mr-1 text-slate-400" />
                    Supplier (Optional)
                  </label>
                  <input
                    type="text"
                    value={supplier}
                    onChange={(e) => setSupplier(e.target.value)}
                    placeholder="Enter supplier name"
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500"
                  />
                </div>

                {/* Submit Button */}
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full px-4 py-2 text-sm font-medium text-white bg-teal-600 hover:bg-teal-700 rounded-lg transition-colors disabled:opacity-50 flex items-center justify-center"
                >
                  {loading ? 'Processing...' : (
                    <>
                      <CheckCircle className="w-4 h-4 mr-2" />
                      Add Batch
                    </>
                  )}
                </button>
              </form>
            </div>

            {/* Right Column - Batch History */}
            <div>
              <div className="flex items-center justify-between mb-4">
                <h4 className="text-lg font-semibold text-slate-800">Batch History</h4>
                {itemId && (
                  <button
                    onClick={() => setShowHistory(!showHistory)}
                    className="text-sm text-teal-600 hover:text-teal-700"
                  >
                    {showHistory ? 'Hide' : 'Show'}
                  </button>
                )}
              </div>

              {!itemId ? (
                <div className="text-center py-8 bg-slate-50 rounded-lg">
                  <Package className="w-12 h-12 text-slate-300 mx-auto mb-2" />
                  <p className="text-slate-500 text-sm">Select an item to view batches</p>
                </div>
              ) : !showHistory ? (
                <div className="text-center py-8 bg-slate-50 rounded-lg">
                  <Package className="w-12 h-12 text-slate-300 mx-auto mb-2" />
                  <p className="text-slate-500 text-sm">Click "Show" to view batch history</p>
                </div>
              ) : batches.length === 0 ? (
                <div className="text-center py-8 bg-slate-50 rounded-lg">
                  <Hash className="w-12 h-12 text-slate-300 mx-auto mb-2" />
                  <p className="text-slate-500 text-sm">No batches found for this item</p>
                </div>
              ) : (
                <div className="space-y-3 max-h-96 overflow-y-auto">
                  {batches.map((batch, index) => {
                    const expiryStatus = getExpiryStatus(batch);
                    return (
                      <div
                        key={batch.id}
                        className={`border rounded-lg p-3 transition-colors ${
                          index % 2 === 0 ? 'bg-white border-slate-200' : 'bg-slate-50 border-slate-200'
                        } ${expiryStatus?.status === 'EXPIRED' ? 'border-red-300 bg-red-50' : ''}`}
                      >
                        <div className="flex items-start justify-between mb-2">
                          <div>
                            <div className="flex items-center space-x-2">
                              <span className="font-mono text-sm font-semibold text-slate-800">
                                {batch.batchNumber}
                              </span>
                              {batch.status === 'EXPIRED' && (
                                <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-red-100 text-red-700">
                                  Expired
                                </span>
                              )}
                              {batch.status === 'DEPLETED' && (
                                <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-slate-100 text-slate-700">
                                  Depleted
                                </span>
                              )}
                            </div>
                            <div className="text-xs text-slate-500 mt-1">
                              Qty: {batch.quantity} units
                              {batch.cost && ` • RM${batch.cost.toFixed(2)}/unit`}
                            </div>
                          </div>
                        </div>

                        {expiryDate && (
                          <div className={`text-xs mb-2 ${expiryStatus ? 'text-amber-700' : 'text-slate-600'}`}>
                            {expiryStatus ? (
                              <div className="flex items-center">
                                <AlertCircle className="w-3 h-3 mr-1" />
                                {expiryStatus.text}
                              </div>
                            ) : (
                              `Expires: ${new Date(batch.expiryDate || '').toLocaleDateString()}`
                            )}
                          </div>
                        )}

                        {batch.manufacturingDate && (
                          <div className="text-xs text-slate-500">
                            Mfg: {new Date(batch.manufacturingDate).toLocaleDateString()}
                          </div>
                        )}

                        {batch.supplier && (
                          <div className="text-xs text-slate-600 mt-1">
                            Supplier: {batch.supplier}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default BatchManagementModal;