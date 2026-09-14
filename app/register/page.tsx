'use client';

import React, { useState } from 'react';
import { useAuth } from '../../lib/context/AuthContext';
import { useRouter } from 'next/navigation';
import { UserPlus, User, Mail, Lock, ShieldCheck, Loader2, Eye, EyeOff, Shield } from 'lucide-react';
import { toast } from 'sonner';

export default function RegisterPage() {
  const { register, token } = useAuth();
  const router = useRouter();
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [fullName, setFullName] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [role, setRole] = useState('USER');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username.trim() || !email.trim() || !password || !confirmPassword) {
      toast.error('Username, email, password, and confirm password are required.');
      return;
    }

    if (password !== confirmPassword) {
      toast.error('Password confirmation does not match.');
      return;
    }

    setLoading(true);
    try {
      await register({
        username: username.trim(),
        email: email.trim(),
        fullName: fullName.trim() || undefined,
        password,
        roles: token ? [role] : undefined
      });
    } catch (err) {
      // Error handled inside AuthContext toast
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen min-h-dvh flex items-center justify-center bg-slate-50 p-4 sm:p-8">
      <div className="grid w-full max-w-5xl overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm lg:grid-cols-[0.8fr_1.2fr]">
        <aside className="hidden flex-col justify-between bg-[#464775] p-10 text-white lg:flex">
          <div className="flex items-center gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-md bg-white/15 text-lg font-semibold">K</span>
            <span className="text-sm font-semibold tracking-wide">KIM COMMUNICATION</span>
          </div>
          <div className="py-14">
            <div aria-hidden="true" className="mb-8 flex items-center gap-3">
              <div className="flex h-16 w-16 items-center justify-center rounded-lg bg-[#6264a7]"><UserPlus className="h-7 w-7" /></div>
              <span className="h-px w-8 bg-white/30" />
              <div className="flex h-12 w-12 items-center justify-center rounded-md border border-white/20 bg-white/10"><ShieldCheck className="h-5 w-5" /></div>
            </div>
            <h1 className="text-4xl font-semibold leading-tight tracking-tight">A workspace<br />for your team.</h1>
            <p className="mt-5 max-w-xs text-sm leading-6 text-white/80">Bring your team together to manage contacts, companies, and events.</p>
          </div>
          <p className="text-xs text-white/65">KIM CRM · Team workspace</p>
        </aside>

      <div className="min-w-0 px-6 py-8 sm:px-10 sm:py-10">
        <div className="mb-6">
          <div className="mb-6 flex items-center gap-3 lg:hidden">
            <span className="flex h-9 w-9 items-center justify-center rounded-md bg-blue-600 font-semibold text-white">K</span>
            <span className="text-sm font-semibold text-slate-900">KIM CRM</span>
          </div>
          <div className="mb-3 inline-flex rounded-md bg-blue-50 p-2.5 text-blue-600"><UserPlus className="h-5 w-5" /></div>
          <h2 className="text-2xl font-semibold tracking-tight text-slate-900">
            {token ? 'Create User Account' : 'Create Admin Account'}
          </h2>
          <p className="text-sm leading-6 text-slate-500 mt-2">
            {token ? 'Provision a new user account with role permissions.' : 'Register the primary administrator account.'}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="grid min-w-0 grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="min-w-0">
            <label htmlFor="register-username" className="block text-sm font-medium text-slate-700 mb-1.5">Username *</label>
            <div className="relative">
              <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-slate-400">
                <User className="w-5 h-5" />
              </span>
              <input
                id="register-username"
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="johndoe"
                className="w-full min-w-0 pl-10 pr-4 py-2.5 bg-white border border-slate-300 focus:border-blue-600 rounded-md text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-blue-600 transition-colors"
                required
              />
            </div>
          </div>

          <div className="min-w-0">
            <label htmlFor="register-email" className="block text-sm font-medium text-slate-700 mb-1.5">Email Address *</label>
            <div className="relative">
              <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-slate-400">
                <Mail className="w-5 h-5" />
              </span>
              <input
                id="register-email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="john@example.com"
                className="w-full min-w-0 pl-10 pr-4 py-2.5 bg-white border border-slate-300 focus:border-blue-600 rounded-md text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-blue-600 transition-colors"
                required
              />
            </div>
          </div>

          <div className="min-w-0 sm:col-span-2">
            <label htmlFor="register-full-name" className="block text-sm font-medium text-slate-700 mb-1.5">Full Name</label>
            <div className="relative">
              <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-slate-400">
                <ShieldCheck className="w-5 h-5" />
              </span>
              <input
                id="register-full-name"
                type="text"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="John Doe"
                className="w-full min-w-0 pl-10 pr-4 py-2.5 bg-white border border-slate-300 focus:border-blue-600 rounded-md text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-blue-600 transition-colors"
              />
            </div>
          </div>

          {token && (
            <div className="min-w-0 sm:col-span-2">
              <label htmlFor="register-role" className="block text-sm font-medium text-slate-700 mb-1.5">User Role *</label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-slate-400">
                  <Shield className="w-5 h-5" />
                </span>
                <select
                  id="register-role"
                  value={role}
                  onChange={(e) => setRole(e.target.value)}
                  className="w-full min-w-0 pl-10 pr-4 py-2.5 bg-white border border-slate-300 focus:border-blue-600 rounded-md text-sm text-slate-900 focus:outline-none focus:ring-1 focus:ring-blue-600 transition-colors"
                  required
                >
                  <option value="USER">USER (Read-only Dashboard, Events Check-in)</option>
                  <option value="MANAGER">PIC (Manage database, companies, events, groups)</option>
                  <option value="ADMIN">ADMIN (Full permissions, watchlists, removals)</option>
                </select>
              </div>
            </div>
          )}

          <div className="min-w-0">
            <label htmlFor="register-password" className="block text-sm font-medium text-slate-700 mb-1.5">Password *</label>
            <div className="relative">
              <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-slate-400">
                <Lock className="w-5 h-5" />
              </span>
              <input
                id="register-password"
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full min-w-0 pl-10 pr-11 py-2.5 bg-white border border-slate-300 focus:border-blue-600 rounded-md text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-blue-600 transition-colors"
                required
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                aria-label={showPassword ? 'Hide password' : 'Show password'}
                className="absolute inset-y-0 right-0 w-11 flex items-center justify-center rounded-r-md text-slate-500 hover:text-blue-600 focus-visible:outline focus-visible:outline-2 focus-visible:outline-blue-600 transition-colors"
              >
                {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
              </button>
            </div>
          </div>

          <div className="min-w-0">
            <label htmlFor="register-confirm-password" className="block text-sm font-medium text-slate-700 mb-1.5">Confirm Password *</label>
            <div className="relative">
              <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-slate-400">
                <Lock className="w-5 h-5" />
              </span>
              <input
                id="register-confirm-password"
                type={showConfirmPassword ? 'text' : 'password'}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full min-w-0 pl-10 pr-11 py-2.5 bg-white border border-slate-300 focus:border-blue-600 rounded-md text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-blue-600 transition-colors"
                required
              />
              <button
                type="button"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                aria-label={showConfirmPassword ? 'Hide confirm password' : 'Show confirm password'}
                className="absolute inset-y-0 right-0 w-11 flex items-center justify-center rounded-r-md text-slate-500 hover:text-blue-600 focus-visible:outline focus-visible:outline-2 focus-visible:outline-blue-600 transition-colors"
              >
                {showConfirmPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full min-h-11 py-2.5 px-4 bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white text-sm font-semibold rounded-md flex items-center justify-center gap-2 transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600 disabled:opacity-50 disabled:cursor-not-allowed mt-2 sm:col-span-2"
          >
            {loading ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                {token ? 'Creating Account...' : 'Registering Admin...'}
              </>
            ) : (
              token ? 'Create Account' : 'Register Admin'
            )}
          </button>
        </form>

        <div className="mt-6 text-sm text-slate-500 border-t border-slate-100 pt-5">
          {token ? (
            <button
              onClick={() => router.push('/dashboard')}
              className="rounded-sm font-semibold text-blue-600 hover:text-blue-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600 transition-colors"
            >
              ← Back to Dashboard
            </button>
          ) : (
            <>
              Already have an account?{' '}
              <button
                onClick={() => router.push('/login')}
                className="rounded-sm font-semibold text-blue-600 hover:text-blue-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600 transition-colors"
              >
                Sign in
              </button>
            </>
          )}
        </div>
      </div>
      </div>
    </div>
  );
}
