import React, { useState, useEffect } from 'react';
import { X, Hash, Package, MapPin, User, FileText, CheckCircle, AlertCircle } from 'lucide-react';
import { InventoryItem, SerialNumber } from '../types';

interface SerialNumberModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (serialData: any) => Promise<void>;
  inventory: InventoryItem[];
  fetchSerials?: (itemId: string) => Promise<SerialNumber[]>;
  itemId?: string;
}

const SerialNumberModal: React.FC<SerialNumberModalProps> = ({
  isOpen,
  onClose,
  onSubmit,
  inventory,
  fetchSerials,
  itemId: propItemId
}) => {
  const [itemId, setItemId] = useState(propItemId || '');
  const [serialNumber, setSerialNumber] = useState('');
  const [batchNumber, setBatchNumber] = useState('');
  const [warehouse, setWarehouse] = useState('Main Warehouse');
  const [location, setLocation] = useState('');
  const [remarks, setRemarks] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [serials, setSerials] = useState<SerialNumber[]>([]);
  const [showHistory, setShowHistory] = useState(false);

  const selectedItem = inventory.find(item => item.id === itemId);

  const warehouses = [
    'Main Warehouse',
    'Secondary Warehouse',
    'Distribution Center',
    'Retail Store'
  ];

  useEffect(() => {
    if (isOpen) {
      if (propItemId) {
        setItemId(propItemId);
        loadSerials(propItemId);
      }
      // Reset form fields
      setSerialNumber('');
      setBatchNumber('');
      setWarehouse('Main Warehouse');
      setLocation('');
      setRemarks('');
      setError('');
    }
  }, [isOpen, propItemId]);

  const loadSerials = async (id: string) => {
    if (!fetchSerials) return;
    try {
      const serialData = await fetchSerials(id);
      setSerials(serialData);
    } catch (err) {
      console.error('Failed to load serial numbers:', err);
    }
  };

  const handleItemChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newItemId = e.target.value;
    setItemId(newItemId);
    setSerials([]);
    if (newItemId && fetchSerials) {
      loadSerials(newItemId);
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
    if (!serialNumber.trim()) {
      setError('Please enter serial number');
      return;
    }

    setLoading(true);

    try {
      const serialData = {
        itemId,
        itemName: selectedItem?.name || '',
        serialNumber: serialNumber.trim(),
        batchNumber: batchNumber.trim() || undefined,
        warehouse,
        location: location.trim() || undefined,
        remarks: remarks.trim() || undefined,
      };

      await onSubmit(serialData);

      // Reload serials for this item
      if (itemId && fetchSerials) {
        await loadSerials(itemId);
      }

      // Reset form
      setSerialNumber('');
      setBatchNumber('');
      setLocation('');
      setRemarks('');

      setLoading(false);
    } catch (error: any) {
      setError(error.message || 'Failed to add serial number');
      setLoading(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'INSTOCK':
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-green-100 text-green-700">
            In Stock
          </span>
        );
      case 'SOLD':
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-red-100 text-red-700">
            Sold
          </span>
        );
      case 'RESERVED':
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-amber-100 text-amber-700">
            Reserved
          </span>
        );
      case 'RETURNED':
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-purple-100 text-purple-700">
            Returned
          </span>
        );
      case 'DEFECTIVE':
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-red-100 text-red-700">
            Defective
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-slate-100 text-slate-700">
            {status}
          </span>
        );
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-white border-b border-slate-200 px-6 py-4 flex items-center justify-between">
          <div>
            <h3 className="text-xl font-bold text-slate-800 flex items-center">
              <Hash className="w-5 h-5 mr-2 text-cyan-600" />
              Serial Number Management
            </h3>
            <p className="text-sm text-slate-500">Track individual items by serial number</p>
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
            {/* Left Column - Add New Serial Number Form */}
            <div>
              <h4 className="text-lg font-semibold text-slate-800 mb-4">Add Serial Number</h4>
              <form onSubmit={handleSubmit} className="space-y-4">
                {/* Item Selection */}
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Inventory Item</label>
                  <select
                    value={itemId}
                    onChange={handleItemChange}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-cyan-500"
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

                {/* Serial Number */}
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1 flex items-center">
                    <Hash className="w-4 h-4 mr-1 text-slate-400" />
                    Serial Number
                  </label>
                  <input
                    type="text"
                    value={serialNumber}
                    onChange={(e) => setSerialNumber(e.target.value)}
                    placeholder="e.g., SN-2024-001234"
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-cyan-500 font-mono"
                    required
                  />
                </div>

                {/* Batch Number (Optional) */}
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Batch Number (Optional)</label>
                  <input
                    type="text"
                    value={batchNumber}
                    onChange={(e) => setBatchNumber(e.target.value)}
                    placeholder="e.g., BATCH-2024-001"
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-cyan-500 font-mono"
                  />
                </div>

                {/* Warehouse and Location */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Warehouse</label>
                    <select
                      value={warehouse}
                      onChange={(e) => setWarehouse(e.target.value)}
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-cyan-500"
                      required
                    >
                      {warehouses.map(wh => (
                        <option key={wh} value={wh}>
                          {wh}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1 flex items-center">
                      <MapPin className="w-4 h-4 mr-1 text-slate-400" />
                      Location (Optional)
                    </label>
                    <input
                      type="text"
                      value={location}
                      onChange={(e) => setLocation(e.target.value)}
                      placeholder="e.g., Aisle 3, Shelf 5"
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-cyan-500"
                    />
                  </div>
                </div>

                {/* Remarks */}
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1 flex items-center">
                    <FileText className="w-4 h-4 mr-1 text-slate-400" />
                    Remarks (Optional)
                  </label>
                  <textarea
                    value={remarks}
                    onChange={(e) => setRemarks(e.target.value)}
                    placeholder="Enter any additional notes..."
                    rows={3}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-cyan-500 resize-none"
                  />
                </div>

                {/* Submit Button */}
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full px-4 py-2 text-sm font-medium text-white bg-cyan-600 hover:bg-cyan-700 rounded-lg transition-colors disabled:opacity-50 flex items-center justify-center"
                >
                  {loading ? 'Processing...' : (
                    <>
                      <CheckCircle className="w-4 h-4 mr-2" />
                      Add Serial Number
                    </>
                  )}
                </button>
              </form>
            </div>

            {/* Right Column - Serial Number History */}
            <div>
              <div className="flex items-center justify-between mb-4">
                <h4 className="text-lg font-semibold text-slate-800">Serial Number History</h4>
                {itemId && (
                  <button
                    onClick={() => setShowHistory(!showHistory)}
                    className="text-sm text-cyan-600 hover:text-cyan-700"
                  >
                    {showHistory ? 'Hide' : 'Show'}
                  </button>
                )}
              </div>

              {!itemId ? (
                <div className="text-center py-8 bg-slate-50 rounded-lg">
                  <Package className="w-12 h-12 text-slate-300 mx-auto mb-2" />
                  <p className="text-slate-500 text-sm">Select an item to view serial numbers</p>
                </div>
              ) : !showHistory ? (
                <div className="text-center py-8 bg-slate-50 rounded-lg">
                  <Package className="w-12 h-12 text-slate-300 mx-auto mb-2" />
                  <p className="text-slate-500 text-sm">Click "Show" to view serial number history</p>
                </div>
              ) : serials.length === 0 ? (
                <div className="text-center py-8 bg-slate-50 rounded-lg">
                  <Hash className="w-12 h-12 text-slate-300 mx-auto mb-2" />
                  <p className="text-slate-500 text-sm">No serial numbers found for this item</p>
                </div>
              ) : (
                <div className="space-y-3 max-h-96 overflow-y-auto">
                  {serials.map((serial, index) => (
                    <div
                      key={serial.id}
                      className={`border rounded-lg p-3 transition-colors ${
                        index % 2 === 0 ? 'bg-white border-slate-200' : 'bg-slate-50 border-slate-200'
                      }`}
                    >
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex-1">
                          <div className="flex items-center space-x-2 mb-1">
                            <span className="font-mono text-sm font-semibold text-slate-800">
                              {serial.serialNumber}
                            </span>
                            {getStatusBadge(serial.status)}
                          </div>

                          <div className="grid grid-cols-2 gap-2 text-xs text-slate-600 mb-1">
                            <div>
                              <span>Warehouse: </span>
                              <span className="font-medium">{serial.warehouse}</span>
                            </div>
                            {serial.location && (
                              <div>
                                <span>Location: </span>
                                <span className="font-medium">{serial.location}</span>
                              </div>
                            )}
                          </div>

                          {serial.batchNumber && (
                            <div className="text-xs text-slate-500">
                              Batch: {serial.batchNumber}
                            </div>
                          )}

                          {serial.customerId && (
                            <div className="text-xs text-slate-600 mt-1">
                              <User className="w-3 h-3 inline mr-1" />
                              Customer: {serial.customerId}
                            </div>
                          )}

                          {serial.soldDate && (
                            <div className="text-xs text-slate-500">
                              Sold: {new Date(serial.soldDate).toLocaleDateString()}
                            </div>
                          )}

                          {serial.remarks && (
                            <div className="text-xs text-slate-600 mt-1">
                              {serial.remarks}
                            </div>
                          )}
                        </div>
                      </div>

                      <div className="text-xs text-slate-400">
                        Added: {new Date(serial.createdAt).toLocaleString()}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SerialNumberModal;