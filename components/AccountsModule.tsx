import React, { useState, useEffect } from 'react';
import { Invoice, SalesOrder } from '../types';
import { CheckCircle, AlertCircle, Clock, RefreshCw, DollarSign, Receipt, X, FileText } from 'lucide-react';
import InvoiceActions from './invoices/InvoiceActions';
import { generateInvoicePDF } from '../services/invoicePDFService';
import { generateReceiptPDF } from '../services/receiptPDFService';
import { DEFAULT_COMPANY_INFO } from '../constants/invoiceTemplate';
import PaymentVoucherForm from './accounts/PaymentVoucherForm';
import CustomerReceiptForm from './accounts/CustomerReceiptForm';

interface AccountsModuleProps {
  newOrder?: SalesOrder | null;
}

const AccountsModule: React.FC<AccountsModuleProps> = ({ newOrder }: AccountsModuleProps) => {
  // Tab management
  const [activeTab, setActiveTab] = useState<'invoices' | 'payment-vouchers' | 'customer-receipts'>('invoices');

  // Invoice functionality state
  const [filter, setFilter] = useState<string>('All');
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedInvoice, setSelectedInvoice] = useState<any | null>(null);
  const [isGeneratingPDF, setIsGeneratingPDF] = useState(false);

  // Receipt functionality state
  const [paymentDialogOpen, setPaymentDialogOpen] = useState(false);
  const [paymentInvoice, setPaymentInvoice] = useState<any | null>(null);
  const [paymentDetails, setPaymentDetails] = useState({
    paymentDate: new Date().toISOString().split('T')[0],
    paymentMethod: 'Cash',
    transactionId: ''
  });
  const [isGeneratingReceipt, setIsGeneratingReceipt] = useState(false);

  // Payment voucher functionality state
  const [paymentVoucherFormOpen, setPaymentVoucherFormOpen] = useState(false);
  const [selectedPaymentVoucher, setSelectedPaymentVoucher] = useState<any | null>(null);
  const [paymentVouchers, setPaymentVouchers] = useState<any[]>([]);

  // Customer receipt functionality state
  const [customerReceiptFormOpen, setCustomerReceiptFormOpen] = useState(false);
  const [selectedCustomerReceipt, setSelectedCustomerReceipt] = useState<any | null>(null);
  const [customerReceipts, setCustomerReceipts] = useState<any[]>([]);

  // Fetch real orders from backend on component mount and when new order is placed
  useEffect(() => {
    fetchOrders();
    fetchPaymentVouchers();
    fetchCustomerReceipts();
  }, [newOrder]); // Re-fetch when newOrder changes

  // Fetch payment vouchers
  const fetchPaymentVouchers = async () => {
    try {
      const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api';
      const response = await fetch(`${API_BASE}/finance/payment-vouchers`);
      const data = await response.json();
      if (data.success) {
        setPaymentVouchers(data.data || []);
      }
    } catch (error) {
      console.error('Error fetching payment vouchers:', error);
    }
  };

  // Fetch customer receipts
  const fetchCustomerReceipts = async () => {
    try {
      const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api';
      const response = await fetch(`${API_BASE}/finance/receipt-collections`);
      const data = await response.json();
      if (data.success) {
        setCustomerReceipts(data.data || []);
      }
    } catch (error) {
      console.error('Error fetching customer receipts:', error);
    }
  };

  const fetchOrders = async () => {
    try {
      setLoading(true);
      const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api';
      console.log('Accounts: Fetching orders from:', `${API_BASE}/orders`);

      const response = await fetch(`${API_BASE}/orders`);
      const data = await response.json();

      console.log('Accounts: Orders response:', data);

      if (data.success) {
        // Transform orders to Invoice format with full order data
        const transformedInvoices: any[] = data.data.map((order: any) => ({
          id: order.id,
          clientName: order.clientName,
          amount: order.totalAmount || 0,
          dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // 30 days from now
          status: mapOrderStatusToInvoiceStatus(order.status),
          items: order.items || [],
          createdAt: order.createdAt || '',
          deliveryAddress: order.deliveryAddress || '',
          contactNumber: order.contactNumber || '',
          notes: order.notes || '',
          signature: order.signature || null
        }));

        console.log('Accounts: Transformed invoices:', transformedInvoices);
        setInvoices(transformedInvoices);
      } else {
        console.error('Accounts: Failed to fetch orders:', data.error);
        setInvoices([]);
      }
    } catch (error) {
      console.error('Accounts: Error fetching orders:', error);
      // Show empty state instead of mock data
      setInvoices([]);
    } finally {
      setLoading(false);
    }
  };

  const mapOrderStatusToInvoiceStatus = (orderStatus: string): Invoice['status'] => {
    switch (orderStatus.toLowerCase()) {
      case 'pending': return 'Pending'; // New orders awaiting approval
      case 'processing': return 'Approved'; // DO orders ready for delivery
      case 'invoiced': return 'Approved'; // Signed DO awaiting payment
      case 'paid': return 'Paid'; // Payment received
      case 'delivered': return 'Paid'; // Delivery completed
      case 'completed': return 'Paid'; // Order fully completed
      default: return 'Pending';
    }
  };

  const handleStatusChange = async (id: string, newStatus: Invoice['status']) => {
    try {
      const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api';

      // Map invoice status back to order status
      const orderStatus = mapInvoiceStatusToOrderStatus(newStatus);

      // Update backend
      const response = await fetch(`${API_BASE}/orders/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: orderStatus })
      });

      const data = await response.json();

      if (data.success) {
        // Update local state
        setInvoices(prev => prev.map(inv => inv.id === id ? { ...inv, status: newStatus } : inv));
        console.log(`✅ Updated invoice ${id} to ${newStatus}`);
      } else {
        console.error('❌ Failed to update status:', data.error);
        alert('Failed to update status. Please try again.');
      }
    } catch (error) {
      console.error('❌ Error updating status:', error);
      alert('Failed to update status. Please try again.');
    }
  };

  const mapInvoiceStatusToOrderStatus = (invoiceStatus: Invoice['status']): string => {
    switch (invoiceStatus) {
      case 'Pending': return 'pending';
      case 'Approved': return 'processing';
      case 'Paid': return 'paid';
      case 'Overdue': return 'invoiced';
      default: return 'pending';
    }
  };

  const handlePrintInvoice = () => {
    if (!selectedInvoice) return;

    const printContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Invoice - ${selectedInvoice.id}</title>
        <script src="https://cdn.tailwindcss.com"></script>
        <style>
          @media print {
            body { margin: 0; padding: 20px; }
            .no-print { display: none !important; }
          }
        </style>
      </head>
      <body class="bg-gray-50">
        <div class="max-w-4xl mx-auto bg-white rounded-lg shadow-lg p-8">
          <div class="text-center mb-8">
            <h1 class="text-3xl font-bold text-blue-900">${DEFAULT_COMPANY_INFO.name}</h1>
            <p class="text-gray-600 mt-2">${DEFAULT_COMPANY_INFO.address}</p>
            <div class="flex justify-center gap-4 mt-2 text-sm text-gray-600">
              <span>📞 ${DEFAULT_COMPANY_INFO.phone}</span>
              <span>✉️ ${DEFAULT_COMPANY_INFO.email}</span>
            </div>
          </div>

          <div class="flex justify-between items-start mb-8">
            <div>
              <h2 class="text-2xl font-bold text-gray-900">INVOICE</h2>
              <p class="text-gray-600">#${selectedInvoice.id}</p>
              <div class="mt-2 inline-flex items-center px-3 py-1 rounded-full text-sm font-bold border-2 ${
                selectedInvoice.status === 'Paid' ? 'bg-green-100 text-green-700 border-green-300' :
                selectedInvoice.status === 'Overdue' ? 'bg-red-100 text-red-700 border-red-300' :
                selectedInvoice.status === 'Approved' ? 'bg-blue-100 text-blue-700 border-blue-300' :
                'bg-yellow-100 text-yellow-700 border-yellow-300'
              }">
                ${selectedInvoice.status}
              </div>
            </div>
            <div class="text-right">
              <div class="text-sm text-gray-600">Issue Date: ${new Date().toLocaleDateString()}</div>
              <div class="text-sm text-gray-600">Due Date: ${new Date(selectedInvoice.dueDate).toLocaleDateString()}</div>
            </div>
          </div>

          <div class="mb-8">
            <h3 class="text-sm font-bold text-gray-700 uppercase tracking-wide mb-2">Bill To</h3>
            <div class="text-gray-800">
              <p class="font-semibold">${selectedInvoice.clientName}</p>
              ${selectedInvoice.deliveryAddress ? `<p class="text-gray-600 text-sm mt-1">${selectedInvoice.deliveryAddress}</p>` : ''}
              ${selectedInvoice.contactNumber ? `<p class="text-gray-600 text-sm">📞 ${selectedInvoice.contactNumber}</p>` : ''}
            </div>
          </div>

          <table class="w-full mb-8">
            <thead>
              <tr class="bg-gray-50 border-b-2 border-gray-200">
                <th class="text-left py-3 px-4 text-xs font-bold text-gray-700 uppercase">Item</th>
                <th class="text-center py-3 px-4 text-xs font-bold text-gray-700 uppercase">Qty</th>
                <th class="text-right py-3 px-4 text-xs font-bold text-gray-700 uppercase">Price</th>
                <th class="text-right py-3 px-4 text-xs font-bold text-gray-700 uppercase">Total</th>
              </tr>
            </thead>
            <tbody>
              ${selectedInvoice.items && selectedInvoice.items.length > 0 ? selectedInvoice.items.map((item: any) => `
                <tr class="border-b border-gray-100">
                  <td class="py-3 px-4 text-gray-700">${item.name}</td>
                  <td class="py-3 px-4 text-center text-gray-600">${item.quantity}</td>
                  <td class="py-3 px-4 text-right text-gray-600 font-mono">RM ${(item.unitPrice || 0).toFixed(2)}</td>
                  <td class="py-3 px-4 text-right text-gray-800 font-semibold font-mono">RM ${((item.unitPrice || 0) * item.quantity).toFixed(2)}</td>
                </tr>
              `).join('') : '<tr><td colspan="4" class="py-6 text-center text-gray-400">No items</td></tr>'}
            </tbody>
            <tfoot class="bg-gray-50 border-t-2 border-gray-200">
              <tr>
                <td colspan="3" class="p-3 text-right font-bold text-gray-700">Total:</td>
                <td class="p-3 text-right font-bold text-gray-800 font-mono">RM ${selectedInvoice.amount.toFixed(2)}</td>
              </tr>
            </tfoot>
          </table>

          ${selectedInvoice.signature ? `
          <div class="mb-8">
            <h3 class="text-sm font-bold text-gray-700 uppercase tracking-wide mb-3">Customer Signature</h3>
            <img src="${selectedInvoice.signature}" alt="Customer Signature" class="h-24 border border-gray-200 rounded bg-white" />
            <p class="text-xs text-gray-400 mt-2">Signed on delivery</p>
          </div>
          ` : ''}

          <div class="text-center text-gray-400 text-sm">
            <p>Generated on ${new Date().toLocaleDateString()}</p>
            <p class="mt-1">${DEFAULT_COMPANY_INFO.footer}</p>
          </div>
        </div>
        <script>
          window.onload = function() {
            window.print();
            window.onafterprint = function() {
              window.close();
            };
          };
        </script>
      </body>
    </html>
    `;

    const printWindow = window.open('', '_blank');
    if (printWindow) {
      printWindow.document.write(printContent);
      printWindow.document.close();
    }
  };

  const handleDownloadPDF = async () => {
    if (!selectedInvoice) return;

    try {
      setIsGeneratingPDF(true);

      // Transform invoice data to EnhancedInvoice format
      const enhancedInvoice = {
        id: selectedInvoice.id,
        clientName: selectedInvoice.clientName,
        clientAddress: selectedInvoice.deliveryAddress,
        clientContact: selectedInvoice.contactNumber,
        amount: selectedInvoice.amount,
        dueDate: selectedInvoice.dueDate,
        issueDate: selectedInvoice.createdAt,
        status: selectedInvoice.status,
        items: selectedInvoice.items || [],
        notes: selectedInvoice.notes,
        signature: selectedInvoice.signature,
        paymentTerms: 'Net 30'
      };

      await generateInvoicePDF(enhancedInvoice, DEFAULT_COMPANY_INFO);
      console.log('✅ PDF generated successfully');
    } catch (error) {
      console.error('❌ Error generating PDF:', error);
      alert('Failed to generate PDF. Please try again.');
    } finally {
      setIsGeneratingPDF(false);
    }
  };

  // Receipt functionality
  const handleOpenPaymentDialog = (invoice: any) => {
    setPaymentInvoice(invoice);
    setPaymentDetails({
      paymentDate: new Date().toISOString().split('T')[0],
      paymentMethod: 'Cash',
      transactionId: ''
    });
    setPaymentDialogOpen(true);
  };

  const handleClosePaymentDialog = () => {
    setPaymentDialogOpen(false);
    setPaymentInvoice(null);
    setPaymentDetails({
      paymentDate: new Date().toISOString().split('T')[0],
      paymentMethod: 'Cash',
      transactionId: ''
    });
  };

  const handleGenerateReceipt = async () => {
    if (!paymentInvoice) return;

    try {
      setIsGeneratingReceipt(true);

      await generateReceiptPDF(paymentInvoice, {
        paymentDate: paymentDetails.paymentDate,
        paymentMethod: paymentDetails.paymentMethod,
        transactionId: paymentDetails.transactionId || undefined,
        companyInfo: DEFAULT_COMPANY_INFO
      });

      handleClosePaymentDialog();
      console.log('✅ Receipt generated successfully');
    } catch (error) {
      console.error('❌ Error generating receipt:', error);
      alert('Failed to generate receipt. Please try again.');
    } finally {
      setIsGeneratingReceipt(false);
    }
  };

  const handleMarkPaidAndGenerateReceipt = async (invoice: any) => {
    try {
      await handleStatusChange(invoice.id, 'Paid');
      handleOpenPaymentDialog(invoice);
    } catch (error) {
      console.error('❌ Error marking as paid:', error);
      alert('Failed to mark as paid. Please try again.');
    }
  };

  const filteredInvoices = filter === 'All' ? invoices : invoices.filter(inv => inv.status === filter);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Paid': return 'bg-green-100 text-green-700 border-green-200';
      case 'Overdue': return 'bg-red-100 text-red-700 border-red-200';
      case 'Approved': return 'bg-blue-100 text-blue-700 border-blue-200';
      default: return 'bg-yellow-100 text-yellow-700 border-yellow-200';
    }
  };

  return (
    <div className="space-y-6">
      {/* Header with Tabs */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="border-b border-slate-200">
          <div className="flex">
            <button
              onClick={() => setActiveTab('invoices')}
              className={`flex items-center space-x-2 px-6 py-4 font-medium transition-colors ${
                activeTab === 'invoices'
                  ? 'bg-blue-50 text-blue-600 border-b-2 border-blue-600'
                  : 'text-slate-600 hover:bg-slate-50'
              }`}
            >
              <FileText className="w-5 h-5" />
              <span>Customer Invoices</span>
            </button>
            <button
              onClick={() => setActiveTab('payment-vouchers')}
              className={`flex items-center space-x-2 px-6 py-4 font-medium transition-colors ${
                activeTab === 'payment-vouchers'
                  ? 'bg-blue-50 text-blue-600 border-b-2 border-blue-600'
                  : 'text-slate-600 hover:bg-slate-50'
              }`}
            >
              <DollarSign className="w-5 h-5" />
              <span>Payment Vouchers</span>
            </button>
            <button
              onClick={() => setActiveTab('customer-receipts')}
              className={`flex items-center space-x-2 px-6 py-4 font-medium transition-colors ${
                activeTab === 'customer-receipts'
                  ? 'bg-blue-50 text-blue-600 border-b-2 border-blue-600'
                  : 'text-slate-600 hover:bg-slate-50'
              }`}
            >
              <Receipt className="w-5 h-5" />
              <span>Customer Receipts</span>
            </button>
          </div>
        </div>

        {/* Customer Invoices Tab Content */}
        {activeTab === 'invoices' && (
          <div className="p-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
              <h3 className="text-lg font-semibold text-slate-800">Customer Invoices</h3>

              <div className="flex items-center space-x-3">
                <button
                  onClick={fetchOrders}
                  className="flex items-center space-x-2 px-3 py-2 text-sm font-medium text-slate-600 bg-white border border-slate-200 rounded-lg hover:bg-slate-50"
                  disabled={loading}
                >
                  <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                  <span>Refresh</span>
                </button>

                <div className="flex items-center space-x-2 bg-white p-1 rounded-lg border border-slate-200">
                  {['All', 'Paid', 'Pending', 'Overdue'].map(f => (
                    <button
                      key={f}
                      onClick={() => setFilter(f)}
                      className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${filter === f ? 'bg-slate-900 text-white' : 'text-slate-600 hover:bg-slate-100'}`}
                    >
                      {f}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {loading ? (
              <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-8 flex items-center justify-center">
                <div className="text-center">
                  <div className="w-12 h-12 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin mx-auto mb-4"/>
                  <p className="text-slate-600">Loading invoices...</p>
                </div>
              </div>
            ) : (
              <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 text-xs uppercase tracking-wider">
                        <th className="p-4 font-semibold">Invoice ID</th>
                        <th className="p-4 font-semibold">Client / Vendor</th>
                        <th className="p-4 font-semibold">Due Date</th>
                        <th className="p-4 font-semibold text-right">Amount</th>
                        <th className="p-4 font-semibold text-center">Status</th>
                        <th className="p-4 font-semibold text-center">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
              {filteredInvoices.map((inv) => (
                <tr
                  key={inv.id}
                  onClick={() => setSelectedInvoice(inv)}
                  className="hover:bg-blue-50 transition-colors cursor-pointer"
                >
                  <td className="p-4 font-medium text-slate-700">{inv.id}</td>
                  <td className="p-4 text-slate-600">{inv.clientName}</td>
                  <td className="p-4 text-slate-600">{inv.dueDate}</td>
                  <td className="p-4 text-right font-mono font-medium text-slate-800">
                    RM {inv.amount.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                  </td>
                  <td className="p-4 text-center">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${getStatusColor(inv.status)}`}>
                      {inv.status === 'Overdue' && <AlertCircle className="w-3 h-3 mr-1" />}
                      {inv.status === 'Paid' && <CheckCircle className="w-3 h-3 mr-1" />}
                      {inv.status === 'Pending' && <Clock className="w-3 h-3 mr-1" />}
                      {inv.status}
                    </span>
                  </td>
                  <td className="p-4 text-center" onClick={(e) => e.stopPropagation()}>
                    <div className="flex items-center justify-center gap-1">
                      {inv.status !== 'Paid' && (
                        <>
                          {inv.status !== 'Approved' && (
                            <button
                              onClick={() => handleStatusChange(inv.id, 'Approved')}
                              className="px-2 py-1 text-xs font-medium text-blue-600 bg-blue-50 hover:bg-blue-100 rounded border border-blue-200 transition-colors"
                            >
                              Approve
                            </button>
                          )}
                          <button
                            onClick={() => handleMarkPaidAndGenerateReceipt(inv)}
                            className="px-2 py-1 text-xs font-medium text-green-600 bg-green-50 hover:bg-green-100 rounded border border-green-200 transition-colors"
                          >
                            Mark Paid & Receipt
                          </button>
                        </>
                      )}
                      {inv.status === 'Paid' && (
                        <>
                          <button
                            onClick={() => handleOpenPaymentDialog(inv)}
                            className="px-2 py-1 text-xs font-medium text-purple-600 bg-purple-50 hover:bg-purple-100 rounded border border-purple-200 transition-colors flex items-center gap-1"
                          >
                            <Receipt className="w-3 h-3" />
                            Receipt
                          </button>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {filteredInvoices.length === 0 && (
            <div className="p-8 text-center text-slate-400">
                No invoices found with status "{filter}".
            </div>
        )}
      </div>
      )}
      </div>
      )}

      {/* Order Details Modal */}
      {selectedInvoice && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden">
            <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50">
              <div>
                <h3 className="text-lg font-bold text-slate-800">Order Details</h3>
                <p className="text-sm text-slate-500">{selectedInvoice.id}</p>
              </div>
              <button
                onClick={() => setSelectedInvoice(null)}
                className="text-slate-400 hover:text-slate-600 p-2 hover:bg-slate-100 rounded-lg transition-colors"
              >
                ✕
              </button>
            </div>

            <div className="p-6 overflow-y-auto max-h-[calc(90vh-100px)]">
              {/* Customer Info */}
              <div className="mb-6">
                <h4 className="text-sm font-semibold text-slate-700 mb-3">Customer Information</h4>
                <div className="bg-slate-50 rounded-lg p-4 space-y-2">
                  <div className="flex justify-between">
                    <span className="text-sm text-slate-500">Customer:</span>
                    <span className="text-sm font-medium text-slate-800">{selectedInvoice.clientName}</span>
                  </div>
                  {selectedInvoice.deliveryAddress && (
                    <div className="flex justify-between">
                      <span className="text-sm text-slate-500">Delivery Address:</span>
                      <span className="text-sm font-medium text-slate-800 max-w-xs">{selectedInvoice.deliveryAddress}</span>
                    </div>
                  )}
                  {selectedInvoice.contactNumber && (
                    <div className="flex justify-between">
                      <span className="text-sm text-slate-500">Contact Number:</span>
                      <span className="text-sm font-medium text-slate-800">{selectedInvoice.contactNumber}</span>
                    </div>
                  )}
                  <div className="flex justify-between">
                    <span className="text-sm text-slate-500">Order Date:</span>
                    <span className="text-sm font-medium text-slate-800">
                      {selectedInvoice.createdAt ? new Date(selectedInvoice.createdAt).toLocaleDateString() : 'N/A'}
                    </span>
                  </div>
                  {selectedInvoice.notes && (
                    <div className="flex justify-between">
                      <span className="text-sm text-slate-500">Notes:</span>
                      <span className="text-sm font-medium text-slate-800 italic max-w-xs">{selectedInvoice.notes}</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Order Items */}
              <div className="mb-6">
                <h4 className="text-sm font-semibold text-slate-700 mb-3">Order Items</h4>
                <div className="bg-slate-50 rounded-lg overflow-hidden">
                  <table className="w-full text-sm">
                    <thead className="bg-slate-100">
                      <tr>
                        <th className="p-3 text-left font-medium text-slate-600">Item</th>
                        <th className="p-3 text-center font-medium text-slate-600">Quantity</th>
                        <th className="p-3 text-right font-medium text-slate-600">Price</th>
                        <th className="p-3 text-right font-medium text-slate-600">Total</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200">
                      {selectedInvoice.items && selectedInvoice.items.length > 0 ? (
                        selectedInvoice.items.map((item: any, idx: number) => (
                          <tr key={idx}>
                            <td className="p-3 text-slate-700">{item.name}</td>
                            <td className="p-3 text-center text-slate-600">x{item.quantity}</td>
                            <td className="p-3 text-right text-slate-600 font-mono">
                              RM {(item.unitPrice || 0).toFixed(2)}
                            </td>
                            <td className="p-3 text-right text-slate-800 font-medium font-mono">
                              RM {((item.unitPrice || 0) * item.quantity).toFixed(2)}
                            </td>
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td colSpan={4} className="p-3 text-center text-slate-400">No items found</td>
                        </tr>
                      )}
                    </tbody>
                    <tfoot className="bg-slate-50 border-t border-slate-200">
                      <tr>
                        <td colSpan={3} className="p-3 text-right font-bold text-slate-700">Total:</td>
                        <td className="p-3 text-right font-bold text-slate-800 font-mono">
                          RM {selectedInvoice.amount.toFixed(2)}
                        </td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              </div>

              {/* Customer Signature */}
              {selectedInvoice.signature && (
                <div>
                  <h4 className="text-sm font-semibold text-slate-700 mb-3">Customer Signature</h4>
                  <div className="bg-slate-50 rounded-lg p-4">
                    <img
                      src={selectedInvoice.signature}
                      alt="Customer Signature"
                      className="h-24 border border-slate-200 rounded bg-white"
                    />
                    <p className="text-xs text-slate-400 mt-2">Signed on delivery</p>
                  </div>
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="p-6 border-t border-slate-100 bg-slate-50">
              <div className="flex justify-between items-center">
                <InvoiceActions
                  onPrint={handlePrintInvoice}
                  onDownloadPDF={handleDownloadPDF}
                  isGeneratingPDF={isGeneratingPDF}
                />
                <button
                  onClick={() => setSelectedInvoice(null)}
                  className="px-6 py-2 bg-slate-600 text-white rounded-lg hover:bg-slate-700 transition-colors"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Payment Vouchers Tab Content */}
      {activeTab === 'payment-vouchers' && (
        <div className="p-6">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
            <h3 className="text-lg font-semibold text-slate-800">Payment Vouchers (Money Out)</h3>
            <button
              onClick={() => {
                setSelectedPaymentVoucher(null);
                setPaymentVoucherFormOpen(true);
              }}
              className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              <DollarSign className="w-5 h-5" />
              <span>Create Voucher</span>
            </button>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 text-xs uppercase tracking-wider">
                    <th className="p-4 font-semibold">Voucher No</th>
                    <th className="p-4 font-semibold">Date</th>
                    <th className="p-4 font-semibold">Supplier</th>
                    <th className="p-4 font-semibold">Invoice No</th>
                    <th className="p-4 font-semibold text-right">Amount</th>
                    <th className="p-4 font-semibold text-center">Status</th>
                    <th className="p-4 font-semibold text-center">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {paymentVouchers.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="p-8 text-center text-slate-500">
                        <DollarSign className="w-12 h-12 mx-auto mb-4 text-slate-300" />
                        <p>No payment vouchers found</p>
                        <p className="text-sm mt-1">Create your first payment voucher to get started</p>
                      </td>
                    </tr>
                  ) : (
                    paymentVouchers.map((voucher) => (
                      <tr key={voucher.id} className="border-b border-slate-100 hover:bg-slate-50">
                        <td className="p-4 font-medium text-slate-900">{voucher.voucherNumber}</td>
                        <td className="p-4 text-slate-600">{new Date(voucher.date).toLocaleDateString()}</td>
                        <td className="p-4 text-slate-900">{voucher.supplier}</td>
                        <td className="p-4 text-slate-600">{voucher.invoiceNumber}</td>
                        <td className="p-4 text-right font-medium text-slate-900">${voucher.amountPaid?.toFixed(2) || '0.00'}</td>
                        <td className="p-4 text-center">
                          <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-semibold ${
                            voucher.status === 'paid' ? 'bg-green-100 text-green-700' :
                            voucher.status === 'approved' ? 'bg-blue-100 text-blue-700' :
                            voucher.status === 'submitted' ? 'bg-yellow-100 text-yellow-700' :
                            'bg-gray-100 text-gray-700'
                          }`}>
                            {(voucher.status || 'draft').toUpperCase()}
                          </span>
                        </td>
                        <td className="p-4 text-center">
                          <button
                            onClick={() => {
                              setSelectedPaymentVoucher(voucher);
                              setPaymentVoucherFormOpen(true);
                            }}
                            className="text-blue-600 hover:text-blue-800 mr-2"
                          >
                            Edit
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Customer Receipts Tab Content */}
      {activeTab === 'customer-receipts' && (
        <div className="p-6">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
            <h3 className="text-lg font-semibold text-slate-800">Customer Receipts (Money In)</h3>
            <button
              onClick={() => {
                setSelectedCustomerReceipt(null);
                setCustomerReceiptFormOpen(true);
              }}
              className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              <Receipt className="w-5 h-5" />
              <span>Create Receipt</span>
            </button>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 text-xs uppercase tracking-wider">
                    <th className="p-4 font-semibold">Receipt No</th>
                    <th className="p-4 font-semibold">Date</th>
                    <th className="p-4 font-semibold">Customer</th>
                    <th className="p-4 font-semibold">Invoice No</th>
                    <th className="p-4 font-semibold text-right">Amount</th>
                    <th className="p-4 font-semibold text-center">Status</th>
                    <th className="p-4 font-semibold text-center">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {customerReceipts.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="p-8 text-center text-slate-500">
                        <Receipt className="w-12 h-12 mx-auto mb-4 text-slate-300" />
                        <p>No customer receipts found</p>
                        <p className="text-sm mt-1">Create your first customer receipt to get started</p>
                      </td>
                    </tr>
                  ) : (
                    customerReceipts.map((receipt) => (
                      <tr key={receipt.id} className="border-b border-slate-100 hover:bg-slate-50">
                        <td className="p-4 font-medium text-slate-900">{receipt.receiptNumber}</td>
                        <td className="p-4 text-slate-600">{new Date(receipt.date).toLocaleDateString()}</td>
                        <td className="p-4 text-slate-900">{receipt.customer}</td>
                        <td className="p-4 text-slate-600">{receipt.invoiceNumber}</td>
                        <td className="p-4 text-right font-medium text-slate-900">${receipt.amountReceived?.toFixed(2) || '0.00'}</td>
                        <td className="p-4 text-center">
                          <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-semibold ${
                            receipt.status === 'deposited' ? 'bg-green-100 text-green-700' :
                            receipt.status === 'approved' ? 'bg-blue-100 text-blue-700' :
                            receipt.status === 'submitted' ? 'bg-yellow-100 text-yellow-700' :
                            'bg-gray-100 text-gray-700'
                          }`}>
                            {(receipt.status || 'draft').toUpperCase()}
                          </span>
                        </td>
                        <td className="p-4 text-center">
                          <button
                            onClick={() => {
                              setSelectedCustomerReceipt(receipt);
                              setCustomerReceiptFormOpen(true);
                            }}
                            className="text-blue-600 hover:text-blue-800 mr-2"
                          >
                            Edit
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
      </div>
        )}
      </div>

      {/* Payment Voucher Form Modal */}
      {paymentVoucherFormOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b flex justify-between items-center">
              <h2 className="text-xl font-bold">
                {selectedPaymentVoucher ? 'Edit Payment Voucher' : 'Create Payment Voucher'}
              </h2>
              <button onClick={() => setPaymentVoucherFormOpen(false)} className="text-slate-500 hover:text-slate-700">
                <X className="w-6 h-6" />
              </button>
            </div>
            <PaymentVoucherForm
              voucher={selectedPaymentVoucher}
              supplierInvoices={[]}
              onSubmit={async (voucherData) => {
                try {
                  const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api';
                  const url = selectedPaymentVoucher
                    ? `${API_BASE}/finance/payment-vouchers/${selectedPaymentVoucher.id}`
                    : `${API_BASE}/finance/payment-voucher`;

                  const response = await fetch(url, {
                    method: selectedPaymentVoucher ? 'PUT' : 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(voucherData)
                  });

                  const data = await response.json();

                  if (data.success) {
                    alert(selectedPaymentVoucher ? 'Payment voucher updated successfully' : 'Payment voucher created successfully');
                    setPaymentVoucherFormOpen(false);
                    fetchPaymentVouchers(); // Refresh the list
                  } else {
                    alert('Failed to save payment voucher: ' + data.error);
                  }
                } catch (error) {
                  console.error('Error saving payment voucher:', error);
                  alert('Failed to save payment voucher');
                }
              }}
              onCancel={() => setPaymentVoucherFormOpen(false)}
            />
          </div>
        </div>
      )}

      {/* Customer Receipt Form Modal */}
      {customerReceiptFormOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b flex justify-between items-center">
              <h2 className="text-xl font-bold">
                {selectedCustomerReceipt ? 'Edit Customer Receipt' : 'Create Customer Receipt'}
              </h2>
              <button onClick={() => setCustomerReceiptFormOpen(false)} className="text-slate-500 hover:text-slate-700">
                <X className="w-6 h-6" />
              </button>
            </div>
            <CustomerReceiptForm
              receipt={selectedCustomerReceipt}
              customerInvoices={[]}
              onSubmit={async (receiptData) => {
                try {
                  const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api';
                  const url = selectedCustomerReceipt
                    ? `${API_BASE}/finance/receipt-collections/${selectedCustomerReceipt.id}`
                    : `${API_BASE}/finance/receipt-collection`;

                  const response = await fetch(url, {
                    method: selectedCustomerReceipt ? 'PUT' : 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(receiptData)
                  });

                  const data = await response.json();

                  if (data.success) {
                    alert(selectedCustomerReceipt ? 'Customer receipt updated successfully' : 'Customer receipt created successfully');
                    setCustomerReceiptFormOpen(false);
                    fetchCustomerReceipts(); // Refresh the list
                  } else {
                    alert('Failed to save customer receipt: ' + data.error);
                  }
                } catch (error) {
                  console.error('Error saving customer receipt:', error);
                  alert('Failed to save customer receipt');
                }
              }}
              onCancel={() => setCustomerReceiptFormOpen(false)}
            />
          </div>
        </div>
      )}

      {/* Payment Details Dialog */}
      {paymentDialogOpen && paymentInvoice && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-md w-full max-h-[90vh] overflow-y-auto">
            <div className="bg-gradient-to-r from-purple-600 to-indigo-700 px-6 py-4 flex justify-between items-center sticky top-0">
              <h2 className="text-xl font-bold text-white">Generate Payment Receipt</h2>
              <button
                onClick={handleClosePaymentDialog}
                className="text-white/80 hover:text-white transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-4">
              <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
                <p className="text-sm text-purple-700">
                  <span className="font-medium">Invoice:</span> #{paymentInvoice.id}
                </p>
                <p className="text-sm text-purple-700">
                  <span className="font-medium">Customer:</span> {paymentInvoice.clientName}
                </p>
                <p className="text-sm text-purple-700 font-bold mt-1">
                  Amount: RM {(paymentInvoice.finalAmount || paymentInvoice.amount).toFixed(2)}
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Payment Date *
                </label>
                <input
                  type="date"
                  value={paymentDetails.paymentDate}
                  onChange={(e) => setPaymentDetails({...paymentDetails, paymentDate: e.target.value})}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Payment Method *
                </label>
                <select
                  value={paymentDetails.paymentMethod}
                  onChange={(e) => setPaymentDetails({...paymentDetails, paymentMethod: e.target.value})}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                  required
                >
                  <option value="Cash">Cash</option>
                  <option value="Bank Transfer">Bank Transfer</option>
                  <option value="Credit Card">Credit Card</option>
                  <option value="Debit Card">Debit Card</option>
                  <option value="Online Banking">Online Banking</option>
                  <option value="Cheque">Cheque</option>
                  <option value="Other">Other</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Transaction ID (Optional)
                </label>
                <input
                  type="text"
                  value={paymentDetails.transactionId}
                  onChange={(e) => setPaymentDetails({...paymentDetails, transactionId: e.target.value})}
                  placeholder="e.g., TXN123456789"
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                />
              </div>

              <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                <p className="text-xs text-blue-700">
                  <span className="font-medium">💡 Tip:</span> Include transaction ID for better tracking. It will appear on the receipt.
                </p>
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  onClick={handleClosePaymentDialog}
                  className="flex-1 px-4 py-2 border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 transition-colors"
                  disabled={isGeneratingReceipt}
                >
                  Cancel
                </button>
                <button
                  onClick={handleGenerateReceipt}
                  disabled={isGeneratingReceipt || !paymentDetails.paymentDate || !paymentDetails.paymentMethod}
                  className="flex-1 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {isGeneratingReceipt ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      Generating...
                    </>
                  ) : (
                    <>
                      <Receipt className="w-4 h-4" />
                      Generate Receipt
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
export default AccountsModule;
