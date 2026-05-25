import { useDispatch, useSelector } from 'react-redux';
import type { RootState, AppDispatch } from '../store';
import {
  getAuditLogs,
  getEntityAuditLogs,
  clearError,
} from '../store/slices/auditSlice';
import type { AuditLog } from '../store/slices/auditSlice';

export const useAudit = () => {
  const dispatch = useDispatch<AppDispatch>();
  const auditState = useSelector((state: RootState) => state.audit);

  const fetchAuditLogs = async (params?: {
    entity_type?: string;
    entity_id?: string;
    action?: string;
    user_id?: string;
    start_date?: string;
    end_date?: string;
    limit?: number;
    offset?: number;
  }) => {
    return dispatch(getAuditLogs(params || {}));
  };

  const fetchEntityLogs = async (params: {
    type: string;
    id: string;
    limit?: number;
    offset?: number;
  }) => {
    return dispatch(getEntityAuditLogs(params));
  };

  const clearAuditError = () => {
    dispatch(clearError());
  };

  const exportAuditLogs = async (params?: {
    entity_type?: string;
    entity_id?: string;
    action?: string;
    user_id?: string;
    start_date?: string;
    end_date?: string;
  }) => {
    const query = new URLSearchParams();
    if (params?.entity_type) query.append('entity_type', params.entity_type);
    if (params?.entity_id) query.append('entity_id', params.entity_id);
    if (params?.action) query.append('action', params.action);
    if (params?.user_id) query.append('user_id', params.user_id);
    if (params?.start_date) query.append('start_date', params.start_date);
    if (params?.end_date) query.append('end_date', params.end_date);

    const response = await fetch(`/api/audit/export?${query}`, {
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${localStorage.getItem('accessToken')}`,
      },
    });

    if (!response.ok) {
      throw new Error('Failed to export audit logs');
    }

    const blob = await response.blob();
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `audit-logs-${Date.now()}.csv`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    window.URL.revokeObjectURL(url);
  };

  return {
    logs: auditState.logs,
    isLoading: auditState.isLoading,
    error: auditState.error,
    pagination: auditState.pagination,
    fetchAuditLogs,
    fetchEntityLogs,
    exportAuditLogs,
    clearError: clearAuditError,
  };
};
