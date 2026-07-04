import jsPDF from 'jspdf';

interface DeliveryOrderItem {
  name: string;
  qty: number;
  price: number;
}

interface DeliveryOrderData {
  id: string;
  clientName: string;
  items: DeliveryOrderItem[];
  total: number;
  date: string;
  deliveryAddress?: string;
  contactNumber?: string;
  notes?: string;
}

interface CompanyInfo {
  name: string;
  address: string;
  phone: string;
  email: string;
  website?: string;
  registrationNumber?: string;
  footer: string;
}

/**
 * Generate Delivery Order number
 */
export const generateDONumber = (orderId: string, date?: Date): string => {
  const doDate = date || new Date();
  const year = doDate.getFullYear();
  const month = String(doDate.getMonth() + 1).padStart(2, '0');
  const day = String(doDate.getDate()).padStart(2, '0');
  const uniqueId = orderId.slice(-6).toUpperCase();
  return `DO-${year}-${month}-${day}-${uniqueId}`;
};

/**
 * Generate professional Delivery Order PDF
 */
export const generateDeliveryOrderPDF = async (
  order: DeliveryOrderData,
  companyInfo?: CompanyInfo
): Promise<void> => {
  try {
    const doc = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4'
    });

    const company = companyInfo || {
      name: 'GMP mobile sales app',
      address: '123 Business Street, City, Country',
      phone: '+60 12-345-6789',
      email: 'info@company.com',
      website: 'www.company.com',
      registrationNumber: '123456789-A',
      footer: 'Thank you for your business!'
    };

    const doNumber = generateDONumber(order.id, new Date(order.date));
    const totalAmount = order.total || 0;

    let yPos = 20;

    // Header Section
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

    // DO Title
    doc.setFillColor(37, 99, 235); // Blue background
    doc.rect(20, yPos, 170, 12, 'F');

    doc.setFontSize(22);
    doc.setTextColor(255, 255, 255);
    doc.text('DELIVERY ORDER', 105, yPos + 8, { align: 'center' });

    yPos += 18;
    doc.setFontSize(9);
    doc.setTextColor(100, 116, 139);
    doc.text('Official Delivery Document', 105, yPos, { align: 'center' });

    yPos += 12;

    // DO Information Box
    doc.setFillColor(249, 250, 251); // Light gray background
    doc.roundedRect(20, yPos, 170, 35, 3, 3, 'F');

    yPos += 8;
    doc.setFontSize(8);
    doc.setTextColor(107, 114, 128); // Light gray

    // Left column - DO Number
    doc.text('DELIVERY ORDER NUMBER', 25, yPos);
    doc.setFontSize(12);
    doc.setTextColor(30, 64, 175);
    doc.setFont(undefined, 'bold');
    doc.text(doNumber, 25, yPos + 6);

    // Right column - Date
    doc.setFontSize(8);
    doc.setTextColor(107, 114, 128);
    doc.setFont(undefined, 'normal');
    doc.text('DELIVERY DATE', 110, yPos);
    doc.setFontSize(11);
    doc.setTextColor(55, 65, 81);
    doc.setFont(undefined, 'bold');

    const deliveryDate = new Date(order.date).toLocaleDateString('en-MY', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
    doc.text(deliveryDate, 110, yPos + 6);

    // Second row - Order Reference
    yPos += 14;
    doc.setFontSize(8);
    doc.setTextColor(107, 114, 128);
    doc.setFont(undefined, 'normal');
    doc.text('ORDER REFERENCE', 25, yPos);
    doc.setFontSize(11);
    doc.setTextColor(55, 65, 81);
    doc.setFont(undefined, 'bold');
    doc.text(`#${order.id}`, 25, yPos + 6);

    // Third row - Status
    yPos += 14;
    doc.setFontSize(8);
    doc.setTextColor(107, 114, 128);
    doc.setFont(undefined, 'normal');
    doc.text('STATUS', 25, yPos);
    doc.setFontSize(11);
    doc.setTextColor(20, 83, 45);
    doc.setFont(undefined, 'bold');
    doc.text('READY FOR DELIVERY', 25, yPos + 6);

    yPos += 18;

    // Delivery Information Section
    doc.setFontSize(14);
    doc.setTextColor(30, 64, 175);
    doc.setFont(undefined, 'bold');
    doc.text('Delivery Information', 20, yPos);

    yPos += 8;
    doc.setFillColor(249, 250, 251);
    doc.roundedRect(20, yPos, 170, 25, 3, 3, 'F');

    yPos += 8;
    doc.setFontSize(12);
    doc.setTextColor(30, 41, 59);
    doc.setFont(undefined, 'bold');
    doc.text(order.clientName, 25, yPos);

    if (order.deliveryAddress) {
      yPos += 6;
      doc.setFontSize(9);
      doc.setTextColor(100, 116, 139);
      doc.setFont(undefined, 'normal');
      doc.text('📍 ' + order.deliveryAddress, 25, yPos);
    }

    if (order.contactNumber) {
      yPos += 5;
      doc.setFontSize(9);
      doc.text('📞 ' + order.contactNumber, 25, yPos);
    }

    yPos += 18;

    // Items Table
    doc.setFontSize(14);
    doc.setTextColor(30, 64, 175);
    doc.setFont(undefined, 'bold');
    doc.text('Delivery Items', 20, yPos);

    yPos += 8;

    // Table header
    doc.setFillColor(239, 246, 255); // Light blue
    doc.rect(20, yPos, 170, 8, 'F');

    doc.setFontSize(10);
    doc.setTextColor(55, 65, 81);
    doc.setFont(undefined, 'bold');
    doc.text('Item', 25, yPos + 5);
    doc.text('Quantity', 100, yPos + 5);
    doc.text('Unit Price', 130, yPos + 5);
    doc.text('Amount', 175, yPos + 5, { align: 'right' });

    yPos += 8;

    // Table content
    doc.setFillColor(255, 255, 255);
    doc.setTextColor(71, 85, 105);
    doc.setFont(undefined, 'normal');

    order.items.forEach((item, index) => {
      // Alternate row colors
      if (index % 2 === 0) {
        doc.setFillColor(249, 250, 251);
        doc.rect(20, yPos, 170, 8, 'F');
      }

      doc.setFontSize(9);
      doc.text(item.name, 25, yPos + 5);
      doc.text(`${item.qty}`, 100, yPos + 5);
      doc.text(`RM ${item.price.toFixed(2)}`, 130, yPos + 5);
      doc.text(`RM ${(item.price * item.qty).toFixed(2)}`, 175, yPos + 5, { align: 'right' });

      yPos += 8;
    });

    // Total
    doc.setFillColor(240, 253, 244); // Light green
    doc.rect(20, yPos, 170, 10, 'F');

    doc.setFontSize(14);
    doc.setTextColor(20, 83, 45);
    doc.setFont(undefined, 'bold');
    doc.text('TOTAL', 25, yPos + 7);
    doc.text(`RM ${totalAmount.toFixed(2)}`, 175, yPos + 7, { align: 'right' });

    yPos += 18;

    // Delivery Instructions Box
    if (order.notes) {
      doc.setFontSize(14);
      doc.setTextColor(30, 64, 175);
      doc.setFont(undefined, 'bold');
      text('Delivery Instructions', 20, yPos);

      yPos += 8;
      doc.setFillColor(254, 252, 232); // Light yellow
      doc.roundedRect(20, yPos, 170, 20, 3, 3, 'F');

      yPos += 8;
      doc.setFontSize(9);
      doc.setTextColor(107, 114, 128);
      doc.setFont(undefined, 'normal');

      // Split long text into multiple lines
      const splitNotes = doc.splitTextToSize(order.notes, 160);
      doc.text(splitNotes, 25, yPos);

      const noteHeight = splitNotes.length * 5;
      yPos += noteHeight + 10;
    } else {
      // Signature placeholder section
      yPos += 10;
      doc.setFillColor(236, 253, 245); // Light green
      doc.roundedRect(20, yPos, 170, 30, 3, 3, 'F');

      yPos += 10;
      doc.setFontSize(12);
      doc.setTextColor(6, 95, 70);
      doc.setFont(undefined, 'bold');
      doc.text('Delivery Confirmation Required', 105, yPos, { align: 'center' });

      yPos += 7;
      doc.setFontSize(9);
      doc.setTextColor(5, 150, 105);
      doc.setFont(undefined, 'normal');
      doc.text('Receiver signature required upon delivery', 105, yPos, { align: 'center' });

      yPos += 5;
      doc.setFontSize(8);
      doc.setTextColor(20, 184, 166);
      doc.text('Please verify all items and sign to confirm receipt', 105, yPos, { align: 'center' });

      yPos += 15;
    }

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

    yPos += 8;
    doc.setFontSize(7);
    doc.setTextColor(156, 163, 175);
    doc.text('This document serves as official confirmation of goods delivery.', 105, yPos, { align: 'center' });

    yPos += 4;
    doc.text(`For inquiries: ${company.phone} | ${company.email}`, 105, yPos, { align: 'center' });

    // Save PDF
    doc.save(`${doNumber}.pdf`);
    console.log('✅ Delivery Order PDF generated successfully:', doNumber);
  } catch (error) {
    console.error('❌ Error generating Delivery Order PDF:', error);
    throw error;
  }
};