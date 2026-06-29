'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { authService, LoginResponse } from '../services/authService';
import { AppUser } from '../types';
import { toast } from 'sonner';

interface AuthContextType {
  user: AppUser | null;
  token: string | null;
  isLoading: boolean;
  login: (data: any) => Promise<void>;
  register: (data: any) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<AppUser | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    // Check local storage for session
    const savedToken = localStorage.getItem('session');
    const savedUserJson = localStorage.getItem('user');

    if (savedToken && savedUserJson) {
      try {
        setToken(savedToken);
        setUser(JSON.parse(savedUserJson));
      } catch (e) {
        console.error('Failed to parse saved user session:', e);
        localStorage.removeItem('session');
        localStorage.removeItem('user');
      }
    }
    setIsLoading(false);
  }, []);

  // Protect routes
  useEffect(() => {
    if (isLoading) return;

    const isAuthRoute = pathname === '/login' || pathname === '/register';
    const isDashboardRoute = pathname.startsWith('/dashboard');

    if (!token && isDashboardRoute) {
      toast.error('Please login first to access the dashboard.');
      router.push('/login');
    } else if (token && isAuthRoute) {
      router.push('/dashboard');
    }
  }, [token, pathname, isLoading, router]);

  const login = async (data: any) => {
    try {
      const response = await authService.login(data);
      localStorage.setItem('session', response.token);
      
      const userData: AppUser = {
        id: response.userId || 0,
        username: response.username,
        email: response.email,
        fullName: response.fullName
      };
      
      localStorage.setItem('user', JSON.stringify(userData));
      setToken(response.token);
      setUser(userData);
      
      toast.success(`Welcome back, ${response.fullName || response.username}!`);
      router.push('/dashboard');
    } catch (err: any) {
      toast.error(err.message || 'Login failed. Please check your credentials.');
      throw err;
    }
  };

  const register = async (data: any) => {
    try {
      await authService.register(data);
      toast.success('Registration successful! Please login.');
      router.push('/login');
    } catch (err: any) {
      toast.error(err.message || 'Registration failed.');
      throw err;
    }
  };

  const logout = async () => {
    try {
      if (token) {
        await authService.logout(token);
      }
    } catch (err) {
      console.warn('Backend logout failed or session already cleared', err);
    } finally {
      localStorage.removeItem('session');
      localStorage.removeItem('user');
      setToken(null);
      setUser(null);
      toast.info('Logged out successfully.');
      router.push('/login');
    }
  };

  return (
    <AuthContext.Provider value={{ user, token, isLoading, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
