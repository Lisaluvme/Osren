/**
 * Invoice Template Component
 * Base invoice layout template supporting both display and PDF generation
 */

import React from 'react';
import { EnhancedInvoice } from '../../services/invoicePDFService';
import { CompanyInfo, formatCurrency, formatDate } from '../../constants/invoiceTemplate';

interface InvoiceTemplateProps {
  invoice: EnhancedInvoice;
  companyInfo?: CompanyInfo;
  showPrintButtons?: boolean;
  onPrint?: () => void;
  onDownloadPDF?: () => void;
  isGeneratingPDF?: boolean;
}

const InvoiceTemplate: React.FC<InvoiceTemplateProps> = ({
  invoice,
  companyInfo,
  showPrintButtons = false,
  onPrint,
  onDownloadPDF,
  isGeneratingPDF = false
}) => {
  const company = companyInfo || {
    name: 'GMP mobile sales app',
    address: '123 Business Street, City, Country',
    phone: '+60 12-345-6789',
    email: 'info@company.com',
    website: 'www.company.com',
    terms: ['Payment due within 30 days.'],
    footer: 'Thank you for your business!'
  };

  // Generate invoice number if not provided
  const invoiceNumber = invoice.invoiceNumber || `INV-${invoice.id}`;

  return (
    <div id="invoice-template" className="bg-white rounded-lg shadow-lg border border-slate-200 overflow-hidden max-w-4xl mx-auto">
      {/* Invoice Header */}
      <div className="bg-gradient-to-r from-blue-600 to-indigo-700 px-6 py-4">
        <div className="flex justify-between items-start">
          <div>
            <h1 className="text-2xl font-bold text-white">{company.name}</h1>
            <p className="text-blue-100 text-sm mt-1">{company.address}</p>
            <div className="flex gap-4 mt-2 text-blue-100 text-sm">
              {company.phone && <span>📞 {company.phone}</span>}
              {company.email && <span>✉️ {company.email}</span>}
            </div>
          </div>

          {showPrintButtons && onPrint && onDownloadPDF && (
            <div className="flex gap-2">
              <button
                onClick={onPrint}
                disabled={isGeneratingPDF}
                className="px-4 py-2 bg-white text-blue-600 rounded-lg font-semibold hover:bg-blue-50 transition-colors shadow-md"
              >
                🖨️ Print
              </button>
              <button
                onClick={onDownloadPDF}
                disabled={isGeneratingPDF}
                className="px-4 py-2 bg-white text-blue-600 rounded-lg font-semibold hover:bg-blue-50 transition-colors shadow-md"
              >
                {isGeneratingPDF ? '⏳ Generating...' : '📥 Download PDF'}
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Invoice Title & Status */}
      <div className="px-6 py-4 border-b border-slate-200 bg-slate-50">
        <div className="flex justify-between items-center">
          <div>
            <h2 className="text-3xl font-bold text-slate-800">INVOICE</h2>
            <p className="text-slate-600 mt-1">#{invoiceNumber}</p>
          </div>
          <div className="text-right">
            <div className={`inline-flex items-center px-4 py-2 rounded-full text-sm font-bold border-2 ${
              invoice.status === 'Paid' ? 'bg-green-100 text-green-700 border-green-300' :
              invoice.status === 'Overdue' ? 'bg-red-100 text-red-700 border-red-300' :
              invoice.status === 'Approved' ? 'bg-blue-100 text-blue-700 border-blue-300' :
              invoice.status === 'Cancelled' ? 'bg-gray-100 text-gray-700 border-gray-300' :
              'bg-yellow-100 text-yellow-700 border-yellow-300'
            }`}>
              {invoice.status === 'Paid' && '✓'}
              {invoice.status === 'Overdue' && '⚠'}
              {invoice.status === 'Approved' && '○'}
              {invoice.status === 'Cancelled' && '✕'}
              {invoice.status === 'Pending' && '⏳'}
              {' '}{invoice.status}
            </div>
          </div>
        </div>
      </div>

      {/* Client & Date Information */}
      <div className="px-6 py-5 border-b border-slate-200">
        <div className="grid grid-cols-2 gap-6">
          {/* Bill To */}
          <div>
            <h3 className="text-sm font-bold text-slate-700 uppercase tracking-wide mb-3">Bill To</h3>
            <div className="space-y-1">
              <p className="font-semibold text-slate-800">{invoice.clientName}</p>
              {invoice.clientAddress && (
                <p className="text-slate-600 text-sm">{invoice.clientAddress}</p>
              )}
              {invoice.clientContact && (
                <p className="text-slate-600 text-sm">📞 {invoice.clientContact}</p>
              )}
              {invoice.clientEmail && (
                <p className="text-slate-600 text-sm">✉️ {invoice.clientEmail}</p>
              )}
            </div>
          </div>

          {/* Invoice Dates */}
          <div className="text-right space-y-2">
            <div>
              <p className="text-xs text-slate-500 uppercase tracking-wide">Issue Date</p>
              <p className="text-slate-800 font-semibold">
                {invoice.issueDate ? formatDate(invoice.issueDate) : 'N/A'}
              </p>
            </div>
            <div>
              <p className="text-xs text-slate-500 uppercase tracking-wide">Due Date</p>
              <p className="text-slate-800 font-semibold">{formatDate(invoice.dueDate)}</p>
            </div>
            {invoice.paymentTerms && (
              <div>
                <p className="text-xs text-slate-500 uppercase tracking-wide">Payment Terms</p>
                <p className="text-slate-800 font-semibold">{invoice.paymentTerms}</p>
              </div>
            )}
            {invoice.paidDate && (
              <div>
                <p className="text-xs text-slate-500 uppercase tracking-wide">Paid Date</p>
                <p className="text-green-600 font-semibold">{formatDate(invoice.paidDate)}</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Line Items */}
      <div className="px-6 py-5 border-b border-slate-200">
        <table className="w-full">
          <thead>
            <tr className="bg-slate-50 border-b-2 border-slate-200">
              <th className="text-left py-3 px-4 text-xs font-bold text-slate-700 uppercase tracking-wide">Description</th>
              <th className="text-center py-3 px-4 text-xs font-bold text-slate-700 uppercase tracking-wide">Qty</th>
              <th className="text-right py-3 px-4 text-xs font-bold text-slate-700 uppercase tracking-wide">Unit Price</th>
              <th className="text-right py-3 px-4 text-xs font-bold text-slate-700 uppercase tracking-wide">Total</th>
            </tr>
          </thead>
          <tbody>
            {invoice.items && invoice.items.length > 0 ? (
              invoice.items.map((item, index) => (
                <tr key={index} className="border-b border-slate-100 hover:bg-slate-50">
                  <td className="py-3 px-4">
                    <p className="font-semibold text-slate-800">{item.name}</p>
                    {item.description && (
                      <p className="text-xs text-slate-500 mt-1">{item.description}</p>
                    )}
                    {item.sku && (
                      <p className="text-xs text-slate-400 mt-1">SKU: {item.sku}</p>
                    )}
                  </td>
                  <td className="py-3 px-4 text-center text-slate-600">{item.quantity}</td>
                  <td className="py-3 px-4 text-right text-slate-600 font-mono">
                    {formatCurrency(item.unitPrice)}
                  </td>
                  <td className="py-3 px-4 text-right text-slate-800 font-semibold font-mono">
                    {formatCurrency(item.totalPrice || (item.quantity * item.unitPrice))}
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={4} className="py-6 text-center text-slate-400">
                  No items in this invoice
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Totals */}
      <div className="px-6 py-5 border-b border-slate-200">
        <div className="flex justify-end">
          <div className="w-72 space-y-3">
            {/* Subtotal */}
            <div className="flex justify-between items-center">
              <span className="text-slate-600 text-sm">Subtotal</span>
              <span className="text-slate-800 font-semibold font-mono">
                {formatCurrency(invoice.subtotal || invoice.amount)}
              </span>
            </div>

            {/* Tax */}
            {invoice.taxRate && invoice.taxRate > 0 && (
              <div className="flex justify-between items-center">
                <span className="text-slate-600 text-sm">
                  Tax ({(invoice.taxRate * 100).toFixed(0)}%)
                </span>
                <span className="text-slate-800 font-semibold font-mono">
                  {formatCurrency(invoice.taxAmount || 0)}
                </span>
              </div>
            )}

            {/* Discount */}
            {invoice.discountAmount && invoice.discountAmount > 0 && (
              <div className="flex justify-between items-center">
                <span className="text-green-600 text-sm">
                  Discount {invoice.discountPercentage ? `(${(invoice.discountPercentage * 100).toFixed(0)}%)` : ''}
                </span>
                <span className="text-green-600 font-semibold font-mono">
                  -{formatCurrency(invoice.discountAmount)}
                </span>
              </div>
            )}

            {/* Shipping */}
            {invoice.shippingCharges && invoice.shippingCharges > 0 && (
              <div className="flex justify-between items-center">
                <span className="text-slate-600 text-sm">Shipping</span>
                <span className="text-slate-800 font-semibold font-mono">
                  {formatCurrency(invoice.shippingCharges)}
                </span>
              </div>
            )}

            {/* Final Total */}
            <div className="flex justify-between items-center pt-3 border-t-2 border-slate-300 bg-blue-50 -mx-3 px-3 py-2 rounded-lg">
              <span className="text-blue-900 font-bold text-lg">TOTAL</span>
              <span className="text-blue-900 font-bold text-xl font-mono">
                {formatCurrency(invoice.finalAmount || invoice.amount)}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Payment Information */}
      {invoice.bankInfo && (
        <div className="px-6 py-5 border-b border-slate-200 bg-slate-50">
          <h3 className="text-sm font-bold text-slate-700 uppercase tracking-wide mb-3">
            💳 Payment Information
          </h3>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <p className="text-slate-500">Bank Name</p>
              <p className="font-semibold text-slate-800">{invoice.bankInfo.bankName}</p>
            </div>
            <div>
              <p className="text-slate-500">Account Name</p>
              <p className="font-semibold text-slate-800">{invoice.bankInfo.accountName}</p>
            </div>
            <div>
              <p className="text-slate-500">Account Number</p>
              <p className="font-semibold text-slate-800 font-mono">{invoice.bankInfo.accountNumber}</p>
            </div>
            {invoice.bankInfo.swiftCode && (
              <div>
                <p className="text-slate-500">SWIFT Code</p>
                <p className="font-semibold text-slate-800 font-mono">{invoice.bankInfo.swiftCode}</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Notes */}
      {invoice.notes && (
        <div className="px-6 py-5 border-b border-slate-200">
          <h3 className="text-sm font-bold text-slate-700 uppercase tracking-wide mb-2">
            📝 Notes
          </h3>
          <p className="text-slate-600 text-sm italic">{invoice.notes}</p>
        </div>
      )}

      {/* Signature */}
      {invoice.signature && (
        <div className="px-6 py-4 border-t border-slate-200 bg-green-50">
          <h3 className="text-sm font-bold text-green-700 uppercase tracking-wide mb-3">
            ✓ Customer Signature
          </h3>
          <img
            src={invoice.signature}
            alt="Customer Signature"
            className="h-16 border border-green-200 rounded bg-white"
          />
          <p className="text-xs text-green-600 mt-2">
            Signed and acknowledged
          </p>
        </div>
      )}

      {/* Footer */}
      <div className="px-6 py-4 bg-slate-50 border-t border-slate-200">
        <div className="grid grid-cols-2 gap-4 text-xs text-slate-500">
          <div>
            <p className="font-semibold text-slate-700">{company.name}</p>
            <p>{company.address}</p>
            <p>📞 {company.phone}</p>
            {company.email && <p>✉️ {company.email}</p>}
            {company.website && <p>🌐 {company.website}</p>}
          </div>
          <div className="text-right">
            <p className="mt-2 text-slate-400">
              Generated on {new Date().toLocaleDateString()}
            </p>
            <p className="mt-1">{company.footer}</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default InvoiceTemplate;