const API_BASE_URL = process.env.REACT_APP_API_BASE_URL || 'http://localhost:5000/api';

class AuditApiService {
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

  async getAuditLogs(params?: {
    entity_type?: string;
    entity_id?: string;
    action?: string;
    user_id?: string;
    start_date?: string;
    end_date?: string;
    limit?: number;
    offset?: number;
  }) {
    const query = new URLSearchParams();
    if (params?.entity_type) query.append('entity_type', params.entity_type);
    if (params?.entity_id) query.append('entity_id', params.entity_id);
    if (params?.action) query.append('action', params.action);
    if (params?.user_id) query.append('user_id', params.user_id);
    if (params?.start_date) query.append('start_date', params.start_date);
    if (params?.end_date) query.append('end_date', params.end_date);
    query.append('limit', String(params?.limit || 100));
    query.append('offset', String(params?.offset || 0));

    return this.request(`/audit?${query}`);
  }

  async getEntityAuditLogs(params: {
    type: string;
    id: string;
    limit?: number;
    offset?: number;
  }) {
    const query = new URLSearchParams();
    query.append('limit', String(params.limit || 100));
    query.append('offset', String(params.offset || 0));

    return this.request(`/audit/entity/${params.type}/${params.id}?${query}`);
  }

  async exportAuditLogs(params?: {
    entity_type?: string;
    entity_id?: string;
    action?: string;
    user_id?: string;
    start_date?: string;
    end_date?: string;
  }) {
    const query = new URLSearchParams();
    if (params?.entity_type) query.append('entity_type', params.entity_type);
    if (params?.entity_id) query.append('entity_id', params.entity_id);
    if (params?.action) query.append('action', params.action);
    if (params?.user_id) query.append('user_id', params.user_id);
    if (params?.start_date) query.append('start_date', params.start_date);
    if (params?.end_date) query.append('end_date', params.end_date);

    const response = await fetch(`/api/audit/export?${query}`, {
      headers: {
        Authorization: `Bearer ${this.getAccessToken()}`,
      },
    });

    if (!response.ok) {
      throw new Error('Failed to export audit logs');
    }

    const blob = await response.blob();
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `audit-logs-${Date.now()}.csv`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    window.URL.revokeObjectURL(url);
  }
}

const auditApiService = new AuditApiService();
export default auditApiService;
