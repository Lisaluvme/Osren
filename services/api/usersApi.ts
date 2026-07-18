import { apiClient } from '../apiClient';

export interface ManagedUser {
  id: string;
  email: string;
  full_name: string;
  firebase_uid: string | null;
  is_active: boolean;
  status: 'pending' | 'active' | 'deactivated' | 'rejected';
  last_login: string | null;
  role: { id: number; name: string; display_name: string } | null;
}

export interface CreateUserPayload {
  email: string;
  password: string;
  full_name: string;
  role_name: string;
}

export type UpdateUserPayload = Partial<{
  full_name: string;
  role_name: string;
  is_active: boolean;
}>;

export const usersApi = {
  list: () =>
    apiClient
      .get<{ success: boolean; data: ManagedUser[] }>('/users')
      .then((r) => r.data.data),

  create: (payload: CreateUserPayload) =>
    apiClient
      .post<{ success: boolean; data: ManagedUser }>('/users', payload)
      .then((r) => r.data.data),

  update: (id: string, patch: UpdateUserPayload) =>
    apiClient
      .patch<{ success: boolean; data: ManagedUser }>(`/users/${id}`, patch)
      .then((r) => r.data.data),

  deactivate: (id: string) =>
    apiClient
      .delete<{ success: boolean; data: ManagedUser }>(`/users/${id}`)
      .then((r) => r.data.data),

  // Self-registration (public) — caller must already hold a Firebase session,
  // which the apiClient interceptor attaches automatically.
  register: (payload: { full_name: string; requested_role: string }) =>
    apiClient
      .post<{ success: boolean; data: ManagedUser }>('/auth/signup', payload)
      .then((r) => r.data.data),

  // Approvals (admin)
  pending: () =>
    apiClient
      .get<{ success: boolean; data: ManagedUser[] }>('/users/pending')
      .then((r) => r.data.data),

  approve: (id: string, role_name: string) =>
    apiClient
      .patch<{ success: boolean; data: ManagedUser }>(`/users/${id}/approve`, { role_name })
      .then((r) => r.data.data),

  reject: (id: string) =>
    apiClient
      .patch<{ success: boolean; data: ManagedUser }>(`/users/${id}/reject`)
      .then((r) => r.data.data),
};
