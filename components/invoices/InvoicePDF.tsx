/**
 * Invoice PDF Component
 * Handles PDF generation using jsPDF library
 */

import React, { useState } from 'react';
import { EnhancedInvoice, generateInvoicePDF } from '../../services/invoicePDFService';
import { CompanyInfo } from '../../constants/invoiceTemplate';

interface InvoicePDFProps {
  invoice: EnhancedInvoice;
  companyInfo?: CompanyInfo;
  onGenerated?: () => void;
  onError?: (error: Error) => void;
}

const InvoicePDF: React.FC<InvoicePDFProps> = ({
  invoice,
  companyInfo,
  onGenerated,
  onError
}) => {
  const [isGenerating, setIsGenerating] = useState(false);

  const handleGeneratePDF = async () => {
    try {
      setIsGenerating(true);
      await generateInvoicePDF(invoice, companyInfo);
      onGenerated?.();
    } catch (error) {
      console.error('Error generating PDF:', error);
      onError?.(error as Error);
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="invoice-pdf-generator">
      <button
        onClick={handleGeneratePDF}
        disabled={isGenerating}
        className="px-4 py-2 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 transition-colors shadow-md disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {isGenerating ? '⏳ Generating PDF...' : '📥 Download PDF'}
      </button>
    </div>
  );
};

export default InvoicePDF;