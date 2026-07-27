import React, { useState, useEffect } from 'react';
import { PaymentVoucher } from '../../types';

interface PaymentVoucherFormProps {
  voucher?: PaymentVoucher;
  onSubmit: (voucher: PaymentVoucher) => Promise<void>;
  onCancel: () => void;
  supplierInvoices?: any[];
}

const PaymentVoucherForm: React.FC<PaymentVoucherFormProps> = ({
  voucher,
  onSubmit,
  onCancel,
  supplierInvoices = []
}) => {
  const [formData, setFormData] = useState({
    voucherNumber: voucher?.voucherNumber || '',
    date: voucher?.date || new Date().toISOString().split('T')[0],
    supplier: voucher?.supplier || '',
    supplierInvoiceId: voucher?.supplierInvoiceId || '',
    invoiceNumber: voucher?.invoiceNumber || '',
    invoiceAmount: voucher?.invoiceAmount || 0,
    outstandingAmount: voucher?.outstandingAmount || 0,
    amountPaid: voucher?.amountPaid || 0,
    paymentMethod: voucher?.paymentMethod || 'BANK_TRANSFER',
    bankAccountId: voucher?.bankAccountId || '',
    referenceNo: voucher?.referenceNo || '',
    remarks: voucher?.remarks || '',
    status: voucher?.status || 'draft',
    attachments: voucher?.attachments || []
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [availableInvoices, setAvailableInvoices] = useState(supplierInvoices);

  useEffect(() => {
    fetchOutstandingInvoices();
  }, []);

  const fetchOutstandingInvoices = async () => {
    try {
      const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api';
      const response = await fetch(`${API_BASE}/finance/supplier-invoices/outstanding`);
      const data = await response.json();

      if (data.success) {
        setAvailableInvoices(data.data || []);
      }
    } catch (error) {
      console.error('Error fetching outstanding invoices:', error);
    }
  };

  const handleInvoiceChange = async (invoiceId: string) => {
    const selectedInvoice = availableInvoices.find(inv => inv.id === invoiceId);

    if (selectedInvoice) {
      setFormData({
        ...formData,
        supplierInvoiceId: invoiceId,
        invoiceNumber: selectedInvoice.invoiceNumber,
        supplier: selectedInvoice.supplier,
        invoiceAmount: selectedInvoice.amount,
        outstandingAmount: selectedInvoice.outstandingAmount,
        amountPaid: selectedInvoice.outstandingAmount
      });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validation
    if (!formData.supplier || !formData.supplierInvoiceId || !formData.invoiceNumber) {
      setError('Please select a supplier invoice');
      return;
    }

    if (!formData.amountPaid || formData.amountPaid <= 0) {
      setError('Payment amount must be greater than 0');
      return;
    }

    if (formData.amountPaid > formData.outstandingAmount) {
      setError(`Payment amount cannot exceed outstanding amount ($${formData.outstandingAmount.toFixed(2)})`);
      return;
    }

    if (!formData.paymentMethod) {
      setError('Please select a payment method');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const submitData = {
        ...formData,
        id: voucher?.id,
        voucherNumber: formData.voucherNumber || `PV-${new Date().getFullYear()}${String(new Date().getMonth() + 1).padStart(2, '0')}${String(new Date().getDate()).padStart(2, '0')}-${Math.floor(Math.random() * 1000).toString().padStart(3, '0')}`,
        amountPaid: parseFloat(formData.amountPaid.toString()),
        outstandingAmount: formData.outstandingAmount - parseFloat(formData.amountPaid.toString())
      };

      await onSubmit(submitData);
    } catch (error) {
      setError('Failed to save payment voucher');
      console.error('Error submitting voucher:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (field: string, value: any) => {
    setFormData({ ...formData, [field]: value });
    setError('');
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Invoice Selection */}
        <div className="md:col-span-2">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Supplier Invoice *
          </label>
          <select
            value={formData.supplierInvoiceId}
            onChange={(e) => handleInvoiceChange(e.target.value)}
            disabled={!!voucher}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-100"
            required
          >
            <option value="">Select an invoice</option>
            {availableInvoices.map(invoice => (
              <option key={invoice.id} value={invoice.id}>
                {invoice.invoiceNumber} - {invoice.supplier} - ${invoice.amount.toFixed(2)} (Outstanding: ${invoice.outstandingAmount?.toFixed(2) || '0.00'})
              </option>
            ))}
          </select>
          {availableInvoices.length === 0 && (
            <p className="text-sm text-gray-500 mt-1">No outstanding invoices available</p>
          )}
        </div>

        {/* Voucher Number (Auto-generated) */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Voucher Number
          </label>
          <input
            type="text"
            value={formData.voucherNumber}
            readOnly
            className="w-full border border-gray-300 rounded-lg px-3 py-2 bg-gray-50 text-gray-600"
            placeholder="Auto-generated"
          />
        </div>

        {/* Date */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Date *
          </label>
          <input
            type="date"
            value={formData.date}
            onChange={(e) => handleInputChange('date', e.target.value)}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            required
          />
        </div>

        {/* Supplier (Auto-filled) */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Supplier
          </label>
          <input
            type="text"
            value={formData.supplier}
            readOnly
            className="w-full border border-gray-300 rounded-lg px-3 py-2 bg-gray-50 text-gray-600"
            placeholder="Auto-filled from invoice"
          />
        </div>

        {/* Invoice Number (Auto-filled) */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Invoice Number
          </label>
          <input
            type="text"
            value={formData.invoiceNumber}
            readOnly
            className="w-full border border-gray-300 rounded-lg px-3 py-2 bg-gray-50 text-gray-600"
            placeholder="Auto-filled from invoice"
          />
        </div>

        {/* Invoice Amount */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Invoice Amount
          </label>
          <div className="relative">
            <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500">$</span>
            <input
              type="text"
              value={formData.invoiceAmount.toFixed(2)}
              readOnly
              className="w-full border border-gray-300 rounded-lg pl-8 pr-3 py-2 bg-gray-50 text-gray-600"
            />
          </div>
        </div>

        {/* Outstanding Amount */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Outstanding Amount
          </label>
          <div className="relative">
            <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500">$</span>
            <input
              type="text"
              value={formData.outstandingAmount.toFixed(2)}
              readOnly
              className="w-full border border-gray-300 rounded-lg pl-8 pr-3 py-2 bg-blue-50 text-blue-600 font-semibold"
            />
          </div>
        </div>

        {/* Payment Amount */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Payment Amount *
          </label>
          <div className="relative">
            <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500">$</span>
            <input
              type="number"
              value={formData.amountPaid}
              onChange={(e) => handleInputChange('amountPaid', parseFloat(e.target.value) || 0)}
              min="0"
              max={formData.outstandingAmount}
              step="0.01"
              className="w-full border border-gray-300 rounded-lg pl-8 pr-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              required
            />
          </div>
          <p className="text-xs text-gray-500 mt-1">
            Maximum: ${formData.outstandingAmount.toFixed(2)}
          </p>
        </div>

        {/* Payment Method */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Payment Method *
          </label>
          <select
            value={formData.paymentMethod}
            onChange={(e) => handleInputChange('paymentMethod', e.target.value)}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            required
          >
            <option value="">Select method</option>
            <option value="BANK_TRANSFER">Bank Transfer</option>
            <option value="CASH">Cash</option>
            <option value="CHEQUE">Cheque</option>
            <option value="OTHER">Other</option>
          </select>
        </div>

        {/* Bank Account */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Bank Account
          </label>
          <select
            value={formData.bankAccountId}
            onChange={(e) => handleInputChange('bankAccountId', e.target.value)}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          >
            <option value="">Select account (optional)</option>
            <option value="bank-1">Company Bank Account - XXXXXX1234</option>
            <option value="bank-2">Company Savings Account - XXXXXX5678</option>
          </select>
        </div>

        {/* Reference Number */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Reference Number
          </label>
          <input
            type="text"
            value={formData.referenceNo}
            onChange={(e) => handleInputChange('referenceNo', e.target.value)}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            placeholder="Transaction reference (optional)"
          />
        </div>

        {/* Status */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Status
          </label>
          <select
            value={formData.status}
            onChange={(e) => handleInputChange('status', e.target.value)}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          >
            <option value="draft">Draft</option>
            <option value="submitted">Submitted</option>
            <option value="approved">Approved</option>
            <option value="paid">Paid</option>
          </select>
        </div>

        {/* Remarks */}
        <div className="md:col-span-2">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Remarks
          </label>
          <textarea
            value={formData.remarks}
            onChange={(e) => handleInputChange('remarks', e.target.value)}
            rows={3}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            placeholder="Additional notes or comments (optional)"
          />
        </div>

        {/* File Attachments */}
        <div className="md:col-span-2">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Attachments
          </label>
          <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center">
            <input
              type="file"
              id="file-upload"
              className="hidden"
              multiple
              onChange={(e) => {
                const files = Array.from(e.target.files || []);
                const newAttachments = files.map(file => file.name);
                handleInputChange('attachments', [...formData.attachments, ...newAttachments]);
              }}
            />
            <label
              htmlFor="file-upload"
              className="cursor-pointer"
            >
              <div className="text-gray-600">
                <svg className="mx-auto h-12 w-12 text-gray-400" stroke="currentColor" fill="none" viewBox="0 0 48 48">
                  <path d="M28 8H12a4 4 0 00-4 4v20m32-12v8m0 0v8a4 4 0 01-4 4H12a4 4 0 01-4-4v-4m32-4l-3.172-3.172a4 4 0 00-5.656 0L28 28M8 32l9.172-9.172a4 4 0 015.656 0L28 28m0 0l4 4m4-24h8m-4-4v8m-12 4h.02" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
                </svg>
                <div className="mt-4">
                  <p className="text-sm text-gray-600">
                    Click to upload or drag and drop
                  </p>
                  <p className="text-xs text-gray-500">
                    PNG, JPG, PDF up to 10MB each
                  </p>
                </div>
              </div>
            </label>
          </div>
          {formData.attachments.length > 0 && (
            <div className="mt-2">
              <p className="text-sm text-gray-600 mb-1">Attached files:</p>
              <ul className="text-sm text-gray-500">
                {formData.attachments.map((file, index) => (
                  <li key={index} className="flex items-center justify-between">
                    <span>📎 {file}</span>
                    <button
                      type="button"
                      onClick={() => {
                        const newAttachments = formData.attachments.filter((_, i) => i !== index);
                        handleInputChange('attachments', newAttachments);
                      }}
                      className="text-red-600 hover:text-red-800 ml-2"
                    >
                      ✕
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </div>

      {/* Form Actions */}
      <div className="flex justify-end space-x-3 pt-6 border-t">
        <button
          type="button"
          onClick={onCancel}
          className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={loading}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
        >
          {loading ? 'Saving...' : voucher ? 'Update Voucher' : 'Create Voucher'}
        </button>
      </div>
    </form>
  );
};

export default PaymentVoucherForm;