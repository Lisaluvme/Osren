import React, { useState, useRef, useEffect } from 'react';
import { SalesOrder } from '../types';
import { ArrowRight, FileCheck, Truck, FileText, PenTool, Eraser } from 'lucide-react';

interface DistributionModuleProps {
  newOrder?: SalesOrder | null;
}

const DistributionModule: React.FC<DistributionModuleProps> = ({newOrder}) => {
  const [orders, setOrders] = useState<SalesOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [signingOrder, setSigningOrder] = useState<string | null>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // Fetch real orders from backend on component mount and when new order is added
  useEffect(() => {
    console.log('🔄 DistributionModule mounted/updated, fetching orders...');
    fetchOrders();
  }, [newOrder]); // Re-fetch when newOrder changes to ensure we get latest data

  const fetchOrders = async () => {
    try {
      setLoading(true);
      const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api';
      console.log('🔍 Fetching orders from:', `${API_BASE}/orders`);
      console.log('🌍 Environment VITE_API_BASE_URL:', import.meta.env.VITE_API_BASE_URL);

      const response = await fetch(`${API_BASE}/orders`, {
        cache: 'no-store', // Prevent caching
        headers: {
          'Cache-Control': 'no-cache',
          'Pragma': 'no-cache'
        }
      });
      const data = await response.json();

      console.log('📦 Orders response:', data);
      console.log('📊 Orders count:', data.data?.length || 0);

      if (data.success) {
        // Transform backend orders to SalesOrder format
        const transformedOrders: SalesOrder[] = data.data.map((order: any) => ({
          id: order.id,
          clientName: order.clientName,
          items: order.items.map((item: any) => ({
            name: item.name,
            qty: item.quantity,
            price: item.unitPrice || 0
          })),
          total: order.totalAmount || 0,
          status: mapStatus(order.status),
          date: order.createdAt || new Date().toISOString()
        }));

        console.log('✅ Transformed orders:', transformedOrders);
        console.log('✅ Order IDs:', transformedOrders.map(o => o.id));
        setOrders(transformedOrders);
      } else {
        console.error('❌ Failed to fetch orders:', data.error);
        setOrders([]);
      }
    } catch (error) {
      console.error('❌ Error fetching orders:', error);
      // Show empty state instead of mock data to make it clear we're using real data
      setOrders([]);
    } finally {
      setLoading(false);
    }
  };

  // Map backend status to DistributionModule status
  const mapStatus = (backendStatus: string): SalesOrder['status'] => {
    switch (backendStatus.toLowerCase()) {
      case 'pending': return 'SO';
      case 'processing': return 'DO';
      case 'invoiced': return 'Invoiced';
      case 'delivered': return 'Delivered';
      default: return 'SO';
    }
  };

  const startDrawing = (e: React.MouseEvent | React.TouchEvent) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.lineWidth = 2;
    ctx.lineCap = 'round';
    ctx.strokeStyle = '#000';

    const rect = canvas.getBoundingClientRect();
    const x = ('touches' in e ? e.touches[0].clientX : e.clientX) - rect.left;
    const y = ('touches' in e ? e.touches[0].clientY : e.clientY) - rect.top;

    ctx.beginPath();
    ctx.moveTo(x, y);

    const moveHandler = (moveEvent: MouseEvent | TouchEvent) => {
       const mx = ('touches' in moveEvent ? moveEvent.touches[0].clientX : (moveEvent as MouseEvent).clientX) - rect.left;
       const my = ('touches' in moveEvent ? moveEvent.touches[0].clientY : (moveEvent as MouseEvent).clientY) - rect.top;
       ctx.lineTo(mx, my);
       ctx.stroke();
    };

    const upHandler = () => {
       document.removeEventListener('mousemove', moveHandler);
       document.removeEventListener('mouseup', upHandler);
       document.removeEventListener('touchmove', moveHandler);
       document.removeEventListener('touchend', upHandler);
    };

    document.addEventListener('mousemove', moveHandler);
    document.addEventListener('mouseup', upHandler);
    document.addEventListener('touchmove', moveHandler);
    document.addEventListener('touchend', upHandler);
  };

  const clearSignature = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (ctx) ctx.clearRect(0, 0, canvas.width, canvas.height);
  };

  const saveSignature = async () => {
     if (signingOrder && canvasRef.current) {
         const dataUrl = canvasRef.current.toDataURL();

         try {
           const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api';
           console.log('🔄 Updating order status to Invoiced with signature:', signingOrder);

           const response = await fetch(`${API_BASE}/orders/${signingOrder}`, {
             method: 'PATCH',
             headers: { 'Content-Type': 'application/json' },
             body: JSON.stringify({ status: 'Invoiced', signature: dataUrl })
           });

           const data = await response.json();
           console.log('✅ Signature saved response:', data);

           if (data.success) {
             // Update local state
             setOrders(prev => prev.map(o => o.id === signingOrder ? { ...o, status: 'Invoiced', signature: dataUrl } : o));
             setSigningOrder(null);
           } else {
             console.error('❌ Failed to save signature:', data.error);
             alert('Failed to save signature. Please try again.');
           }
         } catch (error) {
           console.error('❌ Error saving signature:', error);
           alert('Failed to save signature. Please try again.');
         }
     }
  };

  const advanceStatus = async (id: string, currentStatus: string) => {
      if (currentStatus === 'SO') {
          // Update to DO status
          try {
            const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api';
            console.log('🔄 Updating order status to DO:', id);

            const response = await fetch(`${API_BASE}/orders/${id}`, {
              method: 'PATCH',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ status: 'DO' })
            });

            const data = await response.json();
            console.log('✅ Status update response:', data);

            if (data.success) {
              // Update local state
              setOrders(prev => prev.map(o => o.id === id ? { ...o, status: 'DO' } : o));
            } else {
              console.error('❌ Failed to update status:', data.error);
              alert('Failed to update status. Please try again.');
            }
          } catch (error) {
            console.error('❌ Error updating status:', error);
            alert('Failed to update status. Please try again.');
          }
      } else if (currentStatus === 'DO') {
          setSigningOrder(id);
          // Wait for render then clear if needed
          setTimeout(() => clearSignature(), 100);
      }
  };

  return (
    <div className="space-y-6">
       <h2 className="text-2xl font-bold text-slate-800">Distribution Workflow</h2>

       {loading ? (
         <div className="flex items-center justify-center p-8">
           <div className="text-center">
             <div className="w-12 h-12 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin mx-auto mb-4"/>
             <p className="text-slate-600">Loading orders...</p>
           </div>
         </div>
       ) : orders.length === 0 ? (
         <div className="bg-white p-8 rounded-xl shadow-sm border border-slate-200 text-center">
           <p className="text-slate-400">No orders yet. Place an order in the Sales module to get started.</p>
         </div>
       ) : (
       <div className="grid gap-6">
        {orders.map(order => (
            <div key={order.id} className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
                <div className="flex flex-col md:flex-row justify-between md:items-center mb-4">
                    <div>
                        <div className="flex items-center space-x-2">
                             <span className="font-bold text-lg text-slate-800">{order.id}</span>
                             <span className="text-slate-400">|</span>
                             <span className="text-slate-600">{order.clientName}</span>
                        </div>
                        <p className="text-xs text-slate-400">{order.date}</p>
                    </div>
                    <div className="flex items-center space-x-1 mt-2 md:mt-0">
                        <StatusStep active={true} icon={FileText} label="Sales Order" completed={order.status !== 'SO'} />
                        <ArrowRight className="w-4 h-4 text-slate-300" />
                        <StatusStep active={order.status !== 'SO'} icon={Truck} label="Delivery Order" completed={['Invoiced', 'Delivered'].includes(order.status)} />
                        <ArrowRight className="w-4 h-4 text-slate-300" />
                        <StatusStep active={['Invoiced', 'Delivered'].includes(order.status)} icon={FileCheck} label="Invoice" completed={order.status === 'Delivered'} />
                    </div>
                </div>

                <div className="border-t border-slate-100 pt-4 mb-4">
                    <h4 className="text-xs font-semibold uppercase text-slate-500 mb-2">Items</h4>
                    {order.items.map((item, idx) => (
                        <div key={idx} className="flex justify-between text-sm mb-1">
                            <span>{item.name} <span className="text-slate-400">x{item.qty}</span></span>
                            <span className="font-medium">${((item.price || 0) * item.qty).toFixed(2)}</span>
                        </div>
                    ))}
                    <div className="flex justify-between font-bold text-slate-800 mt-2 pt-2 border-t border-slate-100">
                        <span>Total</span>
                        <span>${(order.total || 0).toFixed(2)}</span>
                    </div>
                </div>

                {order.signature && (
                    <div className="mb-4">
                        <p className="text-xs text-slate-400 mb-1">Customer Signature:</p>
                        <img src={order.signature} alt="Signature" className="h-16 border border-slate-200 rounded bg-slate-50" />
                    </div>
                )}

                <div className="flex justify-end">
                    {order.status === 'SO' && (
                        <button 
                            onClick={() => advanceStatus(order.id, 'SO')}
                            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium flex items-center"
                        >
                            Convert to DO <ArrowRight className="w-4 h-4 ml-2" />
                        </button>
                    )}
                    {order.status === 'DO' && (
                        <button 
                            onClick={() => advanceStatus(order.id, 'DO')}
                            className="bg-orange-600 hover:bg-orange-700 text-white px-4 py-2 rounded-lg text-sm font-medium flex items-center"
                        >
                            <PenTool className="w-4 h-4 mr-2" /> Sign & Invoice
                        </button>
                    )}
                    {order.status === 'Invoiced' && (
                        <button disabled className="bg-green-100 text-green-700 px-4 py-2 rounded-lg text-sm font-medium flex items-center cursor-default border border-green-200">
                            <CheckCircle className="w-4 h-4 mr-2" /> Completed
                        </button>
                    )}
                </div>
            </div>
        ))}
       </div>
       )}

       {/* Sign on Glass Modal */}
       {signingOrder && (
           <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
               <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden">
                   <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-slate-50">
                       <h3 className="font-bold text-slate-800">Sign Delivery Order</h3>
                       <button onClick={() => setSigningOrder(null)} className="text-slate-400 hover:text-slate-600"><Eraser className="w-5 h-5" /></button>
                   </div>
                   <div className="p-4 bg-white relative">
                       <p className="text-xs text-slate-400 mb-2">Please sign below to accept delivery.</p>
                       <canvas 
                            ref={canvasRef}
                            width={350} 
                            height={200} 
                            className="border-2 border-dashed border-slate-300 rounded-lg bg-slate-50 touch-none w-full"
                            onMouseDown={startDrawing}
                            onTouchStart={startDrawing}
                       />
                   </div>
                   <div className="p-4 border-t border-slate-100 flex justify-between space-x-4">
                       <button onClick={clearSignature} className="flex-1 py-2 text-slate-600 font-medium hover:bg-slate-100 rounded-lg">Clear</button>
                       <button onClick={saveSignature} className="flex-1 py-2 bg-blue-600 text-white font-medium hover:bg-blue-700 rounded-lg shadow-md shadow-blue-200">Confirm Signature</button>
                   </div>
               </div>
           </div>
       )}
    </div>
  );
};

const StatusStep = ({ active, completed, icon: Icon, label }: any) => (
    <div className={`flex flex-col items-center ${active ? 'opacity-100' : 'opacity-40'}`}>
        <div className={`p-1.5 rounded-full ${completed ? 'bg-green-100 text-green-600' : active ? 'bg-blue-100 text-blue-600' : 'bg-slate-100 text-slate-400'}`}>
            <Icon className="w-4 h-4" />
        </div>
        <span className="text-[10px] font-medium mt-1">{label}</span>
    </div>
);

// Helper for icon
import { CheckCircle } from 'lucide-react';

export default DistributionModule;
