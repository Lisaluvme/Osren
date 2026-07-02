import { Invoice } from '../types';
import { generateInvoiceNumber } from '../constants/invoiceTemplate';
import jsPDF from 'jspdf';

interface CompanyInfo {
  name: string;
  address: string;
  phone: string;
  email: string;
  website?: string;
  registrationNumber?: string;
  taxId?: string;
  footer: string;
}

interface ReceiptOptions {
  paymentDate: string;
  paymentMethod: string;
  transactionId?: string;
  companyInfo?: CompanyInfo;
}

/**
 * Generate receipt number
 */
export const generateReceiptNumber = (invoiceId: string, date?: Date): string => {
  const receiptDate = date || new Date();
  const year = receiptDate.getFullYear();
  const month = String(receiptDate.getMonth() + 1).padStart(2, '0');
  const uniqueId = invoiceId.slice(-6).toUpperCase();
  return `RCT-${year}-${month}-${uniqueId}`;
};

/**
 * Generate professional receipt PDF
 */
export const generateReceiptPDF = async (
  invoice: Invoice,
  options: ReceiptOptions
): Promise<void> => {
  try {
    const doc = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4'
    });

    const company = options.companyInfo || {
      name: 'GMP mobile sales app',
      address: '123 Business Street, City, Country',
      phone: '+60 12-345-6789',
      email: 'info@company.com',
      website: 'www.company.com',
      registrationNumber: '123456789-A',
      taxId: 'GST-123456789',
      footer: 'Thank you for your business!'
    };

    const receiptNumber = generateReceiptNumber(invoice.id, new Date(options.paymentDate));
    const totalAmount = invoice.finalAmount || invoice.amount;

    let yPos = 20;

    // Header
    doc.setFontSize(24);
    doc.setTextColor(30, 64, 175); // Blue
    doc.text(company.name, 105, yPos, { align: 'center' });

    yPos += 8;
    doc.setFontSize(10);
    doc.setTextColor(100, 116, 139); // Gray
    doc.text(company.address, 105, yPos, { align: 'center' });

    yPos += 6;
    doc.text(`${company.phone} | ${company.email}`, 105, yPos, { align: 'center' });

    if (company.website) {
      yPos += 5;
      doc.setTextColor(37, 99, 235); // Blue
      doc.text(company.website, 105, yPos, { align: 'center' });
    }

    yPos += 12;

    // Receipt Title
    doc.setFillColor(24, 120, 88); // Green background
    doc.rect(20, yPos, 170, 12, 'F');

    doc.setFontSize(22);
    doc.setTextColor(255, 255, 255);
    doc.text('PAYMENT RECEIPT', 105, yPos + 8, { align: 'center' });

    yPos += 18;
    doc.setFontSize(9);
    doc.setTextColor(100, 116, 139);
    doc.text('Official Payment Acknowledgment', 105, yPos, { align: 'center' });

    yPos += 12;

    // Receipt Information Box
    doc.setFillColor(249, 250, 251); // Light gray background
    doc.roundedRect(20, yPos, 170, 30, 3, 3, 'F');

    yPos += 8;
    doc.setFontSize(8);
    doc.setTextColor(107, 114, 128); // Light gray

    // Left column
    doc.text('RECEIPT NUMBER', 25, yPos);
    doc.setFontSize(12);
    doc.setTextColor(30, 64, 175);
    doc.setFont(undefined, 'bold');
    doc.text(receiptNumber, 25, yPos + 6);

    // Right column
    doc.setFontSize(8);
    doc.setTextColor(107, 114, 128);
    doc.setFont(undefined, 'normal');
    doc.text('PAYMENT DATE', 110, yPos);
    doc.setFontSize(11);
    doc.setTextColor(55, 65, 81);
    doc.setFont(undefined, 'bold');
    doc.text(options.paymentDate, 110, yPos + 6);

    // Second row
    yPos += 14;
    doc.setFontSize(8);
    doc.setTextColor(107, 114, 128);
    doc.setFont(undefined, 'normal');
    doc.text('INVOICE REFERENCE', 25, yPos);
    doc.setFontSize(11);
    doc.setTextColor(55, 65, 81);
    doc.setFont(undefined, 'bold');
    doc.text(`#${invoice.id}`, 25, yPos + 6);

    doc.setFontSize(8);
    doc.setTextColor(107, 114, 128);
    doc.setFont(undefined, 'normal');
    doc.text('PAYMENT METHOD', 110, yPos);
    doc.setFontSize(11);
    doc.setTextColor(55, 65, 81);
    doc.setFont(undefined, 'bold');
    doc.text(options.paymentMethod, 110, yPos + 6);

    if (options.transactionId) {
      yPos += 14;
      doc.setFontSize(8);
      doc.setTextColor(107, 114, 128);
      doc.setFont(undefined, 'normal');
      doc.text('TRANSACTION ID', 25, yPos);
      doc.setFontSize(9);
      doc.setTextColor(71, 85, 105);
      doc.setFont(undefined, 'normal');
      doc.text(options.transactionId, 25, yPos + 6);
    }

    yPos += 18;

    // Bill To Section
    doc.setFontSize(14);
    doc.setTextColor(30, 64, 175);
    doc.setFont(undefined, 'bold');
    doc.text('Bill To', 20, yPos);

    yPos += 8;
    doc.setFillColor(249, 250, 251);
    doc.roundedRect(20, yPos, 170, 20, 3, 3, 'F');

    yPos += 8;
    doc.setFontSize(12);
    doc.setTextColor(30, 41, 59);
    doc.setFont(undefined, 'bold');
    doc.text(invoice.clientName, 25, yPos);

    if (invoice.deliveryAddress) {
      yPos += 6;
      doc.setFontSize(9);
      doc.setTextColor(100, 116, 139);
      doc.setFont(undefined, 'normal');
      doc.text(invoice.deliveryAddress, 25, yPos);
    }

    if (invoice.contactNumber) {
      yPos += 5;
      doc.setFontSize(9);
      doc.text(`📞 ${invoice.contactNumber}`, 25, yPos);
    }

    yPos += 18;

    // Payment Details Table
    doc.setFontSize(14);
    doc.setTextColor(30, 64, 175);
    doc.setFont(undefined, 'bold');
    doc.text('Payment Details', 20, yPos);

    yPos += 8;

    // Table header
    doc.setFillColor(239, 246, 255); // Light blue
    doc.rect(20, yPos, 170, 8, 'F');

    doc.setFontSize(10);
    doc.setTextColor(55, 65, 81);
    doc.setFont(undefined, 'bold');
    doc.text('Description', 25, yPos + 5);
    doc.text('Amount', 175, yPos + 5, { align: 'right' });

    yPos += 8;

    // Table content
    doc.setFillColor(255, 255, 255);
    doc.rect(20, yPos, 170, 8, 'F');

    doc.setFontSize(10);
    doc.setTextColor(71, 85, 105);
    doc.setFont(undefined, 'normal');
    doc.text(`Payment for Invoice #${invoice.id}`, 25, yPos + 5);
    doc.text(`RM ${totalAmount.toFixed(2)}`, 175, yPos + 5, { align: 'right' });

    yPos += 8;

    // Total
    doc.setFillColor(240, 253, 244); // Light green
    doc.rect(20, yPos, 170, 10, 'F');

    doc.setFontSize(14);
    doc.setTextColor(20, 83, 45);
    doc.setFont(undefined, 'bold');
    doc.text('TOTAL PAID', 25, yPos + 7);
    doc.text(`RM ${totalAmount.toFixed(2)}`, 175, yPos + 7, { align: 'right' });

    yPos += 18;

    // Payment Confirmation Box - Enhanced Design
    doc.setFillColor(236, 253, 245); // Emerald light
    doc.roundedRect(20, yPos, 170, 30, 5, 5, 'F');

    // Draw a decorative border
    doc.setDrawColor(16, 185, 129); // Emerald border
    doc.setLineWidth(0.5);
    doc.roundedRect(20, yPos, 170, 30, 5, 5, 'D');

    // Add checkmark circle
    const circleX = 105;
    const circleY = yPos + 10;
    const circleRadius = 6;

    doc.setFillColor(16, 185, 129); // Emerald green
    doc.circle(circleX, circleY, circleRadius, 'F');

    // Draw checkmark
    doc.setLineWidth(1.5);
    doc.setDrawColor(255, 255, 255); // White checkmark
    doc.line(circleX - 2.5, circleY - 0.5, circleX - 0.5, circleY + 2);
    doc.line(circleX - 0.5, circleY + 2, circleX + 3, circleY - 2.5);

    // Add title
    yPos += 10;
    doc.setFontSize(16);
    doc.setTextColor(6, 95, 70); // Dark emerald
    doc.setFont(undefined, 'bold');
    doc.text('PAYMENT RECEIVED', 105, yPos, { align: 'center' });

    yPos += 7;
    doc.setFontSize(10);
    doc.setTextColor(5, 150, 105); // Medium emerald
    doc.setFont(undefined, 'normal');
    doc.text('Thank you for your payment!', 105, yPos, { align: 'center' });

    yPos += 5;
    doc.setFontSize(9);
    doc.setTextColor(20, 184, 166); // Teal
    doc.text(`This receipt confirms payment of RM ${totalAmount.toFixed(2)}`, 105, yPos, { align: 'center' });

    yPos += 25;

    // Footer
    doc.setDrawColor(209, 213, 219); // Gray line
    doc.line(20, yPos, 190, yPos);

    yPos += 8;
    doc.setFontSize(10);
    doc.setTextColor(100, 116, 139);
    doc.setFont(undefined, 'bold');
    doc.text(company.name, 105, yPos, { align: 'center' });

    yPos += 5;
    doc.setFont(undefined, 'normal');
    doc.text(company.footer, 105, yPos, { align: 'center' });

    if (company.registrationNumber) {
      yPos += 4;
      doc.setFontSize(8);
      doc.text(`Registration No: ${company.registrationNumber}`, 105, yPos, { align: 'center' });
    }

    if (company.taxId) {
      yPos += 4;
      doc.text(`Tax ID: ${company.taxId}`, 105, yPos, { align: 'center' });
    }

    yPos += 8;
    doc.setFontSize(7);
    doc.setTextColor(156, 163, 175);
    doc.text('This receipt serves as official confirmation of payment received.', 105, yPos, { align: 'center' });

    yPos += 4;
    doc.text(`For inquiries: ${company.phone} | ${company.email}`, 105, yPos, { align: 'center' });

    // Save PDF
    doc.save(`Receipt-${receiptNumber}.pdf`);
    console.log('✅ Receipt PDF generated successfully');
  } catch (error) {
    console.error('❌ Error generating receipt PDF:', error);
    throw error;
  }
};

/**
 * Generate receipt using html2pdf (alternative method)
 */
export const generateReceiptPDFAlternative = async (
  invoice: Invoice,
  options: ReceiptOptions
): Promise<void> => {
  try {
    const html2pdf = (await import('html2pdf.js')).default;
    const ReceiptTemplate = (await import('../components/ReceiptTemplate')).default;

    const receiptNumber = generateReceiptNumber(invoice.id, new Date(options.paymentDate));

    // Create a temporary div to render the receipt
    const tempDiv = document.createElement('div');
    tempDiv.style.position = 'absolute';
    tempDiv.style.left = '-9999px';
    document.body.appendChild(tempDiv);

    // Render the receipt template
    const { createElement } = await import('react');
    const { render } = await import('react-dom/client');
    const root = render(createElement(ReceiptTemplate, {
      invoice,
      receiptNumber,
      paymentDate: options.paymentDate,
      paymentMethod: options.paymentMethod,
      transactionId: options.transactionId
    }), tempDiv);

    // Wait for render to complete
    await new Promise(resolve => setTimeout(resolve, 100));

    const pdfOptions = {
      margin: [10, 10, 10, 10],
      filename: `Receipt-${receiptNumber}.pdf`,
      image: { type: 'jpeg', quality: 0.98 },
      html2canvas: { scale: 2, useCORS: true },
      jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
    };

    await html2pdf().set(pdfOptions).from(tempDiv).save();

    // Clean up
    document.body.removeChild(tempDiv);
    console.log('✅ Receipt PDF generated successfully');
  } catch (error) {
    console.error('❌ Error generating receipt PDF:', error);
    throw error;
  }
};