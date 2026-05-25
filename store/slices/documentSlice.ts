import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import { DocumentStatus } from '../../lib/workflow';

export interface DocumentItem {
  id: string;
  document_id: string;
  product_id: string | null;
  description: string;
  quantity: number;
  unit_price: number;
  discount_percentage: number;
  tax_percentage: number;
  line_total: number;
  product?: any;
}

export interface Document {
  id: string;
  type: string;
  status: string;
  document_number: string;
  title: string;
  customer_id: string | null;
  vendor_id: string | null;
  created_by: string;
  assigned_to: string | null;
  data: Record<string, any>;
  total_amount: number;
  currency: string;
  notes: string | null;
  internal_notes: string | null;
  approved_at: string | null;
  approved_by: string | null;
  completed_at: string | null;
  signature_data: string | null;
  customer_acknowledged_at: string | null;
  customer_acknowledgement_data: Record<string, any> | null;
  created_at: string;
  updated_at: string;
  creator?: {
    id: string;
    full_name: string;
    email: string;
  };
  assignee?: {
    id: string;
    full_name: string;
    email: string;
  };
  approver?: {
    id: string;
    full_name: string;
    email: string;
  };
  customer?: any;
  vendor?: any;
  items?: DocumentItem[];
}

interface DocumentState {
  documents: Document[];
  selectedDocument: Document | null;
  isLoading: boolean;
  error: string | null;
  pagination: {
    page: number;
    limit: number;
    total: number;
    pages: number;
  };
  filters: {
    type?: string;
    status?: string;
    customer_id?: string;
    assigned_to_me?: boolean;
    created_by_me?: boolean;
  };
}

const initialState: DocumentState = {
  documents: [],
  selectedDocument: null,
  isLoading: false,
  error: null,
  pagination: {
    page: 1,
    limit: 50,
    total: 0,
    pages: 0,
  },
  filters: {},
};

// Async thunks
export const getDocuments = createAsyncThunk(
  'documents/getDocuments',
  async (filters: {
    type?: string;
    status?: string;
    customer_id?: string;
    assigned_to_me?: boolean;
    created_by_me?: boolean;
    page?: number;
    limit?: number;
  }) => {
    const params = new URLSearchParams();
    if (filters.type) params.append('type', filters.type);
    if (filters.status) params.append('status', filters.status);
    if (filters.customer_id) params.append('customer_id', filters.customer_id);
    if (filters.assigned_to_me) params.append('assigned_to_me', 'true');
    if (filters.created_by_me) params.append('created_by_me', 'true');
    params.append('page', String(filters.page || 1));
    params.append('limit', String(filters.limit || 50));

    const response = await fetch(`/api/documents?${params}`, {
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${localStorage.getItem('accessToken')}`,
      },
    });

    if (!response.ok) {
      throw new Error('Failed to get documents');
    }

    const data = await response.json();
    return data.data;
  }
);

export const getDocument = createAsyncThunk(
  'documents/getDocument',
  async (documentId: string) => {
    const response = await fetch(`/api/documents/${documentId}`, {
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${localStorage.getItem('accessToken')}`,
      },
    });

    if (!response.ok) {
      throw new Error('Failed to get document');
    }

    const data = await response.json();
    return data.data;
  }
);

export const createDocument = createAsyncThunk(
  'documents/createDocument',
  async (documentData: {
    type: string;
    title: string;
    customer_id?: string;
    vendor_id?: string;
    assigned_to?: string;
    items?: Partial<DocumentItem>[];
    notes?: string;
    internal_notes?: string;
    data?: Record<string, any>;
  }) => {
    const response = await fetch('/api/documents', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${localStorage.getItem('accessToken')}`,
      },
      body: JSON.stringify(documentData),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to create document');
    }

    const data = await response.json();
    return data.data;
  }
);

export const updateDocument = createAsyncThunk(
  'documents/updateDocument',
  async ({
    documentId,
    updates,
  }: {
    documentId: string;
    updates: Partial<Document>;
  }) => {
    const response = await fetch(`/api/documents/${documentId}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${localStorage.getItem('accessToken')}`,
      },
      body: JSON.stringify(updates),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to update document');
    }

    const data = await response.json();
    return data.data;
  }
);

export const deleteDocument = createAsyncThunk(
  'documents/deleteDocument',
  async (documentId: string) => {
    const response = await fetch(`/api/documents/${documentId}`, {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${localStorage.getItem('accessToken')}`,
      },
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to delete document');
    }

    return documentId;
  }
);

const documentSlice = createSlice({
  name: 'documents',
  initialState,
  reducers: {
    setSelectedDocument: (state, action: PayloadAction<Document | null>) => {
      state.selectedDocument = action.payload;
    },
    clearError: (state) => {
      state.error = null;
    },
    setFilters: (state, action: PayloadAction<Partial<DocumentState['filters']>>) => {
      state.filters = { ...state.filters, ...action.payload };
    },
  },
  extraReducers: (builder) => {
    builder
      // Get documents
      .addCase(getDocuments.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(getDocuments.fulfilled, (state, action) => {
        state.isLoading = false;
        state.documents = action.payload.documents;
        state.pagination = action.payload.pagination;
      })
      .addCase(getDocuments.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.error.message || 'Failed to get documents';
      })
      // Get document
      .addCase(getDocument.fulfilled, (state, action) => {
        state.selectedDocument = action.payload;
      })
      // Create document
      .addCase(createDocument.fulfilled, (state, action) => {
        state.documents.unshift(action.payload);
        state.selectedDocument = action.payload;
      })
      .addCase(createDocument.rejected, (state, action) => {
        state.error = action.error.message || 'Failed to create document';
      })
      // Update document
      .addCase(updateDocument.fulfilled, (state, action) => {
        const index = state.documents.findIndex((d) => d.id === action.payload.id);
        if (index !== -1) {
          state.documents[index] = action.payload;
        }
        if (state.selectedDocument?.id === action.payload.id) {
          state.selectedDocument = action.payload;
        }
      })
      .addCase(updateDocument.rejected, (state, action) => {
        state.error = action.error.message || 'Failed to update document';
      })
      // Delete document
      .addCase(deleteDocument.fulfilled, (state, action) => {
        state.documents = state.documents.filter((d) => d.id !== action.payload);
        if (state.selectedDocument?.id === action.payload) {
          state.selectedDocument = null;
        }
      })
      .addCase(deleteDocument.rejected, (state, action) => {
        state.error = action.error.message || 'Failed to delete document';
      });
  },
});

export const { setSelectedDocument, clearError, setFilters } = documentSlice.actions;
export default documentSlice.reducer;
