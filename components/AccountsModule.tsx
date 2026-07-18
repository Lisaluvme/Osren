import React, { useState, useEffect } from 'react';
import { Invoice, SalesOrder, Bill } from '../types';
import { Filter, CheckCircle, AlertCircle, Clock, RefreshCw, DollarSign, Receipt, X, Plus, Trash2 } from 'lucide-react';
import { billsApi } from '../services/api/billsApi';
import InvoiceActions from './invoices/InvoiceActions';
import { generateInvoicePDF } from '../services/invoicePDFService';
import { generateReceiptPDF } from '../services/receiptPDFService';
import { DEFAULT_COMPANY_INFO } from '../constants/invoiceTemplate';

interface AccountsModuleProps {
  newOrder?: SalesOrder | null;
}

const AccountsModule: React.FC<AccountsModuleProps> = ({newOrder}) => {
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

  // Accounts Payable (AP) state
  const [view, setView] = useState<'receivable' | 'payable'>('receivable');
  const [bills, setBills] = useState<Bill[]>([]);
  const [billsLoading, setBillsLoading] = useState(false);
  const [billFilter, setBillFilter] = useState<string>('All');
  const [showBillModal, setShowBillModal] = useState(false);
  const [billError, setBillError] = useState('');
  const [savingBill, setSavingBill] = useState(false);
  const [billForm, setBillForm] = useState({
    vendor_name: '', invoice_ref: '', category: '', amount: '', issue_date: '', due_date: '', notes: ''
  });

  // Fetch real orders from backend on component mount and when new order is placed
  useEffect(() => {
    fetchOrders();
  }, [newOrder]); // Re-fetch when newOrder changes

  useEffect(() => {
    if (view === 'payable') fetchBills();
  }, [view]);

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

  // ===== Accounts Payable handlers =====
  const fetchBills = async () => {
    try {
      setBillsLoading(true);
      setBills(await billsApi.list());
    } catch (error) {
      console.error('Accounts: Error fetching bills:', error);
      setBills([]);
    } finally {
      setBillsLoading(false);
    }
  };

  const openBillModal = () => {
    setBillForm({ vendor_name: '', invoice_ref: '', category: '', amount: '', issue_date: '', due_date: '', notes: '' });
    setBillError('');
    setShowBillModal(true);
  };

  const addBill = async (e: React.FormEvent) => {
    e.preventDefault();
    setBillError('');
    if (!billForm.vendor_name || !billForm.amount || !billForm.due_date) {
      setBillError('Vendor, amount and due date are required.');
      return;
    }
    setSavingBill(true);
    try {
      await billsApi.create({
        vendor_name: billForm.vendor_name,
        invoice_ref: billForm.invoice_ref || undefined,
        category: billForm.category || undefined,
        amount: parseFloat(billForm.amount),
        issue_date: billForm.issue_date || undefined,
        due_date: billForm.due_date,
        notes: billForm.notes || undefined
      });
      setShowBillModal(false);
      await fetchBills();
    } catch (error: any) {
      setBillError(error?.response?.data?.error || 'Failed to add bill.');
    } finally {
      setSavingBill(false);
    }
  };

  const markBillPaid = async (id: string) => {
    try { await billsApi.update(id, { status: 'paid' }); await fetchBills(); }
    catch (error) { console.error(error); alert('Failed to update bill.'); }
  };

  const reopenBill = async (id: string) => {
    try { await billsApi.update(id, { status: 'pending' }); await fetchBills(); }
    catch (error) { console.error(error); alert('Failed to update bill.'); }
  };

  const deleteBill = async (id: string) => {
    if (!window.confirm('Delete this bill? This cannot be undone.')) return;
    try { await billsApi.remove(id); await fetchBills(); }
    catch (error) { console.error(error); alert('Failed to delete bill.'); }
  };

  const filteredInvoices = filter === 'All' ? invoices : invoices.filter(inv => inv.status === filter);

  // Derive a bill's display status: paid / pending / overdue (by due date).
  const billDisplayStatus = (b: Bill): 'Paid' | 'Pending' | 'Overdue' => {
    if (b.status === 'paid') return 'Paid';
    const todayStr = new Date().toISOString().split('T')[0];
    return b.due_date < todayStr ? 'Overdue' : 'Pending';
  };
  const filteredBills = billFilter === 'All' ? bills : bills.filter(b => billDisplayStatus(b) === billFilter);
  const totalPayable = bills.filter(b => b.status !== 'paid').reduce((sum, b) => sum + Number(b.amount), 0);

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
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <h2 className="text-2xl font-bold text-slate-800">Accounts</h2>
          <div className="flex items-center bg-white p-1 rounded-lg border border-slate-200">
            <button
              onClick={() => setView('receivable')}
              className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${view === 'receivable' ? 'bg-slate-900 text-white' : 'text-slate-600 hover:bg-slate-100'}`}
            >
              Receivable
            </button>
            <button
              onClick={() => setView('payable')}
              className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${view === 'payable' ? 'bg-slate-900 text-white' : 'text-slate-600 hover:bg-slate-100'}`}
            >
              Payable
            </button>
          </div>
        </div>

        <div className="flex items-center space-x-3">
          {view === 'receivable' ? (
            <>
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
            </>
          ) : (
            <>
              <span className="text-sm text-slate-500">Outstanding: <strong className="text-slate-800">RM {totalPayable.toLocaleString(undefined, { minimumFractionDigits: 2 })}</strong></span>
              <button
                onClick={openBillModal}
                className="flex items-center space-x-2 px-3 py-2 text-sm font-medium text-white bg-blue-600 border border-blue-600 rounded-lg hover:bg-blue-700"
              >
                <Plus className="w-4 h-4" />
                <span>Add Bill</span>
              </button>
              <div className="flex items-center space-x-2 bg-white p-1 rounded-lg border border-slate-200">
                {['All', 'Paid', 'Pending', 'Overdue'].map(f => (
                  <button
                    key={f}
                    onClick={() => setBillFilter(f)}
                    className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${billFilter === f ? 'bg-slate-900 text-white' : 'text-slate-600 hover:bg-slate-100'}`}
                  >
                    {f}
                  </button>
                ))}
              </div>
            </>
          )}
        </div>
      </div>

      <div className={view === 'receivable' ? '' : 'hidden'}>
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

      {/* ===== Accounts Payable ===== */}
      <div className={view === 'payable' ? 'space-y-4' : 'hidden'}>
        {billsLoading ? (
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-8 flex items-center justify-center">
            <div className="w-12 h-12 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin" />
          </div>
        ) : bills.length === 0 ? (
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-8 text-center text-slate-400">
            No bills recorded yet. Click <strong>Add Bill</strong> to record a payable.
          </div>
        ) : (
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 text-xs uppercase tracking-wider">
                    <th className="p-4 font-semibold">Vendor</th>
                    <th className="p-4 font-semibold">Invoice Ref</th>
                    <th className="p-4 font-semibold">Category</th>
                    <th className="p-4 font-semibold">Due Date</th>
                    <th className="p-4 font-semibold text-right">Amount</th>
                    <th className="p-4 font-semibold text-center">Status</th>
                    <th className="p-4 font-semibold text-center">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredBills.map((b) => {
                    const st = billDisplayStatus(b);
                    return (
                      <tr key={b.id} className="hover:bg-blue-50 transition-colors">
                        <td className="p-4 font-medium text-slate-700">{b.vendor_name}</td>
                        <td className="p-4 text-slate-600">{b.invoice_ref || '—'}</td>
                        <td className="p-4 text-slate-600">{b.category || '—'}</td>
                        <td className="p-4 text-slate-600">{b.due_date}</td>
                        <td className="p-4 text-right font-mono font-medium text-slate-800">
                          RM {Number(b.amount).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                        </td>
                        <td className="p-4 text-center">
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${getStatusColor(st)}`}>
                            {st === 'Overdue' && <AlertCircle className="w-3 h-3 mr-1" />}
                            {st === 'Paid' && <CheckCircle className="w-3 h-3 mr-1" />}
                            {st === 'Pending' && <Clock className="w-3 h-3 mr-1" />}
                            {st}
                          </span>
                        </td>
                        <td className="p-4 text-center">
                          <div className="flex items-center justify-center gap-1">
                            {st !== 'Paid' ? (
                              <button onClick={() => markBillPaid(b.id)} className="px-2 py-1 text-xs font-medium text-green-600 bg-green-50 hover:bg-green-100 rounded border border-green-200 transition-colors">Mark Paid</button>
                            ) : (
                              <button onClick={() => reopenBill(b.id)} className="px-2 py-1 text-xs font-medium text-yellow-700 bg-yellow-50 hover:bg-yellow-100 rounded border border-yellow-200 transition-colors">Reopen</button>
                            )}
                            <button onClick={() => deleteBill(b.id)} className="px-2 py-1 text-xs font-medium text-red-600 bg-red-50 hover:bg-red-100 rounded border border-red-200 transition-colors flex items-center gap-1">
                              <Trash2 className="w-3 h-3" />Delete
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {/* Add Bill modal */}
      {showBillModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-lg">
            <div className="flex items-center justify-between p-5 border-b border-slate-200">
              <h2 className="text-lg font-semibold text-slate-800">Add Bill (Payable)</h2>
              <button onClick={() => setShowBillModal(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={addBill} className="p-5 space-y-4">
              {billError && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-600">{billError}</div>
              )}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Vendor *</label>
                  <input required value={billForm.vendor_name} onChange={(e) => setBillForm({ ...billForm, vendor_name: e.target.value })} className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500" placeholder="Supplier name" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Invoice Ref</label>
                  <input value={billForm.invoice_ref} onChange={(e) => setBillForm({ ...billForm, invoice_ref: e.target.value })} className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500" placeholder="Vendor's bill #" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Category</label>
                  <input value={billForm.category} onChange={(e) => setBillForm({ ...billForm, category: e.target.value })} className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500" placeholder="e.g. Utilities" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Amount (RM) *</label>
                  <input type="number" step="0.01" min="0" required value={billForm.amount} onChange={(e) => setBillForm({ ...billForm, amount: e.target.value })} className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500" placeholder="0.00" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Issue Date</label>
                  <input type="date" value={billForm.issue_date} onChange={(e) => setBillForm({ ...billForm, issue_date: e.target.value })} className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Due Date *</label>
                  <input type="date" required value={billForm.due_date} onChange={(e) => setBillForm({ ...billForm, due_date: e.target.value })} className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500" />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Notes</label>
                <textarea value={billForm.notes} onChange={(e) => setBillForm({ ...billForm, notes: e.target.value })} rows={2} className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500" />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button type="button" onClick={() => setShowBillModal(false)} className="px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100 rounded-lg transition-colors">Cancel</button>
                <button type="submit" disabled={savingBill} className="px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors disabled:opacity-50">
                  {savingBill ? 'Saving…' : 'Add Bill'}
                </button>
              </div>
            </form>
          </div>
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
