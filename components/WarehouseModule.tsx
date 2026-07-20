import React, { useState, useMemo, useCallback } from 'react';
import { InventoryItem } from '../types';
import { AlertTriangle, Package, Upload, Download, Search, Filter, Plus, Minus, ShoppingCart, RefreshCw, Cloud, ExternalLink, X, Image as ImageIcon, Pencil, Trash2, LogOut, Clock } from 'lucide-react';
import { readExcel, writeExcel } from '../services/excelService';
import inventoryApiService from '../services/api/inventoryApi';
import ImageUpload from './ImageUpload';
import { productApiService } from '../services/api/productApi';
import GRNModal, { GRNData } from './GRNModal';
import EditItemModal from './EditItemModal';
import StockIssueModal from './StockIssueModal';
import StockHistoryModal from './StockHistoryModal';

interface WarehouseModuleProps {
  inventory: InventoryItem[];
  onInventoryChange: (newInventory: InventoryItem[]) => void;
}

const WarehouseModule: React.FC<WarehouseModuleProps> = ({inventory, onInventoryChange}) => {
  const [syncing, setSyncing] = useState(false);
  const [syncStatus, setSyncStatus] = useState<'idle' | 'syncing' | 'success' | 'error'>('idle');
  const [searchTerm, setSearchTerm] = useState('');
  const [filterCategory, setFilterCategory] = useState('All');
  const [filterStatus, setFilterStatus] = useState('All');
  const [sortBy, setSortBy] = useState('name');
  const [selectedItem, setSelectedItem] = useState<InventoryItem | null>(null);
  const [imageModalOpen, setImageModalOpen] = useState(false);
  const [grnModalOpen, setGrnModalOpen] = useState(false);
  const [notification, setNotification] = useState({ show: false, message: '', type: 'success' as 'success' | 'error' });
  const [editItem, setEditItem] = useState<InventoryItem | null>(null);
  const [issueItem, setIssueItem] = useState<InventoryItem | null>(null);
  const [historyItem, setHistoryItem] = useState<InventoryItem | null>(null);

  // Fetch inventory from Google Sheets (manual refresh only)
  const fetchInventoryFromSheets = useCallback(async () => {
    try {
      setSyncing(true);
      setSyncStatus('syncing');
      const data = await inventoryApiService.getInventory();
      onInventoryChange(data);
      setSyncStatus('success');
      setTimeout(() => setSyncStatus('idle'), 2000);
    } catch (error) {
      console.error('Failed to fetch inventory:', error);
      setSyncStatus('error');
      setTimeout(() => setSyncStatus('idle'), 3000);
    } finally {
      setSyncing(false);
    }
  }, [onInventoryChange]);

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      try {
        const newInventory = await readExcel(file);
        onInventoryChange(newInventory);
      } catch (error) {
        console.error('Error reading Excel file:', error);
        alert('Failed to import inventory from Excel. Please check the file format.');
      }
    }
  };

  // Filtered and sorted inventory
  const filteredInventory = useMemo(() => {
    let filtered = inventory.filter(item => {
      const name = item.name || '';
      const sku = item.sku || '';
      const category = item.category || 'Uncategorized';
      const quantity = item.quantity || 0;
      const minLevel = item.minLevel || 10;

      const matchesSearch = name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           sku.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesCategory = filterCategory === 'All' || category === filterCategory;
      const matchesStatus = filterStatus === 'All' ||
        (filterStatus === 'Critical' && quantity <= minLevel * 0.2) ||
        (filterStatus === 'Low' && quantity <= minLevel && quantity > minLevel * 0.2) ||
        (filterStatus === 'Healthy' && quantity > minLevel);

      return matchesSearch && matchesCategory && matchesStatus;
    });

    // Sort inventory
    filtered.sort((a, b) => {
      if (sortBy === 'name') {
        const aName = a.name || '';
        const bName = b.name || '';
        return aName.localeCompare(bName);
      }
      if (sortBy === 'quantity') return (b.quantity || 0) - (a.quantity || 0);
      if (sortBy === 'category') {
        const aCat = a.category || '';
        const bCat = b.category || '';
        return aCat.localeCompare(bCat);
      }
      if (sortBy === 'status') {
        const aQty = a.quantity || 0;
        const aMin = a.minLevel || 10;
        const bQty = b.quantity || 0;
        const bMin = b.minLevel || 10;
        const aStatus = aQty <= aMin * 0.2 ? 0 : aQty <= aMin ? 1 : 2;
        const bStatus = bQty <= bMin * 0.2 ? 0 : bQty <= bMin ? 1 : 2;
        return aStatus - bStatus;
      }
      return 0;
    });

    return filtered;
  }, [inventory, searchTerm, filterCategory, filterStatus, sortBy]);

  // Quick quantity adjustments with real-time sync to Google Sheets
  const adjustQuantity = async (itemId: string, adjustment: number) => {
    try {
      // Update locally first for immediate feedback
      const updatedInventory = inventory.map(item => {
        if (item.id === itemId) {
          const newQuantity = Math.max(0, item.quantity + adjustment);
          return {
            ...item,
            quantity: newQuantity,
            lastMovement: new Date().toISOString().split('T')[0]
          };
        }
        return item;
      });
      onInventoryChange(updatedInventory);

      // Sync to Google Sheets
      setSyncing(true);
      setSyncStatus('syncing');
      await inventoryApiService.adjustQuantity(itemId, adjustment);
      const adjustedItem = inventory.find(i => i.id === itemId);
      if (adjustedItem) {
        logMovementBestEffort({ itemId, itemName: adjustedItem.name, sku: adjustedItem.sku, type: 'adjust', quantityChange: adjustment, newQuantity: Math.max(0, (adjustedItem.quantity || 0) + adjustment) });
      }
      setSyncStatus('success');
      setTimeout(() => setSyncStatus('idle'), 2000);
      setSyncing(false);
    } catch (error) {
      console.error('Failed to update quantity:', error);
      setSyncStatus('error');
      setTimeout(() => setSyncStatus('idle'), 3000);
      setSyncing(false);

      // Re-fetch to get correct state
      await fetchInventoryFromSheets();
    }
  };

  // GRN (Goods Received Note): receive stock for an existing item or create a new one.
  // Lightweight: only stock/product fields persist (via addItem / adjustQuantity);
  // GRN-meta (number, DO, remarks) is not stored.
  const handleGRNSubmit = async (grn: GRNData) => {
    setSyncing(true);
    setSyncStatus('syncing');
    try {
      let created: InventoryItem | undefined;
      if (grn.itemType === 'existing' && grn.itemId) {
        await inventoryApiService.adjustQuantity(grn.itemId, grn.quantityReceived);
      } else if (grn.itemType === 'new' && grn.newItemData) {
        const today = new Date().toISOString().split('T')[0];
        const newItem = grn.newItemData;
        created = await inventoryApiService.addItem({
          name: newItem.name,
          sku: newItem.sku,
          category: newItem.category || 'General',
          brand: newItem.brand || 'Unknown',
          quantity: grn.quantityReceived,
          unitCost: newItem.unitCost ?? grn.unitCost ?? 0,
          sellingPrice: newItem.sellingPrice,
          minLevel: newItem.minLevel ?? 10,
          supplier: grn.supplier,
          lastMovement: today,
        });
      } else {
        throw new Error('Invalid GRN payload');
      }

      // Refresh inventory from the backend so the table reflects the change.
      await fetchInventoryFromSheets();

      // Best-effort movement log
      if (grn.itemType === 'existing' && grn.itemId) {
        const rcvItem = inventory.find(i => i.id === grn.itemId);
        logMovementBestEffort({ itemId: grn.itemId, itemName: grn.itemName, sku: rcvItem?.sku, type: 'receive', quantityChange: grn.quantityReceived, newQuantity: (rcvItem?.quantity ?? 0) + grn.quantityReceived });
      } else if (grn.newItemData) {
        logMovementBestEffort({ itemId: created?.id || '', itemName: grn.newItemData.name, sku: grn.newItemData.sku, type: 'create', quantityChange: grn.quantityReceived, newQuantity: grn.quantityReceived });
      }

      const itemName = grn.itemType === 'existing' ? (grn.itemName || 'item') : (grn.newItemData?.name || 'new item');
      setNotification({ show: true, message: `GRN ${grn.grnNumber} created — stock updated for ${itemName}.`, type: 'success' });
      setSyncStatus('success');
      setTimeout(() => setNotification(n => ({ ...n, show: false })), 3000);
      setTimeout(() => setSyncStatus('idle'), 2000);
    } catch (error: any) {
      console.error('Failed to create GRN:', error);
      setNotification({ show: true, message: error.message || 'Failed to create GRN. Please try again.', type: 'error' });
      setSyncStatus('error');
      setTimeout(() => setNotification(n => ({ ...n, show: false })), 4000);
      setTimeout(() => setSyncStatus('idle'), 3000);
      throw error; // let the modal show its inline error and stay open
    } finally {
      setSyncing(false);
    }
  };

  // Best-effort movement log — never lets logging fail the main operation.
  const logMovementBestEffort = (entry: { itemId: string; itemName?: string; sku?: string; type: string; quantityChange: number; newQuantity: number; reason?: string }) => {
    inventoryApiService.logMovement(entry).catch(e => console.error('Movement log failed (non-fatal):', e));
  };

  // Edit product details (syncs to Google Sheets via existing POST /inventory/update).
  const handleEditSubmit = async (updates: Partial<InventoryItem>) => {
    if (!editItem) return;
    setSyncing(true);
    setSyncStatus('syncing');
    try {
      await inventoryApiService.updateItem(editItem.id, updates);
      await fetchInventoryFromSheets();
      setNotification({ show: true, message: `${updates.name || editItem.name} updated.`, type: 'success' });
      setSyncStatus('success');
      setTimeout(() => setNotification(n => ({ ...n, show: false })), 3000);
      setTimeout(() => setSyncStatus('idle'), 2000);
    } catch (error: any) {
      setNotification({ show: true, message: error.message || 'Failed to update item.', type: 'error' });
      setSyncStatus('error');
      setTimeout(() => setNotification(n => ({ ...n, show: false })), 4000);
      setTimeout(() => setSyncStatus('idle'), 3000);
      throw error;
    } finally {
      setSyncing(false);
    }
  };

  // Issue / stock-out (negative adjust via existing POST /inventory/adjust; logs a movement with reason).
  const handleIssueSubmit = async (quantity: number, reason: string) => {
    if (!issueItem) return;
    setSyncing(true);
    setSyncStatus('syncing');
    try {
      await inventoryApiService.adjustQuantity(issueItem.id, -quantity);
      logMovementBestEffort({
        itemId: issueItem.id, itemName: issueItem.name, sku: issueItem.sku,
        type: 'issue', quantityChange: -quantity, newQuantity: Math.max(0, issueItem.quantity - quantity), reason,
      });
      await fetchInventoryFromSheets();
      setNotification({ show: true, message: `Issued ${quantity} of ${issueItem.name}.`, type: 'success' });
      setSyncStatus('success');
      setTimeout(() => setNotification(n => ({ ...n, show: false })), 3000);
      setTimeout(() => setSyncStatus('idle'), 2000);
    } catch (error: any) {
      setNotification({ show: true, message: error.message || 'Failed to issue stock.', type: 'error' });
      setSyncStatus('error');
      setTimeout(() => setNotification(n => ({ ...n, show: false })), 4000);
      setTimeout(() => setSyncStatus('idle'), 3000);
      throw error;
    } finally {
      setSyncing(false);
    }
  };

  // Delete product (syncs to Google Sheets via existing POST /inventory/delete).
  const handleDelete = async (item: InventoryItem) => {
    if (!window.confirm(`Delete "${item.name}" (${item.sku})? This removes it from the Google Sheet.`)) return;
    setSyncing(true);
    setSyncStatus('syncing');
    try {
      await inventoryApiService.deleteItem(item.id);
      logMovementBestEffort({
        itemId: item.id, itemName: item.name, sku: item.sku,
        type: 'delete', quantityChange: -(item.quantity || 0), newQuantity: 0,
      });
      await fetchInventoryFromSheets();
      setNotification({ show: true, message: `${item.name} deleted.`, type: 'success' });
      setSyncStatus('success');
      setTimeout(() => setNotification(n => ({ ...n, show: false })), 3000);
      setTimeout(() => setSyncStatus('idle'), 2000);
    } catch (error: any) {
      console.error('Failed to delete item:', error);
      setNotification({ show: true, message: error.message || 'Failed to delete item.', type: 'error' });
      setSyncStatus('error');
      setTimeout(() => setNotification(n => ({ ...n, show: false })), 4000);
      setTimeout(() => setSyncStatus('idle'), 3000);
    } finally {
      setSyncing(false);
    }
  };

  const handleExport = () => {
    writeExcel(inventory);
  };

  // Image management functions
  const openImageModal = (item: InventoryItem) => {
    setSelectedItem(item);
    setImageModalOpen(true);
  };

  const closeImageModal = () => {
    setSelectedItem(null);
    setImageModalOpen(false);
  };

  const handleImageUpdate = async (itemId: string, imageUrl: string, fileId: string) => {
    // Update local inventory
    const updatedInventory = inventory.map(item => {
      if (item.id === itemId) {
        return {
          ...item,
          imageUrl,
          imageFileId: fileId
        };
      }
      return item;
    });
    onInventoryChange(updatedInventory);

    // Update the selected item
    if (selectedItem && selectedItem.id === itemId) {
      setSelectedItem({
        ...selectedItem,
        imageUrl,
        imageFileId: fileId
      });
    }
  };

  const handleImageDelete = async (itemId: string) => {
    // Update local inventory
    const updatedInventory = inventory.map(item => {
      if (item.id === itemId) {
        return {
          ...item,
          imageUrl: '',
          imageFileId: ''
        };
      }
      return item;
    });
    onInventoryChange(updatedInventory);

    // Update the selected item
    if (selectedItem && selectedItem.id === itemId) {
      setSelectedItem({
        ...selectedItem,
        imageUrl: '',
        imageFileId: ''
      });
    }
  };

  return (
    <div className="space-y-6">
        <div className="flex items-center justify-between">
            <h2 className="text-2xl font-bold text-slate-800">Warehouse & Inventory</h2>

            {/* Google Sheets Sync Status */}
            <div className="flex items-center space-x-2">
                {notification.show && (
                    <span className={`px-3 py-2 text-sm font-medium rounded-lg border ${notification.type === 'success' ? 'bg-green-100 text-green-700 border-green-300' : 'bg-red-100 text-red-700 border-red-300'}`}>
                        {notification.message}
                    </span>
                )}
                {syncStatus === 'syncing' && (
                    <div className="flex items-center text-blue-600 text-sm">
                        <RefreshCw className="w-4 h-4 mr-1 animate-spin" />
                        Syncing to Google Sheets...
                    </div>
                )}
                {syncStatus === 'success' && (
                    <div className="flex items-center text-green-600 text-sm">
                        <Cloud className="w-4 h-4 mr-1" />
                        Synced successfully
                    </div>
                )}
                {syncStatus === 'error' && (
                    <div className="flex items-center text-red-600 text-sm">
                        <Cloud className="w-4 h-4 mr-1" />
                        Sync failed
                    </div>
                )}
                <a
                    href="https://docs.google.com/spreadsheets/d/1EzXFasyQxlhhDUCwTbhSc_Zxdm077xNNVvzznw0gwgk"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center px-3 py-2 text-sm font-medium text-green-600 bg-green-50 hover:bg-green-100 rounded-lg border border-green-300 transition-colors"
                    title="Open Google Sheet in new tab"
                >
                    <ExternalLink className="w-4 h-4 mr-2" />
                    Google Sheet
                </a>
                <button
                    onClick={fetchInventoryFromSheets}
                    disabled={syncing}
                    className="flex items-center px-3 py-2 text-sm font-medium text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-lg border border-slate-300 transition-colors"
                    title="Refresh from Google Sheets"
                >
                    <RefreshCw className={`w-4 h-4 mr-2 ${syncing ? 'animate-spin' : ''}`} />
                    Refresh
                </button>
            </div>
        </div>

        {/* Enhanced Inventory Management */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
            {/* Header with Search and Controls */}
            <div className="p-4 border-b border-slate-100 bg-slate-50">
                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">

                    {/* Search and Filters */}
                    <div className="flex flex-col sm:flex-row gap-3">
                        {/* Search */}
                        <div className="relative">
                            <Search className="w-4 h-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400" />
                            <input
                                type="text"
                                placeholder="Search products..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="pl-9 pr-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            />
                        </div>

                        {/* Category Filter */}
                        <select
                            value={filterCategory}
                            onChange={(e) => setFilterCategory(e.target.value)}
                            className="px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                        >
                            <option value="All">All Categories</option>
                            {[...new Set(inventory.map(item => item.category))].map(category => (
                                <option key={category} value={category}>{category}</option>
                            ))}
                        </select>

                        {/* Status Filter */}
                        <select
                            value={filterStatus}
                            onChange={(e) => setFilterStatus(e.target.value)}
                            className="px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                        >
                            <option value="All">All Status</option>
                            <option value="Critical">Critical Stock</option>
                            <option value="Low">Low Stock</option>
                            <option value="Healthy">Healthy Stock</option>
                        </select>

                        {/* Sort By */}
                        <select
                            value={sortBy}
                            onChange={(e) => setSortBy(e.target.value)}
                            className="px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                        >
                            <option value="name">Sort by Name</option>
                            <option value="quantity">Sort by Quantity</option>
                            <option value="category">Sort by Category</option>
                            <option value="status">Sort by Status</option>
                        </select>
                    </div>

                    {/* Action Buttons */}
                    <div className="flex items-center space-x-2">
                        <button
                            onClick={() => setGrnModalOpen(true)}
                            className="flex items-center px-3 py-2 text-sm font-medium text-white bg-green-600 hover:bg-green-700 rounded-lg border border-green-600 transition-colors"
                            title="Receive stock or add a new item (Goods Received Note)"
                        >
                            <Package className="w-4 h-4 mr-2" /> Receive Stock (GRN)
                        </button>
                        <button
                            onClick={handleExport}
                            className="flex items-center px-3 py-2 text-sm font-medium text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-lg border border-slate-300 transition-colors"
                        >
                            <Download className="w-4 h-4 mr-2" /> Export
                        </button>
                        <label className="flex items-center px-3 py-2 text-sm font-medium text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-lg border border-slate-300 cursor-pointer transition-colors">
                            <Upload className="w-4 h-4 mr-2" /> Import
                            <input type="file" accept=".xlsx,.xls" onChange={handleFileUpload} className="hidden" />
                        </label>
                    </div>
                </div>

                {/* Stats */}
                <div className="flex items-center space-x-4 mt-3">
                    <span className="text-xs text-slate-500 bg-white px-2 py-1 rounded border border-slate-200">
                        Total SKUs: {inventory.length}
                    </span>
                    <span className="text-xs text-slate-500 bg-white px-2 py-1 rounded border border-slate-200">
                        Showing: {filteredInventory.length}
                    </span>
                    <span className="text-xs text-red-600 bg-red-50 px-2 py-1 rounded border border-red-200">
                        Critical: {inventory.filter(i => i.quantity <= i.minLevel * 0.2).length}
                    </span>
                </div>
            </div>

            {/* Inventory Table */}
            <div className="overflow-x-auto">
                <table className="w-full text-left">
                    <thead>
                        <tr className="text-xs text-slate-400 uppercase border-b border-slate-100 bg-slate-25">
                            <th className="px-6 py-3 font-medium">Image</th>
                            <th className="px-6 py-3 font-medium">Product</th>
                            <th className="px-6 py-3 font-medium">SKU</th>
                            <th className="px-6 py-3 font-medium text-center">Stock Level</th>
                            <th className="px-6 py-3 font-medium text-center">Min Level</th>
                            <th className="px-6 py-3 font-medium text-center">Status</th>
                            <th className="px-6 py-3 font-medium">Category</th>
                            <th className="px-6 py-3 font-medium text-right">Selling Price</th>
                            <th className="px-6 py-3 font-medium text-center">Actions</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                        {filteredInventory.map((item) => {
                            const isLow = item.quantity <= item.minLevel;
                            const isCritical = item.quantity <= item.minLevel * 0.2;

                            return (
                                <tr
                                    key={item.id}
                                    className={`transition-colors group ${
                                        isCritical
                                            ? 'bg-red-50 hover:bg-red-100 border-l-4 border-l-red-500'
                                            : isLow
                                            ? 'bg-amber-50 hover:bg-amber-100 border-l-4 border-l-amber-500'
                                            : 'hover:bg-slate-50 border-l-4 border-l-transparent'
                                    }`}
                                >
                                    <td className="px-6 py-4">
                                        <div className="relative w-16 h-16 rounded-lg overflow-hidden border-2 border-slate-200 bg-slate-50">
                                            {(item.imageUrl || item.image_url) ? (
                                                <img
                                                    src={item.image_url ? productApiService.getImageUrl(item.image_url) : item.imageUrl}
                                                    alt={item.name}
                                                    className="w-full h-full object-cover cursor-pointer hover:opacity-80"
                                                    onClick={() => openImageModal(item)}
                                                    onError={(e) => {
                                                        console.error('Failed to load image:', item.imageUrl || item.image_url);
                                                        // Fallback to show placeholder
                                                        (e.currentTarget as HTMLImageElement).style.display = 'none';
                                                    }}
                                                />
                                            ) : (
                                                <div
                                                    onClick={() => openImageModal(item)}
                                                    className="w-full h-full flex items-center justify-center cursor-pointer hover:bg-blue-50 transition-colors"
                                                    title="Click to add image"
                                                >
                                                    <ImageIcon className="w-8 h-8 text-slate-300" />
                                                </div>
                                            )}
                                        </div>
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className={`font-medium ${isCritical ? 'text-red-900' : 'text-slate-800'}`}>
                                            {item.name}
                                        </div>
                                        <div className="text-xs text-slate-400">Last moved: {item.lastMovement}</div>
                                    </td>
                                    <td className="px-6 py-4 text-sm text-slate-500 font-mono">{item.sku}</td>
                                    <td className="px-6 py-4 text-center">
                                        <div className={`inline-flex items-center px-3 py-1 rounded-lg font-bold text-lg ${
                                            isCritical ? 'bg-red-100 text-red-700' :
                                            isLow ? 'bg-amber-100 text-amber-700' :
                                            'bg-green-100 text-green-700'
                                        }`}>
                                            {item.quantity}
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 text-center text-sm text-slate-600">
                                        {item.minLevel}
                                    </td>
                                    <td className="px-6 py-4 text-center">
                                        {isCritical ? (
                                            <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold bg-red-100 text-red-700 border border-red-200">
                                                <AlertTriangle className="w-3 h-3 mr-1" /> CRITICAL
                                            </span>
                                        ) : isLow ? (
                                            <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-amber-100 text-amber-700 border border-amber-200">
                                                Low Stock
                                            </span>
                                        ) : (
                                            <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-green-100 text-green-700 border border-green-200">
                                                Healthy
                                            </span>
                                        )}
                                    </td>
                                    <td className="px-6 py-4 text-sm text-slate-500">{item.category}</td>
                                    <td className="px-6 py-4 text-right text-sm font-semibold text-slate-800 font-mono">
                                        RM{(item.sellingPrice || 0).toFixed(2)}
                                    </td>
                                    <td className="px-6 py-4 text-center">
                                        <div className="flex items-center justify-center space-x-1">
                                            <button onClick={() => adjustQuantity(item.id, -1)} className="p-1 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors" title="Decrease stock">
                                                <Minus className="w-4 h-4" />
                                            </button>
                                            <button onClick={() => adjustQuantity(item.id, 1)} className="p-1 text-slate-400 hover:text-green-600 hover:bg-green-50 rounded transition-colors" title="Increase stock">
                                                <Plus className="w-4 h-4" />
                                            </button>
                                            {isLow && (
                                                <button onClick={() => adjustQuantity(item.id, item.minLevel - item.quantity)} className="ml-2 px-2 py-1 text-xs font-medium text-blue-600 bg-blue-50 hover:bg-blue-100 rounded border border-blue-200 transition-colors" title="Quick reorder to minimum">
                                                    <ShoppingCart className="w-3 h-3 inline mr-1" />Reorder
                                                </button>
                                            )}
                                            <span className="mx-1 text-slate-200">|</span>
                                            <button onClick={() => setEditItem(item)} className="p-1 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors" title="Edit item">
                                                <Pencil className="w-4 h-4" />
                                            </button>
                                            <button onClick={() => setIssueItem(item)} className="p-1 text-slate-400 hover:text-amber-600 hover:bg-amber-50 rounded transition-colors" title="Issue stock (out)">
                                                <LogOut className="w-4 h-4" />
                                            </button>
                                            <button onClick={() => setHistoryItem(item)} className="p-1 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded transition-colors" title="Stock history">
                                                <Clock className="w-4 h-4" />
                                            </button>
                                            <button onClick={() => handleDelete(item)} className="p-1 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors" title="Delete item">
                                                <Trash2 className="w-4 h-4" />
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>

                {filteredInventory.length === 0 && (
                    <div className="py-12 text-center">
                        <Package className="w-12 h-12 text-slate-300 mx-auto mb-4" />
                        <p className="text-slate-500">No items match your search criteria.</p>
                        <button
                            onClick={() => {
                                setSearchTerm('');
                                setFilterCategory('All');
                                setFilterStatus('All');
                                setSortBy('name');
                            }}
                            className="mt-2 text-blue-600 hover:text-blue-800 text-sm underline"
                        >
                            Clear filters
                        </button>
                    </div>
                )}
            </div>
        </div>

        {/* Image Management Modal */}
        {imageModalOpen && selectedItem && (
            <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
                    <div className="sticky top-0 bg-white border-b border-slate-200 px-6 py-4 flex items-center justify-between">
                        <div>
                            <h3 className="text-xl font-bold text-slate-800">Product Image Management</h3>
                            <p className="text-sm text-slate-500">{selectedItem.name} ({selectedItem.sku})</p>
                        </div>
                        <button
                            onClick={closeImageModal}
                            className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
                        >
                            <X className="w-5 h-5" />
                        </button>
                    </div>

                    <div className="p-6">
                        {/* Current Image Preview */}
                        <div className="mb-6">
                            <h4 className="text-sm font-semibold text-slate-700 mb-3">Current Image</h4>
                            {selectedItem.imageUrl ? (
                                <div className="relative w-full h-64 rounded-lg overflow-hidden border-2 border-slate-200 bg-slate-50">
                                    <img
                                        src={selectedItem.imageUrl}
                                        alt={selectedItem.name}
                                        className="w-full h-full object-contain"
                                        onError={(e) => {
                                            console.error('Failed to load modal image:', selectedItem.imageUrl);
                                            e.currentTarget.style.display = 'none';
                                            e.currentTarget.parentElement!.innerHTML = `
                                                <div class="w-full h-64 flex items-center justify-center">
                                                    <div class="text-center">
                                                        <svg class="w-12 h-12 text-slate-300 mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                                                        </svg>
                                                        <p class="text-sm text-slate-500">Failed to load image</p>
                                                    </div>
                                                </div>
                                            `;
                                        }}
                                    />
                                </div>
                            ) : (
                                <div className="w-full h-64 rounded-lg border-2 border-dashed border-slate-300 bg-slate-50 flex items-center justify-center">
                                    <div className="text-center">
                                        <Package className="w-12 h-12 text-slate-300 mx-auto mb-2" />
                                        <p className="text-sm text-slate-500">No image uploaded</p>
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Image Upload */}
                        <div>
                            <h4 className="text-sm font-semibold text-slate-700 mb-3">Upload New Image</h4>
                            <ImageUpload
                                itemId={selectedItem.id}
                                currentImage={selectedItem.imageUrl}
                                onImageUpdate={(imageUrl, fileId) => handleImageUpdate(selectedItem.id, imageUrl, fileId)}
                                onImageDelete={() => handleImageDelete(selectedItem.id)}
                            />
                        </div>

                        {/* Item Details */}
                        <div className="mt-6 p-4 bg-slate-50 rounded-lg">
                            <h4 className="text-sm font-semibold text-slate-700 mb-2">Product Details</h4>
                            <div className="grid grid-cols-2 gap-4 text-sm">
                                <div>
                                    <span className="text-slate-500">SKU:</span>
                                    <span className="ml-2 font-medium text-slate-800">{selectedItem.sku}</span>
                                </div>
                                <div>
                                    <span className="text-slate-500">Category:</span>
                                    <span className="ml-2 font-medium text-slate-800">{selectedItem.category}</span>
                                </div>
                                <div>
                                    <span className="text-slate-500">Brand:</span>
                                    <span className="ml-2 font-medium text-slate-800">{selectedItem.brand}</span>
                                </div>
                                <div>
                                    <span className="text-slate-500">Current Stock:</span>
                                    <span className="ml-2 font-medium text-slate-800">{selectedItem.quantity} units</span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        )}

        {/* GRN (Add Item / Receive Stock) Modal */}
        <GRNModal
            isOpen={grnModalOpen}
            onClose={() => setGrnModalOpen(false)}
            onSubmit={handleGRNSubmit}
            inventory={inventory}
        />

        <EditItemModal item={editItem} onClose={() => setEditItem(null)} onSubmit={handleEditSubmit} />
        <StockIssueModal item={issueItem} onClose={() => setIssueItem(null)} onSubmit={handleIssueSubmit} />
        <StockHistoryModal item={historyItem} onClose={() => setHistoryItem(null)} />
    </div>
  );
};

export default WarehouseModule;
