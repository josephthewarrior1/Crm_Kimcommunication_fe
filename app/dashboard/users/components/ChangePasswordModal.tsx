import React, { useState } from 'react';
import { X, Lock, Eye, EyeOff, Loader2 } from 'lucide-react';
import { AppUser } from '../../../../lib/types';

interface ChangePasswordModalProps {
  isOpen: boolean;
  onClose: () => void;
  targetUser: AppUser;
  onSubmit: (password: string) => Promise<void>;
  loading: boolean;
}

export const ChangePasswordModal: React.FC<ChangePasswordModalProps> = ({
  isOpen,
  onClose,
  targetUser,
  onSubmit,
  loading
}) => {
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (password !== confirmPassword) {
      return;
    }
    onSubmit(password.trim());
  };

  return (
    <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-white border border-slate-200 rounded-2xl shadow-xl relative animate-in scale-in duration-200 text-slate-900">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
          <h3 className="text-lg font-extrabold text-slate-900 flex items-center gap-2">
            <Lock className="w-5 h-5 text-blue-650" />
            Change Password
          </h3>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 transition-colors p-1.5 hover:bg-slate-55 rounded-lg"
            type="button"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div className="text-xs text-slate-500 bg-slate-55 border border-slate-100 rounded-xl p-3 mb-2 font-medium">
            You are updating the password for user <span className="font-extrabold text-slate-800">@{targetUser.username}</span> ({targetUser.fullName || targetUser.email}).
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">New Password *</label>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full pl-3 pr-10 py-2 bg-slate-55 border border-slate-200 focus:border-blue-500 rounded-xl text-slate-900 placeholder-slate-400 focus:outline-none transition-all text-xs"
                required
              />
              <button
                type="button"
                onClick={() => setShowPassword((val) => !val)}
                className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-650 transition-colors"
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Confirm New Password *</label>
            <div className="relative">
              <input
                type={showConfirmPassword ? 'text' : 'password'}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full pl-3 pr-10 py-2 bg-slate-55 border border-slate-200 focus:border-blue-500 rounded-xl text-slate-900 placeholder-slate-400 focus:outline-none transition-all text-xs"
                required
              />
              <button
                type="button"
                onClick={() => setShowConfirmPassword((val) => !val)}
                className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-650 transition-colors"
              >
                {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {password && confirmPassword && password !== confirmPassword && (
            <p className="text-[10px] text-red-600 font-extrabold">Passwords do not match.</p>
          )}

          <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="px-4 py-2 bg-slate-105 hover:bg-slate-200 active:bg-slate-300 text-slate-700 text-xs font-bold rounded-xl transition-all"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading || (password !== confirmPassword)}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-500 active:bg-blue-700 text-white text-xs font-bold rounded-xl flex items-center gap-1.5 shadow-md shadow-blue-600/10 transition-all disabled:opacity-50"
            >
              {loading && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
              Change Password
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
