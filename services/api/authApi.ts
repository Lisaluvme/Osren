const API_BASE_URL = process.env.REACT_APP_API_BASE_URL || 'http://localhost:5000/api';

class AuthApiService {
  private getAccessToken(): string | null {
    return localStorage.getItem('accessToken');
  }

  private async request(endpoint: string, options?: RequestInit): Promise<any> {
    const url = `${API_BASE_URL}${endpoint}`;
    const config: RequestInit = {
      headers: {
        'Content-Type': 'application/json',
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

  async login(email: string, password: string) {
    return this.request('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });
  }

  async register(userData: {
    email: string;
    password: string;
    full_name: string;
    role_name: string;
  }) {
    return this.request('/auth/register', {
      method: 'POST',
      body: JSON.stringify(userData),
    });
  }

  async getCurrentUser() {
    return this.request('/auth/me', {
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${this.getAccessToken()}`,
      },
    });
  }

  async updateProfile(updates: { full_name: string }) {
    return this.request('/auth/me', {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${this.getAccessToken()}`,
      },
      body: JSON.stringify(updates),
    });
  }

  async changePassword(passwords: {
    currentPassword: string;
    newPassword: string;
  }) {
    return this.request('/auth/me/password', {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${this.getAccessToken()}`,
      },
      body: JSON.stringify(passwords),
    });
  }

  async logout() {
    return this.request('/auth/logout', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${this.getAccessToken()}`,
      },
    });
  }
}

const authApiService = new AuthApiService();
export default authApiService;
