import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';

export interface AuditLog {
  id: string;
  entity_type: string;
  entity_id: string;
  action: string;
  performed_by: string;
  performed_at: string;
  old_values: Record<string, any> | null;
  new_values: Record<string, any> | null;
  ip_address: string | null;
  user_agent: string | null;
  metadata: Record<string, any>;
  performedByUser?: {
    id: string;
    full_name: string;
    email: string;
    role?: {
      name: string;
      display_name: string;
    };
  };
}

interface AuditState {
  logs: AuditLog[];
  isLoading: boolean;
  error: string | null;
  pagination: {
    limit: number;
    offset: number;
    total: number;
  };
}

const initialState: AuditState = {
  logs: [],
  isLoading: false,
  error: null,
  pagination: {
    limit: 100,
    offset: 0,
    total: 0,
  },
};

// Async thunks
export const getAuditLogs = createAsyncThunk(
  'audit/getAuditLogs',
  async (params: {
    entity_type?: string;
    entity_id?: string;
    action?: string;
    user_id?: string;
    start_date?: string;
    end_date?: string;
    limit?: number;
    offset?: number;
  }) => {
    const query = new URLSearchParams();
    if (params.entity_type) query.append('entity_type', params.entity_type);
    if (params.entity_id) query.append('entity_id', params.entity_id);
    if (params.action) query.append('action', params.action);
    if (params.user_id) query.append('user_id', params.user_id);
    if (params.start_date) query.append('start_date', params.start_date);
    if (params.end_date) query.append('end_date', params.end_date);
    query.append('limit', String(params.limit || 100));
    query.append('offset', String(params.offset || 0));

    const response = await fetch(`/api/audit?${query}`, {
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${localStorage.getItem('accessToken')}`,
      },
    });

    if (!response.ok) {
      throw new Error('Failed to get audit logs');
    }

    const data = await response.json();
    return data.data;
  }
);

export const getEntityAuditLogs = createAsyncThunk(
  'audit/getEntityAuditLogs',
  async (params: {
    type: string;
    id: string;
    limit?: number;
    offset?: number;
  }) => {
    const query = new URLSearchParams();
    query.append('limit', String(params.limit || 100));
    query.append('offset', String(params.offset || 0));

    const response = await fetch(`/api/audit/entity/${params.type}/${params.id}?${query}`, {
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${localStorage.getItem('accessToken')}`,
      },
    });

    if (!response.ok) {
      throw new Error('Failed to get entity audit logs');
    }

    const data = await response.json();
    return data.data;
  }
);

const auditSlice = createSlice({
  name: 'audit',
  initialState,
  reducers: {
    clearError: (state) => {
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    builder
      // Get audit logs
      .addCase(getAuditLogs.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(getAuditLogs.fulfilled, (state, action) => {
        state.isLoading = false;
        state.logs = action.payload.logs;
        state.pagination = action.payload.pagination;
      })
      .addCase(getAuditLogs.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.error.message || 'Failed to get audit logs';
      })
      // Get entity audit logs
      .addCase(getEntityAuditLogs.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(getEntityAuditLogs.fulfilled, (state, action) => {
        state.isLoading = false;
        state.logs = action.payload.logs;
        state.pagination = action.payload.pagination;
      })
      .addCase(getEntityAuditLogs.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.error.message || 'Failed to get entity audit logs';
      });
  },
});

export const { clearError } = auditSlice.actions;
export default auditSlice.reducer;
