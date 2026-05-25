import React from 'react';
import { CheckCircle, XCircle, Send, FileText, Clock, UserCheck } from 'lucide-react';
import { useWorkflow } from '../../hooks/useWorkflow';
import { usePermissions } from '../../hooks/usePermissions';
import { DocumentStatus } from '../../lib/workflow';

interface WorkflowActionsProps {
  documentId: string;
  documentType: string;
  currentStatus: string;
  onTransition?: (newStatus: string) => void;
  disabled?: boolean;
}

const WorkflowActions: React.FC<WorkflowActionsProps> = ({
  documentId,
  documentType,
  currentStatus,
  onTransition,
  disabled = false
}) => {
  const {
    status,
    isTransitioning,
    transitionError,
    getUserTransitions,
    transitionTo,
    approve,
    reject,
    complete,
    submitToCustomer,
    getStatusDisplayName,
    getStatusColor,
    clearError,
  } = useWorkflow({
    documentId,
    documentType,
    initialStatus: currentStatus
  });

  const { canApproveDocument, canRejectDocument } = usePermissions();

  const transitions = getUserTransitions();
  const canApprove = canApproveDocument() && transitions.some(t => t.to === DocumentStatus.APPROVED);
  const canReject = canRejectDocument() && transitions.some(t => t.to === DocumentStatus.REJECTED);

  const handleTransition = async (newStatus: DocumentStatus, comments?: string) => {
    clearError();
    const result = await transitionTo(newStatus, comments);
    if (result && (result as any).success !== false) {
      onTransition?.(newStatus);
    }
  };

  const handleApprove = async () => {
    await handleTransition(DocumentStatus.APPROVED, 'Document approved');
  };

  const handleReject = async () => {
    const comments = prompt('Please provide a reason for rejection:');
    if (comments !== null) {
      await handleTransition(DocumentStatus.REJECTED, comments);
    }
  };

  const handleComplete = async () => {
    await handleTransition(DocumentStatus.COMPLETED, 'Document completed');
  };

  const handleSendToCustomer = async () => {
    await handleTransition(DocumentStatus.CUSTOMER_ACKNOWLEDGEMENT, 'Sent to customer for acknowledgement');
  };

  return (
    <div className="space-y-4">
      {/* Current Status Badge */}
      <div className="flex items-center gap-2">
        <span className="text-sm text-slate-600">Current Status:</span>
        <span className={`px-3 py-1 rounded-full text-sm font-medium ${getStatusColor()}`}>
          {getStatusDisplayName()}
        </span>
      </div>

      {/* Error Display */}
      {transitionError && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg flex items-center justify-between">
          <span className="text-sm">{transitionError}</span>
          <button
            onClick={clearError}
            className="text-red-600 hover:text-red-800"
            type="button"
          >
            <XCircle className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Workflow Actions */}
      <div className="flex flex-wrap gap-2">
        {canApprove && (
          <button
            onClick={handleApprove}
            disabled={isTransitioning || disabled}
            className="inline-flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium shadow-sm"
            type="button"
          >
            <CheckCircle className="w-4 h-4" />
            Approve
          </button>
        )}

        {canReject && (
          <button
            onClick={handleReject}
            disabled={isTransitioning || disabled}
            className="inline-flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium shadow-sm"
            type="button"
          >
            <XCircle className="w-4 h-4" />
            Reject
          </button>
        )}

        {transitions.some(t => t.to === DocumentStatus.COMPLETED) && (
          <button
            onClick={handleComplete}
            disabled={isTransitioning || disabled}
            className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium shadow-sm"
            type="button"
          >
            <CheckCircle className="w-4 h-4" />
            Complete
          </button>
        )}

        {transitions.some(t => t.to === DocumentStatus.CUSTOMER_ACKNOWLEDGEMENT) && (
          <button
            onClick={handleSendToCustomer}
            disabled={isTransitioning || disabled}
            className="inline-flex items-center gap-2 px-4 py-2 bg-yellow-600 text-white rounded-lg hover:bg-yellow-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium shadow-sm"
            type="button"
          >
            <Send className="w-4 h-4" />
            Send to Customer
          </button>
        )}

        {status === DocumentStatus.INTERNAL_REVIEW && (
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-blue-50 text-blue-700 rounded-lg">
            <Clock className="w-4 h-4" />
            <span className="text-sm font-medium">Under Review</span>
          </div>
        )}

        {status === DocumentStatus.CUSTOMER_ACKNOWLEDGEMENT && (
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-yellow-50 text-yellow-700 rounded-lg">
            <UserCheck className="w-4 h-4" />
            <span className="text-sm font-medium">Awaiting Customer</span>
          </div>
        )}
      </div>

      {/* Help Text */}
      {transitions.length === 0 && !disabled && (
        <div className="text-sm text-slate-500 italic">
          No workflow actions available for this document
        </div>
      )}
    </div>
  );
};

export default WorkflowActions;
