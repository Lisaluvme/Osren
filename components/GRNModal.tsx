import React, { useState, useEffect } from 'react';
import { X, Package, Calendar, Building2, DollarSign, FileText, FileText as FileIcon } from 'lucide-react';
import { InventoryItem } from '../types';

interface GRNModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (grnData: any) => Promise<void>;
  inventory: InventoryItem[];
}

const GRNModal: React.FC<GRNModalProps> = ({ isOpen, onClose, onSubmit, inventory }) => {
  const [grnNumber, setGrnNumber] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [supplier, setSupplier] = useState('');
  const [supplierInput, setSupplierInput] = useState('');
  const [showSupplierDropdown, setShowSupplierDropdown] = useState(false);
  const [doNumber, setDoNumber] = useState('');
  const [itemType, setItemType] = useState<'existing' | 'new'>('existing');
  const [selectedItemId, setSelectedItemId] = useState('');
  const [quantityReceived, setQuantityReceived] = useState('');
  const [unitCost, setUnitCost] = useState('');
  const [remarks, setRemarks] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // New item fields
  const [newItemName, setNewItemName] = useState('');
  const [newItemSku, setNewItemSku] = useState('');
  const [newItemCategory, setNewItemCategory] = useState('');
  const [newItemBrand, setNewItemBrand] = useState('');
  const [newItemSellingPrice, setNewItemSellingPrice] = useState('');
  const [newItemMinLevel, setNewItemMinLevel] = useState('10');

  // Extract unique suppliers from inventory
  const uniqueSuppliers = React.useMemo(() => {
    const suppliers = new Set<string>();
    inventory.forEach(item => {
      if (item.supplier && item.supplier.trim()) {
        suppliers.add(item.supplier.trim());
      }
    });
    return Array.from(suppliers).sort();
  }, [inventory]);

  // Extract unique categories from inventory
  const uniqueCategories = React.useMemo(() => {
    const categories = new Set<string>();
    inventory.forEach(item => {
      if (item.category && item.category.trim()) {
        categories.add(item.category.trim());
      }
    });
    return Array.from(categories).sort();
  }, [inventory]);

  // Extract unique brands from inventory
  const uniqueBrands = React.useMemo(() => {
    const brands = new Set<string>();
    inventory.forEach(item => {
      if (item.brand && item.brand.trim()) {
        brands.add(item.brand.trim());
      }
    });
    return Array.from(brands).sort();
  }, [inventory]);

  // Filter suppliers based on input
  const filteredSuppliers = React.useMemo(() => {
    if (!supplierInput.trim()) return uniqueSuppliers;
    return uniqueSuppliers.filter(s =>
      s.toLowerCase().includes(supplierInput.toLowerCase())
    );
  }, [supplierInput, uniqueSuppliers]);

  // Auto-generate GRN number on modal open
  useEffect(() => {
    if (isOpen) {
      const today = new Date();
      const year = today.getFullYear();
      const month = String(today.getMonth() + 1).padStart(2, '0');
      const day = String(today.getDate()).padStart(2, '0');
      const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
      setGrnNumber(`GRN-${year}${month}${day}-${random}`);

      // Reset form fields
      setDate(new Date().toISOString().split('T')[0]);
      setSupplier('');
      setSupplierInput('');
      setShowSupplierDropdown(false);
      setDoNumber('');
      setItemType('existing');
      setSelectedItemId('');
      setQuantityReceived('');
      setUnitCost('');
      setRemarks('');
      setNewItemName('');
      setNewItemSku('');
      setNewItemCategory('');
      setNewItemBrand('');
      setNewItemSellingPrice('');
      setNewItemMinLevel('10');
      setError('');
    }
  }, [isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setShowSupplierDropdown(false);
    setError('');

    // Validation
    if (itemType === 'existing' && !selectedItemId) {
      setError('Please select an inventory item');
      return;
    }
    if (itemType === 'new' && !newItemName.trim()) {
      setError('Please enter item name');
      return;
    }
    if (itemType === 'new' && !newItemSku.trim()) {
      setError('Please enter SKU');
      return;
    }
    if (!quantityReceived || parseInt(quantityReceived) <= 0) {
      setError('Please enter a valid quantity received');
      return;
    }
    if (!supplier.trim()) {
      setError('Please enter supplier name');
      return;
    }
    if (!doNumber.trim()) {
      setError('Please enter supplier DO number');
      return;
    }
    if (itemType === 'new' && !newItemSellingPrice || parseFloat(newItemSellingPrice) <= 0) {
      setError('Please enter a valid selling price');
      return;
    }

    let finalItemId = selectedItemId;
    let finalItemName = '';

    if (itemType === 'new') {
      finalItemName = newItemName.trim();
      // For new items, we'll let the backend generate the item ID
    } else {
      const selectedItem = inventory.find(item => item.id === selectedItemId);
      if (!selectedItem) {
        setError('Selected item not found');
        return;
      }
      finalItemName = selectedItem.name;
    }

    setLoading(true);

    try {
      const grnData = {
        grnNumber,
        date,
        supplier: supplier.trim(),
        doNumber: doNumber.trim(),
        itemType,
        // For existing items
        ...(itemType === 'existing' ? {
          itemId: selectedItemId,
          itemName: finalItemName,
        } : {
          itemId: undefined, // Backend will generate
          newItemData: {
            name: newItemName.trim(),
            sku: newItemSku.trim(),
            category: newItemCategory.trim() || 'General',
            brand: newItemBrand.trim() || 'Unknown',
            quantity: parseInt(quantityReceived),
            unitCost: unitCost ? parseFloat(unitCost) : 0,
            sellingPrice: parseFloat(newItemSellingPrice),
            minLevel: parseInt(newItemMinLevel) || 10,
            supplier: supplier.trim(),
          }
        }),
        quantityReceived: parseInt(quantityReceived),
        unitCost: unitCost ? parseFloat(unitCost) : undefined,
        totalCost: unitCost ? parseFloat(unitCost) * parseInt(quantityReceived) : undefined,
        remarks: remarks.trim() || undefined,
      };

      await onSubmit(grnData);
      onClose();
    } catch (error: any) {
      setError(error.message || 'Failed to create GRN');
    } finally {
      setLoading(false);
    }
  };

  const selectedItem = inventory.find(item => item.id === selectedItemId);
  const totalCost = unitCost && quantityReceived ? parseFloat(unitCost) * parseInt(quantityReceived) : 0;

  // Auto-fill supplier when selecting existing item
  React.useEffect(() => {
    if (itemType === 'existing' && selectedItem && selectedItem.supplier && !supplier) {
      setSupplier(selectedItem.supplier);
      setSupplierInput(selectedItem.supplier);
    }
  }, [selectedItem, itemType, supplier]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-white border-b border-slate-200 px-6 py-4 flex items-center justify-between">
          <div>
            <h3 className="text-xl font-bold text-slate-800 flex items-center">
              <Package className="w-5 h-5 mr-2 text-green-600" />
              Add Item (GRN)
            </h3>
            <p className="text-sm text-slate-500">Goods Received Note - Record incoming inventory</p>
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

          {/* GRN Number */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              GRN Number (Auto-generated)
            </label>
            <input
              type="text"
              value={grnNumber}
              onChange={(e) => setGrnNumber(e.target.value)}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg bg-slate-50 text-slate-700 font-mono text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
              required
            />
          </div>

          {/* Date and Supplier */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1 flex items-center">
                <Calendar className="w-4 h-4 mr-1 text-slate-400" />
                Date
              </label>
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                required
              />
            </div>

            <div className="relative">
              <label className="block text-sm font-medium text-slate-700 mb-1 flex items-center">
                <Building2 className="w-4 h-4 mr-1 text-slate-400" />
                Supplier
              </label>
              <input
                type="text"
                value={supplierInput}
                onChange={(e) => {
                  setSupplierInput(e.target.value);
                  setShowSupplierDropdown(true);
                  setSupplier(e.target.value);
                }}
                onFocus={() => setShowSupplierDropdown(true)}
                placeholder="Enter or select supplier name"
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                required
              />
              {showSupplierDropdown && filteredSuppliers.length > 0 && (
                <div className="absolute z-10 w-full mt-1 bg-white border border-slate-300 rounded-lg shadow-lg max-h-40 overflow-y-auto">
                  {filteredSuppliers.map((supp) => (
                    <div
                      key={supp}
                      className="px-3 py-2 hover:bg-slate-100 cursor-pointer text-sm text-slate-700"
                      onClick={() => {
                        setSupplier(supp);
                        setSupplierInput(supp);
                        setShowSupplierDropdown(false);
                      }}
                    >
                      {supp}
                    </div>
                  ))}
                </div>
              )}
              {showSupplierDropdown && filteredSuppliers.length === 0 && supplierInput.trim() && (
                <div className="absolute z-10 w-full mt-1 bg-white border border-slate-300 rounded-lg shadow-lg">
                  <div className="px-3 py-2 text-sm text-slate-500 italic">
                    No matching suppliers. Press Enter to add "{supplierInput}" as new supplier.
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* DO Number */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1 flex items-center">
              <FileIcon className="w-4 h-4 mr-1 text-slate-400" />
              Supplier Delivery Order (DO) Number
            </label>
            <input
              type="text"
              value={doNumber}
              onChange={(e) => setDoNumber(e.target.value)}
              placeholder="Enter supplier DO number"
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
              required
            />
          </div>

          {/* Item Type Selection */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">Item Type</label>
            <div className="flex space-x-4">
              <label className="flex items-center">
                <input
                  type="radio"
                  value="existing"
                  checked={itemType === 'existing'}
                  onChange={(e) => setItemType(e.target.value as 'existing' | 'new')}
                  className="mr-2"
                />
                <span className="text-sm text-slate-700">Existing Item</span>
              </label>
              <label className="flex items-center">
                <input
                  type="radio"
                  value="new"
                  checked={itemType === 'new'}
                  onChange={(e) => setItemType(e.target.value as 'existing' | 'new')}
                  className="mr-2"
                />
                <span className="text-sm text-slate-700">New Item</span>
              </label>
            </div>
          </div>

          {/* Existing Item Selection */}
          {itemType === 'existing' && (
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Select Existing Item</label>
              <select
                value={selectedItemId}
                onChange={(e) => setSelectedItemId(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                required
              >
                <option value="">Select an item...</option>
                {inventory.map(item => (
                  <option key={item.id} value={item.id}>
                    {item.name} ({item.sku}) - Current: {item.quantity} units
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* New Item Details */}
          {itemType === 'new' && (
            <div className="space-y-4 p-4 bg-green-50 border border-green-200 rounded-lg">
              <h4 className="text-sm font-semibold text-green-800 mb-3">New Item Details</h4>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Item Name *</label>
                  <input
                    type="text"
                    value={newItemName}
                    onChange={(e) => setNewItemName(e.target.value)}
                    placeholder="Enter item name"
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                    required={itemType === 'new'}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">SKU *</label>
                  <input
                    type="text"
                    value={newItemSku}
                    onChange={(e) => setNewItemSku(e.target.value)}
                    placeholder="Enter SKU"
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                    required={itemType === 'new'}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Category</label>
                  <select
                    value={newItemCategory}
                    onChange={(e) => setNewItemCategory(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                  >
                    <option value="">Select category...</option>
                    {uniqueCategories.map(cat => (
                      <option key={cat} value={cat}>{cat}</option>
                    ))}
                    <option value="General">General</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Brand</label>
                  <select
                    value={newItemBrand}
                    onChange={(e) => setNewItemBrand(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                  >
                    <option value="">Select brand...</option>
                    {uniqueBrands.map(brand => (
                      <option key={brand} value={brand}>{brand}</option>
                    ))}
                    <option value="Unknown">Unknown</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Selling Price (RM) *</label>
                  <input
                    type="number"
                    value={newItemSellingPrice}
                    onChange={(e) => setNewItemSellingPrice(e.target.value)}
                    placeholder="0.00"
                    min="0"
                    step="0.01"
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                    required={itemType === 'new'}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Min Stock Level</label>
                  <input
                    type="number"
                    value={newItemMinLevel}
                    onChange={(e) => setNewItemMinLevel(e.target.value)}
                    placeholder="10"
                    min="0"
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                  />
                </div>
              </div>
            </div>
          )}

          {/* Selected Item Details */}
          {selectedItem && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
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
                  <span className="text-slate-500">Current Stock:</span>
                  <span className="ml-2 font-medium text-slate-800">{selectedItem.quantity} units</span>
                </div>
              </div>
            </div>
          )}

          {/* Quantity and Unit Cost */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Quantity Received</label>
              <input
                type="number"
                value={quantityReceived}
                onChange={(e) => setQuantityReceived(e.target.value)}
                placeholder="Enter quantity"
                min="1"
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
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
                value={unitCost}
                onChange={(e) => setUnitCost(e.target.value)}
                placeholder="Enter unit cost"
                min="0"
                step="0.01"
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
              />
            </div>
          </div>

          {/* Total Cost Display */}
          {totalCost > 0 && (
            <div className="bg-green-50 border border-green-200 rounded-lg p-3">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-slate-700">Total Cost:</span>
                <span className="text-lg font-bold text-green-700">RM{totalCost.toFixed(2)}</span>
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
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 resize-none"
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
              className="px-6 py-2 text-sm font-medium text-white bg-green-600 hover:bg-green-700 rounded-lg transition-colors disabled:opacity-50"
            >
              {loading ? 'Processing...' : 'Create GRN'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default GRNModal;