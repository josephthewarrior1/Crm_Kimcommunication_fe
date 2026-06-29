import { ApiService } from './apiService';
import { AppUser } from '../types';

export interface LoginResponse {
  token: string;
  expiresAt: string;
  userId?: number;
  username: string;
  email: string;
  fullName: string;
}

export class AuthService extends ApiService {
  constructor() {
    super();
  }

  async register(data: any): Promise<AppUser> {
    return this.post<AppUser>('/api/auth/register', data);
  }

  async login(data: any): Promise<LoginResponse> {
    return this.post<LoginResponse>('/api/auth/login', data);
  }

  async logout(token: string): Promise<string> {
    return this.post<string>(`/api/auth/logout?token=${encodeURIComponent(token)}`);
  }
}

export const authService = new AuthService();
