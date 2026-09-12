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
    <div className="ms-modal-overlay">
      <div className="ms-modal w-full max-w-md">
        <div className="ms-modal-header flex items-center gap-3 pr-14">
          <h3 className="ms-modal-title flex items-center gap-2">
            <Lock className="w-5 h-5 text-blue-650" />
            Change Password
          </h3>
          <button
            onClick={onClose}
            className="ms-modal-close"
            type="button"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="ms-modal-form">
          <div className="ms-modal-body space-y-4">
          <div className="text-xs text-slate-500 bg-slate-55 border border-slate-100 rounded-md p-3 mb-2 font-medium">
            You are updating the password for user <span className="font-semibold text-slate-800">@{targetUser.username}</span> ({targetUser.fullName || targetUser.email}).
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">New Password *</label>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full pl-3 pr-10 py-2 bg-slate-55 border border-slate-200 focus:border-blue-500 rounded-md text-slate-900 placeholder-slate-400 focus:outline-none transition-all text-xs"
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
                className="w-full pl-3 pr-10 py-2 bg-slate-55 border border-slate-200 focus:border-blue-500 rounded-md text-slate-900 placeholder-slate-400 focus:outline-none transition-all text-xs"
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
            <p className="text-[10px] text-red-600 font-semibold">Passwords do not match.</p>
          )}

          </div>
          <div className="ms-modal-footer">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="ms-modal-secondary"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading || (password !== confirmPassword)}
              className="ms-modal-primary"
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
