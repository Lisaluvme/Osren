import { useDispatch, useSelector } from 'react-redux';
import type { RootState, AppDispatch } from '../store';
import {
  getDocuments,
  getDocument,
  createDocument,
  updateDocument,
  deleteDocument,
  setSelectedDocument,
  clearError,
  setFilters,
} from '../store/slices/documentSlice';
import type { Document } from '../store/slices/documentSlice';

export const useDocuments = () => {
  const dispatch = useDispatch<AppDispatch>();
  const documentsState = useSelector((state: RootState) => state.documents);

  const fetchDocuments = async (params?: {
    type?: string;
    status?: string;
    customer_id?: string;
    assigned_to_me?: boolean;
    created_by_me?: boolean;
    page?: number;
    limit?: number;
  }) => {
    return dispatch(getDocuments(params || {}));
  };

  const fetchDocument = async (documentId: string) => {
    return dispatch(getDocument(documentId));
  };

  const createNewDocument = async (documentData: {
    type: string;
    title: string;
    customer_id?: string;
    vendor_id?: string;
    assigned_to?: string;
    items?: any[];
    notes?: string;
    internal_notes?: string;
    data?: Record<string, any>;
  }) => {
    return dispatch(createDocument(documentData));
  };

  const updateExistingDocument = async (
    documentId: string,
    updates: Partial<Document>
  ) => {
    return dispatch(updateDocument({ documentId, updates }));
  };

  const deleteExistingDocument = async (documentId: string) => {
    return dispatch(deleteDocument(documentId));
  };

  const selectDocument = (document: Document | null) => {
    dispatch(setSelectedDocument(document));
  };

  const updateFilters = (filters: {
    type?: string;
    status?: string;
    customer_id?: string;
    assigned_to_me?: boolean;
    created_by_me?: boolean;
  }) => {
    dispatch(setFilters(filters));
  };

  const clearDocumentsError = () => {
    dispatch(clearError());
  };

  return {
    documents: documentsState.documents,
    selectedDocument: documentsState.selectedDocument,
    isLoading: documentsState.isLoading,
    error: documentsState.error,
    pagination: documentsState.pagination,
    filters: documentsState.filters,
    fetchDocuments,
    fetchDocument,
    createNewDocument,
    updateExistingDocument,
    deleteExistingDocument,
    selectDocument,
    updateFilters,
    clearError: clearDocumentsError,
  };
};
