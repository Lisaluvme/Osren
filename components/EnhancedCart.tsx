import React, { useState, useEffect } from 'react';
import { InventoryItem } from '../types';
import {
  ShoppingCart, Plus, Minus, X, Trash2, Package, Sparkles,
  CheckCircle, AlertCircle, ArrowRight, CreditCard, Truck,
  MapPin, Phone, FileText, User, Building, Image as ImageIcon
} from 'lucide-react';
import { productApiService } from '../services/api/productApi';

interface CartItem {
  name: string;
  qty: number;
  price: number;
  image?: string;
  stock: number;
}

interface OrderFormData {
  customerName: string;
  adminName: string;
  deliveryAddress: string;
  contactNumber: string;
  notes: string;
}

interface EnhancedCartProps {
  inventory: InventoryItem[];
  onPlaceOrder: (orderData: any) => Promise<void>;
  recentOrders: any[];
}

const EnhancedCart: React.FC<EnhancedCartProps> = ({ inventory, onPlaceOrder, recentOrders }) => {
  const [cart, setCart] = useState<CartItem[]>([]);
  const [showOrderForm, setShowOrderForm] = useState(false);
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [orderLoading, setOrderLoading] = useState(false);
  const [orderSuccess, setOrderSuccess] = useState(false);
  const [orderError, setOrderError] = useState('');
  const [addedItem, setAddedItem] = useState<string | null>(null);

  const [orderFormData, setOrderFormData] = useState<OrderFormData>({
    customerName: '',
    adminName: '',
    deliveryAddress: '',
    contactNumber: '',
    notes: ''
  });

  // Animation for added items
  useEffect(() => {
    if (addedItem) {
      const timer = setTimeout(() => setAddedItem(null), 1000);
      return () => clearTimeout(timer);
    }
  }, [addedItem]);

  const addToCart = (name: string) => {
    setCart(prev => {
      const existing = prev.find(i => i.name === name);
      if (existing) {
        return prev.map(i => i.name === name ? { ...i, qty: i.qty + 1 } : i);
      }
      const inventoryItem = inventory.find(inv => inv.name === name);
      return [...prev, {
        name,
        qty: 1,
        price: inventoryItem?.sellingPrice || 0,
        stock: inventoryItem?.quantity || 0,
        image: inventoryItem?.brand
      }];
    });
    setAddedItem(name);
  };

  const removeFromCart = (name: string) => {
    setCart(prev => {
      const existing = prev.find(i => i.name === name);
      if (existing && existing.qty > 1) {
        return prev.map(i => i.name === name ? { ...i, qty: i.qty - 1 } : i);
      }
      return prev.filter(i => i.name !== name);
    });
  };

  const removeItemCompletely = (name: string) => {
    setCart(prev => prev.filter(i => i.name !== name));
  };

  const getOrderTotal = () => {
    return cart.reduce((total, item) => total + (item.price * item.qty), 0);
  };

  const getTotalItems = () => {
    return cart.reduce((total, item) => total + item.qty, 0);
  };

  const handlePlaceOrder = async () => {
    if (cart.length === 0) {
      setOrderError('Cart is empty. Please add items to your order.');
      setTimeout(() => setOrderError(''), 3000);
      return;
    }

    if (!showOrderForm) {
      setShowOrderForm(true);
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }

    // Validation
    if (!orderFormData.customerName || !orderFormData.adminName || !orderFormData.deliveryAddress) {
      setOrderError('Please fill in all required fields.');
      setTimeout(() => setOrderError(''), 3000);
      return;
    }

    // Show confirmation
    if (!showConfirmation) {
      setShowConfirmation(true);
      return;
    }

    setOrderLoading(true);
    setOrderError('');

    try {
      await onPlaceOrder({
        clientName: orderFormData.customerName,
        adminName: orderFormData.adminName,
        items: cart.map(item => ({
          name: item.name,
          quantity: item.qty
        })),
        deliveryAddress: orderFormData.deliveryAddress,
        contactNumber: orderFormData.contactNumber,
        notes: orderFormData.notes
      });

      setOrderSuccess(true);

      setTimeout(() => {
        setCart([]);
        setShowOrderForm(false);
        setShowConfirmation(false);
        setOrderSuccess(false);
        setOrderFormData({
          customerName: '',
          adminName: '',
          deliveryAddress: '',
          contactNumber: '',
          notes: ''
        });
      }, 3000);

    } catch (error) {
      setOrderError('Failed to place order. Please try again.');
      setTimeout(() => setOrderError(''), 3000);
    } finally {
      setOrderLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Success Message Animation */}
      {orderSuccess && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm animate-fade-in">
          <div className="bg-white rounded-2xl p-8 max-w-md w-full mx-4 animate-scale-up shadow-2xl">
            <div className="text-center">
              <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4 animate-bounce-subtle">
                <CheckCircle className="w-12 h-12 text-green-600" />
              </div>
              <h3 className="text-2xl font-bold text-slate-800 mb-2">Order Confirmed!</h3>
              <p className="text-slate-600 mb-4">Your order has been placed successfully and is being processed.</p>
              <div className="bg-green-50 rounded-lg p-4 text-left animate-slide-in-left">
                <p className="text-sm text-green-700 font-semibold">Order Details:</p>
                <p className="text-sm text-slate-600 mt-2">Customer: {orderFormData.customerName}</p>
                <p className="text-sm text-slate-600">Items: {getTotalItems()}</p>
                <p className="text-sm text-slate-600">Total: RM{getOrderTotal().toFixed(2)}</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Main Cart Interface */}
      <div className="grid lg:grid-cols-3 gap-6">
        {/* Product Catalog */}
        <div className="lg:col-span-2 space-y-6">
          {/* Featured Products */}
          <div className="bg-gradient-to-r from-blue-600 to-indigo-600 rounded-2xl p-6 text-white">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-xl font-bold mb-1">🛍️ Product Catalog</h3>
                <p className="text-blue-100 text-sm">Select products to add to your order</p>
              </div>
              <div className="bg-white/20 rounded-full px-4 py-2">
                <span className="text-sm font-semibold">{inventory.length} Products</span>
              </div>
            </div>
          </div>

          {/* Product Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {inventory.map((item, index) => {
              const inCart = cart.find(c => c.name === item.name);
              const cartQty = inCart?.qty || 0;
              const staggerClass = `stagger-${(index % 6) + 1}`;

              return (
                <div
                  key={item.id}
                  className={`group relative bg-white rounded-xl border-2 transition-all duration-300 overflow-hidden hover-lift smooth-transition ${staggerClass} ${
                    addedItem === item.name
                      ? 'border-green-400 shadow-lg shadow-green-200 scale-105'
                      : inCart
                      ? 'border-blue-200 shadow-md'
                      : 'border-slate-100 hover:border-blue-300 hover:shadow-lg'
                  }`}
                  style={{ animationDelay: `${index * 50}ms` }}
                >
                  {/* Stock Status Badge */}
                  <div className={`absolute top-3 right-3 px-2 py-1 rounded-full text-xs font-semibold ${
                    item.quantity > 10
                      ? 'bg-green-100 text-green-700'
                      : item.quantity > 5
                      ? 'bg-yellow-100 text-yellow-700'
                      : 'bg-red-100 text-red-700'
                  }`}>
                    {item.quantity > 10 ? 'In Stock' : item.quantity > 5 ? 'Low Stock' : 'Critical'}
                  </div>

                  <div className="p-4">
                    {/* Product Image/Icon */}
                    <div className="w-full h-24 bg-gradient-to-br from-slate-50 to-slate-100 rounded-lg mb-3 flex items-center justify-center overflow-hidden">
                      {(item.imageUrl || item.image_url) ? (
                        <img
                          src={item.image_url ? productApiService.getImageUrl(item.image_url) : item.imageUrl}
                          alt={item.name}
                          className="w-full h-full object-cover transform group-hover:scale-110 transition-transform duration-300"
                          onError={(e) => {
                            // Fallback to icon if image fails to load
                            (e.currentTarget as HTMLImageElement).style.display = 'none';
                            const parent = (e.currentTarget as HTMLImageElement).parentElement;
                            if (parent) {
                              parent.innerHTML = `
                                <div class="transform group-hover:scale-110 transition-transform duration-300">
                                  <div class="w-10 h-10 flex items-center justify-center">
                                    <svg class="w-10 h-10 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                                    </svg>
                                  </div>
                                </div>
                              `;
                            }
                          }}
                        />
                      ) : (
                        <div className="transform group-hover:scale-110 transition-transform duration-300">
                          <ImageIcon className="w-10 h-10 text-slate-400" />
                        </div>
                      )}
                    </div>

                    {/* Product Info */}
                    <h4 className="font-semibold text-slate-800 mb-1 group-hover:text-blue-600 transition-colors">{item.name}</h4>
                    <div className="flex justify-between items-center mb-3">
                      <p className="text-lg font-bold text-blue-600">RM{item.sellingPrice.toFixed(2)}</p>
                      <p className="text-xs text-slate-400">Stock: {item.quantity}</p>
                    </div>

                    {/* Add to Cart Button */}
                    {inCart ? (
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => removeFromCart(item.name)}
                          className="flex-1 py-2 bg-red-500 text-white rounded-lg font-semibold hover:bg-red-600 transition-all btn-press flex items-center justify-center gap-1 smooth-transition"
                        >
                          <Minus className="w-4 h-4" />
                        </button>
                        <div className="px-4 py-2 bg-blue-600 text-white rounded-lg font-bold animate-pulse-slow">
                          {cartQty}
                        </div>
                        <button
                          onClick={() => addToCart(item.name)}
                          disabled={cartQty >= item.quantity}
                          className={`flex-1 py-2 text-white rounded-lg font-semibold transition-all btn-press flex items-center justify-center gap-1 smooth-transition ${
                            cartQty >= item.quantity
                              ? 'bg-slate-300 cursor-not-allowed'
                              : 'bg-green-500 hover:bg-green-600 hover:scale-105'
                          }`}
                        >
                          <Plus className="w-4 h-4" />
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={() => addToCart(item.name)}
                        className="w-full py-2.5 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-lg font-semibold hover:from-blue-700 hover:to-indigo-700 transition-all flex items-center justify-center gap-2 btn-press ripple hover-lift"
                      >
                        <ShoppingCart className="w-4 h-4" />
                        Add to Cart
                      </button>
                    )}
                  </div>

                  {/* Added Animation */}
                  {addedItem === item.name && (
                    <div className="absolute inset-0 bg-green-500/10 flex items-center justify-center">
                      <div className="bg-green-500 text-white px-3 py-1 rounded-full text-sm font-semibold animate-bounce">
                        ✓ Added!
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Shopping Cart */}
        <div className="lg:col-span-1">
          <div className="bg-white rounded-2xl border border-slate-200 sticky top-4 shadow-xl hover-lift smooth-transition">
            {/* Cart Header */}
            <div className="bg-gradient-to-r from-slate-800 to-slate-900 rounded-t-2xl p-4 text-white">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 bg-white/20 rounded-lg flex items-center justify-center">
                    <ShoppingCart className="w-5 h-5" />
                  </div>
                  <h3 className="font-bold">Your Cart</h3>
                </div>
                {cart.length > 0 && (
                  <div className="bg-white/20 rounded-full px-3 py-1 animate-pulse-slow">
                    <span className="text-sm font-semibold">{getTotalItems()} items</span>
                  </div>
                )}
              </div>
            </div>

            {/* Cart Items */}
            <div className="p-4 max-h-96 overflow-y-auto">
              {cart.length === 0 ? (
                <div className="text-center py-8">
                  <ShoppingCart className="w-16 h-16 mx-auto mb-3 text-slate-300" />
                  <p className="text-slate-400 text-sm">Your cart is empty</p>
                  <p className="text-slate-300 text-xs mt-1">Add some products to get started</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {cart.map((item, idx) => (
                    <div
                      key={idx}
                      className="bg-slate-50 rounded-xl p-3 border border-slate-100 hover:shadow-md transition-all"
                    >
                      <div className="flex justify-between items-start mb-2">
                        <div className="flex-1">
                          <h5 className="font-semibold text-slate-800 text-sm">{item.name}</h5>
                          <p className="text-xs text-slate-400">RM{item.price.toFixed(2)} each</p>
                        </div>
                        <button
                          onClick={() => removeItemCompletely(item.name)}
                          className="text-slate-400 hover:text-red-500 transition-colors"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>

                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => removeFromCart(item.name)}
                            className="w-6 h-6 bg-white border border-slate-200 rounded text-slate-600 hover:bg-red-50 hover:text-red-500 hover:border-red-200 transition-all flex items-center justify-center"
                          >
                            <Minus className="w-3 h-3" />
                          </button>
                          <span className="font-bold text-slate-800 min-w-[2rem] text-center">{item.qty}</span>
                          <button
                            onClick={() => addToCart(item.name)}
                            disabled={item.qty >= item.stock}
                            className={`w-6 h-6 border rounded flex items-center justify-center transition-all ${
                              item.qty >= item.stock
                                ? 'bg-slate-100 border-slate-200 text-slate-400 cursor-not-allowed'
                                : 'bg-white border-slate-200 text-slate-600 hover:bg-green-50 hover:text-green-500 hover:border-green-200'
                            }`}
                          >
                            <Plus className="w-3 h-3" />
                          </button>
                        </div>
                        <p className="font-bold text-blue-600">RM{(item.price * item.qty).toFixed(2)}</p>
                      </div>

                      {item.qty >= item.stock && (
                        <p className="text-xs text-red-500 mt-2">Maximum stock reached</p>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Cart Summary */}
            {cart.length > 0 && (
              <div className="border-t border-slate-200 p-4 space-y-3 bg-slate-50">
                <div className="flex justify-between text-sm text-slate-600">
                  <span>Subtotal ({getTotalItems()} items)</span>
                  <span className="font-semibold">RM{getOrderTotal().toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-lg font-bold text-slate-900 pt-2 border-t border-slate-200">
                  <span>Total</span>
                  <span className="text-blue-600">RM{getOrderTotal().toFixed(2)}</span>
                </div>
              </div>
            )}

            {/* Order Form */}
            {showOrderForm && (
              <div className="border-t border-slate-200 p-4 space-y-4 bg-blue-50">
                <h4 className="font-semibold text-slate-800 flex items-center gap-2">
                  <FileText className="w-4 h-4 text-blue-600" />
                  Order Details
                </h4>

                <div className="space-y-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1 flex items-center gap-1">
                      <User className="w-3 h-3" />
                      Customer Name *
                    </label>
                    <input
                      type="text"
                      value={orderFormData.customerName}
                      onChange={(e) => setOrderFormData({...orderFormData, customerName: e.target.value})}
                      className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      placeholder="Enter customer name"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1 flex items-center gap-1">
                      <Building className="w-3 h-3" />
                      Admin Name *
                    </label>
                    <select
                      value={orderFormData.adminName}
                      onChange={(e) => setOrderFormData({...orderFormData, adminName: e.target.value})}
                      className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    >
                      <option value="">Select admin...</option>
                      <option value="Admin/Management">Admin/Management</option>
                      <option value="Accounts Officer">Accounts Officer</option>
                      <option value="Sales Rep">Sales Rep</option>
                      <option value="Warehouse Manager">Warehouse Manager</option>
                      <option value="Logistics/Driver">Logistics/Driver</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1 flex items-center gap-1">
                      <MapPin className="w-3 h-3" />
                      Delivery Address *
                    </label>
                    <input
                      type="text"
                      value={orderFormData.deliveryAddress}
                      onChange={(e) => setOrderFormData({...orderFormData, deliveryAddress: e.target.value})}
                      className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      placeholder="Enter delivery address"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1 flex items-center gap-1">
                      <Phone className="w-3 h-3" />
                      Contact Number
                    </label>
                    <input
                      type="tel"
                      value={orderFormData.contactNumber}
                      onChange={(e) => setOrderFormData({...orderFormData, contactNumber: e.target.value})}
                      className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      placeholder="Enter contact number"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Notes (Optional)
                    </label>
                    <textarea
                      value={orderFormData.notes}
                      onChange={(e) => setOrderFormData({...orderFormData, notes: e.target.value})}
                      className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      placeholder="Any special instructions..."
                      rows={2}
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Error Message */}
            {orderError && (
              <div className="mx-4 mb-3 bg-red-50 border border-red-200 text-red-600 px-3 py-2 rounded-lg text-sm flex items-center gap-2">
                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                {orderError}
              </div>
            )}

            {/* Place Order Button */}
            <div className="p-4 border-t border-slate-200">
              <button
                onClick={handlePlaceOrder}
                disabled={orderLoading || cart.length === 0}
                className={`w-full py-3 rounded-xl font-semibold transition-all transform hover:scale-[1.02] active:scale-[0.98] flex items-center justify-center gap-2 ${
                  orderLoading || cart.length === 0
                    ? 'bg-slate-300 text-slate-500 cursor-not-allowed'
                    : 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white hover:from-blue-700 hover:to-indigo-700 shadow-lg shadow-blue-200'
                }`}
              >
                {orderLoading ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    Processing...
                  </>
                ) : showOrderForm ? (
                  showConfirmation ? (
                    <>
                      <CheckCircle className="w-5 h-5" />
                      Confirm Order
                    </>
                  ) : (
                    <>
                      <ArrowRight className="w-5 h-5" />
                      Review Order
                    </>
                  )
                ) : (
                  <>
                    <ShoppingCart className="w-5 h-5" />
                    Place Order
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Order Confirmation Modal */}
      {showConfirmation && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-hidden">
            <div className="bg-gradient-to-r from-blue-600 to-indigo-600 p-6 text-white">
              <h3 className="text-2xl font-bold mb-2">Confirm Your Order</h3>
              <p className="text-blue-100">Please review your order details before confirming</p>
            </div>

            <div className="p-6 overflow-y-auto max-h-[calc(90vh-120px)]">
              {/* Customer Info */}
              <div className="mb-6">
                <h4 className="font-semibold text-slate-800 mb-3 flex items-center gap-2">
                  <User className="w-4 h-4 text-blue-600" />
                  Customer Information
                </h4>
                <div className="bg-slate-50 rounded-lg p-4 space-y-2">
                  <div className="flex justify-between">
                    <span className="text-sm text-slate-600">Name:</span>
                    <span className="text-sm font-medium text-slate-800">{orderFormData.customerName}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-slate-600">Admin:</span>
                    <span className="text-sm font-medium text-slate-800">{orderFormData.adminName}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-slate-600">Contact:</span>
                    <span className="text-sm font-medium text-slate-800">{orderFormData.contactNumber || 'N/A'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-slate-600">Delivery:</span>
                    <span className="text-sm font-medium text-slate-800 text-right max-w-xs">{orderFormData.deliveryAddress}</span>
                  </div>
                </div>
              </div>

              {/* Order Items */}
              <div className="mb-6">
                <h4 className="font-semibold text-slate-800 mb-3 flex items-center gap-2">
                  <Package className="w-4 h-4 text-blue-600" />
                  Order Items
                </h4>
                <div className="space-y-2">
                  {cart.map((item, idx) => (
                    <div key={idx} className="bg-slate-50 rounded-lg p-3 flex justify-between items-center">
                      <div>
                        <p className="font-medium text-slate-800">{item.name}</p>
                        <p className="text-xs text-slate-400">RM{item.price.toFixed(2)} each × {item.qty}</p>
                      </div>
                      <p className="font-bold text-slate-800">RM{(item.price * item.qty).toFixed(2)}</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Order Summary */}
              <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg p-4">
                <div className="flex justify-between items-center mb-2">
                  <span className="text-sm text-slate-600">Total Items:</span>
                  <span className="font-semibold text-slate-800">{getTotalItems()}</span>
                </div>
                <div className="flex justify-between items-center text-lg">
                  <span className="font-bold text-slate-800">Total Amount:</span>
                  <span className="font-bold text-blue-600">RM{getOrderTotal().toFixed(2)}</span>
                </div>
              </div>

              {orderFormData.notes && (
                <div className="mt-4">
                  <h4 className="font-semibold text-slate-800 mb-2">Special Instructions</h4>
                  <p className="text-sm text-slate-600 italic">{orderFormData.notes}</p>
                </div>
              )}
            </div>

            <div className="border-t border-slate-200 p-4 flex gap-3">
              <button
                onClick={() => setShowConfirmation(false)}
                className="flex-1 py-3 bg-slate-100 text-slate-700 rounded-xl font-semibold hover:bg-slate-200 transition-colors"
              >
                Back to Edit
              </button>
              <button
                onClick={() => {
                  setShowConfirmation(false);
                  handlePlaceOrder();
                }}
                disabled={orderLoading}
                className={`flex-1 py-3 rounded-xl font-semibold transition-all flex items-center justify-center gap-2 ${
                  orderLoading
                    ? 'bg-slate-300 text-slate-500 cursor-not-allowed'
                    : 'bg-gradient-to-r from-green-500 to-emerald-600 text-white hover:from-green-600 hover:to-emerald-700 shadow-lg'
                }`}
              >
                {orderLoading ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    Processing...
                  </>
                ) : (
                  <>
                    <CheckCircle className="w-5 h-5" />
                    Confirm Order
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default EnhancedCart;