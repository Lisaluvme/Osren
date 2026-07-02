/**
 * Invoice Automation Utilities
 * Handles automatic invoice number generation, payment tracking, reminders, and status updates
 */

import { Invoice } from '../types';
import { calculateAging, isOverdue, getAgingCategory } from './invoiceUtils';

/**
 * Auto-increment invoice number
 */
export const generateNextInvoiceNumber = (lastInvoiceNumber?: string): string => {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');

  let sequenceNumber = 1;

  if (lastInvoiceNumber) {
    // Extract sequence number from last invoice number (INV-2024-06-001)
    const match = lastInvoiceNumber.match(/INV-\d{4}-\d{2}-(\d+)/);
    if (match) {
      sequenceNumber = parseInt(match[1]) + 1;
    }
  }

  const paddedSequence = String(sequenceNumber).padStart(3, '0');
  return `INV-${year}-${month}-${paddedSequence}`;
};

/**
 * Batch generate invoice numbers for multiple invoices
 */
export const batchGenerateInvoiceNumbers = (invoices: Invoice[]): Invoice[] => {
  let lastNumber: string | undefined;

  return invoices.map(invoice => {
    if (!invoice.invoiceNumber) {
      invoice.invoiceNumber = generateNextInvoiceNumber(lastNumber);
      lastNumber = invoice.invoiceNumber;
    }
    return invoice;
  });
};

/**
 * Auto-update invoice status based on due date and payment
 */
export const autoUpdateInvoiceStatus = (invoice: Invoice): Invoice => {
  const updatedInvoice = { ...invoice };

  if (invoice.status === 'Paid' || invoice.status === 'Cancelled' || invoice.status === 'Draft') {
    return updatedInvoice;
  }

  // Check if invoice is overdue
  if (isOverdue(invoice.dueDate, invoice.status)) {
    if (updatedInvoice.status !== 'Overdue') {
      updatedInvoice.status = 'Overdue';
    }
    updatedInvoice.aging = calculateAging(invoice.dueDate, updatedInvoice.status);
  }

  return updatedInvoice;
};

/**
 * Batch update invoice statuses
 */
export const batchUpdateInvoiceStatuses = (invoices: Invoice[]): Invoice[] => {
  return invoices.map(invoice => autoUpdateInvoiceStatus(invoice));
};

/**
 * Check if payment reminder should be sent
 */
export const shouldSendReminder = (invoice: Invoice): boolean => {
  if (invoice.status === 'Paid' || invoice.status === 'Cancelled' || invoice.status === 'Draft') {
    return false;
  }

  const today = new Date();
  const dueDate = new Date(invoice.dueDate);

  // Don't send reminders before due date
  if (today < dueDate) {
    return false;
  }

  const daysOverdue = calculateAging(invoice.dueDate, invoice.status);

  // Send reminders at specific intervals
  const reminderSchedule = [3, 7, 14, 30, 45]; // Days overdue
  const maxReminders = 5;

  // Check if we should send a reminder based on days overdue
  if (reminderSchedule.includes(daysOverdue)) {
    const reminderCount = invoice.reminderCount || 0;
    return reminderCount < maxReminders;
  }

  return false;
};

/**
 * Generate payment reminder message
 */
export const generateReminderMessage = (invoice: Invoice): { subject: string; body: string } => {
  const daysOverdue = invoice.aging || 0;
  const urgencyLevel = getUrgencyLevel(daysOverdue);

  const subject = `Payment Reminder: Invoice ${invoice.invoiceNumber || invoice.id} ${urgencyLevel.emoji}`;

  const body = `
Dear ${invoice.clientName},

${urgencyLevel.message}

Invoice Details:
- Invoice Number: ${invoice.invoiceNumber || invoice.id}
- Issue Date: ${invoice.issueDate}
- Due Date: ${invoice.dueDate}
- Amount Due: ${invoice.finalAmount || invoice.amount}
- Days Overdue: ${daysOverdue} days

Please ensure payment is made as soon as possible to avoid any service interruptions.

${urgencyLevel.closing}

Best regards,
Accounts Receivable Team
`;

  return { subject, body };
};

/**
 * Get urgency level based on days overdue
 */
const getUrgencyLevel = (daysOverdue: number): { emoji: string; message: string; closing: string } => {
  if (daysOverdue <= 7) {
    return {
      emoji: '⏰',
      message: 'This is a friendly reminder that your invoice is now overdue.',
      closing: 'Thank you for your prompt attention to this matter.'
    };
  } else if (daysOverdue <= 30) {
    return {
      emoji: '⚠️',
      message: 'Your invoice is significantly overdue. Please arrange payment immediately.',
      closing: 'Please contact us if you are experiencing any issues with payment.'
    };
  } else if (daysOverdue <= 60) {
    return {
      emoji: '🚨',
      message: 'URGENT: Your invoice is severely overdue. Immediate payment is required.',
      closing: 'Failure to pay may result in service suspension or additional fees.'
    };
  } else {
    return {
      emoji: '🔴',
      message: 'CRITICAL: Your invoice is extremely overdue. This is your final notice before further action.',
      closing: 'Please contact us immediately to resolve this matter.'
    };
  }
};

/**
 * Process invoices for payment reminders
 */
export const processPaymentReminders = (invoices: Invoice[]): Invoice[] => {
  return invoices.map(invoice => {
    if (shouldSendReminder(invoice)) {
      const reminderCount = (invoice.reminderCount || 0) + 1;
      return {
        ...invoice,
        reminderSent: true,
        reminderCount
      };
    }
    return invoice;
  });
};

/**
 * Auto-calculate payment due date based on issue date and terms
 */
export const autoCalculateDueDate = (issueDate: string, paymentTerms: string): string => {
  const issue = new Date(issueDate);
  let dueDate = new Date(issue);

  // Parse payment terms
  const netMatch = paymentTerms.match(/net\s*(\d+)/i);
  if (netMatch) {
    const days = parseInt(netMatch[1]);
    dueDate.setDate(dueDate.getDate() + days);
  } else if (paymentTerms.toLowerCase().includes('end of month')) {
    // Set to last day of the month
    dueDate = new Date(issue.getFullYear(), issue.getMonth() + 1, 0);
  } else if (paymentTerms.toLowerCase().includes('receipt')) {
    // Due immediately
    dueDate = issue;
  } else {
    // Default to 30 days
    dueDate.setDate(dueDate.getDate() + 30);
  }

  return dueDate.toISOString().split('T')[0];
};

/**
 * Batch process invoice automation
 */
export const batchProcessInvoices = (invoices: Invoice[]): {
  processedInvoices: Invoice[];
  remindersSent: number;
  statusesUpdated: number;
} => {
  let remindersSent = 0;
  let statusesUpdated = 0;

  const processedInvoices = invoices.map(invoice => {
    let updatedInvoice = { ...invoice };

    // Update status if needed
    const previousStatus = updatedInvoice.status;
    updatedInvoice = autoUpdateInvoiceStatus(updatedInvoice);
    if (previousStatus !== updatedInvoice.status) {
      statusesUpdated++;
    }

    // Check for reminders
    if (shouldSendReminder(updatedInvoice)) {
      remindersSent++;
      const reminderCount = (updatedInvoice.reminderCount || 0) + 1;
      updatedInvoice = {
        ...updatedInvoice,
        reminderSent: true,
        reminderCount
      };
    }

    return updatedInvoice;
  });

  return {
    processedInvoices,
    remindersSent,
    statusesUpdated
  };
};

/**
 * Generate automation summary report
 */
export const generateAutomationReport = (invoices: Invoice[]): {
  totalInvoices: number;
  pendingInvoices: number;
  overdueInvoices: number;
  paidInvoices: number;
  remindersToSend: number;
  totalOutstanding: number;
  averageOverdueDays: number;
} => {
  const pendingInvoices = invoices.filter(inv => inv.status === 'Pending' || inv.status === 'Approved');
  const overdueInvoices = invoices.filter(inv => inv.status === 'Overdue');
  const paidInvoices = invoices.filter(inv => inv.status === 'Paid');

  const remindersToSend = invoices.filter(shouldSendReminder).length;
  const totalOutstanding = pendingInvoices.reduce((sum, inv) => sum + (inv.finalAmount || inv.amount), 0);

  const overdueDays = overdueInvoices.map(inv => inv.aging || 0);
  const averageOverdueDays = overdueDays.length > 0
    ? overdueDays.reduce((sum, days) => sum + days, 0) / overdueDays.length
    : 0;

  return {
    totalInvoices: invoices.length,
    pendingInvoices: pendingInvoices.length,
    overdueInvoices: overdueInvoices.length,
    paidInvoices: paidInvoices.length,
    remindersToSend,
    totalOutstanding,
    averageOverdueDays
  };
};

/**
 * Check invoice completeness before sending
 */
export const validateInvoice = (invoice: Invoice): { isValid: boolean; errors: string[] } => {
  const errors: string[] = [];

  if (!invoice.clientName) errors.push('Client name is required');
  if (!invoice.amount || invoice.amount <= 0) errors.push('Amount must be greater than 0');
  if (!invoice.dueDate) errors.push('Due date is required');
  if (!invoice.items || invoice.items.length === 0) errors.push('At least one item is required');
  if (!invoice.companyInfo?.name) errors.push('Company information is required');
  if (!invoice.bankInfo?.accountNumber) errors.push('Bank information is required');

  return {
    isValid: errors.length === 0,
    errors
  };
};