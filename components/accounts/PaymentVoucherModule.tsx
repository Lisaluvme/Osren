import React, { useState, useEffect } from 'react';
import {
  DollarSign, Plus, Edit, Eye, Trash2, Printer, Download,
  Search, Filter, FileText, AlertCircle, CheckCircle, Clock, RefreshCw, X
} from 'lucide-react';
import { PaymentVoucher } from '../../types';
import PaymentVoucherForm from './PaymentVoucherForm';

interface PaymentVoucherModuleProps {
  currentUser?: { name: string; role: string };
}

const PaymentVoucherModule: React.FC<PaymentVoucherModuleProps> = ({ currentUser }) => {
  const [vouchers, setVouchers] = useState<PaymentVoucher[]>([]);
  const [filteredVouchers, setFilteredVouchers] = useState<PaymentVoucher[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<string>('All');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [isFormOpen, setIsFormOpen] = useState<boolean>(false);
  const [selectedVoucher, setSelectedVoucher] = useState<PaymentVoucher | null>(null);
  const [isDetailsOpen, setIsDetailsOpen] = useState<boolean>(false);
  const [isGeneratingPDF, setIsGeneratingPDF] = useState(false);

  // Fetch payment vouchers on component mount
  useEffect(() => {
    fetchVouchers();
  }, []);

  // Filter vouchers when filter or search changes
  useEffect(() => {
    let result = vouchers;

    // Apply status filter
    if (filter !== 'All') {
      result = result.filter(voucher =>
        voucher.status?.toLowerCase() === filter.toLowerCase()
      );
    }

    // Apply search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      result = result.filter(voucher =>
        voucher.voucherNumber?.toLowerCase().includes(query) ||
        voucher.supplier?.toLowerCase().includes(query) ||
        voucher.invoiceNumber?.toLowerCase().includes(query) ||
        voucher.remarks?.toLowerCase().includes(query)
      );
    }

    setFilteredVouchers(result);
  }, [vouchers, filter, searchQuery]);

  const fetchVouchers = async () => {
    try {
      setLoading(true);
      const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api';
      const response = await fetch(`${API_BASE}/finance/payment-vouchers`);
      const data = await response.json();

      if (data.success) {
        setVouchers(data.data || []);
      } else {
        console.error('Failed to fetch payment vouchers:', data.error);
      }
    } catch (error) {
      console.error('Error fetching payment vouchers:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateNew = () => {
    setSelectedVoucher(null);
    setIsFormOpen(true);
  };

  const handleEdit = (voucher: PaymentVoucher) => {
    if (voucher.status && voucher.status !== 'draft') {
      alert('Only draft vouchers can be edited');
      return;
    }
    setSelectedVoucher(voucher);
    setIsFormOpen(true);
  };

  const handleView = (voucher: PaymentVoucher) => {
    setSelectedVoucher(voucher);
    setIsDetailsOpen(true);
  };

  const handleDelete = async (voucher: PaymentVoucher) => {
    if (voucher.status && voucher.status !== 'draft') {
      alert('Only draft vouchers can be deleted');
      return;
    }

    if (!confirm(`Are you sure you want to delete payment voucher ${voucher.voucherNumber}?`)) {
      return;
    }

    try {
      const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api';
      const response = await fetch(`${API_BASE}/finance/payment-vouchers/${voucher.id}`, {
        method: 'DELETE'
      });

      const data = await response.json();

      if (data.success) {
        alert('Payment voucher deleted successfully');
        fetchVouchers(); // Refresh the list
      } else {
        alert('Failed to delete payment voucher: ' + data.error);
      }
    } catch (error) {
      console.error('Error deleting payment voucher:', error);
      alert('Failed to delete payment voucher');
    }
  };

  const handlePrint = async (voucher: PaymentVoucher) => {
    try {
      setIsGeneratingPDF(true);
      // Import PDF generation service
      const { generatePaymentVoucherPDF } = await import('../../services/paymentVoucherPDFService');
      await generatePaymentVoucherPDF(voucher);
    } catch (error) {
      console.error('Error generating PDF:', error);
      alert('Failed to generate PDF');
    } finally {
      setIsGeneratingPDF(false);
    }
  };

  const handleExport = () => {
    // Export filtered vouchers to CSV
    const csvContent = [
      ['Voucher No', 'Date', 'Supplier', 'Invoice No', 'Amount', 'Payment Method', 'Status'].join(','),
      ...filteredVouchers.map(v => [
        v.voucherNumber,
        v.date,
        v.supplier,
        v.invoiceNumber,
        v.amountPaid?.toFixed(2) || '0.00',
        v.paymentMethod,
        v.status || 'draft'
      ].join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `payment-vouchers-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
  };

  const getStatusColor = (status?: string) => {
    switch (status?.toLowerCase()) {
      case 'draft': return 'bg-yellow-100 text-yellow-800';
      case 'submitted': return 'bg-blue-100 text-blue-800';
      case 'approved': return 'bg-green-100 text-green-800';
      case 'paid': return 'bg-emerald-100 text-emerald-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusIcon = (status?: string) => {
    switch (status?.toLowerCase()) {
      case 'draft': return <Edit className="w-4 h-4" />;
      case 'submitted': return <Clock className="w-4 h-4" />;
      case 'approved': return <CheckCircle className="w-4 h-4" />;
      case 'paid': return <DollarSign className="w-4 h-4" />;
      default: return <FileText className="w-4 h-4" />;
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <RefreshCw className="w-8 h-8 animate-spin mx-auto mb-4 text-blue-600" />
          <p className="text-gray-600">Loading payment vouchers...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Payment Vouchers</h1>
          <p className="text-gray-600 mt-1">Supplier payment management</p>
        </div>
        <button
          onClick={handleCreateNew}
          className="bg-blue-600 text-white px-4 py-2 rounded-lg flex items-center space-x-2 hover:bg-blue-700 transition-colors"
        >
          <Plus className="w-5 h-5" />
          <span>Create Voucher</span>
        </button>
      </div>

      {/* Filters and Search */}
      <div className="bg-white rounded-lg shadow p-4">
        <div className="flex flex-col md:flex-row gap-4">
          {/* Status Filter */}
          <div className="flex items-center space-x-2">
            <Filter className="w-5 h-5 text-gray-500" />
            <select
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              className="border rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="All">All Status</option>
              <option value="draft">Draft</option>
              <option value="submitted">Submitted</option>
              <option value="approved">Approved</option>
              <option value="paid">Paid</option>
            </select>
          </div>

          {/* Search */}
          <div className="flex-1 relative">
            <Search className="w-5 h-5 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500" />
            <input
              type="text"
              placeholder="Search by voucher number, supplier, invoice..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full border rounded-lg pl-10 pr-4 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>

          {/* Export Button */}
          <button
            onClick={handleExport}
            className="bg-gray-100 text-gray-700 px-4 py-2 rounded-lg flex items-center space-x-2 hover:bg-gray-200 transition-colors"
          >
            <Download className="w-5 h-5" />
            <span>Export</span>
          </button>

          {/* Refresh Button */}
          <button
            onClick={fetchVouchers}
            className="bg-gray-100 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-200 transition-colors"
          >
            <RefreshCw className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Vouchers Table */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Voucher No
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Date
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Supplier
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Invoice No
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Amount
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Payment Method
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredVouchers.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-6 py-12 text-center">
                    <FileText className="w-12 h-12 mx-auto text-gray-400 mb-4" />
                    <p className="text-gray-600">No payment vouchers found</p>
                    <p className="text-gray-500 text-sm mt-1">
                      {searchQuery || filter !== 'All'
                        ? 'Try adjusting your filters or search query'
                        : 'Create your first payment voucher to get started'}
                    </p>
                  </td>
                </tr>
              ) : (
                filteredVouchers.map((voucher) => (
                  <tr key={voucher.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap font-medium text-gray-900">
                      {voucher.voucherNumber}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-gray-600">
                      {new Date(voucher.date).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 text-gray-900">
                      {voucher.supplier}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-gray-600">
                      {voucher.invoiceNumber}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap font-medium text-gray-900">
                      ${voucher.amountPaid?.toFixed(2) || '0.00'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-gray-600">
                      {voucher.paymentMethod}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 py-1 inline-flex items-center text-xs leading-5 font-semibold rounded-full ${getStatusColor(voucher.status)}`}>
                        {getStatusIcon(voucher.status)}
                        <span className="ml-1">{(voucher.status || 'draft').toUpperCase()}</span>
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      <div className="flex items-center space-x-2">
                        <button
                          onClick={() => handleView(voucher)}
                          className="text-blue-600 hover:text-blue-900"
                          title="View"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                        {(!voucher.status || voucher.status === 'draft') && (
                          <>
                            <button
                              onClick={() => handleEdit(voucher)}
                              className="text-green-600 hover:text-green-900"
                              title="Edit"
                            >
                              <Edit className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => handleDelete(voucher)}
                              className="text-red-600 hover:text-red-900"
                              title="Delete"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </>
                        )}
                        <button
                          onClick={() => handlePrint(voucher)}
                          disabled={isGeneratingPDF}
                          className="text-gray-600 hover:text-gray-900 disabled:opacity-50"
                          title="Print PDF"
                        >
                          <Printer className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Form Modal */}
      {isFormOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b flex justify-between items-center">
              <h2 className="text-xl font-bold">
                {selectedVoucher ? 'Edit Payment Voucher' : 'Create Payment Voucher'}
              </h2>
              <button
                onClick={() => setIsFormOpen(false)}
                className="text-gray-500 hover:text-gray-700"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            <PaymentVoucherForm
              voucher={selectedVoucher}
              supplierInvoices={[]}
              onSubmit={async (voucherData) => {
                try {
                  const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api';
                  const url = selectedVoucher
                    ? `${API_BASE}/finance/payment-vouchers/${selectedVoucher.id}`
                    : `${API_BASE}/finance/payment-voucher`;

                  const response = await fetch(url, {
                    method: selectedVoucher ? 'PUT' : 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(voucherData)
                  });

                  const data = await response.json();

                  if (data.success) {
                    alert(selectedVoucher ? 'Payment voucher updated successfully' : 'Payment voucher created successfully');
                    setIsFormOpen(false);
                    fetchVouchers(); // Refresh the list
                  } else {
                    alert('Failed to save payment voucher: ' + data.error);
                  }
                } catch (error) {
                  console.error('Error saving payment voucher:', error);
                  alert('Failed to save payment voucher');
                }
              }}
              onCancel={() => setIsFormOpen(false)}
            />
          </div>
        </div>
      )}

      {/* Details Modal */}
      {isDetailsOpen && selectedVoucher && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b flex justify-between items-center">
              <h2 className="text-xl font-bold">Payment Voucher Details</h2>
              <button
                onClick={() => setIsDetailsOpen(false)}
                className="text-gray-500 hover:text-gray-700"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            <div className="p-6">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-gray-700">Voucher Number</label>
                  <p className="mt-1 text-gray-900">{selectedVoucher.voucherNumber}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700">Date</label>
                  <p className="mt-1 text-gray-900">{new Date(selectedVoucher.date).toLocaleDateString()}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700">Supplier</label>
                  <p className="mt-1 text-gray-900">{selectedVoucher.supplier}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700">Invoice Number</label>
                  <p className="mt-1 text-gray-900">{selectedVoucher.invoiceNumber}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700">Amount Paid</label>
                  <p className="mt-1 text-gray-900 font-semibold">${selectedVoucher.amountPaid?.toFixed(2) || '0.00'}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700">Payment Method</label>
                  <p className="mt-1 text-gray-900">{selectedVoucher.paymentMethod}</p>
                </div>
                {selectedVoucher.outstandingAmount !== undefined && (
                  <div>
                    <label className="text-sm font-medium text-gray-700">Outstanding Amount</label>
                    <p className="mt-1 text-gray-900">${selectedVoucher.outstandingAmount.toFixed(2)}</p>
                  </div>
                )}
                {selectedVoucher.referenceNo && (
                  <div>
                    <label className="text-sm font-medium text-gray-700">Reference Number</label>
                    <p className="mt-1 text-gray-900">{selectedVoucher.referenceNo}</p>
                  </div>
                )}
                <div className="col-span-2">
                  <label className="text-sm font-medium text-gray-700">Remarks</label>
                  <p className="mt-1 text-gray-900">{selectedVoucher.remarks || 'No remarks'}</p>
                </div>
                <div className="col-span-2">
                  <label className="text-sm font-medium text-gray-700">Status</label>
                  <p className="mt-1">
                    <span className={`px-2 py-1 inline-flex items-center text-xs leading-5 font-semibold rounded-full ${getStatusColor(selectedVoucher.status)}`}>
                      {getStatusIcon(selectedVoucher.status)}
                      <span className="ml-1">{(selectedVoucher.status || 'draft').toUpperCase()}</span>
                    </span>
                  </p>
                </div>
              </div>

              <div className="mt-6 flex justify-end space-x-3">
                {(!selectedVoucher.status || selectedVoucher.status === 'draft') && (
                  <button
                    onClick={() => {
                      setIsDetailsOpen(false);
                      handleEdit(selectedVoucher);
                    }}
                    className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
                  >
                    Edit Voucher
                  </button>
                )}
                <button
                  onClick={() => {
                    setIsDetailsOpen(false);
                    handlePrint(selectedVoucher);
                  }}
                  disabled={isGeneratingPDF}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
                >
                  {isGeneratingPDF ? 'Generating PDF...' : 'Print PDF'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PaymentVoucherModule;