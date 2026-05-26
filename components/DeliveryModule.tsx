import React, { useState, useEffect } from 'react';
import { optimizeRouteSequence } from '../services/geminiService';
import { DeliveryRoute } from '../types';
import { MapPin, Navigation, Compass, Layers, Package, RefreshCw, Clock, Phone } from 'lucide-react';

interface Order {
  id: string;
  clientName: string;
  items: Array<{ name: string; quantity: number }>;
  totalItems: number;
  totalAmount: number;
  status: string;
  createdAt: string;
  deliveryAddress?: string;
  contactNumber?: string;
  notes?: string;
}

interface DeliveryStop extends DeliveryRoute {
  originalOrder: Order;
  hasCoordinates: boolean;
}

const DeliveryModule: React.FC = () => {
  const [deliveries, setDeliveries] = useState<DeliveryStop[]>([]);
  const [loading, setLoading] = useState(true);
  const [optimizing, setOptimizing] = useState(false);

  // Load real orders with delivery addresses
  useEffect(() => {
    loadPendingDeliveries();
  }, []);

  const loadPendingDeliveries = async () => {
    setLoading(true);
    try {
      const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api';
      const response = await fetch(`${API_BASE}/orders?status=pending`);
      const data = await response.json();

      if (data.success) {
        const orders: Order[] = data.data;

        // Convert orders to delivery stops
        const deliveryStops: DeliveryStop[] = orders
          .filter(order => order.deliveryAddress && order.deliveryAddress.trim() !== '')
          .map((order, index) => ({
            id: `DEL-${order.id}`,
            clientName: order.clientName,
            address: order.deliveryAddress || '',
            orderId: order.id,
            status: order.status === 'pending' ? 'Pending' : order.status,
            lat: 0, // Will be calculated for navigation
            lng: 0, // Will be calculated for navigation
            originalOrder: order,
            hasCoordinates: false
          }));

        setDeliveries(deliveryStops);
        console.log(`Loaded ${deliveryStops.length} deliveries from pending orders`);
      }
    } catch (error) {
      console.error('Failed to load deliveries:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleOptimize = async () => {
    if (deliveries.length === 0) return;

    setOptimizing(true);
    try {
      // Extract addresses for AI context
      const addresses = deliveries.map(d => `${d.clientName}, ${d.address}`);
      const newIndices = await optimizeRouteSequence(addresses);

      // Reorder based on indices returned
      const reordered = newIndices.map(i => deliveries[i]).filter(Boolean);
      setDeliveries(reordered);
    } catch (error) {
      console.error('Route optimization failed:', error);
    } finally {
      setOptimizing(false);
    }
  };

  const openMapNavigation = (stop: DeliveryStop) => {
    // Use the actual address from the order for Google Maps navigation
    const address = stop.address;
    const clientName = stop.clientName;

    // Open Google Maps with the actual address for navigation
    const mapsUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address + ' ' + clientName)}`;
    window.open(mapsUrl, '_blank');
  };

  const markAsDelivered = async (deliveryId: string) => {
    try {
      const stop = deliveries.find(d => d.id === deliveryId);
      if (!stop) return;

      const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api';

      // Update order status to completed
      await fetch(`${API_BASE}/orders/${stop.originalOrder.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'completed' })
      });

      // Update local state
      setDeliveries(prev => prev.map(d =>
        d.id === deliveryId ? { ...d, status: 'Delivered' } : d
      ));
    } catch (error) {
      console.error('Failed to mark as delivered:', error);
    }
  };

  return (
    <div className="space-y-6">
        <div className="flex justify-between items-center">
             <div>
                 <h2 className="text-2xl font-bold text-slate-800">Delivery Navigation</h2>
                 <p className="text-sm text-slate-500 mt-1">
                     {deliveries.length > 0 ? `${deliveries.length} pending deliveries` : 'No pending deliveries'}
                 </p>
             </div>
             <div className="flex gap-2">
                 <button
                    onClick={loadPendingDeliveries}
                    disabled={loading}
                    className="bg-slate-600 text-white px-4 py-2 rounded-lg text-sm font-medium shadow-md flex items-center hover:bg-slate-700 transition-colors"
                 >
                     <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
                     Refresh
                 </button>
                 <button
                    onClick={handleOptimize}
                    disabled={optimizing || deliveries.length === 0}
                    className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium shadow-md flex items-center hover:bg-blue-700 transition-colors disabled:bg-slate-400 disabled:cursor-not-allowed"
                 >
                     {optimizing ? (
                         <span className="animate-spin mr-2">⟳</span>
                     ) : (
                         <Compass className="w-4 h-4 mr-2" />
                     )}
                     Optimize Route
                 </button>
             </div>
        </div>

        {loading ? (
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-12 flex items-center justify-center">
                <div className="text-center">
                    <div className="w-12 h-12 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin mx-auto mb-4"/>
                    <p className="text-slate-600">Loading deliveries...</p>
                </div>
            </div>
        ) : deliveries.length === 0 ? (
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-12 flex items-center justify-center">
                <div className="text-center">
                    <Package className="w-16 h-16 mx-auto mb-4 text-slate-300"/>
                    <h3 className="text-lg font-semibold text-slate-700 mb-2">No Pending Deliveries</h3>
                    <p className="text-slate-500 mb-4">Orders with delivery addresses will appear here</p>
                    <p className="text-sm text-slate-400">Place orders with delivery addresses to get started</p>
                </div>
            </div>
        ) : (
            <>
                {/* Timeline View */}
                <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden relative">
                    <div className="absolute top-0 left-8 bottom-0 w-0.5 bg-slate-200 z-0"></div>

                    <div className="relative z-10">
                        {deliveries.map((stop, index) => (
                            <div key={stop.id} className="flex items-start p-6 hover:bg-slate-50 transition-colors border-b border-slate-100 last:border-0">
                                {/* Timeline Connector */}
                                <div className="mr-6 flex flex-col items-center">
                                    <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold shadow-sm ${
                                        stop.status === 'Delivered' ? 'bg-green-500 text-white' :
                                        index === 0 ? 'bg-green-500 text-white' :
                                        'bg-white border-2 border-slate-300 text-slate-500'
                                    }`}>
                                        {index + 1}
                                    </div>
                                </div>

                                <div className="flex-1">
                                    <div className="flex justify-between items-start mb-2">
                                        <div>
                                            <h3 className="text-lg font-bold text-slate-800">{stop.clientName}</h3>
                                            <p className="text-sm text-slate-500 flex items-center mt-1">
                                                <MapPin className="w-3 h-3 mr-1" /> {stop.address}
                                            </p>
                                            {stop.originalOrder.contactNumber && (
                                                <p className="text-xs text-slate-400 flex items-center mt-1">
                                                    <Phone className="w-3 h-3 mr-1" /> {stop.originalOrder.contactNumber}
                                                </p>
                                            )}
                                        </div>
                                        <span className={`px-2 py-1 rounded text-xs font-bold uppercase tracking-wide ${
                                            stop.status === 'Delivered' ? 'bg-green-100 text-green-700' :
                                            stop.status === 'In Transit' ? 'bg-blue-100 text-blue-700' :
                                            'bg-yellow-100 text-yellow-700'
                                        }`}>
                                            {stop.status}
                                        </span>
                                    </div>

                                    {/* Order Details */}
                                    <div className="bg-slate-50 rounded-lg p-3 mb-3">
                                        <div className="flex items-center justify-between text-xs text-slate-500 mb-1">
                                            <span>Order #{stop.originalOrder.id}</span>
                                            <span className="flex items-center">
                                                <Clock className="w-3 h-3 mr-1" />
                                                {new Date(stop.originalOrder.createdAt).toLocaleString()}
                                            </span>
                                        </div>
                                        <div className="flex items-center gap-2 flex-wrap">
                                            {stop.originalOrder.items.slice(0, 3).map((item, i) => (
                                                <span key={i} className="text-xs bg-white px-2 py-1 rounded border border-slate-200">
                                                    {item.name} x{item.quantity}
                                                </span>
                                            ))}
                                            {stop.originalOrder.items.length > 3 && (
                                                <span className="text-xs text-slate-400">
                                                    +{stop.originalOrder.items.length - 3} more items
                                                </span>
                                            )}
                                        </div>
                                        {stop.originalOrder.notes && (
                                            <p className="text-xs text-slate-500 mt-2 italic">"{stop.originalOrder.notes}"</p>
                                        )}
                                    </div>

                                    <div className="flex items-center justify-between mt-4">
                                        <p className="text-xs text-slate-400 font-medium">
                                            RM {stop.originalOrder.totalAmount.toFixed(2)}
                                        </p>
                                        <div className="flex gap-2">
                                            {stop.status !== 'Delivered' && (
                                                <button
                                                    onClick={() => markAsDelivered(stop.id)}
                                                    className="flex items-center text-green-600 hover:text-green-800 text-sm font-medium bg-green-50 px-3 py-1.5 rounded transition-colors"
                                                >
                                                    Mark Delivered
                                                </button>
                                            )}
                                            <button
                                                onClick={() => openMapNavigation(stop)}
                                                className="flex items-center text-blue-600 hover:text-blue-800 text-sm font-medium bg-blue-50 px-3 py-1.5 rounded transition-colors"
                                            >
                                                <Navigation className="w-4 h-4 mr-1.5" /> Navigate
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Summary Stats */}
                <div className="grid grid-cols-3 gap-4">
                    <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-4">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-xs text-slate-500">Total Deliveries</p>
                                <p className="text-2xl font-bold text-slate-800">{deliveries.length}</p>
                            </div>
                            <Package className="w-8 h-8 text-blue-500" />
                        </div>
                    </div>
                    <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-4">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-xs text-slate-500">Completed</p>
                                <p className="text-2xl font-bold text-green-600">{deliveries.filter(d => d.status === 'Delivered').length}</p>
                            </div>
                            <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center">
                                <span className="text-green-600 font-bold text-sm">✓</span>
                            </div>
                        </div>
                    </div>
                    <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-4">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-xs text-slate-500">Pending</p>
                                <p className="text-2xl font-bold text-yellow-600">{deliveries.filter(d => d.status !== 'Delivered').length}</p>
                            </div>
                            <Clock className="w-8 h-8 text-yellow-500" />
                        </div>
                    </div>
                </div>
            </>
        )}

        {/* Map Integration Notice */}
        {!loading && deliveries.length > 0 && (
            <div className="bg-blue-50 rounded-xl p-4 border border-blue-100">
                <div className="flex items-start">
                    <Navigation className="w-5 h-5 text-blue-600 mr-3 mt-0.5" />
                    <div className="flex-1">
                        <h4 className="text-sm font-semibold text-blue-900">Navigation Ready</h4>
                        <p className="text-xs text-blue-700 mt-1">
                            Click "Navigate" on any delivery to open Google Maps with the exact address from the customer's order.
                            The navigation will follow the real delivery addresses provided by customers.
                        </p>
                    </div>
                </div>
            </div>
        )}
    </div>
  );
};

export default DeliveryModule;
