/**
 * Workflow Engine for OSREN ERP-Lite
 *
 * Implements a state machine for document workflows with controlled transitions,
 * role-based approvals, and audit trail support.
 */

import { Role } from './permissions';

// Document workflow states
export enum DocumentStatus {
  DRAFT = 'draft',
  INTERNAL_REVIEW = 'internal_review',
  CUSTOMER_ACKNOWLEDGEMENT = 'customer_acknowledgement',
  APPROVED = 'approved',
  COMPLETED = 'completed',
  REJECTED = 'rejected',
  CANCELLED = 'cancelled'
}

// Document types supported in the system
export enum DocumentType {
  QUOTATION = 'quotation',
  INVOICE = 'invoice',
  DELIVERY_ORDER = 'delivery_order',
  PURCHASE_ORDER = 'purchase_order',
  SALES_ORDER = 'sales_order',
  CREDIT_NOTE = 'credit_note',
  DEBIT_NOTE = 'debit_note'
}

// Workflow transition definition
export interface WorkflowTransition {
  from: DocumentStatus;
  to: DocumentStatus;
  allowedRoles: Role[];
  requiresApproval?: boolean;
  allowedActions?: string[];
  requiresComment?: boolean;
}

// Customer acknowledgement data
export interface CustomerAcknowledgement {
  acknowledged: boolean;
  signature?: string; // Base64 encoded signature
  customerName: string;
  email?: string;
  comments?: string;
  acknowledgedAt?: Date;
  ipAddress?: string;
}

// Document metadata for workflow
export interface DocumentMetadata {
  documentType: DocumentType;
  documentNumber: string;
  title: string;
  customerId?: string;
  vendorId?: string;
  totalAmount?: number;
  createdBy: string;
  assignedTo?: string;
}

// Workflow state machine definition
export const WORKFLOW_TRANSITIONS: Record<DocumentType, WorkflowTransition[]> = {
  [DocumentType.QUOTATION]: [
    {
      from: DocumentStatus.DRAFT,
      to: DocumentStatus.INTERNAL_REVIEW,
      allowedRoles: [Role.SALES, Role.ADMIN],
      requiresComment: false
    },
    {
      from: DocumentStatus.INTERNAL_REVIEW,
      to: DocumentStatus.CUSTOMER_ACKNOWLEDGEMENT,
      allowedRoles: [Role.SALES, Role.ADMIN],
      requiresApproval: false,
      requiresComment: true
    },
    {
      from: DocumentStatus.CUSTOMER_ACKNOWLEDGEMENT,
      to: DocumentStatus.APPROVED,
      allowedRoles: [Role.SALES, Role.ADMIN],
      requiresApproval: false
    },
    {
      from: DocumentStatus.APPROVED,
      to: DocumentStatus.COMPLETED,
      allowedRoles: [Role.SALES, Role.ADMIN],
      requiresComment: false
    },
    {
      from: DocumentStatus.REJECTED,
      to: DocumentStatus.DRAFT,
      allowedRoles: [Role.SALES, Role.ADMIN],
      requiresComment: false
    }
  ],

  [DocumentType.INVOICE]: [
    {
      from: DocumentStatus.DRAFT,
      to: DocumentStatus.INTERNAL_REVIEW,
      allowedRoles: [Role.ACCOUNTS, Role.ADMIN],
      requiresComment: false
    },
    {
      from: DocumentStatus.INTERNAL_REVIEW,
      to: DocumentStatus.APPROVED,
      allowedRoles: [Role.ACCOUNTS, Role.ADMIN],
      requiresApproval: true,
      requiresComment: true
    },
    {
      from: DocumentStatus.APPROVED,
      to: DocumentStatus.COMPLETED,
      allowedRoles: [Role.ACCOUNTS, Role.ADMIN],
      requiresComment: false
    },
    {
      from: DocumentStatus.REJECTED,
      to: DocumentStatus.DRAFT,
      allowedRoles: [Role.ACCOUNTS, Role.ADMIN],
      requiresComment: true
    }
  ],

  [DocumentType.DELIVERY_ORDER]: [
    {
      from: DocumentStatus.DRAFT,
      to: DocumentStatus.INTERNAL_REVIEW,
      allowedRoles: [Role.LOGISTICS, Role.ADMIN],
      requiresComment: false
    },
    {
      from: DocumentStatus.INTERNAL_REVIEW,
      to: DocumentStatus.CUSTOMER_ACKNOWLEDGEMENT,
      allowedRoles: [Role.LOGISTICS, Role.SALES, Role.ADMIN],
      requiresComment: false
    },
    {
      from: DocumentStatus.CUSTOMER_ACKNOWLEDGEMENT,
      to: DocumentStatus.COMPLETED,
      allowedRoles: [Role.LOGISTICS, Role.ADMIN],
      requiresComment: false
    },
    {
      from: DocumentStatus.REJECTED,
      to: DocumentStatus.DRAFT,
      allowedRoles: [Role.LOGISTICS, Role.ADMIN],
      requiresComment: true
    }
  ],

  [DocumentType.PURCHASE_ORDER]: [
    {
      from: DocumentStatus.DRAFT,
      to: DocumentStatus.INTERNAL_REVIEW,
      allowedRoles: [Role.ACCOUNTS, Role.ADMIN],
      requiresComment: false
    },
    {
      from: DocumentStatus.INTERNAL_REVIEW,
      to: DocumentStatus.APPROVED,
      allowedRoles: [Role.ADMIN], // Only admin can approve POs
      requiresApproval: true,
      requiresComment: true
    },
    {
      from: DocumentStatus.APPROVED,
      to: DocumentStatus.COMPLETED,
      allowedRoles: [Role.ACCOUNTS, Role.ADMIN],
      requiresComment: false
    },
    {
      from: DocumentStatus.REJECTED,
      to: DocumentStatus.DRAFT,
      allowedRoles: [Role.ACCOUNTS, Role.ADMIN],
      requiresComment: true
    }
  ],

  [DocumentType.SALES_ORDER]: [
    {
      from: DocumentStatus.DRAFT,
      to: DocumentStatus.INTERNAL_REVIEW,
      allowedRoles: [Role.SALES, Role.ADMIN],
      requiresComment: false
    },
    {
      from: DocumentStatus.INTERNAL_REVIEW,
      to: DocumentStatus.APPROVED,
      allowedRoles: [Role.SALES, Role.ADMIN],
      requiresApproval: false,
      requiresComment: true
    },
    {
      from: DocumentStatus.APPROVED,
      to: DocumentStatus.COMPLETED,
      allowedRoles: [Role.LOGISTICS, Role.SALES, Role.ADMIN],
      requiresComment: false
    },
    {
      from: DocumentStatus.REJECTED,
      to: DocumentStatus.DRAFT,
      allowedRoles: [Role.SALES, Role.ADMIN],
      requiresComment: true
    }
  ],

  [DocumentType.CREDIT_NOTE]: [
    {
      from: DocumentStatus.DRAFT,
      to: DocumentStatus.INTERNAL_REVIEW,
      allowedRoles: [Role.ACCOUNTS, Role.ADMIN],
      requiresComment: false
    },
    {
      from: DocumentStatus.INTERNAL_REVIEW,
      to: DocumentStatus.APPROVED,
      allowedRoles: [Role.ACCOUNTS, Role.ADMIN],
      requiresApproval: true,
      requiresComment: true
    },
    {
      from: DocumentStatus.APPROVED,
      to: DocumentStatus.COMPLETED,
      allowedRoles: [Role.ACCOUNTS, Role.ADMIN],
      requiresComment: false
    },
    {
      from: DocumentStatus.REJECTED,
      to: DocumentStatus.DRAFT,
      allowedRoles: [Role.ACCOUNTS, Role.ADMIN],
      requiresComment: true
    }
  ],

  [DocumentType.DEBIT_NOTE]: [
    {
      from: DocumentStatus.DRAFT,
      to: DocumentStatus.INTERNAL_REVIEW,
      allowedRoles: [Role.ACCOUNTS, Role.ADMIN],
      requiresComment: false
    },
    {
      from: DocumentStatus.INTERNAL_REVIEW,
      to: DocumentStatus.APPROVED,
      allowedRoles: [Role.ACCOUNTS, Role.ADMIN],
      requiresApproval: true,
      requiresComment: true
    },
    {
      from: DocumentStatus.APPROVED,
      to: DocumentStatus.COMPLETED,
      allowedRoles: [Role.ACCOUNTS, Role.ADMIN],
      requiresComment: false
    },
    {
      from: DocumentStatus.REJECTED,
      to: DocumentStatus.DRAFT,
      allowedRoles: [Role.ACCOUNTS, Role.ADMIN],
      requiresComment: true
    }
  ]
};

// Rejection transitions (common to all document types)
export const REJECTION_TRANSITIONS: WorkflowTransition[] = [
  {
    from: DocumentStatus.INTERNAL_REVIEW,
    to: DocumentStatus.REJECTED,
    allowedRoles: [Role.ADMIN, Role.ACCOUNTS, Role.SALES],
    requiresComment: true
  },
  {
    from: DocumentStatus.CUSTOMER_ACKNOWLEDGEMENT,
    to: DocumentStatus.REJECTED,
    allowedRoles: [Role.ADMIN, Role.SALES, Role.ACCOUNTS, Role.LOGISTICS],
    requiresComment: false
  }
];

// Cancellation transitions
export const CANCELLATION_TRANSITIONS: WorkflowTransition[] = [
  {
    from: DocumentStatus.DRAFT,
    to: DocumentStatus.CANCELLED,
    allowedRoles: [Role.ADMIN, Role.SALES, Role.ACCOUNTS, Role.LOGISTICS],
    requiresComment: true
  },
  {
    from: DocumentStatus.INTERNAL_REVIEW,
    to: DocumentStatus.CANCELLED,
    allowedRoles: [Role.ADMIN],
    requiresComment: true
  }
];

// Workflow Engine Class
export class WorkflowEngine {
  /**
   * Get all valid transitions for a document type and current status
   */
  getValidTransitions(
    documentType: DocumentType,
    currentStatus: DocumentStatus
  ): WorkflowTransition[] {
    const typeTransitions = WORKFLOW_TRANSITIONS[documentType] || [];
    const rejectionTransitions = REJECTION_TRANSITIONS.filter(
      t => t.from === currentStatus && this.canTransitionTo(documentType, currentStatus, t.to)
    );
    const cancellationTransitions = CANCELLATION_TRANSITIONS.filter(
      t => t.from === currentStatus
    );

    return [
      ...typeTransitions.filter(t => t.from === currentStatus),
      ...rejectionTransitions,
      ...cancellationTransitions
    ];
  }

  /**
   * Check if a transition is valid (exists in workflow definition)
   */
  canTransition(
    documentType: DocumentType,
    currentStatus: DocumentStatus,
    newStatus: DocumentStatus
  ): boolean {
    const transitions = this.getValidTransitions(documentType, currentStatus);
    return transitions.some(t => t.to === newStatus);
  }

  /**
   * Check if a specific user role can perform a transition
   */
  canUserTransition(
    role: Role,
    documentType: DocumentType,
    currentStatus: DocumentStatus,
    newStatus: DocumentStatus
  ): boolean {
    const transitions = this.getValidTransitions(documentType, currentStatus);
    const transition = transitions.find(t => t.to === newStatus);

    if (!transition) return false;

    return transition.allowedRoles.includes(role);
  }

  /**
   * Get next possible statuses for a role
   */
  getNextStatuses(
    role: Role,
    documentType: DocumentType,
    currentStatus: DocumentStatus
  ): DocumentStatus[] {
    const transitions = this.getValidTransitions(documentType, currentStatus);
    return transitions
      .filter(t => t.allowedRoles.includes(role))
      .map(t => t.to);
  }

  /**
   * Check if approval is required for a transition
   */
  requiresApproval(
    documentType: DocumentType,
    currentStatus: DocumentStatus,
    newStatus: DocumentStatus
  ): boolean {
    const transitions = this.getValidTransitions(documentType, currentStatus);
    const transition = transitions.find(t => t.to === newStatus);
    return transition?.requiresApproval || false;
  }

  /**
   * Check if comment is required for a transition
   */
  requiresComment(
    documentType: DocumentType,
    currentStatus: DocumentStatus,
    newStatus: DocumentStatus
  ): boolean {
    const transitions = this.getValidTransitions(documentType, currentStatus);
    const transition = transitions.find(t => t.to === newStatus);
    return transition?.requiresComment || false;
  }

  /**
   * Check if a document can be edited in its current status
   */
  canEdit(status: DocumentStatus): boolean {
    return [
      DocumentStatus.DRAFT,
      DocumentStatus.INTERNAL_REVIEW,
      DocumentStatus.REJECTED
    ].includes(status);
  }

  /**
   * Check if a document can be deleted in its current status
   */
  canDelete(status: DocumentStatus): boolean {
    return [
      DocumentStatus.DRAFT,
      DocumentStatus.REJECTED
    ].includes(status);
  }

  /**
   * Check if a document can be cancelled in its current status
   */
  canCancel(status: DocumentStatus): boolean {
    return [
      DocumentStatus.DRAFT,
      DocumentStatus.INTERNAL_REVIEW
    ].includes(status);
  }

  /**
   * Check if customer acknowledgement is required for this document type
   */
  requiresCustomerAcknowledgement(documentType: DocumentType): boolean {
    return [
      DocumentType.QUOTATION,
      DocumentType.DELIVERY_ORDER,
      DocumentType.SALES_ORDER
    ].includes(documentType);
  }

  /**
   * Get status display name
   */
  getStatusDisplayName(status: DocumentStatus): string {
    const displayNames: Record<DocumentStatus, string> = {
      [DocumentStatus.DRAFT]: 'Draft',
      [DocumentStatus.INTERNAL_REVIEW]: 'Internal Review',
      [DocumentStatus.CUSTOMER_ACKNOWLEDGEMENT]: 'Customer Acknowledgement',
      [DocumentStatus.APPROVED]: 'Approved',
      [DocumentStatus.COMPLETED]: 'Completed',
      [DocumentStatus.REJECTED]: 'Rejected',
      [DocumentStatus.CANCELLED]: 'Cancelled'
    };
    return displayNames[status] || status;
  }

  /**
   * Get status color for UI display
   */
  getStatusColor(status: DocumentStatus): string {
    const colors: Record<DocumentStatus, string> = {
      [DocumentStatus.DRAFT]: 'bg-gray-100 text-gray-700 border-gray-200',
      [DocumentStatus.INTERNAL_REVIEW]: 'bg-blue-100 text-blue-700 border-blue-200',
      [DocumentStatus.CUSTOMER_ACKNOWLEDGEMENT]: 'bg-yellow-100 text-yellow-700 border-yellow-200',
      [DocumentStatus.APPROVED]: 'bg-green-100 text-green-700 border-green-200',
      [DocumentStatus.COMPLETED]: 'bg-green-100 text-green-700 border-green-200',
      [DocumentStatus.REJECTED]: 'bg-red-100 text-red-700 border-red-200',
      [DocumentStatus.CANCELLED]: 'bg-gray-100 text-gray-500 border-gray-200'
    };
    return colors[status] || colors[DocumentStatus.DRAFT];
  }

  /**
   * Get document type display name
   */
  getDocumentTypeDisplayName(documentType: DocumentType): string {
    const displayNames: Record<DocumentType, string> = {
      [DocumentType.QUOTATION]: 'Quotation',
      [DocumentType.INVOICE]: 'Invoice',
      [DocumentType.DELIVERY_ORDER]: 'Delivery Order',
      [DocumentType.PURCHASE_ORDER]: 'Purchase Order',
      [DocumentType.SALES_ORDER]: 'Sales Order',
      [DocumentType.CREDIT_NOTE]: 'Credit Note',
      [DocumentType.DEBIT_NOTE]: 'Debit Note'
    };
    return displayNames[documentType] || documentType;
  }

  /**
   * Validate customer acknowledgement data
   */
  validateCustomerAcknowledgement(data: CustomerAcknowledgement): { valid: boolean; errors?: string[] } {
    const errors: string[] = [];

    if (!data.acknowledged && !data.comments) {
      errors.push('Comments are required when rejecting');
    }

    if (data.acknowledged && !data.signature) {
      errors.push('Signature is required when acknowledging');
    }

    if (!data.customerName) {
      errors.push('Customer name is required');
    }

    return {
      valid: errors.length === 0,
      errors: errors.length > 0 ? errors : undefined
    };
  }

  /**
   * Helper method for additional transition validation
   */
  private canTransitionTo(
    documentType: DocumentType,
    from: DocumentStatus,
    to: DocumentStatus
  ): boolean {
    // Additional validation logic can be added here
    // For example, business rules based on document type
    return true;
  }
}

// Singleton instance
export const workflowEngine = new WorkflowEngine();

// Export workflow transition type for use in other modules
export type { WorkflowTransition };
