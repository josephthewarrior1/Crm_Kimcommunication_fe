'use client';

import React, { useState } from 'react';
import { useAuth } from '../../lib/context/AuthContext';
import Link from 'next/navigation';
import { useRouter } from 'next/navigation';
import { LogIn, User, Lock, Loader2, Eye, EyeOff } from 'lucide-react';
import { toast } from 'sonner';

export default function LoginPage() {
  const { login } = useAuth();
  const router = useRouter();
  const [usernameOrEmail, setUsernameOrEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!usernameOrEmail.trim() || !password) {
      toast.error('Please enter both username/email and password.');
      return;
    }

    setLoading(true);
    try {
      await login({ usernameOrEmail: usernameOrEmail.trim(), password });
    } catch (err) {
      // Error handled inside AuthContext toast
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen min-h-dvh flex items-center justify-center bg-slate-50 p-4 sm:p-8">
      <div className="grid w-full max-w-5xl overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm lg:grid-cols-[0.95fr_1fr]">
        <aside className="hidden flex-col justify-between bg-[#464775] p-10 text-white lg:flex">
          <div className="flex items-center gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-md bg-white/15 text-lg font-semibold">K</span>
            <span className="text-sm font-semibold tracking-wide">KIM COMMUNICATION</span>
          </div>
          <div className="py-14">
            <div aria-hidden="true" className="mb-8 flex items-center gap-3">
              <div className="flex h-16 w-16 items-center justify-center rounded-lg bg-[#6264a7] shadow-sm"><User className="h-7 w-7" /></div>
              <span className="h-px w-8 bg-white/30" />
              <div className="flex h-12 w-12 items-center justify-center rounded-md border border-white/20 bg-white/10"><LogIn className="h-5 w-5" /></div>
            </div>
            <h1 className="text-4xl font-semibold leading-tight tracking-tight">Your team.<br />One workspace.</h1>
            <p className="mt-5 max-w-xs text-sm leading-6 text-white/80">Keep your contacts, companies, and events together in KIM CRM.</p>
          </div>
          <p className="text-xs text-white/65">KIM CRM · Team workspace</p>
        </aside>

      <div className="min-w-0 px-6 py-10 sm:px-10 sm:py-14 lg:px-12">
        <div className="mb-8">
          <div className="mb-8 flex items-center gap-3 text-slate-900 lg:hidden">
            <span className="flex h-9 w-9 items-center justify-center rounded-md bg-blue-600 text-base font-semibold text-white">K</span>
            <span className="text-sm font-semibold">KIM CRM</span>
          </div>
          <div className="mb-4 inline-flex rounded-md bg-blue-50 p-2.5 text-blue-600"><LogIn className="h-5 w-5" /></div>
          <h2 className="text-2xl font-semibold tracking-tight text-slate-900">Welcome back</h2>
          <p className="text-sm leading-6 text-slate-500 mt-2">Sign in to manage leads, events, and holding companies.</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label htmlFor="login-username" className="block text-sm font-medium text-slate-700 mb-2">Username or Email</label>
            <div className="relative">
              <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-slate-400">
                <User className="w-5 h-5" />
              </span>
              <input
                id="login-username"
                type="text"
                value={usernameOrEmail}
                onChange={(e) => setUsernameOrEmail(e.target.value)}
                placeholder="Enter username or email"
                className="w-full min-w-0 pl-10 pr-4 py-2.5 bg-white border border-slate-300 focus:border-blue-600 rounded-md text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-blue-600 transition-colors"
                required
              />
            </div>
          </div>

          <div>
            <label htmlFor="login-password" className="block text-sm font-medium text-slate-700 mb-2">Password</label>
            <div className="relative">
              <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-slate-400">
                <Lock className="w-5 h-5" />
              </span>
              <input
                id="login-password"
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full min-w-0 pl-10 pr-11 py-2.5 bg-white border border-slate-300 focus:border-blue-600 rounded-md text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-blue-600 transition-colors"
                required
              />
              <button
                type="button"
                onClick={() => setShowPassword((value) => !value)}
                aria-label={showPassword ? 'Hide password' : 'Show password'}
                className="absolute inset-y-0 right-0 w-11 flex items-center justify-center rounded-r-md text-slate-500 hover:text-blue-600 focus-visible:outline focus-visible:outline-2 focus-visible:outline-blue-600 transition-colors"
              >
                {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full min-h-11 py-2.5 px-4 bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white text-sm font-semibold rounded-md flex items-center justify-center gap-2 transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                Signing in...
              </>
            ) : (
              'Sign In'
            )}
          </button>
        </form>
        <p className="mt-8 border-t border-slate-100 pt-5 text-xs leading-5 text-slate-500">KIM Communication · Customer relationship management</p>
      </div>
      </div>
    </div>
  );
}
