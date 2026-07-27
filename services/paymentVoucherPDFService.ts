import jsPDF from 'jspdf';
import { PaymentVoucher } from '../types';
import { DEFAULT_COMPANY_INFO } from '../constants/invoiceTemplate';

interface CompanyInfo {
  name: string;
  logo?: string;
  address: string;
  contactNumber?: string;
  email?: string;
  website?: string;
  taxId?: string;
}

export const generatePaymentVoucherPDF = async (
  voucher: PaymentVoucher,
  companyInfo?: CompanyInfo
): Promise<void> => {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });

  // Use provided company info or default
  const company = companyInfo || DEFAULT_COMPANY_INFO;

  // Colors
  const primaryColor = '#1e40af'; // blue-800
  const accentColor = '#3b82f6'; // blue-500

  let yPosition = 20;

  // Header
  doc.setFillColor(...hexToRgb(primaryColor));
  doc.rect(0, 0, 210, 40, 'F');

  // Company name
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(24);
  doc.setFont('helvetica', 'bold');
  doc.text(company.name, 15, 20);

  // Document title
  doc.setFontSize(12);
  doc.setFont('helvetica', 'normal');
  doc.text('PAYMENT VOUCHER', 15, 32);

  // Voucher number
  doc.setFontSize(10);
  doc.text(`Voucher No: ${voucher.voucherNumber}`, 150, 20);

  // Company address in header
  doc.setFontSize(8);
  doc.text(company.address, 15, 45);
  if (company.contactNumber) {
    doc.text(`Tel: ${company.contactNumber}`, 15, 50);
  }
  if (company.email) {
    doc.text(`Email: ${company.email}`, 15, 55);
  }

  yPosition = 65;

  // Payment details box
  doc.setDrawColor(...hexToRgb('#cbd5e1')); // slate-300
  doc.setFillColor(...hexToRgb('#f8fafc')); // slate-50
  doc.roundedRect(15, yPosition, 180, 30, 3, 3, 'FD');

  doc.setTextColor(0, 0, 0);
  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.text('Payment Details', 20, yPosition + 8);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);

  // Payment details grid
  const details = [
    ['Voucher Number:', voucher.voucherNumber],
    ['Date:', new Date(voucher.date).toLocaleDateString()],
    ['Payment Method:', formatPaymentMethod(voucher.paymentMethod)],
    ['Amount:', `$${voucher.amountPaid?.toFixed(2) || '0.00'}`],
  ];

  let detailY = yPosition + 15;
  let detailX = 20;
  details.forEach(([label, value]) => {
    doc.setFont('helvetica', 'bold');
    doc.text(label, detailX, detailY);
    doc.setFont('helvetica', 'normal');
    doc.text(value, detailX + 35, detailY);

    if (detailX === 20) {
      detailX = 110;
    } else {
      detailX = 20;
      detailY += 6;
    }
  });

  yPosition += 40;

  // Supplier details
  doc.setDrawColor(...hexToRgb('#cbd5e1'));
  doc.setFillColor(...hexToRgb('#f8fafc'));
  doc.roundedRect(15, yPosition, 180, 25, 3, 3, 'FD');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.text('Supplier Details', 20, yPosition + 8);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.text(`Supplier: ${voucher.supplier}`, 20, yPosition + 15);

  if (voucher.invoiceNumber) {
    doc.text(`Invoice No: ${voucher.invoiceNumber}`, 20, yPosition + 20);
  }

  if (voucher.invoiceAmount) {
    doc.text(`Invoice Amount: $${voucher.invoiceAmount.toFixed(2)}`, 20, yPosition + 25);
  }

  if (voucher.outstandingAmount !== undefined) {
    const remainingX = 110;
    doc.text(`Outstanding: $${voucher.outstandingAmount.toFixed(2)}`, remainingX, yPosition + 20);
  }

  yPosition += 35;

  // Bank details
  if (voucher.paymentMethod === 'BANK_TRANSFER') {
    doc.setDrawColor(...hexToRgb('#cbd5e1'));
    doc.setFillColor(...hexToRgb('#f8fafc'));
    doc.roundedRect(15, yPosition, 180, 20, 3, 3, 'FD');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.text('Bank Details', 20, yPosition + 8);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.text('Bank: Company Bank Account', 20, yPosition + 13);
    doc.text('Account No: XXXXXX1234', 20, yPosition + 18);
    doc.text('Sort Code: 12-34-56', 110, yPosition + 13);
    doc.text('SWIFT: ABCD1234', 110, yPosition + 18);

    yPosition += 25;
  }

  // Remarks
  if (voucher.remarks) {
    doc.setDrawColor(...hexToRgb('#cbd5e1'));
    doc.setFillColor(...hexToRgb('#f8fafc'));
    doc.roundedRect(15, yPosition, 180, 20, 3, 3, 'FD');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.text('Remarks', 20, yPosition + 8);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    const remarks = voucher.remarks;
    const splitRemarks = doc.splitTextToSize(remarks, 170);
    doc.text(splitRemarks, 20, yPosition + 13);

    yPosition += 25;
  }

  // Terms and conditions
  const terms = [
    '1. This payment voucher confirms payment made to the supplier.',
    '2. Please quote the voucher number for any queries.',
    '3. Payment is made according to the terms agreed with the supplier.',
    '4. This document serves as proof of payment.'
  ];

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.text('Terms & Conditions:', 15, yPosition);

  doc.setFont('helvetica', 'normal');
  let termY = yPosition + 5;
  terms.forEach(term => {
    doc.text(term, 15, termY);
    termY += 4;
  });

  // Signature section
  const signatureY = 260;
  doc.line(15, signatureY, 65, signatureY);
  doc.line(145, signatureY, 195, signatureY);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.text('Prepared By:', 15, signatureY + 5);
  doc.text('Approved By:', 145, signatureY + 5);

  doc.text('Date: ____________', 15, signatureY + 12);
  doc.text('Date: ____________', 145, signatureY + 12);

  // Footer
  doc.setFillColor(...hexToRgb(primaryColor));
  doc.rect(0, 280, 210, 17, 'F');

  doc.setTextColor(255, 255, 255);
  doc.setFontSize(8);
  doc.text('This document is computer-generated and valid without signature', 105, 288, { align: 'center' });
  doc.text(`Generated on ${new Date().toLocaleString()}`, 105, 293, { align: 'center' });

  // Save the PDF
  doc.save(`Payment-Voucher-${voucher.voucherNumber}.pdf`);
};

// Helper function to convert hex color to RGB
function hexToRgb(hex: string): [number, number, number] {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result ? [
    parseInt(result[1], 16),
    parseInt(result[2], 16),
    parseInt(result[3], 16)
  ] : [0, 0, 0];
}

// Helper function to format payment method
function formatPaymentMethod(method: string): string {
  const methodMap: { [key: string]: string } = {
    'BANK_TRANSFER': 'Bank Transfer',
    'CASH': 'Cash',
    'CHEQUE': 'Cheque',
    'OTHER': 'Other'
  };
  return methodMap[method] || method;
}