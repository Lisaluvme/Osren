/**
 * Invoice Print View Component
 * Print-optimized view using browser's native print functionality
 */

import React, { useEffect } from 'react';
import { EnhancedInvoice } from '../../services/invoicePDFService';
import { CompanyInfo } from '../../constants/invoiceTemplate';
import InvoiceTemplate from './InvoiceTemplate';

interface InvoicePrintViewProps {
  invoice: EnhancedInvoice;
  companyInfo?: CompanyInfo;
}

const InvoicePrintView: React.FC<InvoicePrintViewProps> = ({ invoice, companyInfo }) => {
  useEffect(() => {
    // Trigger print dialog when component mounts
    const timer = setTimeout(() => {
      window.print();
    }, 500);

    return () => clearTimeout(timer);
  }, []);

  return (
    <div className="print-container">
      <style>{`
        @media print {
          body {
            margin: 0;
            padding: 0;
            font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
          }

          .print-container {
            width: 210mm;
            min-height: 297mm;
            margin: 0 auto;
            padding: 10mm;
            box-sizing: border-box;
          }

          .no-print {
            display: none !important;
          }

          @page {
            size: A4 portrait;
            margin: 10mm;
          }

          /* Ensure page breaks happen correctly */
          .invoice-page {
            page-break-after: always;
          }

          /* Hide any background elements that shouldn't print */
          body > div:not(.print-container) {
            display: none;
          }

          /* Remove shadows and backgrounds for cleaner printing */
          * {
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }

          /* Optimize text rendering */
          body {
            -webkit-font-smoothing: antialiased;
            text-rendering: optimizeLegibility;
          }
        }
      `}</style>

      <div className="invoice-page">
        <InvoiceTemplate
          invoice={invoice}
          companyInfo={companyInfo}
          showPrintButtons={false}
        />
      </div>
    </div>
  );
};

export default InvoicePrintView;