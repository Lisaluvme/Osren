import React, { useState, useEffect } from 'react';
import { X, ShoppingCart, TrendingUp, AlertCircle, Package, DollarSign, Calendar } from 'lucide-react';

interface ReorderRecommendation {
  itemId: string;
  itemName: string;
  currentStock: number;
  minLevel: number;
  avgMonthlyUsage: number;
  lastSaleDate: string | null;
  reorderRecommendation: number;
  urgency: 'HIGH' | 'MEDIUM' | 'LOW';
  reason: string;
  estimatedCost: number;
}

interface ReorderRecommendationModalProps {
  isOpen: boolean;
  onClose: () => void;
  inventory: any[];
  onCreatePurchaseOrder?: (recommendations: ReorderRecommendation[]) => void;
}

const ReorderRecommendationModal: React.FC<ReorderRecommendationModalProps> = ({
  isOpen,
  onClose,
  inventory,
  onCreatePurchaseOrder
}) => {
  const [recommendations, setRecommendations] = useState<ReorderRecommendation[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedItems, setSelectedItems] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (isOpen) {
      fetchRecommendations();
    }
  }, [isOpen, inventory]);

  const fetchRecommendations = async () => {
    setLoading(true);
    try {
      // Get recommendations for low stock items
      const lowStockItems = inventory.filter(item => item.quantity <= item.minLevel);

      const recommendationPromises = lowStockItems.map(async (item) => {
        try {
          const response = await fetch(`http://localhost:5000/api/inventory/usage-analysis/${item.id}`);
          const result = await response.json();
          if (result.success) {
            return result.data;
          }
        } catch (error) {
          console.error(`Failed to get recommendation for ${item.id}:`, error);
        }
        return null;
      });

      const results = await Promise.all(recommendationPromises);
      const validRecommendations = results.filter(r => r !== null && r.reorderRecommendation > 0);

      setRecommendations(validRecommendations);
    } catch (error) {
      console.error('Failed to fetch recommendations:', error);
    } finally {
      setLoading(false);
    }
  };

  const toggleItemSelection = (itemId: string) => {
    const newSelection = new Set(selectedItems);
    if (newSelection.has(itemId)) {
      newSelection.delete(itemId);
    } else {
      newSelection.add(itemId);
    }
    setSelectedItems(newSelection);
  };

  const selectAll = () => {
    setSelectedItems(new Set(recommendations.map(r => r.itemId)));
  };

  const clearAll = () => {
    setSelectedItems(new Set());
  };

  const handleCreatePurchaseOrder = () => {
    const selectedRecommendations = recommendations.filter(r => selectedItems.has(r.itemId));
    if (selectedRecommendations.length > 0 && onCreatePurchaseOrder) {
      onCreatePurchaseOrder(selectedRecommendations);
      onClose();
    }
  };

  const getUrgencyColor = (urgency: string) => {
    switch (urgency) {
      case 'HIGH': return 'text-red-700 bg-red-100 border-red-300';
      case 'MEDIUM': return 'text-amber-700 bg-amber-100 border-amber-300';
      case 'LOW': return 'text-green-700 bg-green-100 border-green-300';
      default: return 'text-slate-700 bg-slate-100 border-slate-300';
    }
  };

  const getUrgencyIcon = (urgency: string) => {
    switch (urgency) {
      case 'HIGH': return <AlertCircle className="w-4 h-4" />;
      case 'MEDIUM': return <AlertCircle className="w-4 h-4" />;
      case 'LOW': return <TrendingUp className="w-4 h-4" />;
      default: return <Package className="w-4 h-4" />;
    }
  };

  if (!isOpen) return null;

  const selectedCount = selectedItems.size;
  const totalEstimatedCost = recommendations
    .filter(r => selectedItems.has(r.itemId))
    .reduce((sum, r) => sum + r.estimatedCost, 0);

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl max-w-6xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-white border-b border-slate-200 px-6 py-4 flex items-center justify-between">
          <div>
            <h3 className="text-xl font-bold text-slate-800 flex items-center">
              <ShoppingCart className="w-5 h-5 mr-2 text-green-600" />
              Reorder Recommendations
            </h3>
            <p className="text-sm text-slate-500">Intelligent reorder suggestions based on usage patterns and stock levels</p>
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
          {/* Actions Bar */}
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center space-x-2">
              <button
                onClick={selectAll}
                className="px-3 py-1.5 text-sm font-medium text-blue-600 bg-blue-50 hover:bg-blue-100 rounded-lg border border-blue-300 transition-colors"
              >
                Select All
              </button>
              <button
                onClick={clearAll}
                className="px-3 py-1.5 text-sm font-medium text-slate-600 bg-slate-50 hover:bg-slate-100 rounded-lg border border-slate-300 transition-colors"
              >
                Clear All
              </button>
              <span className="text-sm text-slate-500">
                {selectedCount} of {recommendations.length} selected
              </span>
            </div>

            {selectedCount > 0 && (
              <button
                onClick={handleCreatePurchaseOrder}
                className="flex items-center px-4 py-2 text-sm font-medium text-white bg-green-600 hover:bg-green-700 rounded-lg transition-colors"
              >
                <ShoppingCart className="w-4 h-4 mr-2" />
                Create Purchase Order (RM{totalEstimatedCost.toLocaleString('en-MY', { minimumFractionDigits: 0, maximumFractionDigits: 0 })})
              </button>
            )}
          </div>

          {/* Loading State */}
          {loading ? (
            <div className="text-center py-12">
              <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
              <p className="text-slate-500 mt-2">Analyzing inventory and generating recommendations...</p>
            </div>
          ) : recommendations.length === 0 ? (
            /* Empty State */
            <div className="text-center py-12">
              <Package className="w-12 h-12 text-slate-300 mx-auto mb-4" />
              <p className="text-slate-500">No reorder recommendations at this time.</p>
              <p className="text-sm text-slate-400">All items are above minimum stock levels.</p>
            </div>
          ) : (
            /* Recommendations List */
            <div className="space-y-3">
              {recommendations.map((rec) => (
                <div
                  key={rec.itemId}
                  className={`border rounded-lg p-4 transition-colors cursor-pointer ${
                    selectedItems.has(rec.itemId)
                      ? 'bg-blue-50 border-blue-300'
                      : 'bg-white border-slate-200 hover:bg-slate-50'
                  }`}
                  onClick={() => toggleItemSelection(rec.itemId)}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex items-start space-x-3">
                      <input
                        type="checkbox"
                        checked={selectedItems.has(rec.itemId)}
                        onChange={() => toggleItemSelection(rec.itemId)}
                        className="mt-1 w-4 h-4 text-blue-600 rounded border-slate-300 focus:ring-blue-500"
                      />
                      <div className="flex-1">
                        <div className="flex items-center space-x-2 mb-1">
                          <h4 className="font-semibold text-slate-800">{rec.itemName}</h4>
                          <span className={`px-2 py-0.5 text-xs font-medium rounded-full border ${getUrgencyColor(rec.urgency)}`}>
                            {getUrgencyIcon(rec.urgency)}
                            <span className="ml-1">{rec.urgency}</span>
                          </span>
                        </div>

                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                          <div>
                            <span className="text-slate-500">Current Stock:</span>
                            <span className={`ml-1 font-semibold ${rec.currentStock === 0 ? 'text-red-700' : rec.currentStock <= rec.minLevel ? 'text-amber-700' : 'text-green-700'}`}>
                              {rec.currentStock}
                            </span>
                          </div>
                          <div>
                            <span className="text-slate-500">Minimum Level:</span>
                            <span className="ml-1 font-semibold text-slate-700">{rec.minLevel}</span>
                          </div>
                          <div>
                            <span className="text-slate-500">Avg Monthly Usage:</span>
                            <span className="ml-1 font-semibold text-slate-700">{rec.avgMonthlyUsage}</span>
                          </div>
                          <div>
                            <span className="text-slate-500">Last Sale:</span>
                            <span className="ml-1 font-semibold text-slate-700">{rec.lastSaleDate || 'N/A'}</span>
                          </div>
                        </div>

                        <div className="mt-2 p-2 bg-slate-50 rounded text-xs text-slate-600">
                          {rec.reason}
                        </div>
                      </div>
                    </div>

                    <div className="text-right">
                      <div className="text-sm font-semibold text-blue-700">
                        Order: {rec.reorderRecommendation} units
                      </div>
                      <div className="text-xs text-slate-500">
                        Est. Cost: RM{rec.estimatedCost.toLocaleString('en-MY', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ReorderRecommendationModal;