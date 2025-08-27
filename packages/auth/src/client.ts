// Client-side auth utilities that can be used by web and mobile apps
import { AUTH_CONFIG } from './config';
import type { User, AuthResponse } from './types';

export interface AuthClientConfig {
  baseURL: string;
  apiKey?: string;
}

export class AuthClient {
  private baseURL: string;
  private apiKey?: string;

  constructor(config: AuthClientConfig) {
    this.baseURL = config.baseURL.replace(/\/$/, ''); // Remove trailing slash
    this.apiKey = config.apiKey;
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const url = `${this.baseURL}${endpoint}`;
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };

    // Add custom headers if provided
    if (options.headers) {
      Object.assign(headers, options.headers);
    }

    if (this.apiKey) {
      headers['Authorization'] = `Bearer ${this.apiKey}`;
    }

    const response = await fetch(url, {
      ...options,
      headers,
      credentials: 'include', // Important for cookies
    });

    if (!response.ok) {
      throw new Error(`Auth request failed: ${response.statusText}`);
    }

    return response.json();
  }

  async signIn(email: string, password: string): Promise<AuthResponse> {
    return this.request<AuthResponse>(AUTH_CONFIG.ENDPOINTS.SIGN_IN, {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });
  }

  async signUp(email: string, password: string, name?: string): Promise<AuthResponse> {
    return this.request<AuthResponse>(AUTH_CONFIG.ENDPOINTS.SIGN_UP, {
      method: 'POST',
      body: JSON.stringify({ email, password, name }),
    });
  }

  async signOut(): Promise<void> {
    await this.request(AUTH_CONFIG.ENDPOINTS.SIGN_OUT, {
      method: 'POST',
    });
  }

  async getMe(): Promise<User | null> {
    try {
      return await this.request<User>(AUTH_CONFIG.ENDPOINTS.ME);
    } catch {
      return null;
    }
  }

  async refreshSession(): Promise<AuthResponse> {
    return this.request<AuthResponse>(AUTH_CONFIG.ENDPOINTS.REFRESH, {
      method: 'POST',
    });
  }
}

// Factory function for creating auth client
export function createAuthClient(config: AuthClientConfig): AuthClient {
  return new AuthClient(config);
}

