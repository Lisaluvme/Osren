import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import { DocumentStatus } from '../../lib/workflow';

export interface WorkflowTransition {
  id: string;
  document_id: string;
  from_status: string;
  to_status: string;
  transitioned_by: string;
  comments: string | null;
  transitioned_at: string;
  metadata: Record<string, any>;
  transitionedBy?: {
    id: string;
    full_name: string;
    email: string;
    role?: {
      name: string;
      display_name: string;
    };
  };
}

interface WorkflowState {
  availableTransitions: WorkflowTransition[];
  workflowHistory: WorkflowTransition[];
  isTransitioning: boolean;
  transitionError: string | null;
}

const initialState: WorkflowState = {
  availableTransitions: [],
  workflowHistory: [],
  isTransitioning: false,
  transitionError: null,
};

// Async thunks
export const transitionDocument = createAsyncThunk(
  'workflow/transitionDocument',
  async ({
    documentId,
    toStatus,
    comments,
  }: {
    documentId: string;
    toStatus: DocumentStatus;
    comments?: string;
  }) => {
    const response = await fetch(`/api/documents/${documentId}/transition`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${localStorage.getItem('accessToken')}`,
      },
      body: JSON.stringify({ to_status: toStatus, comments }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Transition failed');
    }

    const data = await response.json();
    return data.data;
  }
);

export const getDocumentWorkflow = createAsyncThunk(
  'workflow/getDocumentWorkflow',
  async (documentId: string) => {
    const response = await fetch(`/api/documents/${documentId}/workflow`, {
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${localStorage.getItem('accessToken')}`,
      },
    });

    if (!response.ok) {
      throw new Error('Failed to get workflow history');
    }

    const data = await response.json();
    return data.data;
  }
);

export const submitCustomerAcknowledgement = createAsyncThunk(
  'workflow/submitCustomerAcknowledgement',
  async ({
    documentId,
    acknowledged,
    signature,
    customerName,
    email,
    comments,
  }: {
    documentId: string;
    acknowledged: boolean;
    signature?: string;
    customerName: string;
    email?: string;
    comments?: string;
  }) => {
    const response = await fetch(`/api/documents/${documentId}/acknowledge`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${localStorage.getItem('accessToken')}`,
      },
      body: JSON.stringify({
        acknowledged,
        signature,
        customerName,
        email,
        comments,
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Acknowledgement failed');
    }

    const data = await response.json();
    return data.data;
  }
);

const workflowSlice = createSlice({
  name: 'workflow',
  initialState,
  reducers: {
    clearTransitionError: (state) => {
      state.transitionError = null;
    },
    setAvailableTransitions: (state, action: PayloadAction<WorkflowTransition[]>) => {
      state.availableTransitions = action.payload;
    },
  },
  extraReducers: (builder) => {
    builder
      // Transition document
      .addCase(transitionDocument.pending, (state) => {
        state.isTransitioning = true;
        state.transitionError = null;
      })
      .addCase(transitionDocument.fulfilled, (state) => {
        state.isTransitioning = false;
      })
      .addCase(transitionDocument.rejected, (state, action) => {
        state.isTransitioning = false;
        state.transitionError = action.error.message || 'Transition failed';
      })
      // Get document workflow
      .addCase(getDocumentWorkflow.fulfilled, (state, action) => {
        state.workflowHistory = action.payload;
      })
      // Customer acknowledgement
      .addCase(submitCustomerAcknowledgement.pending, (state) => {
        state.isTransitioning = true;
        state.transitionError = null;
      })
      .addCase(submitCustomerAcknowledgement.fulfilled, (state) => {
        state.isTransitioning = false;
      })
      .addCase(submitCustomerAcknowledgement.rejected, (state, action) => {
        state.isTransitioning = false;
        state.transitionError = action.error.message || 'Acknowledgement failed';
      });
  },
});

export const { clearTransitionError, setAvailableTransitions } = workflowSlice.actions;
export default workflowSlice.reducer;
