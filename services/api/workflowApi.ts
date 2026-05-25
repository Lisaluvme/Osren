import documentApiService from './documentApi';

class WorkflowApiService {
  async transitionDocument(
    documentId: string,
    transition: {
      to_status: string;
      comments?: string;
    }
  ) {
    return documentApiService.transitionDocument(documentId, transition);
  }

  async getDocumentWorkflow(documentId: string) {
    return documentApiService.getDocumentWorkflow(documentId);
  }

  async submitCustomerAcknowledgement(
    documentId: string,
    acknowledgement: {
      acknowledged: boolean;
      signature?: string;
      customerName: string;
      email?: string;
      comments?: string;
    }
  ) {
    return documentApiService.submitCustomerAcknowledgement(documentId, acknowledgement);
  }

  async getPendingDocuments() {
    // This would be a dedicated endpoint in the backend
    // For now, we'll filter documents assigned to current user
    return documentApiService.getDocuments({
      assigned_to_me: true,
      status: 'internal_review',
    });
  }
}

const workflowApiService = new WorkflowApiService();
export default workflowApiService;
