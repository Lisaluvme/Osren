const API_BASE_URL = process.env.REACT_APP_API_BASE_URL || 'http://localhost:5000/api';

class NotificationApiService {
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

  async getNotifications(params?: {
    is_read?: boolean;
    type?: string;
    limit?: number;
    offset?: number;
  }) {
    const query = new URLSearchParams();
    if (params?.is_read !== undefined) {
      query.append('is_read', String(params.is_read));
    }
    if (params?.type) query.append('type', params.type);
    query.append('limit', String(params?.limit || 50));
    query.append('offset', String(params?.offset || 0));

    return this.request(`/notifications?${query}`);
  }

  async getUnreadCount() {
    return this.request('/notifications/unread-count');
  }

  async markAsRead(notificationId: string) {
    return this.request(`/notifications/${notificationId}/read`, {
      method: 'PUT',
    });
  }

  async markAllAsRead() {
    return this.request('/notifications/read-all', {
      method: 'PUT',
    });
  }

  async deleteNotification(notificationId: string) {
    return this.request(`/notifications/${notificationId}`, {
      method: 'DELETE',
    });
  }
}

const notificationApiService = new NotificationApiService();
export default notificationApiService;
