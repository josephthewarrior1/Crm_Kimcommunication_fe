'use client';

import React, { createContext, useContext, useState, useEffect, useRef, useCallback } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { authService } from '../services/authService';
import { auditLogService } from '../services/auditLogService';
import { AppUser } from '../types';
import { tagtogSsoEnabled, setTagtogCsrf, crmAuthHeaders, safeCrmReturnTo, startCrmSignIn } from '../utils/tagtogAuth';
import { toast } from 'sonner';

interface AuthContextType {
  user: AppUser | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  authError: string | null;
  login: (data: any) => Promise<void>;
  register: (data: any) => Promise<void>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<AppUser | null>;
  isAdmin: boolean;
  isManager: boolean;
  isUser: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<AppUser | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [authError, setAuthError] = useState<string | null>(null);
  const isLoggingOutRef = useRef(false);
  const sessionEpoch = useRef(0);
  const router = useRouter();
  const pathname = usePathname();
  const isAuthenticated = tagtogSsoEnabled ? user !== null : Boolean(token);
  const isAdmin = user?.roles?.includes('ADMIN') || false;
  const isManager = user?.roles?.includes('MANAGER') || false;
  const isUser = user?.roles?.includes('USER') || false;

  const clearSession = useCallback(() => {
    sessionEpoch.current += 1;
    localStorage.removeItem('session');
    localStorage.removeItem('user');
    setTagtogCsrf(null);
    setToken(null);
    setUser(null);
  }, []);

  const readCentralSession = useCallback(async (): Promise<AppUser | null> => {
    const epoch = sessionEpoch.current;
    const response = await fetch('/api/tagtog/session', { headers: { 'X-TAGTOG-Request': '1' }, cache: 'no-store', credentials: 'same-origin' });
    if (epoch !== sessionEpoch.current) return null;
    if (response.status === 401 || response.status === 403) { clearSession(); return null; }
    if (!response.ok) throw new Error('CRM sign-in is temporarily unavailable. Please try again.');
    const data = await response.json();
    if (epoch !== sessionEpoch.current) return null;
    if (!data.user || !Number.isSafeInteger(data.user.id) || !Array.isArray(data.user.roles)
      || typeof data.csrfToken !== 'string' || !/^[A-Za-z0-9_-]{43}$/.test(data.csrfToken)) throw new Error('CRM could not verify your session. Sign in again.');
    setTagtogCsrf(data.csrfToken);
    setUser(data.user);
    setAuthError(null);
    return data.user as AppUser;
  }, [clearSession]);

  useEffect(() => {
    let mounted = true;
    if (tagtogSsoEnabled) {
      // Legacy browser tokens and cached roles are never used for central sign-in.
      localStorage.removeItem('session');
      localStorage.removeItem('user');
      void readCentralSession().catch(error => { if (mounted) setAuthError(error instanceof Error ? error.message : 'CRM sign-in is unavailable.'); })
        .finally(() => { if (mounted) setIsLoading(false); });
    } else {
      const savedToken = localStorage.getItem('session'), savedUser = localStorage.getItem('user');
      if (savedToken && savedUser) {
        try { setToken(savedToken); setUser(JSON.parse(savedUser)); } catch { clearSession(); }
      }
      setIsLoading(false);
    }
    return () => { mounted = false; };
  }, [clearSession, readCentralSession]);

  useEffect(() => {
    if (!tagtogSsoEnabled) return;
    const ended = () => {
      clearSession();
      setAuthError(null);
      const returnTo = safeCrmReturnTo(window.location.pathname + window.location.search);
      router.replace('/login?ssoError=expired&returnTo=' + encodeURIComponent(returnTo));
    };
    window.addEventListener('crm-session-ended', ended);
    return () => window.removeEventListener('crm-session-ended', ended);
  }, [clearSession, router]);

  useEffect(() => {
    if (isLoading) return;
    const isAuthRoute = pathname === '/login' || pathname === '/register';
    if (tagtogSsoEnabled && pathname === '/register') {
      router.replace('/login?ssoError=managed');
      return;
    }
    if (!isAuthenticated && pathname.startsWith('/dashboard')) {
      const returnTo = safeCrmReturnTo(pathname + window.location.search);
      router.replace('/login?returnTo=' + encodeURIComponent(returnTo));
    } else if (isAuthenticated) {
      if (isAuthRoute && !(pathname === '/register' && isAdmin && !tagtogSsoEnabled)) {
        const target = safeCrmReturnTo(new URLSearchParams(window.location.search).get('returnTo'));
        router.replace(isAdmin || isManager ? target : '/dashboard/events');
      } else if (pathname === '/dashboard/takeout' && !isAdmin) {
        toast.error('Only ADMIN accounts can access Takeout Requests.');
        router.replace('/dashboard');
      }
    }
  }, [isAuthenticated, pathname, isLoading, isAdmin, isManager, router]);

  const refreshUser = async (): Promise<AppUser | null> => {
    if (tagtogSsoEnabled) {
      try { return await readCentralSession(); } catch (error) { setAuthError(error instanceof Error ? error.message : 'CRM sign-in is unavailable.'); return null; }
    }
    if (!token || !user?.id) return user;
    try {
      const freshUser = await authService.getCurrentUser();
      const updatedUser = { ...user, ...freshUser, roles: freshUser.roles || [], allowedEventIds: freshUser.allowedEventIds || [] };
      localStorage.setItem('user', JSON.stringify(updatedUser));
      setUser(updatedUser);
      return updatedUser;
    } catch { return user; }
  };

  const login = async (data: any) => {
    if (tagtogSsoEnabled) { startCrmSignIn(); return; }
    try {
      const response = await authService.login(data);
      const userData: AppUser = { id: response.userId || 0, username: response.username, email: response.email,
        fullName: response.fullName, roles: response.roles || [], allowedEventIds: response.allowedEventIds || [] };
      localStorage.setItem('session', response.token);
      localStorage.setItem('user', JSON.stringify(userData));
      setToken(response.token); setUser(userData);
      auditLogService.recordLog({ userId: userData.id, username: userData.username, userFullName: userData.fullName, userRole: userData.roles?.[0] || 'USER',
        module: 'AUTH', actionType: 'LOGIN', targetName: 'Session Login', description: `Pengguna '${userData.username}' berhasil login ke sistem CRM.` });
      toast.success(`Welcome back, ${response.fullName || response.username}!`);
      router.push('/dashboard');
    } catch (error: any) { toast.error(error.message || 'Login failed. Please check your credentials.'); throw error; }
  };

  const register = async (data: any) => {
    if (tagtogSsoEnabled) throw new Error('Accounts are managed through TAGTOG. Contact your workspace administrator.');
    try {
      await authService.register(data);
      toast.success(token ? `Account for "${data.username}" created successfully!` : 'Registration successful! Please login.');
      router.push(token ? '/dashboard' : '/login');
    } catch (error: any) { toast.error(error.message || 'Registration failed.'); throw error; }
  };

  const logout = async () => {
    if (isLoggingOutRef.current) return;
    isLoggingOutRef.current = true;
    const currentToken = token;
    try {
      if (tagtogSsoEnabled) {
        const response = await fetch('/api/tagtog/logout', { method: 'POST', credentials: 'same-origin', headers: crmAuthHeaders({ 'Content-Type': 'application/json' }), body: '{}' });
        if (!response.ok) throw new Error('CRM could not complete sign-out. Please retry.');
      } else if (currentToken) {
        await authService.logout(currentToken);
      }
      clearSession();
      setAuthError(null);
      router.replace('/login?signedOut=1');
      toast.info(tagtogSsoEnabled ? 'Signed out of CRM. Use TAGTOG to sign out of all workspaces.' : 'Logged out successfully.');
    } catch (error) {
      if (!tagtogSsoEnabled) { clearSession(); router.replace('/login'); }
      toast.error(error instanceof Error ? error.message : 'Sign-out is unavailable.');
    } finally { isLoggingOutRef.current = false; }
  };

  return <AuthContext.Provider value={{ user, token, isAuthenticated, isLoading, authError, login, register, logout, refreshUser, isAdmin, isManager, isUser }}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) throw new Error('useAuth must be used within an AuthProvider');
  return context;
};
