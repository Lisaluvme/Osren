const API_BASE_URL = process.env.REACT_APP_API_BASE_URL || 'http://localhost:5000/api';

class DocumentApiService {
  private getAccessToken(): string | null {
    return localStorage.getItem('accessToken');
  }

  private async request(endpoint: string, options?: RequestInit): Promise<any> {
    const url = `${API_BASE_URL}${endpoint}`;
    const config: RequestInit = {
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${this.getAccessToken()}`,
        ...(options?.headers || {}),
      },
      ...options,
    };

    const response = await fetch(url, config);
    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || `HTTP error! status: ${response.status}`);
    }

    return data;
  }

  async getDocuments(params?: {
    type?: string;
    status?: string;
    customer_id?: string;
    assigned_to_me?: boolean;
    created_by_me?: boolean;
    page?: number;
    limit?: number;
  }) {
    const query = new URLSearchParams();
    if (params?.type) query.append('type', params.type);
    if (params?.status) query.append('status', params.status);
    if (params?.customer_id) query.append('customer_id', params.customer_id);
    if (params?.assigned_to_me) query.append('assigned_to_me', 'true');
    if (params?.created_by_me) query.append('created_by_me', 'true');
    query.append('page', String(params?.page || 1));
    query.append('limit', String(params?.limit || 50));

    return this.request(`/documents?${query}`);
  }

  async getDocument(documentId: string) {
    return this.request(`/documents/${documentId}`);
  }

  async createDocument(documentData: {
    type: string;
    title: string;
    customer_id?: string;
    vendor_id?: string;
    assigned_to?: string;
    items?: any[];
    notes?: string;
    internal_notes?: string;
    data?: Record<string, any>;
  }) {
    return this.request('/documents', {
      method: 'POST',
      body: JSON.stringify(documentData),
    });
  }

  async updateDocument(
    documentId: string,
    updates: {
      title?: string;
      customer_id?: string;
      vendor_id?: string;
      assigned_to?: string;
      items?: any[];
      notes?: string;
      internal_notes?: string;
      data?: Record<string, any>;
    }
  ) {
    return this.request(`/documents/${documentId}`, {
      method: 'PUT',
      body: JSON.stringify(updates),
    });
  }

  async deleteDocument(documentId: string) {
    return this.request(`/documents/${documentId}`, {
      method: 'DELETE',
    });
  }

  async transitionDocument(
    documentId: string,
    transition: {
      to_status: string;
      comments?: string;
    }
  ) {
    return this.request(`/documents/${documentId}/transition`, {
      method: 'POST',
      body: JSON.stringify(transition),
    });
  }

  async getDocumentWorkflow(documentId: string) {
    return this.request(`/documents/${documentId}/workflow`);
  }

  async getDocumentFiles(documentId: string) {
    return this.request(`/documents/${documentId}/files`);
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
    return this.request(`/documents/${documentId}/acknowledge`, {
      method: 'POST',
      body: JSON.stringify(acknowledgement),
    });
  }
}

const documentApiService = new DocumentApiService();
export default documentApiService;
