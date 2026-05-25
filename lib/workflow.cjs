const DocumentStatus = {
  DRAFT: 'draft',
  PENDING_APPROVAL: 'pending_approval',
  APPROVED: 'approved',
  REJECTED: 'rejected',
  PROCESSING: 'processing',
  COMPLETED: 'completed',
  CANCELLED: 'cancelled',
  INTERNAL_REVIEW: 'internal_review',
  CUSTOMER_ACKNOWLEDGEMENT: 'customer_acknowledgement'
};

const DocumentType = {
  QUOTE: 'quote',
  ORDER: 'order',
  INVOICE: 'invoice',
  DELIVERY_NOTE: 'delivery_note',
  CREDIT_NOTE: 'credit_note'
};

class WorkflowEngine {
  constructor() {
    this.transitions = new Map();
    this.setupDefaultTransitions();
  }

  setupDefaultTransitions() {
    // Define default workflow transitions
    this.transitions.set('draft', ['pending_approval', 'cancelled']);
    this.transitions.set('pending_approval', ['approved', 'rejected']);
    this.transitions.set('approved', ['processing', 'cancelled']);
    this.transitions.set('processing', ['completed', 'cancelled']);
    this.transitions.set('completed', []);
    this.transitions.set('rejected', ['draft']);
    this.transitions.set('cancelled', ['draft']);
    this.transitions.set('internal_review', ['customer_acknowledgement', 'cancelled']);
    this.transitions.set('customer_acknowledgement', ['completed', 'cancelled']);
  }

  canTransition(fromStatus, toStatus) {
    const allowed = this.transitions.get(fromStatus) || [];
    return allowed.includes(toStatus);
  }

  getNextStatuses(currentStatus) {
    return this.transitions.get(currentStatus) || [];
  }
}

const workflowEngine = new WorkflowEngine();

module.exports = {
  DocumentStatus,
  DocumentType,
  workflowEngine
};
