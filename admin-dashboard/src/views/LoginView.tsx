import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { adminApi } from '../api/adminApi';
import { useToast } from '../components/Toast';

const LoginView: React.FC = () => {
  const navigate = useNavigate();
  const { showToast } = useToast();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    // Basic client-side validation — server validates authoritatively
    if (!email.trim() || !password) {
      setError('Please enter your email and password.');
      return;
    }

    setLoading(true);
    try {
      const res = await adminApi.login(email.trim(), password);
      const data = res.data?.data ?? res.data;
      const token = data?.token ?? data?.access_token;
      const user = data?.user ?? data?.admin;

      if (!token) {
        setError('Invalid response from server. Please try again.');
        return;
      }

      // TODO(security): Migrate to HttpOnly cookie auth on backend for zero XSS token exposure.
      // Current approach stores JWT in localStorage which is acceptable for this internal admin
      // tool served over HTTPS with strict network access controls.
      localStorage.setItem('admin_token', token);
      localStorage.setItem('admin_user', JSON.stringify(user ?? { email }));

      showToast('Welcome back!', 'success');
      navigate('/overview');
    } catch (err: unknown) {
      // Display generic error — do NOT expose server error details to UI
      const axiosErr = err as { response?: { data?: { message?: string } } };
      const msg = axiosErr?.response?.data?.message;
      // Only show safe server messages; fall back to generic
      setError(msg && typeof msg === 'string' && msg.length < 120
        ? msg
        : 'Invalid credentials. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-page">
      <div className="login-box">
        <div className="login-logo">
          <span className="emoji">🏥</span>
          <h1>SaaS Clinic Admin</h1>
          <p>Super Admin Control Panel</p>
        </div>

        {error && (
          <div className="login-error" role="alert">
            {/* Safe text — React JSX escapes all content */}
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} autoComplete="off">
          <div className="form-group">
            <label className="form-label" htmlFor="email">Email Address</label>
            <input
              id="email"
              type="email"
              className="form-input"
              placeholder="admin@saasclinic.com"
              value={email}
              onChange={e => setEmail(e.target.value)}
              required
              autoComplete="username"
              maxLength={254}
            />
          </div>
          <div className="form-group">
            <label className="form-label" htmlFor="password">Password</label>
            <input
              id="password"
              type="password"
              className="form-input"
              placeholder="••••••••"
              value={password}
              onChange={e => setPassword(e.target.value)}
              required
              autoComplete="current-password"
              maxLength={128}
            />
          </div>
          <button
            type="submit"
            className="btn btn-primary w-full"
            disabled={loading}
            style={{ justifyContent: 'center', marginTop: 8, padding: '13px 18px', fontSize: 14 }}
          >
            {loading ? (
              <>
                <span className="spinner" style={{ width: 16, height: 16 }} />
                Signing in…
              </>
            ) : (
              <>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M15 3h4a2 2 0 012 2v14a2 2 0 01-2 2h-4" />
                  <polyline points="10 17 15 12 10 7" /><line x1="15" y1="12" x2="3" y2="12" />
                </svg>
                Sign In
              </>
            )}
          </button>
        </form>

        <p style={{ textAlign: 'center', marginTop: 24, fontSize: 11, color: 'var(--text-muted)' }}>
          Access restricted to authorized administrators only.
        </p>
      </div>
    </div>
  );
};

export default LoginView;
