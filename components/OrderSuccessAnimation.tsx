import React from 'react';
import { CheckCircle, Package, Truck, MapPin, Phone, CreditCard } from 'lucide-react';

interface OrderSuccessAnimationProps {
  orderData: {
    customerName: string;
    adminName: string;
    items: Array<{ name: string; quantity: number }>;
    totalAmount: number;
    deliveryAddress: string;
    contactNumber?: string;
  };
  onClose: () => void;
}

const OrderSuccessAnimation: React.FC<OrderSuccessAnimationProps> = ({ orderData, onClose }) => {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl max-w-lg w-full mx-4 overflow-hidden animate-success-reveal">
        {/* Success Header */}
        <div className="bg-gradient-to-br from-green-500 to-emerald-600 p-8 text-white text-center">
          <div className="w-20 h-20 bg-white/20 rounded-full flex items-center justify-center mx-auto mb-4 animate-scale-in">
            <CheckCircle className="w-12 h-12" />
          </div>
          <h3 className="text-3xl font-bold mb-2">Order Confirmed!</h3>
          <p className="text-green-100">Your order has been successfully placed</p>
        </div>

        {/* Order Details */}
        <div className="p-6 space-y-4">
          {/* Customer Info Card */}
          <div className="bg-slate-50 rounded-xl p-4">
            <h4 className="font-semibold text-slate-800 mb-3 flex items-center gap-2">
              <Package className="w-4 h-4 text-blue-600" />
              Customer Information
            </h4>
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-sm text-slate-600">Name:</span>
                <span className="text-sm font-medium text-slate-800">{orderData.customerName}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-slate-600">Processed By:</span>
                <span className="text-sm font-medium text-slate-800">{orderData.adminName}</span>
              </div>
            </div>
          </div>

          {/* Delivery Info */}
          <div className="bg-blue-50 rounded-xl p-4">
            <h4 className="font-semibold text-slate-800 mb-3 flex items-center gap-2">
              <Truck className="w-4 h-4 text-blue-600" />
              Delivery Information
            </h4>
            <div className="space-y-2">
              <div className="flex items-start gap-2">
                <MapPin className="w-4 h-4 text-slate-400 flex-shrink-0 mt-0.5" />
                <span className="text-sm text-slate-700">{orderData.deliveryAddress}</span>
              </div>
              {orderData.contactNumber && (
                <div className="flex items-center gap-2">
                  <Phone className="w-4 h-4 text-slate-400" />
                  <span className="text-sm text-slate-700">{orderData.contactNumber}</span>
                </div>
              )}
            </div>
          </div>

          {/* Order Items */}
          <div className="bg-white border border-slate-200 rounded-xl p-4">
            <h4 className="font-semibold text-slate-800 mb-3">Order Items</h4>
            <div className="space-y-2">
              {orderData.items.map((item, idx) => (
                <div key={idx} className="flex justify-between items-center text-sm">
                  <span className="text-slate-700">{item.name} × {item.quantity}</span>
                  <span className="font-medium text-slate-800">
                    RM{(item.quantity * (orderData.totalAmount / orderData.items.reduce((sum, i) => sum + i.quantity, 0))).toFixed(2)}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Total */}
          <div className="bg-gradient-to-r from-blue-600 to-indigo-600 rounded-xl p-4 text-white">
            <div className="flex justify-between items-center">
              <span className="font-semibold">Total Amount</span>
              <span className="text-2xl font-bold">RM{orderData.totalAmount.toFixed(2)}</span>
            </div>
          </div>

          {/* Next Steps */}
          <div className="bg-green-50 rounded-xl p-4">
            <h4 className="font-semibold text-green-800 mb-2">What's Next?</h4>
            <ul className="text-sm text-green-700 space-y-1">
              <li className="flex items-start gap-2">
                <span className="text-green-500 mt-1">✓</span>
                <span>Your order is being processed</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-green-500 mt-1">✓</span>
                <span>You'll receive confirmation shortly</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-green-500 mt-1">✓</span>
                <span>Delivery will be arranged based on your location</span>
              </li>
            </ul>
          </div>
        </div>

        {/* Close Button */}
        <div className="p-4 border-t border-slate-200">
          <button
            onClick={onClose}
            className="w-full py-3 bg-gradient-to-r from-slate-800 to-slate-900 text-white rounded-xl font-semibold hover:from-slate-900 hover:to-black transition-all"
          >
            Continue Shopping
          </button>
        </div>
      </div>
    </div>
  );
};

export default OrderSuccessAnimation;