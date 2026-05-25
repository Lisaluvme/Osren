const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api';

export interface OAuthTokens {
  token_key: string;
  access_token: string;
  expiry_date?: number;
}

class GoogleOAuthService {
  private static instance: GoogleOAuthService;
  private tokenKey: string | null = null;

  private constructor() {
    // Load token from localStorage on init
    const savedToken = localStorage.getItem('google_token_key');
    if (savedToken) {
      this.tokenKey = savedToken;
    }
  }

  static getInstance(): GoogleOAuthService {
    if (!GoogleOAuthService.instance) {
      GoogleOAuthService.instance = new GoogleOAuthService();
    }
    return GoogleOAuthService.instance;
  }

  async getAuthUrl(): Promise<{ authUrl: string; state: string }> {
    const response = await fetch(`${API_BASE_URL}/auth/google`);
    const data = await response.json();
    return data;
  }

  setToken(tokenKey: string): void {
    this.tokenKey = tokenKey;
    localStorage.setItem('google_token_key', tokenKey);
  }

  getToken(): string | null {
    return this.tokenKey;
  }

  clearToken(): void {
    this.tokenKey = null;
    localStorage.removeItem('google_token_key');
  }

  isAuthenticated(): boolean {
    return this.tokenKey !== null;
  }

  async verifyToken(): Promise<boolean> {
    if (!this.tokenKey) {
      return false;
    }

    try {
      const response = await fetch(`${API_BASE_URL}/auth/verify`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ token_key: this.tokenKey }),
      });

      const data = await response.json();
      return data.valid;
    } catch (error) {
      console.error('Token verification failed:', error);
      return false;
    }
  }

  getAuthHeaders(): Record<string, string> {
    if (!this.tokenKey) {
      throw new Error('Not authenticated');
    }

    return {
      'X-Token-Key': this.tokenKey,
      'Content-Type': 'application/json',
    };
  }
}

const googleOAuthService = GoogleOAuthService.getInstance();
export default googleOAuthService;
export { GoogleOAuthService };
