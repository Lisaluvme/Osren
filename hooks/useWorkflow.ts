import { useDispatch, useSelector } from 'react-redux';
import type { RootState, AppDispatch } from '../store';
import { workflowEngine, DocumentStatus, DocumentType } from '../lib/workflow';
import {
  transitionDocument,
  getDocumentWorkflow,
  submitCustomerAcknowledgement,
  clearTransitionError,
  setAvailableTransitions,
} from '../store/slices/workflowSlice';
import { useAuth } from './useAuth';
import { usePermissions } from './usePermissions';
import type { Document } from '../store/slices/documentSlice';

interface UseWorkflowOptions {
  documentId: string;
  documentType: string;
  initialStatus: string;
}

export const useWorkflow = ({ documentId, documentType, initialStatus }: UseWorkflowOptions) => {
  const dispatch = useDispatch<AppDispatch>();
  const { user } = useAuth();
  const { hasPermission } = usePermissions();

  const { availableTransitions, workflowHistory, isTransitioning, transitionError } = useSelector(
    (state: RootState) => state.workflow
  );

  const getValidTransitions = () => {
    const docType = DocumentType[documentType.toUpperCase() as keyof typeof DocumentType] || (documentType as DocumentType);
    return workflowEngine.getValidTransitions(docType, initialStatus as DocumentStatus);
  };

  const canTransition = (newStatus: DocumentStatus): boolean => {
    const docType = DocumentType[documentType.toUpperCase() as keyof typeof DocumentType] || (documentType as DocumentType);
    return workflowEngine.canTransition(docType, initialStatus as DocumentStatus, newStatus);
  };

  const transitionTo = async (newStatus: DocumentStatus, comments?: string) => {
    try {
      const result = await dispatch(transitionDocument({
        documentId,
        toStatus: newStatus,
        comments,
      }));

      if (transitionDocument.fulfilled.match(result)) {
        // Update local available transitions after successful transition
        const newTransitions = getValidTransitions().filter(t => t.to === newStatus);
        dispatch(setAvailableTransitions(newTransitions));
      }

      return result;
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : 'Transition failed' };
    }
  };

  const approve = async (comments?: string) => {
    return transitionTo(DocumentStatus.APPROVED, comments);
  };

  const reject = async (comments?: string) => {
    return transitionTo(DocumentStatus.REJECTED, comments);
  };

  const complete = async (comments?: string) => {
    return transitionTo(DocumentStatus.COMPLETED, comments);
  };

  const submitToCustomer = async (comments?: string) => {
    return transitionTo(DocumentStatus.CUSTOMER_ACKNOWLEDGEMENT, comments);
  };

  const fetchWorkflowHistory = async () => {
    return dispatch(getDocumentWorkflow(documentId));
  };

  const submitAcknowledgement = async (
    acknowledged: boolean,
    signature?: string,
    customerName?: string,
    email?: string,
    comments?: string
  ) => {
    return dispatch(
      submitCustomerAcknowledgement({
        documentId,
        acknowledged,
        signature,
        customerName: customerName || '',
        email,
        comments,
      })
    );
  };

  const canEdit = () => {
    return workflowEngine.canEdit(initialStatus as DocumentStatus);
  };

  const canDelete = () => {
    return workflowEngine.canDelete(initialStatus as DocumentStatus);
  };

  const canCancel = () => {
    return workflowEngine.canCancel(initialStatus as DocumentStatus);
  };

  const requiresCustomerAcknowledgement = () => {
    return workflowEngine.requiresCustomerAcknowledgement(documentType as DocumentType);
  };

  const requiresApproval = (newStatus: DocumentStatus): boolean => {
    const docType = DocumentType[documentType.toUpperCase() as keyof typeof DocumentType] || (documentType as DocumentType);
    return workflowEngine.requiresApproval(docType, initialStatus as DocumentStatus, newStatus);
  };

  const requiresComment = (newStatus: DocumentStatus): boolean => {
    const docType = DocumentType[documentType.toUpperCase() as keyof typeof DocumentType] || (documentType as DocumentType);
    return workflowEngine.requiresComment(docType, initialStatus as DocumentStatus, newStatus);
  };

  const getStatusColor = () => {
    return workflowEngine.getStatusColor(initialStatus as DocumentStatus);
  };

  const getStatusDisplayName = () => {
    return workflowEngine.getStatusDisplayName(initialStatus as DocumentStatus);
  };

  const getDocumentTypeDisplayName = () => {
    return workflowEngine.getDocumentTypeDisplayName(documentType as DocumentType);
  };

  const clearError = () => {
    dispatch(clearTransitionError());
  };

  // Get user-specific available transitions
  const getUserTransitions = () => {
    const allTransitions = getValidTransitions();
    const userRole = user?.role?.name;
    return allTransitions.filter(transition => transition.allowedRoles.includes(userRole as any));
  };

  return {
    status: initialStatus,
    availableTransitions: getUserTransitions(),
    workflowHistory,
    isTransitioning,
    transitionError,
    getValidTransitions,
    canTransition,
    transitionTo,
    approve,
    reject,
    complete,
    submitToCustomer,
    fetchWorkflowHistory,
    submitAcknowledgement,
    canEdit,
    canDelete,
    canCancel,
    requiresCustomerAcknowledgement,
    requiresApproval,
    requiresComment,
    getStatusColor,
    getStatusDisplayName,
    getDocumentTypeDisplayName,
    clearError,
  };
};
