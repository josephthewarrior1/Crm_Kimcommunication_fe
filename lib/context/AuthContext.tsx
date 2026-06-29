'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { authService } from '../services/authService';
import { AppUser } from '../types';
import { toast } from 'sonner';

interface AuthContextType {
  user: AppUser | null;
  token: string | null;
  isLoading: boolean;
  login: (data: any) => Promise<void>;
  register: (data: any) => Promise<void>;
  logout: () => Promise<void>;
  isAdmin: boolean;
  isManager: boolean;
  isUser: boolean;
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

  // Compute role permissions
  const isAdmin = user?.roles?.includes('ADMIN') || false;
  const isManager = user?.roles?.includes('MANAGER') || false;
  const isUser = user?.roles?.includes('USER') || false;

  // Protect routes
  useEffect(() => {
    if (isLoading) return;

    const isAuthRoute = pathname === '/login' || pathname === '/register';
    const isDashboardRoute = pathname.startsWith('/dashboard');

    if (!token && isDashboardRoute) {
      toast.error('Please login first to access the dashboard.');
      router.push('/login');
    } else if (token) {
      if (isAuthRoute) {
        const savedUserJson = localStorage.getItem('user');
        let hasAdmin = false;
        if (savedUserJson) {
          try {
            hasAdmin = JSON.parse(savedUserJson).roles?.includes('ADMIN') || false;
          } catch (e) {}
        }
        if (pathname === '/register' && hasAdmin) {
          // Allow ADMIN to register/create accounts
        } else {
          router.push('/dashboard');
        }
      } else {
        // Protect specific dashboard sub-routes
        const isSettingsRoute = pathname === '/dashboard/settings';
        const isFlaggedRoute = pathname === '/dashboard/flagged';

        const savedUserJson = localStorage.getItem('user');
        if (savedUserJson) {
          try {
            const parsedUser = JSON.parse(savedUserJson) as AppUser;
            const hasAdmin = parsedUser.roles?.includes('ADMIN') || false;
            const hasManager = parsedUser.roles?.includes('MANAGER') || false;

            if (isSettingsRoute && !hasAdmin) {
              toast.error('Access Denied: Only ADMIN accounts can access Removal Requests.');
              router.push('/dashboard');
            }
          } catch (e) {
            // Ignore parse errors
          }
        }
      }
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
        fullName: response.fullName,
        roles: response.roles || []
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
      if (token) {
        toast.success(`Account for "${data.username}" created successfully!`);
        router.push('/dashboard');
      } else {
        toast.success('Registration successful! Please login.');
        router.push('/login');
      }
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
    <AuthContext.Provider value={{ user, token, isLoading, login, register, logout, isAdmin, isManager, isUser }}>
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
