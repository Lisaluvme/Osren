import React, { useState, useRef, useEffect } from 'react';
import { SalesOrder } from '../types';
import { ArrowRight, FileCheck, Truck, FileText, PenTool, Eraser, Download, CheckCircle } from 'lucide-react';
import { generateDeliveryOrderPDF } from '../services/deliveryOrderPDFService';

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
      case 'paid': return 'Completed';
      case 'delivered': return 'Delivered';
      case 'completed': return 'Delivered';
      default: return 'SO';
    }
  };

  // Map DistributionModule status to backend status
  const mapStatusToBackend = (frontendStatus: SalesOrder['status']): string => {
    switch (frontendStatus) {
      case 'SO': return 'pending';
      case 'DO': return 'processing';
      case 'Invoiced': return 'invoiced';
      case 'Completed': return 'paid';
      case 'Delivered': return 'delivered';
      default: return 'pending';
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
           const backendStatus = mapStatusToBackend('Invoiced');

           console.log('🔄 [Save Signature] Updating order status to Invoiced:', signingOrder);
           console.log('🔄 Frontend: DO → Backend:', backendStatus, '→ Frontend: Invoiced');

           const response = await fetch(`${API_BASE}/orders/${signingOrder}`, {
             method: 'PATCH',
             headers: { 'Content-Type': 'application/json' },
             body: JSON.stringify({ status: backendStatus, signature: dataUrl })
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
            const backendStatus = mapStatusToBackend('DO');

            console.log('🔄 [Convert to DO] Updating order status:', id);
            console.log('🔄 Frontend: SO → Backend:', backendStatus, '→ Frontend: DO');
            console.log('🌍 Using API base:', API_BASE);

            const response = await fetch(`${API_BASE}/orders/${id}`, {
              method: 'PATCH',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ status: backendStatus })
            });

            console.log('📡 Response status:', response.status);

            if (!response.ok) {
              throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }

            const data = await response.json();
            console.log('✅ Status update response:', data);

            if (data.success) {
              // Update local state
              console.log('🎯 Updating local state for order:', id, '→ DO');
              setOrders(prev => prev.map(o => o.id === id ? { ...o, status: 'DO' } : o));

              // Generate DO PDF
              const order = orders.find(o => o.id === id);
              if (order) {
                try {
                  console.log('📄 Generating DO PDF for order:', id);
                  await generateDeliveryOrderPDF({
                    id: order.id,
                    clientName: order.clientName,
                    items: order.items,
                    total: order.total,
                    date: order.date,
                    deliveryAddress: data.data?.deliveryAddress,
                    contactNumber: data.data?.contactNumber,
                    notes: data.data?.notes
                  });
                  console.log('✅ DO PDF generated successfully');
                } catch (pdfError) {
                  console.error('⚠️ Failed to generate DO PDF:', pdfError);
                  // Don't alert the user, the status update was successful
                }
              }
            } else {
              console.error('❌ Failed to update status:', data.error);
              alert(`Failed to update status: ${data.error}`);
            }
          } catch (error) {
            console.error('❌ Error updating status:', error);
            alert(`Failed to update status: ${error.message}`);
          }
      }
  };

  const handleDownloadDO = async (order: SalesOrder) => {
    try {
      console.log('📄 Downloading DO PDF for order:', order.id);
      await generateDeliveryOrderPDF({
        id: order.id,
        clientName: order.clientName,
        items: order.items,
        total: order.total,
        date: order.date
      });
      console.log('✅ DO PDF downloaded successfully');
    } catch (error) {
      console.error('❌ Failed to download DO PDF:', error);
      alert('Failed to generate DO PDF. Please try again.');
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
                        <span>RM{(order.total || 0).toFixed(2)}</span>
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
                        <>
                            <button disabled className="bg-blue-100 text-blue-700 px-4 py-2 rounded-lg text-sm font-medium flex items-center cursor-default border border-blue-200 mr-2">
                                <Truck className="w-4 h-4 mr-2" /> In Delivery
                            </button>
                            <button
                                onClick={() => handleDownloadDO(order)}
                                className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg text-sm font-medium flex items-center"
                            >
                                <Download className="w-4 h-4 mr-2" /> Download DO PDF
                            </button>
                        </>
                    )}
                    {order.status === 'Invoiced' && (
                        <button disabled className="bg-yellow-100 text-yellow-700 px-4 py-2 rounded-lg text-sm font-medium flex items-center cursor-default border border-yellow-200">
                            <FileText className="w-4 h-4 mr-2" /> Invoiced - Awaiting Payment
                        </button>
                    )}
                    {order.status === 'Completed' && (
                        <button disabled className="bg-green-100 text-green-700 px-4 py-2 rounded-lg text-sm font-medium flex items-center cursor-default border border-green-200">
                            <CheckCircle className="w-4 h-4 mr-2" /> Completed
                        </button>
                    )}
                    {order.status === 'Delivered' && (
                        <button disabled className="bg-green-100 text-green-700 px-4 py-2 rounded-lg text-sm font-medium flex items-center cursor-default border border-green-200">
                            <CheckCircle className="w-4 h-4 mr-2" /> Delivered
                        </button>
                    )}
                </div>
            </div>
        ))}
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

export default DistributionModule;
