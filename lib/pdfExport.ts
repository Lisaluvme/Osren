/**
 * PDF Export Utility for Invoices
 * Uses html2pdf.js for client-side PDF generation
 */

export interface PDFOptions {
  margin?: number;
  filename?: string;
  image?: { type: 'jpeg' | 'png'; quality: number };
  html2canvas?: { scale: number; useCORS: boolean };
  jsPDF?: { unit: 'pt' | 'mm' | 'cm' | 'in'; format: string; orientation: 'portrait' | 'landscape' };
}

/**
 * Generate professional PDF invoice
 */
export const generateInvoicePDF = async (elementId: string, invoiceNumber: string): Promise<void> => {
  try {
    // Dynamically import html2pdf to avoid build issues
    const html2pdf = (await import('html2pdf.js')).default;

    const element = document.getElementById(elementId);
    if (!element) {
      throw new Error(`Element with id "${elementId}" not found`);
    }

    const opt: PDFOptions = {
      margin: [10, 10, 10, 10],
      filename: `Invoice-${invoiceNumber}.pdf`,
      image: { type: 'jpeg', quality: 0.98 },
      html2canvas: { scale: 2, useCORS: true },
      jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
    };

    await html2pdf().set(opt).from(element).save();
    console.log('✅ PDF generated successfully');
  } catch (error) {
    console.error('❌ Error generating PDF:', error);
    throw error;
  }
};

/**
 * Generate multiple PDFs (batch processing)
 */
export const generateMultiplePDFs = async (
  elements: Array<{ id: string; filename: string }>
): Promise<void> => {
  try {
    const html2pdf = (await import('html2pdf.js')).default;

    for (const { id, filename } of elements) {
      const element = document.getElementById(id);
      if (element) {
        const opt: PDFOptions = {
          margin: [10, 10, 10, 10],
          filename: filename,
          image: { type: 'jpeg', quality: 0.98 },
          html2canvas: { scale: 2, useCORS: true },
          jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
        };

        await html2pdf().set(opt).from(element).save();
        console.log(`✅ Generated ${filename}`);
      }
    }
  } catch (error) {
    console.error('❌ Error generating PDFs:', error);
    throw error;
  }
};

/**
 * Print invoice directly (opens print dialog)
 */
export const printInvoice = (elementId: string): void => {
  const element = document.getElementById(elementId);
  if (!element) {
    console.error(`Element with id "${elementId}" not found`);
    return;
  }

  // Create a new window for printing
  const printWindow = window.open('', '_blank');
  if (!printWindow) {
    console.error('Failed to open print window');
    return;
  }

  // Copy the invoice content to the new window
  printWindow.document.write(`
    <!DOCTYPE html>
    <html>
    <head>
      <title>Print Invoice</title>
      <style>
        body {
          font-family: 'Inter', sans-serif;
          margin: 0;
          padding: 20px;
        }
        @media print {
          body {
            padding: 0;
          }
          .no-print {
            display: none !important;
          }
        }
      </style>
      <script src="https://cdn.tailwindcss.com"></script>
    </head>
    <body>
      ${element.innerHTML}
      <script>
        window.onload = function() {
          window.print();
          window.onafterprint = function() {
            window.close();
          };
        };
      </script>
    </body>
    </html>
  `);
  printWindow.document.close();
};

/**
 * Download invoice as image (PNG)
 */
export const downloadInvoiceImage = async (elementId: string, filename: string): Promise<void> => {
  try {
    const html2canvas = (await import('html2canvas')).default;

    const element = document.getElementById(elementId);
    if (!element) {
      throw new Error(`Element with id "${elementId}" not found`);
    }

    const canvas = await html2canvas(element, {
      scale: 2,
      useCORS: true,
      logging: false
    });

    canvas.toBlob((blob) => {
      if (blob) {
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `${filename}.png`;
        link.click();
        URL.revokeObjectURL(url);
        console.log('✅ Image downloaded successfully');
      }
    });
  } catch (error) {
    console.error('❌ Error downloading image:', error);
    throw error;
  }
};

/**
 * Email invoice (opens email client with attachment)
 */
export const emailInvoice = (
  to: string,
  subject: string,
  body: string,
  attachmentPath?: string
): void => {
  const mailtoLink = `mailto:${to}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
  window.location.href = mailtoLink;
};

/**
 * Generate invoice email template
 */
export const generateInvoiceEmail = (
  invoice: any,
  companyInfo: any
): { subject: string; body: string } => {
  const subject = `Invoice ${invoice.invoiceNumber || invoice.id} from ${companyInfo.name}`;

  const body = `
Dear ${invoice.clientName},

Please find attached your invoice ${invoice.invoiceNumber || invoice.id} for the amount of ${invoice.finalAmount || invoice.amount}.

Invoice Details:
- Invoice Number: ${invoice.invoiceNumber || invoice.id}
- Issue Date: ${invoice.issueDate}
- Due Date: ${invoice.dueDate}
- Amount: ${invoice.finalAmount || invoice.amount}

Payment Information:
- Bank: ${invoice.bankInfo?.bankName || 'Contact us for details'}
- Account Name: ${invoice.bankInfo?.accountName || 'Contact us for details'}
- Account Number: ${invoice.bankInfo?.accountNumber || 'Contact us for details'}

Please ensure payment is made by the due date to avoid any late payment fees.

If you have any questions or concerns, please don't hesitate to contact us.

Best regards,
${companyInfo.name}
${companyInfo.contactNumber || ''}
${companyInfo.email || ''}

---
This is an automated email. Please do not reply directly to this message.
`;

  return { subject, body };
};