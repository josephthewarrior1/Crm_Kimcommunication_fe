import React, { useState, useEffect } from 'react';
import { AppUser } from '../../../../lib/types';
import { X, Loader2, Edit3, Eye, EyeOff, Lock } from 'lucide-react';

interface EditUserModalProps {
  isOpen: boolean;
  onClose: () => void;
  targetUser: AppUser | null;
  onSubmit: (id: number, data: { username: string; fullName: string; email: string; password?: string }) => Promise<void>;
  loading: boolean;
}

export const EditUserModal: React.FC<EditUserModalProps> = ({
  isOpen,
  onClose,
  targetUser,
  onSubmit,
  loading
}) => {
  const [username, setUsername] = useState('');
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  useEffect(() => {
    if (targetUser) {
      setUsername(targetUser.username || '');
      setFullName(targetUser.fullName || '');
      setEmail(targetUser.email || '');
      setPassword('');
      setConfirmPassword('');
      setShowPassword(false);
      setShowConfirmPassword(false);
    }
  }, [targetUser]);

  if (!isOpen || !targetUser) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (password !== confirmPassword) {
      return;
    }
    onSubmit(targetUser.id, {
      username,
      fullName,
      email,
      password: password.trim() || undefined
    });
  };

  return (
    <div className="ms-modal-overlay">
      <div className="ms-modal w-full max-w-md">
        <div className="ms-modal-header flex items-center gap-3 pr-14">
          <div className="flex min-w-0 items-center gap-2">
            <div className="p-2 bg-blue-50 text-blue-600 rounded-md">
              <Edit3 className="w-4 h-4" />
            </div>
            <div>
              <h3 className="ms-modal-title flex items-center gap-2">Edit User Details</h3>
              <p className="ms-modal-description">Update account profile info for @{targetUser.username}</p>
            </div>
          </div>
          <button onClick={onClose} className="ms-modal-close">
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="ms-modal-form">
          <div className="ms-modal-body space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Username</label>
            <input
              type="text"
              required
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="e.g. johndoe"
              className="w-full px-3.5 py-2 text-xs bg-slate-50 border border-slate-200 rounded-md focus:outline-none focus:border-blue-500 text-slate-800 font-medium"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Full Name</label>
            <input
              type="text"
              required
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              placeholder="e.g. John Doe"
              className="w-full px-3.5 py-2 text-xs bg-slate-50 border border-slate-200 rounded-md focus:outline-none focus:border-blue-500 text-slate-800 font-medium"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Email Address</label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="e.g. john@example.com"
              className="w-full px-3.5 py-2 text-xs bg-slate-50 border border-slate-200 rounded-md focus:outline-none focus:border-blue-500 text-slate-800 font-medium"
            />
          </div>

          <div className="rounded-lg border border-slate-200 bg-slate-50/70 p-4 space-y-4">
            <div className="flex items-center gap-2 text-slate-800">
              <Lock className="w-4 h-4 text-blue-600" />
              <div>
                <p className="text-xs font-semibold">Change Password</p>
                <p className="text-[11px] text-slate-500">Kosongkan kalau password tidak mau diubah.</p>
              </div>
            </div>

            <div className="min-w-0">
              <label className="block text-xs font-semibold text-slate-700 mb-1">New Password</label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Optional"
                  className="w-full px-3.5 pr-10 py-2 text-xs bg-white border border-slate-200 rounded-md focus:outline-none focus:border-blue-500 text-slate-800 font-medium"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((value) => !value)}
                  className="absolute inset-y-0 right-0 px-3 text-slate-400 hover:text-slate-600"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Confirm New Password</label>
              <div className="relative">
                <input
                  type={showConfirmPassword ? 'text' : 'password'}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Optional"
                  className="w-full px-3.5 pr-10 py-2 text-xs bg-white border border-slate-200 rounded-md focus:outline-none focus:border-blue-500 text-slate-800 font-medium"
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword((value) => !value)}
                  className="absolute inset-y-0 right-0 px-3 text-slate-400 hover:text-slate-600"
                >
                  {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {password && confirmPassword && password !== confirmPassword && (
              <p className="text-[10px] text-red-600 font-semibold">Passwords do not match.</p>
            )}
          </div>

          </div>
          <div className="ms-modal-footer">
            <button
              type="button"
              onClick={onClose}
              className="ms-modal-secondary"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading || password !== confirmPassword}
              className="ms-modal-primary"
            >
              {loading && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
              Save Changes
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
