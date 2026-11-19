'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '../lib/context/AuthContext';
import { tagtogSsoEnabled } from '../lib/utils/tagtogAuth';

export default function Home() {
  const { isAuthenticated, isLoading, authError } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!isLoading) {
      if (isAuthenticated) {
        router.push('/dashboard');
      } else {
        router.push(tagtogSsoEnabled && authError ? '/login?ssoError=unavailable' : '/login');
      }
    }
  }, [isAuthenticated, isLoading, authError, router]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 text-slate-900">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary mx-auto mb-4"></div>
        <p className="text-sm text-slate-500 font-mono">{tagtogSsoEnabled ? 'Memuat TAGTOG CRM…' : 'Loading KIM CRM...'}</p>
      </div>
    </div>
  );
}
