import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { InventoryItem } from '../types';
import { getDemandPrediction } from '../services/geminiService';
import { AlertTriangle, Package, Zap, Upload, Download, Search, Filter, Plus, Minus, ShoppingCart, RefreshCw, Cloud } from 'lucide-react';
import { readExcel, writeExcel } from '../services/excelService';
import inventoryApiService from '../services/api/inventoryApi';

interface WarehouseModuleProps {
  inventory: InventoryItem[];
  onInventoryChange: (newInventory: InventoryItem[]) => void;
}

const WarehouseModule: React.FC<WarehouseModuleProps> = ({inventory, onInventoryChange}) => {
  const [prediction, setPrediction] = useState<string>('Analyzing demand patterns...');
  const [loading, setLoading] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [syncStatus, setSyncStatus] = useState<'idle' | 'syncing' | 'success' | 'error'>('idle');
  const [searchTerm, setSearchTerm] = useState('');
  const [filterCategory, setFilterCategory] = useState('All');
  const [filterStatus, setFilterStatus] = useState('All');
  const [sortBy, setSortBy] = useState('name');

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

  useEffect(() => {
    const fetchPrediction = async () => {
        setLoading(true);
        const result = await getDemandPrediction(inventory);
        setPrediction(result);
        setLoading(false);
    };
    fetchPrediction();
  }, [inventory]);

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

  const handleExport = () => {
    writeExcel(inventory);
  };

  return (
    <div className="space-y-6">
        <div className="flex items-center justify-between">
            <h2 className="text-2xl font-bold text-slate-800">Warehouse & Inventory</h2>

            {/* Google Sheets Sync Status */}
            <div className="flex items-center space-x-2">
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

        {/* AI Prediction Card */}
        <div className="bg-gradient-to-br from-orange-50 to-amber-50 border border-orange-200 rounded-xl p-6 shadow-sm">
            <div className="flex items-start">
                <div className="p-2 bg-orange-100 rounded-lg mr-4">
                    <Zap className="w-6 h-6 text-orange-600" />
                </div>
                <div className="flex-1">
                    <h3 className="text-lg font-bold text-slate-800 mb-1">AI Demand Prediction Engine</h3>
                    {loading ? (
                        <div className="h-4 bg-orange-200 rounded w-3/4 animate-pulse mt-2"></div>
                    ) : (
                        <p className="text-slate-700 text-sm leading-relaxed">{prediction}</p>
                    )}
                </div>
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
                            <th className="px-6 py-3 font-medium">Product</th>
                            <th className="px-6 py-3 font-medium">SKU</th>
                            <th className="px-6 py-3 font-medium text-center">Stock Level</th>
                            <th className="px-6 py-3 font-medium text-center">Min Level</th>
                            <th className="px-6 py-3 font-medium text-center">Status</th>
                            <th className="px-6 py-3 font-medium">Category</th>
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
                                    <td className="px-6 py-4 text-center">
                                        <div className="flex items-center justify-center space-x-1">
                                            <button
                                                onClick={() => adjustQuantity(item.id, -1)}
                                                className="p-1 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
                                                title="Decrease stock"
                                            >
                                                <Minus className="w-4 h-4" />
                                            </button>
                                            <span className="text-sm font-medium text-slate-600 mx-2">
                                                Adjust
                                            </span>
                                            <button
                                                onClick={() => adjustQuantity(item.id, 1)}
                                                className="p-1 text-slate-400 hover:text-green-600 hover:bg-green-50 rounded transition-colors"
                                                title="Increase stock"
                                            >
                                                <Plus className="w-4 h-4" />
                                            </button>
                                            {isLow && (
                                                <button
                                                    onClick={() => adjustQuantity(item.id, item.minLevel - item.quantity)}
                                                    className="ml-3 px-2 py-1 text-xs font-medium text-blue-600 bg-blue-50 hover:bg-blue-100 rounded border border-blue-200 transition-colors"
                                                    title="Quick reorder to minimum"
                                                >
                                                    <ShoppingCart className="w-3 h-3 inline mr-1" />
                                                    Reorder
                                                </button>
                                            )}
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
    </div>
  );
};

export default WarehouseModule;
