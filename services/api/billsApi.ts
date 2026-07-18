import { apiClient } from '../apiClient';
import { Bill } from '../../types';

export interface CreateBillPayload {
  vendor_name: string;
  invoice_ref?: string;
  category?: string;
  amount: number;
  issue_date?: string;
  due_date: string;
  notes?: string;
}

export type UpdateBillPayload = Partial<{
  vendor_name: string;
  invoice_ref: string;
  category: string;
  amount: number;
  issue_date: string;
  due_date: string;
  status: 'pending' | 'paid';
  payment_date: string;
  payment_method: string;
  notes: string;
}>;

export const billsApi = {
  list: () =>
    apiClient
      .get<{ success: boolean; data: Bill[] }>('/bills')
      .then((r) => r.data.data),

  create: (payload: CreateBillPayload) =>
    apiClient
      .post<{ success: boolean; data: Bill }>('/bills', payload)
      .then((r) => r.data.data),

  update: (id: string, patch: UpdateBillPayload) =>
    apiClient
      .patch<{ success: boolean; data: Bill }>(`/bills/${id}`, patch)
      .then((r) => r.data.data),

  remove: (id: string) =>
    apiClient
      .delete<{ success: boolean; data: { id: string } }>(`/bills/${id}`)
      .then((r) => r.data.data),
};
