/**
 * Invoice Analytics and Reporting Utilities
 * Provides comprehensive financial analysis, aging reports, and revenue forecasting
 */

import { Invoice } from '../types';
import { calculateAging, getAgingCategory, calculateMonthlyRevenue, calculateOutstandingRevenue, calculateAgingBreakdown } from './invoiceUtils';

/**
 * Invoice analytics data structure
 */
export interface InvoiceAnalytics {
  overview: {
    totalRevenue: number;
    totalPaid: number;
    totalOutstanding: number;
    totalOverdue: number;
    paymentRate: number;
    averageInvoiceValue: number;
  };
  aging: {
    current: { count: number; amount: number };
    overdue1to30: { count: number; amount: number };
    overdue31to60: { count: number; amount: number };
    overdue61to90: { count: number; amount: number };
    overdue90plus: { count: number; amount: number };
  };
  monthlyTrends: {
    month: string;
    revenue: number;
    invoicesPaid: number;
    invoicesOutstanding: number;
  }[];
  paymentTrends: {
    onTime: number;
    late: number;
    averageDaysToPay: number;
  };
  forecasts: {
    nextMonthRevenue: number;
    nextQuarterRevenue: number;
    outstandingCollection: number;
  };
}

/**
 * Calculate comprehensive invoice analytics
 */
export const calculateInvoiceAnalytics = (invoices: Invoice[]): InvoiceAnalytics => {
  const paidInvoices = invoices.filter(inv => inv.status === 'Paid');
  const overdueInvoices = invoices.filter(inv => inv.status === 'Overdue');
  const pendingInvoices = invoices.filter(inv => inv.status === 'Pending' || inv.status === 'Approved');

  // Overview calculations
  const totalRevenue = invoices.reduce((sum, inv) => sum + (inv.finalAmount || inv.amount), 0);
  const totalPaid = paidInvoices.reduce((sum, inv) => sum + (inv.finalAmount || inv.amount), 0);
  const totalOutstanding = pendingInvoices.reduce((sum, inv) => sum + (inv.finalAmount || inv.amount), 0);
  const totalOverdue = overdueInvoices.reduce((sum, inv) => sum + (inv.finalAmount || inv.amount), 0);

  const paymentRate = invoices.length > 0 ? (paidInvoices.length / invoices.length) * 100 : 0;
  const averageInvoiceValue = invoices.length > 0 ? totalRevenue / invoices.length : 0;

  // Aging breakdown
  const agingBreakdown = calculateAgingBreakdown(invoices);

  // Monthly trends (last 6 months)
  const monthlyTrends = generateMonthlyTrends(invoices, 6);

  // Payment trends
  const paymentTrends = calculatePaymentTrends(paidInvoices);

  // Revenue forecasting
  const forecasts = generateForecasts(invoices, paidInvoices, pendingInvoices);

  return {
    overview: {
      totalRevenue,
      totalPaid,
      totalOutstanding,
      totalOverdue,
      paymentRate,
      averageInvoiceValue
    },
    aging: {
      current: agingBreakdown['Current'] || { count: 0, amount: 0 },
      overdue1to30: agingBreakdown['1-30 Days'] || { count: 0, amount: 0 },
      overdue31to60: agingBreakdown['31-60 Days'] || { count: 0, amount: 0 },
      overdue61to90: agingBreakdown['61-90 Days'] || { count: 0, amount: 0 },
      overdue90plus: agingBreakdown['90+ Days'] || { count: 0, amount: 0 }
    },
    monthlyTrends,
    paymentTrends,
    forecasts
  };
};

/**
 * Generate monthly revenue trends
 */
const generateMonthlyTrends = (invoices: Invoice[], months: number) => {
  const trends = [];
  const today = new Date();

  for (let i = months - 1; i >= 0; i--) {
    const monthDate = new Date(today.getFullYear(), today.getMonth() - i, 1);
    const month = monthDate.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });

    const monthlyRevenue = calculateMonthlyRevenue(
      invoices,
      monthDate.getMonth(),
      monthDate.getFullYear()
    );

    const monthlyPaidInvoices = invoices.filter(inv => {
      if (!inv.paidDate) return false;
      const paidDate = new Date(inv.paidDate);
      return paidDate.getMonth() === monthDate.getMonth() &&
             paidDate.getFullYear() === monthDate.getFullYear();
    });

    const monthlyOutstanding = invoices.filter(inv => {
      if (inv.status === 'Paid' || inv.status === 'Cancelled' || inv.status === 'Draft') return false;
      const issueDate = new Date(inv.issueDate || inv.dueDate);
      return issueDate.getMonth() === monthDate.getMonth() &&
             issueDate.getFullYear() === monthDate.getFullYear();
    });

    trends.push({
      month,
      revenue: monthlyRevenue,
      invoicesPaid: monthlyPaidInvoices.length,
      invoicesOutstanding: monthlyOutstanding.length
    });
  }

  return trends;
};

/**
 * Calculate payment trends
 */
const calculatePaymentTrends = (paidInvoices: Invoice[]) => {
  let onTime = 0;
  let late = 0;
  let totalDaysToPay = 0;

  paidInvoices.forEach(inv => {
    if (inv.paidDate && inv.issueDate) {
      const paidDate = new Date(inv.paidDate);
      const issueDate = new Date(inv.issueDate);
      const dueDate = new Date(inv.dueDate);

      const daysToPay = Math.ceil((paidDate.getTime() - issueDate.getTime()) / (1000 * 60 * 60 * 24));
      totalDaysToPay += daysToPay;

      if (paidDate <= dueDate) {
        onTime++;
      } else {
        late++;
      }
    }
  });

  const averageDaysToPay = paidInvoices.length > 0 ? totalDaysToPay / paidInvoices.length : 0;

  return {
    onTime,
    late,
    averageDaysToPay
  };
};

/**
 * Generate revenue forecasts
 */
const generateForecasts = (allInvoices: Invoice[], paidInvoices: Invoice[], pendingInvoices: Invoice[]) => {
  // Calculate average monthly revenue from last 3 months
  const last3MonthsRevenue = [];
  const today = new Date();

  for (let i = 0; i < 3; i++) {
    const monthDate = new Date(today.getFullYear(), today.getMonth() - i, 1);
    const monthlyRevenue = calculateMonthlyRevenue(
      paidInvoices,
      monthDate.getMonth(),
      monthDate.getFullYear()
    );
    last3MonthsRevenue.push(monthlyRevenue);
  }

  const averageMonthlyRevenue = last3MonthsRevenue.length > 0
    ? last3MonthsRevenue.reduce((sum, rev) => sum + rev, 0) / last3MonthsRevenue.length
    : 0;

  // Outstanding collection potential
  const outstandingCollection = pendingInvoices.reduce((sum, inv) => {
    const daysOverdue = calculateAging(inv.dueDate, inv.status);
    const collectionProbability = getCollectionProbability(daysOverdue);
    return sum + ((inv.finalAmount || inv.amount) * collectionProbability);
  }, 0);

  return {
    nextMonthRevenue: averageMonthlyRevenue,
    nextQuarterRevenue: averageMonthlyRevenue * 3,
    outstandingCollection
  };
};

/**
 * Estimate collection probability based on days overdue
 */
const getCollectionProbability = (daysOverdue: number): number => {
  if (daysOverdue === 0) return 1.0; // 100% for current invoices
  if (daysOverdue <= 30) return 0.9;  // 90% for 1-30 days overdue
  if (daysOverdue <= 60) return 0.7;  // 70% for 31-60 days overdue
  if (daysOverdue <= 90) return 0.5;  // 50% for 61-90 days overdue
  return 0.3;                          // 30% for 90+ days overdue
};

/**
 * Generate aging report for accounts receivable
 */
export const generateAgingReport = (invoices: Invoice[]): {
  summary: {
    totalOutstanding: number;
    totalOverdue: number;
    overduePercentage: number;
  };
  categories: Array<{
    name: string;
    count: number;
    amount: number;
    percentage: number;
  }>;
  riskAssessment: {
    low: number;
    medium: number;
    high: number;
    critical: number;
  };
} => {
  const outstandingInvoices = invoices.filter(inv =>
    inv.status === 'Pending' || inv.status === 'Approved' || inv.status === 'Overdue'
  );

  const totalOutstanding = outstandingInvoices.reduce((sum, inv) => sum + (inv.finalAmount || inv.amount), 0);
  const overdueInvoices = outstandingInvoices.filter(inv => calculateAging(inv.dueDate, inv.status) > 0);
  const totalOverdue = overdueInvoices.reduce((sum, inv) => sum + (inv.finalAmount || inv.amount), 0);

  const overduePercentage = totalOutstanding > 0 ? (totalOverdue / totalOutstanding) * 100 : 0;

  const agingBreakdown = calculateAgingBreakdown(invoices);

  const categories = [
    {
      name: 'Current',
      count: agingBreakdown['Current']?.count || 0,
      amount: agingBreakdown['Current']?.amount || 0,
      percentage: totalOutstanding > 0 ? ((agingBreakdown['Current']?.amount || 0) / totalOutstanding) * 100 : 0
    },
    {
      name: '1-30 Days',
      count: agingBreakdown['1-30 Days']?.count || 0,
      amount: agingBreakdown['1-30 Days']?.amount || 0,
      percentage: totalOutstanding > 0 ? ((agingBreakdown['1-30 Days']?.amount || 0) / totalOutstanding) * 100 : 0
    },
    {
      name: '31-60 Days',
      count: agingBreakdown['31-60 Days']?.count || 0,
      amount: agingBreakdown['31-60 Days']?.amount || 0,
      percentage: totalOutstanding > 0 ? ((agingBreakdown['31-60 Days']?.amount || 0) / totalOutstanding) * 100 : 0
    },
    {
      name: '61-90 Days',
      count: agingBreakdown['61-90 Days']?.count || 0,
      amount: agingBreakdown['61-90 Days']?.amount || 0,
      percentage: totalOutstanding > 0 ? ((agingBreakdown['61-90 Days']?.amount || 0) / totalOutstanding) * 100 : 0
    },
    {
      name: '90+ Days',
      count: agingBreakdown['90+ Days']?.count || 0,
      amount: agingBreakdown['90+ Days']?.amount || 0,
      percentage: totalOutstanding > 0 ? ((agingBreakdown['90+ Days']?.amount || 0) / totalOutstanding) * 100 : 0
    }
  ];

  // Risk assessment
  const riskAssessment = {
    low: agingBreakdown['Current']?.amount || 0,
    medium: (agingBreakdown['1-30 Days']?.amount || 0) + (agingBreakdown['31-60 Days']?.amount || 0),
    high: agingBreakdown['61-90 Days']?.amount || 0,
    critical: agingBreakdown['90+ Days']?.amount || 0
  };

  return {
    summary: {
      totalOutstanding,
      totalOverdue,
      overduePercentage
    },
    categories,
    riskAssessment
  };
};

/**
 * Generate payment performance report
 */
export const generatePaymentPerformanceReport = (invoices: Invoice[]): {
  totalInvoices: number;
  paidInvoices: number;
  paymentRate: number;
  averagePaymentTime: number;
  onTimePayments: number;
  latePayments: number;
  onTimePaymentRate: number;
} => {
  const paidInvoices = invoices.filter(inv => inv.status === 'Paid');
  const totalInvoices = invoices.length;
  const paymentRate = totalInvoices > 0 ? (paidInvoices.length / totalInvoices) * 100 : 0;

  let totalPaymentDays = 0;
  let onTimePayments = 0;
  let latePayments = 0;

  paidInvoices.forEach(inv => {
    if (inv.paidDate && inv.issueDate) {
      const paidDate = new Date(inv.paidDate);
      const issueDate = new Date(inv.issueDate);
      const daysToPay = Math.ceil((paidDate.getTime() - issueDate.getTime()) / (1000 * 60 * 60 * 24));
      totalPaymentDays += daysToPay;

      const dueDate = new Date(inv.dueDate);
      if (paidDate <= dueDate) {
        onTimePayments++;
      } else {
        latePayments++;
      }
    }
  });

  const averagePaymentTime = paidInvoices.length > 0 ? totalPaymentDays / paidInvoices.length : 0;
  const onTimePaymentRate = paidInvoices.length > 0 ? (onTimePayments / paidInvoices.length) * 100 : 0;

  return {
    totalInvoices,
    paidInvoices: paidInvoices.length,
    paymentRate,
    averagePaymentTime,
    onTimePayments,
    latePayments,
    onTimePaymentRate
  };
};

/**
 * Export analytics data for Excel/CSV
 */
export const exportAnalyticsData = (analytics: InvoiceAnalytics): string => {
  const rows = [
    ['Invoice Analytics Report'],
    ['Generated on', new Date().toLocaleDateString()],
    [],
    ['Overview'],
    ['Total Revenue', analytics.overview.totalRevenue.toFixed(2)],
    ['Total Paid', analytics.overview.totalPaid.toFixed(2)],
    ['Total Outstanding', analytics.overview.totalOutstanding.toFixed(2)],
    ['Total Overdue', analytics.overview.totalOverdue.toFixed(2)],
    ['Payment Rate (%)', analytics.overview.paymentRate.toFixed(2)],
    ['Average Invoice Value', analytics.overview.averageInvoiceValue.toFixed(2)],
    [],
    ['Aging Report'],
    ['Category', 'Count', 'Amount'],
    ['Current', analytics.aging.current.count, analytics.aging.current.amount.toFixed(2)],
    ['1-30 Days', analytics.aging.overdue1to30.count, analytics.aging.overdue1to30.amount.toFixed(2)],
    ['31-60 Days', analytics.aging.overdue31to60.count, analytics.aging.overdue31to60.amount.toFixed(2)],
    ['61-90 Days', analytics.aging.overdue61to90.count, analytics.aging.overdue61to90.amount.toFixed(2)],
    ['90+ Days', analytics.aging.overdue90plus.count, analytics.aging.overdue90plus.amount.toFixed(2)],
    [],
    ['Forecasts'],
    ['Next Month Revenue', analytics.forecasts.nextMonthRevenue.toFixed(2)],
    ['Next Quarter Revenue', analytics.forecasts.nextQuarterRevenue.toFixed(2)],
    ['Outstanding Collection', analytics.forecasts.outstandingCollection.toFixed(2)]
  ];

  return rows.map(row => row.join(',')).join('\n');
};