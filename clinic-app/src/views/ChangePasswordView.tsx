import React, { useState } from 'react';
import { Lock, Loader2, LogOut, ShieldAlert } from 'lucide-react';
import { User as UserType } from '../types';

interface ChangePasswordViewProps {
  currentUser: UserType;
  onComplete: (user: UserType) => void;
  onLogout: () => void;
}

export function ChangePasswordView({ currentUser, onComplete, onLogout }: ChangePasswordViewProps) {
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!currentPassword || !newPassword || !confirmPassword) {
      setError('Please fill in all fields.');
      return;
    }

    if (newPassword.length < 6) {
      setError('New password must be at least 6 characters.');
      return;
    }

    if (newPassword !== confirmPassword) {
      setError('New passwords do not match.');
      return;
    }

    setLoading(true);

    try {
      const res = await window.api.changePassword({ currentPassword, newPassword });
      if (res.success) {
        onComplete({ ...currentUser, requirePasswordChange: false });
      } else {
        setError(res.error || 'Failed to change password. Please verify your temporary password.');
      }
    } catch (err: any) {
      setError(err.message || 'An error occurred while changing password.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-full bg-gradient-to-br from-slate-900 via-slate-800 to-indigo-950 flex items-center justify-center p-4 antialiased text-white">
      <div className="max-w-md w-full bg-slate-900/60 backdrop-blur-xl border border-slate-700/50 p-8 rounded-3xl shadow-2xl space-y-6">
        
        {/* Header */}
        <div className="text-center space-y-2">
          <div className="inline-flex p-4 bg-amber-500/10 rounded-2xl border border-amber-500/20 text-amber-400">
            <ShieldAlert size={36} />
          </div>
          <h2 className="text-2xl font-bold tracking-tight bg-gradient-to-r from-white via-indigo-200 to-indigo-400 bg-clip-text text-transparent">
            Password Change Required
          </h2>
          <p className="text-slate-400 text-sm">
            For security, you must change your temporary password before accessing your workspace.
          </p>
        </div>

        {error && (
          <div className="bg-red-500/10 border border-red-500/20 text-red-200 text-xs p-3 rounded-xl text-center">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          
          {/* Current/Temporary Password */}
          <div className="space-y-1">
            <label className="text-xs font-semibold text-slate-300 block">Temporary / Current Password *</label>
            <div className="relative">
              <span className="absolute left-3 top-2.5 text-slate-500"><Lock size={16} /></span>
              <input
                type="password"
                placeholder="Enter temporary password"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                required
                className="w-full pl-9 pr-3 py-2 bg-slate-800/80 border border-slate-700 rounded-xl text-sm focus:outline-none focus:border-indigo-500 placeholder-slate-600 text-white"
              />
            </div>
          </div>

          {/* New Password */}
          <div className="space-y-1">
            <label className="text-xs font-semibold text-slate-300 block">New Password (min 6 chars) *</label>
            <div className="relative">
              <span className="absolute left-3 top-2.5 text-slate-500"><Lock size={16} /></span>
              <input
                type="password"
                placeholder="Enter new password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                required
                className="w-full pl-9 pr-3 py-2 bg-slate-800/80 border border-slate-700 rounded-xl text-sm focus:outline-none focus:border-indigo-500 placeholder-slate-600 text-white"
              />
            </div>
          </div>

          {/* Confirm New Password */}
          <div className="space-y-1">
            <label className="text-xs font-semibold text-slate-300 block">Confirm New Password *</label>
            <div className="relative">
              <span className="absolute left-3 top-2.5 text-slate-500"><Lock size={16} /></span>
              <input
                type="password"
                placeholder="Re-enter new password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
                className="w-full pl-9 pr-3 py-2 bg-slate-800/80 border border-slate-700 rounded-xl text-sm focus:outline-none focus:border-indigo-500 placeholder-slate-600 text-white"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-bold py-2.5 px-4 rounded-xl text-sm transition-all duration-200 active:scale-[0.98] disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {loading ? <Loader2 className="animate-spin" size={16} /> : 'Update Password & Enter Workspace'}
          </button>
        </form>

        <div className="pt-2 border-t border-slate-800">
          <button
            onClick={onLogout}
            className="w-full bg-transparent hover:bg-slate-800 text-slate-400 hover:text-white font-semibold py-2 px-4 rounded-xl text-xs transition-all flex items-center justify-center gap-2"
          >
            <LogOut size={14} /> Cancel & Logout
          </button>
        </div>

      </div>
    </div>
  );
}
