import React, { useState, useEffect } from 'react';
import {
  Receipt, Plus, Edit, Eye, Trash2, Printer, Download,
  Search, Filter, FileText, AlertCircle, CheckCircle, Clock, RefreshCw, X
} from 'lucide-react';
import { ReceiptCollection } from '../../types';
import CustomerReceiptForm from './CustomerReceiptForm';

interface CustomerReceiptModuleProps {
  currentUser?: { name: string; role: string };
}

const CustomerReceiptModule: React.FC<CustomerReceiptModuleProps> = ({ currentUser }) => {
  const [receipts, setReceipts] = useState<ReceiptCollection[]>([]);
  const [filteredReceipts, setFilteredReceipts] = useState<ReceiptCollection[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<string>('All');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [isFormOpen, setIsFormOpen] = useState<boolean>(false);
  const [selectedReceipt, setSelectedReceipt] = useState<ReceiptCollection | null>(null);
  const [isDetailsOpen, setIsDetailsOpen] = useState<boolean>(false);
  const [isGeneratingPDF, setIsGeneratingPDF] = useState(false);

  // Fetch receipt collections on component mount
  useEffect(() => {
    fetchReceipts();
  }, []);

  // Filter receipts when filter or search changes
  useEffect(() => {
    let result = receipts;

    // Apply status filter
    if (filter !== 'All') {
      result = result.filter(receipt =>
        receipt.status?.toLowerCase() === filter.toLowerCase()
      );
    }

    // Apply search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      result = result.filter(receipt =>
        receipt.receiptNumber?.toLowerCase().includes(query) ||
        receipt.customer?.toLowerCase().includes(query) ||
        receipt.invoiceNumber?.toLowerCase().includes(query) ||
        receipt.remarks?.toLowerCase().includes(query)
      );
    }

    setFilteredReceipts(result);
  }, [receipts, filter, searchQuery]);

  const fetchReceipts = async () => {
    try {
      setLoading(true);
      const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api';
      const response = await fetch(`${API_BASE}/finance/receipt-collections`);
      const data = await response.json();

      if (data.success) {
        setReceipts(data.data || []);
      } else {
        console.error('Failed to fetch receipt collections:', data.error);
      }
    } catch (error) {
      console.error('Error fetching receipt collections:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateNew = () => {
    setSelectedReceipt(null);
    setIsFormOpen(true);
  };

  const handleEdit = (receipt: ReceiptCollection) => {
    if (receipt.status && receipt.status !== 'draft') {
      alert('Only draft receipts can be edited');
      return;
    }
    setSelectedReceipt(receipt);
    setIsFormOpen(true);
  };

  const handleView = (receipt: ReceiptCollection) => {
    setSelectedReceipt(receipt);
    setIsDetailsOpen(true);
  };

  const handleDelete = async (receipt: ReceiptCollection) => {
    if (receipt.status && receipt.status !== 'draft') {
      alert('Only draft receipts can be deleted');
      return;
    }

    if (!confirm(`Are you sure you want to delete receipt ${receipt.receiptNumber}?`)) {
      return;
    }

    try {
      const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api';
      const response = await fetch(`${API_BASE}/finance/receipt-collections/${receipt.id}`, {
        method: 'DELETE'
      });

      const data = await response.json();

      if (data.success) {
        alert('Receipt deleted successfully');
        fetchReceipts(); // Refresh the list
      } else {
        alert('Failed to delete receipt: ' + data.error);
      }
    } catch (error) {
      console.error('Error deleting receipt:', error);
      alert('Failed to delete receipt');
    }
  };

  const handlePrint = async (receipt: ReceiptCollection) => {
    try {
      setIsGeneratingPDF(true);
      // Import PDF generation service
      const { generateCustomerReceiptPDF } = await import('../../services/customerReceiptPDFService');
      await generateCustomerReceiptPDF(receipt);
    } catch (error) {
      console.error('Error generating PDF:', error);
      alert('Failed to generate PDF');
    } finally {
      setIsGeneratingPDF(false);
    }
  };

  const handleExport = () => {
    // Export filtered receipts to CSV
    const csvContent = [
      ['Receipt No', 'Date', 'Customer', 'Invoice No', 'Amount', 'Payment Method', 'Status'].join(','),
      ...filteredReceipts.map(r => [
        r.receiptNumber,
        r.date,
        r.customer,
        r.invoiceNumber,
        r.amountReceived?.toFixed(2) || '0.00',
        r.paymentMethod,
        r.status || 'draft'
      ].join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `customer-receipts-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
  };

  const getStatusColor = (status?: string) => {
    switch (status?.toLowerCase()) {
      case 'draft': return 'bg-yellow-100 text-yellow-800';
      case 'submitted': return 'bg-blue-100 text-blue-800';
      case 'approved': return 'bg-green-100 text-green-800';
      case 'deposited': return 'bg-emerald-100 text-emerald-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusIcon = (status?: string) => {
    switch (status?.toLowerCase()) {
      case 'draft': return <Edit className="w-4 h-4" />;
      case 'submitted': return <Clock className="w-4 h-4" />;
      case 'approved': return <CheckCircle className="w-4 h-4" />;
      case 'deposited': return <Receipt className="w-4 h-4" />;
      default: return <FileText className="w-4 h-4" />;
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <RefreshCw className="w-8 h-8 animate-spin mx-auto mb-4 text-blue-600" />
          <p className="text-gray-600">Loading customer receipts...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Customer Receipts</h1>
          <p className="text-gray-600 mt-1">Customer payment collection management</p>
        </div>
        <button
          onClick={handleCreateNew}
          className="bg-blue-600 text-white px-4 py-2 rounded-lg flex items-center space-x-2 hover:bg-blue-700 transition-colors"
        >
          <Plus className="w-5 h-5" />
          <span>Create Receipt</span>
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
              <option value="deposited">Deposited</option>
            </select>
          </div>

          {/* Search */}
          <div className="flex-1 relative">
            <Search className="w-5 h-5 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500" />
            <input
              type="text"
              placeholder="Search by receipt number, customer, invoice..."
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
            onClick={fetchReceipts}
            className="bg-gray-100 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-200 transition-colors"
          >
            <RefreshCw className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Receipts Table */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Receipt No
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Date
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Customer
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
              {filteredReceipts.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-6 py-12 text-center">
                    <Receipt className="w-12 h-12 mx-auto text-gray-400 mb-4" />
                    <p className="text-gray-600">No customer receipts found</p>
                    <p className="text-gray-500 text-sm mt-1">
                      {searchQuery || filter !== 'All'
                        ? 'Try adjusting your filters or search query'
                        : 'Create your first customer receipt to get started'}
                    </p>
                  </td>
                </tr>
              ) : (
                filteredReceipts.map((receipt) => (
                  <tr key={receipt.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap font-medium text-gray-900">
                      {receipt.receiptNumber}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-gray-600">
                      {new Date(receipt.date).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 text-gray-900">
                      {receipt.customer}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-gray-600">
                      {receipt.invoiceNumber}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap font-medium text-gray-900">
                      ${receipt.amountReceived?.toFixed(2) || '0.00'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-gray-600">
                      {receipt.paymentMethod}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 py-1 inline-flex items-center text-xs leading-5 font-semibold rounded-full ${getStatusColor(receipt.status)}`}>
                        {getStatusIcon(receipt.status)}
                        <span className="ml-1">{(receipt.status || 'draft').toUpperCase()}</span>
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      <div className="flex items-center space-x-2">
                        <button
                          onClick={() => handleView(receipt)}
                          className="text-blue-600 hover:text-blue-900"
                          title="View"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                        {(!receipt.status || receipt.status === 'draft') && (
                          <>
                            <button
                              onClick={() => handleEdit(receipt)}
                              className="text-green-600 hover:text-green-900"
                              title="Edit"
                            >
                              <Edit className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => handleDelete(receipt)}
                              className="text-red-600 hover:text-red-900"
                              title="Delete"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </>
                        )}
                        <button
                          onClick={() => handlePrint(receipt)}
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
                {selectedReceipt ? 'Edit Customer Receipt' : 'Create Customer Receipt'}
              </h2>
              <button
                onClick={() => setIsFormOpen(false)}
                className="text-gray-500 hover:text-gray-700"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            <CustomerReceiptForm
              receipt={selectedReceipt}
              customerInvoices={[]}
              onSubmit={async (receiptData) => {
                try {
                  const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api';
                  const url = selectedReceipt
                    ? `${API_BASE}/finance/receipt-collections/${selectedReceipt.id}`
                    : `${API_BASE}/finance/receipt-collection`;

                  const response = await fetch(url, {
                    method: selectedReceipt ? 'PUT' : 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(receiptData)
                  });

                  const data = await response.json();

                  if (data.success) {
                    alert(selectedReceipt ? 'Customer receipt updated successfully' : 'Customer receipt created successfully');
                    setIsFormOpen(false);
                    fetchReceipts(); // Refresh the list
                  } else {
                    alert('Failed to save customer receipt: ' + data.error);
                  }
                } catch (error) {
                  console.error('Error saving customer receipt:', error);
                  alert('Failed to save customer receipt');
                }
              }}
              onCancel={() => setIsFormOpen(false)}
            />
          </div>
        </div>
      )}

      {/* Details Modal */}
      {isDetailsOpen && selectedReceipt && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b flex justify-between items-center">
              <h2 className="text-xl font-bold">Customer Receipt Details</h2>
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
                  <label className="text-sm font-medium text-gray-700">Receipt Number</label>
                  <p className="mt-1 text-gray-900">{selectedReceipt.receiptNumber}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700">Date</label>
                  <p className="mt-1 text-gray-900">{new Date(selectedReceipt.date).toLocaleDateString()}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700">Customer</label>
                  <p className="mt-1 text-gray-900">{selectedReceipt.customer}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700">Invoice Number</label>
                  <p className="mt-1 text-gray-900">{selectedReceipt.invoiceNumber}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700">Amount Received</label>
                  <p className="mt-1 text-gray-900 font-semibold">${selectedReceipt.amountReceived?.toFixed(2) || '0.00'}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700">Payment Method</label>
                  <p className="mt-1 text-gray-900">{selectedReceipt.paymentMethod}</p>
                </div>
                {selectedReceipt.outstandingAmount !== undefined && (
                  <div>
                    <label className="text-sm font-medium text-gray-700">Outstanding Amount</label>
                    <p className="mt-1 text-gray-900">${selectedReceipt.outstandingAmount.toFixed(2)}</p>
                  </div>
                )}
                {selectedReceipt.referenceNo && (
                  <div>
                    <label className="text-sm font-medium text-gray-700">Reference Number</label>
                    <p className="mt-1 text-gray-900">{selectedReceipt.referenceNo}</p>
                  </div>
                )}
                <div className="col-span-2">
                  <label className="text-sm font-medium text-gray-700">Remarks</label>
                  <p className="mt-1 text-gray-900">{selectedReceipt.remarks || 'No remarks'}</p>
                </div>
                <div className="col-span-2">
                  <label className="text-sm font-medium text-gray-700">Status</label>
                  <p className="mt-1">
                    <span className={`px-2 py-1 inline-flex items-center text-xs leading-5 font-semibold rounded-full ${getStatusColor(selectedReceipt.status)}`}>
                      {getStatusIcon(selectedReceipt.status)}
                      <span className="ml-1">{(selectedReceipt.status || 'draft').toUpperCase()}</span>
                    </span>
                  </p>
                </div>
              </div>

              <div className="mt-6 flex justify-end space-x-3">
                {(!selectedReceipt.status || selectedReceipt.status === 'draft') && (
                  <button
                    onClick={() => {
                      setIsDetailsOpen(false);
                      handleEdit(selectedReceipt);
                    }}
                    className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
                  >
                    Edit Receipt
                  </button>
                )}
                <button
                  onClick={() => {
                    setIsDetailsOpen(false);
                    handlePrint(selectedReceipt);
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

export default CustomerReceiptModule;