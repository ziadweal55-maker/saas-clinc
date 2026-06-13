import React, { useState } from 'react';
import { Building2, Mail, Lock, Phone, Palette, Hash, Loader2, ArrowRight } from 'lucide-react';

interface RegisterTenantViewProps {
  onComplete: (subdomain: string) => void;
  onBackToLogin: () => void;
}

export function RegisterTenantView({ onComplete, onBackToLogin }: RegisterTenantViewProps) {
  const [tenantId, setTenantId] = useState('');
  const [clinicName, setClinicName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [whatsappNumber, setWhatsappNumber] = useState('');
  const [primaryColor, setPrimaryColor] = useState('#C8102E');
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (!tenantId || !clinicName || !email || !password) {
      setError('Please fill in all required fields.');
      return;
    }

    if (tenantId.length < 3) {
      setError('Subdomain must be at least 3 characters.');
      return;
    }

    setLoading(true);

    try {
      // Access global registration endpoint via bridge or fetch directly
      const apiEndpoint = import.meta.env.VITE_API_URL 
        ? `${import.meta.env.VITE_API_URL.replace('/api/v1', '')}/api/v1/global/register`
        : 'http://127.0.0.1:3000/api/v1/global/register';

      const response = await fetch(apiEndpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          tenantId: tenantId.trim().toLowerCase(),
          clinicName: clinicName.trim(),
          email: email.trim(),
          password,
          whatsappNumber: whatsappNumber.trim() || null,
          primaryColor
        })
      });

      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(result.error || 'Registration failed.');
      }

      setSuccess(`Clinic successfully registered! Setting workspace...`);
      setTimeout(() => {
        onComplete(tenantId.trim().toLowerCase());
      }, 1500);
    } catch (err: any) {
      setError(err.message || 'An error occurred during registration.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-full bg-gradient-to-br from-slate-900 via-slate-800 to-indigo-950 flex items-center justify-center p-4 antialiased text-white">
      <div className="max-w-md w-full bg-slate-900/60 backdrop-blur-xl border border-slate-700/50 p-8 rounded-3xl shadow-2xl space-y-6">
        
        {/* Logo and Header */}
        <div className="text-center space-y-2">
          <div className="inline-flex p-4 bg-indigo-500/10 rounded-2xl border border-indigo-500/20 text-indigo-400">
            <Building2 size={36} />
          </div>
          <h2 className="text-2xl font-bold tracking-tight bg-gradient-to-r from-white via-indigo-200 to-indigo-400 bg-clip-text text-transparent">
            Register Your Clinic SaaS
          </h2>
          <p className="text-slate-400 text-sm">
            Launch your multi-branch online clinic workspace in seconds
          </p>
        </div>

        {error && (
          <div className="bg-red-500/10 border border-red-500/20 text-red-200 text-xs p-3 rounded-xl text-center">
            {error}
          </div>
        )}

        {success && (
          <div className="bg-green-500/10 border border-green-500/20 text-green-200 text-xs p-3 rounded-xl text-center">
            {success}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          
          {/* Subdomain Input */}
          <div className="space-y-1">
            <label className="text-xs font-semibold text-slate-300 block">Workspace Subdomain (URL prefix) *</label>
            <div className="relative">
              <span className="absolute left-3 top-2.5 text-slate-500 text-sm">@</span>
              <input
                type="text"
                placeholder="e.g. revive"
                value={tenantId}
                onChange={(e) => setTenantId(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ''))}
                required
                className="w-full pl-8 pr-28 py-2 bg-slate-850 border border-slate-700 rounded-xl text-sm focus:outline-none focus:border-indigo-500 placeholder-slate-600 text-white"
              />
              <span className="absolute right-3 top-2.5 text-xs text-slate-500">.yourdomain.com</span>
            </div>
          </div>

          {/* Clinic Name */}
          <div className="space-y-1">
            <label className="text-xs font-semibold text-slate-300 block">Clinic Name *</label>
            <div className="relative">
              <span className="absolute left-3 top-2.5 text-slate-500"><Building2 size={16} /></span>
              <input
                type="text"
                placeholder="e.g. Revive Physiotherapy"
                value={clinicName}
                onChange={(e) => setClinicName(e.target.value)}
                required
                className="w-full pl-9 pr-3 py-2 bg-slate-850 border border-slate-700 rounded-xl text-sm focus:outline-none focus:border-indigo-500 placeholder-slate-600 text-white"
              />
            </div>
          </div>

          {/* Admin Email */}
          <div className="space-y-1">
            <label className="text-xs font-semibold text-slate-300 block">Admin Username (Email) *</label>
            <div className="relative">
              <span className="absolute left-3 top-2.5 text-slate-500"><Mail size={16} /></span>
              <input
                type="email"
                placeholder="admin@clinic.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="w-full pl-9 pr-3 py-2 bg-slate-850 border border-slate-700 rounded-xl text-sm focus:outline-none focus:border-indigo-500 placeholder-slate-600 text-white"
              />
            </div>
          </div>

          {/* Password */}
          <div className="space-y-1">
            <label className="text-xs font-semibold text-slate-300 block">Admin Password *</label>
            <div className="relative">
              <span className="absolute left-3 top-2.5 text-slate-500"><Lock size={16} /></span>
              <input
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="w-full pl-9 pr-3 py-2 bg-slate-850 border border-slate-700 rounded-xl text-sm focus:outline-none focus:border-indigo-500 placeholder-slate-600 text-white"
              />
            </div>
          </div>

          {/* WhatsApp */}
          <div className="space-y-1">
            <label className="text-xs font-semibold text-slate-300 block">WhatsApp Number (For reminders)</label>
            <div className="relative">
              <span className="absolute left-3 top-2.5 text-slate-500"><Phone size={16} /></span>
              <input
                type="tel"
                placeholder="e.g. 201000000000"
                value={whatsappNumber}
                onChange={(e) => setWhatsappNumber(e.target.value)}
                className="w-full pl-9 pr-3 py-2 bg-slate-850 border border-slate-700 rounded-xl text-sm focus:outline-none focus:border-indigo-500 placeholder-slate-600 text-white"
              />
            </div>
          </div>

          {/* Theme Color */}
          <div className="space-y-1">
            <label className="text-xs font-semibold text-slate-300 block">Primary Brand Color</label>
            <div className="flex items-center space-x-3 bg-slate-850 border border-slate-700 rounded-xl p-2">
              <span className="text-slate-500 pl-1"><Palette size={16} /></span>
              <input
                type="color"
                value={primaryColor}
                onChange={(e) => setPrimaryColor(e.target.value)}
                className="h-7 w-12 bg-transparent border-0 cursor-pointer rounded"
              />
              <span className="text-xs text-slate-300 font-mono uppercase">{primaryColor}</span>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full mt-4 bg-indigo-600 hover:bg-indigo-500 active:bg-indigo-700 text-white py-2.5 px-4 rounded-xl text-sm font-semibold flex items-center justify-center space-x-2 transition-all disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
          >
            {loading ? (
              <>
                <Loader2 size={16} className="animate-spin" />
                <span>Provisioning Database...</span>
              </>
            ) : (
              <>
                <span>Launch Workspace</span>
                <ArrowRight size={16} />
              </>
            )}
          </button>
        </form>

        <div className="text-center">
          <button
            onClick={onBackToLogin}
            className="text-xs text-slate-400 hover:text-indigo-400 transition cursor-pointer"
          >
            Back to Login Screen
          </button>
        </div>
      </div>
    </div>
  );
}
