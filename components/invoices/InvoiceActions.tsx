/**
 * Invoice Actions Component
 * Provides unified action buttons for print and PDF functionality
 */

import React from 'react';
import { Printer, Download, Loader2 } from 'lucide-react';

interface InvoiceActionsProps {
  onPrint: () => void;
  onDownloadPDF: () => void;
  isGeneratingPDF?: boolean;
  disabled?: boolean;
}

const InvoiceActions: React.FC<InvoiceActionsProps> = ({
  onPrint,
  onDownloadPDF,
  isGeneratingPDF = false,
  disabled = false
}) => {
  return (
    <div className="flex gap-3">
      {/* Print Button */}
      <button
        onClick={onPrint}
        disabled={disabled || isGeneratingPDF}
        className="flex items-center gap-2 px-4 py-2 bg-slate-600 text-white rounded-lg font-semibold hover:bg-slate-700 transition-colors shadow-md disabled:opacity-50 disabled:cursor-not-allowed"
        title="Print invoice"
      >
        <Printer className="w-4 h-4" />
        <span>Print</span>
      </button>

      {/* Download PDF Button */}
      <button
        onClick={onDownloadPDF}
        disabled={disabled || isGeneratingPDF}
        className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 transition-colors shadow-md disabled:opacity-50 disabled:cursor-not-allowed"
        title="Download as PDF"
      >
        {isGeneratingPDF ? (
          <>
            <Loader2 className="w-4 h-4 animate-spin" />
            <span>Generating...</span>
          </>
        ) : (
          <>
            <Download className="w-4 h-4" />
            <span>Download PDF</span>
          </>
        )}
      </button>
    </div>
  );
};

export default InvoiceActions;