import React from 'react';
import { Invoice } from '../types';
import { DEFAULT_COMPANY_INFO } from '../constants/invoiceTemplate';

interface ReceiptTemplateProps {
  invoice: Invoice;
  receiptNumber: string;
  paymentDate: string;
  paymentMethod: string;
  transactionId?: string;
}

const ReceiptTemplate: React.FC<ReceiptTemplateProps> = ({
  invoice,
  receiptNumber,
  paymentDate,
  paymentMethod,
  transactionId
}) => {
  const companyInfo = DEFAULT_COMPANY_INFO;
  const totalAmount = invoice.finalAmount || invoice.amount;

  return (
    <div id="receipt-content" className="max-w-2xl mx-auto bg-white p-8 shadow-lg">
      {/* Header */}
      <div className="text-center border-b-2 border-blue-600 pb-4 mb-6">
        <h1 className="text-3xl font-bold text-blue-900">{companyInfo.name}</h1>
        <p className="text-gray-600 mt-1">{companyInfo.address}</p>
        <div className="flex justify-center gap-4 mt-2 text-sm text-gray-600">
          <span>📞 {companyInfo.phone}</span>
          <span>✉️ {companyInfo.email}</span>
        </div>
        {companyInfo.website && (
          <p className="text-sm text-blue-600 mt-1">{companyInfo.website}</p>
        )}
      </div>

      {/* Receipt Title */}
      <div className="text-center mb-6">
        <h2 className="text-4xl font-bold text-green-700 tracking-wide">PAYMENT RECEIPT</h2>
        <p className="text-gray-600 mt-1">Official Payment Acknowledgment</p>
      </div>

      {/* Receipt Information */}
      <div className="bg-gray-50 rounded-lg p-4 mb-6">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <p className="text-xs text-gray-500 uppercase tracking-wide">Receipt Number</p>
            <p className="text-lg font-bold text-blue-900">{receiptNumber}</p>
          </div>
          <div>
            <p className="text-xs text-gray-500 uppercase tracking-wide">Payment Date</p>
            <p className="text-lg font-semibold text-gray-800">{paymentDate}</p>
          </div>
          <div>
            <p className="text-xs text-gray-500 uppercase tracking-wide">Invoice Reference</p>
            <p className="text-lg font-semibold text-gray-800">#{invoice.id}</p>
          </div>
          <div>
            <p className="text-xs text-gray-500 uppercase tracking-wide">Payment Method</p>
            <p className="text-lg font-semibold text-gray-800">{paymentMethod}</p>
          </div>
        </div>
        {transactionId && (
          <div className="mt-3">
            <p className="text-xs text-gray-500 uppercase tracking-wide">Transaction ID</p>
            <p className="text-sm font-mono text-gray-700">{transactionId}</p>
          </div>
        )}
      </div>

      {/* Customer Information */}
      <div className="mb-6">
        <h3 className="text-lg font-bold text-gray-800 mb-2">Bill To</h3>
        <div className="bg-gray-50 rounded-lg p-4">
          <p className="text-lg font-semibold text-gray-800">{invoice.clientName}</p>
          {invoice.deliveryAddress && (
            <p className="text-sm text-gray-600 mt-1">{invoice.deliveryAddress}</p>
          )}
          {invoice.contactNumber && (
            <p className="text-sm text-gray-600">📞 {invoice.contactNumber}</p>
          )}
        </div>
      </div>

      {/* Payment Details */}
      <div className="mb-6">
        <h3 className="text-lg font-bold text-gray-800 mb-2">Payment Details</h3>
        <table className="w-full">
          <thead>
            <tr className="bg-blue-50 border-b-2 border-blue-200">
              <th className="p-3 text-left text-sm font-semibold text-gray-700">Description</th>
              <th className="p-3 text-right text-sm font-semibold text-gray-700">Amount</th>
            </tr>
          </thead>
          <tbody>
            <tr className="border-b border-gray-200">
              <td className="p-3 text-gray-800">Payment for Invoice #{invoice.id}</td>
              <td className="p-3 text-right font-medium text-gray-800">
                RM {totalAmount.toFixed(2)}
              </td>
            </tr>
          </tbody>
          <tfoot>
            <tr className="bg-green-50 border-t-2 border-green-300">
              <td className="p-3 text-lg font-bold text-green-900">TOTAL PAID</td>
              <td className="p-3 text-lg font-bold text-green-900 text-right">
                RM {totalAmount.toFixed(2)}
              </td>
            </tr>
          </tfoot>
        </table>
      </div>

      {/* Payment Confirmation */}
      <div className="mb-6">
        <div className="bg-gradient-to-r from-emerald-50 to-teal-50 rounded-2xl p-6 border border-emerald-200 shadow-sm">
          <div className="flex items-center justify-center mb-4">
            <div className="w-16 h-16 bg-emerald-500 rounded-full flex items-center justify-center shadow-lg">
              <svg className="h-8 w-8 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7" />
              </svg>
            </div>
          </div>
          <div className="text-center">
            <h3 className="text-2xl font-bold text-emerald-900 mb-2 tracking-wide">PAYMENT RECEIVED</h3>
            <p className="text-emerald-700 font-medium mb-1">Thank you for your payment!</p>
            <p className="text-emerald-600 text-sm">
              This receipt confirms payment of <span className="font-bold text-emerald-800">RM {totalAmount.toFixed(2)}</span>
            </p>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="border-t border-gray-300 pt-4 mt-6">
        <div className="text-center text-sm text-gray-600">
          <p className="font-semibold">{companyInfo.name}</p>
          <p className="mt-1">{companyInfo.footer}</p>
          {companyInfo.registrationNumber && (
            <p className="mt-1 text-xs">Registration No: {companyInfo.registrationNumber}</p>
          )}
          {companyInfo.taxId && (
            <p className="text-xs">Tax ID: {companyInfo.taxId}</p>
          )}
        </div>
      </div>

      {/* Terms */}
      <div className="mt-4 text-xs text-gray-500">
        <p>This receipt serves as official confirmation of payment received.</p>
        <p className="mt-1">For any inquiries, please contact us at {companyInfo.phone} or {companyInfo.email}.</p>
      </div>
    </div>
  );
};

export default ReceiptTemplate;