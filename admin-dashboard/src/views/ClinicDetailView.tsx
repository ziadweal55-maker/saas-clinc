import React, { useEffect, useState, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { adminApi } from '../api/adminApi';
import { useToast } from '../components/Toast';

interface Tenant {
  id: string;
  name: string;
  subdomain: string;
  email: string;
  status: string;
  createdAt: string;
  plan?: { id: string; name: string; price: number } | string;
}

interface HealthCheck {
  key: string;
  label: string;
  passed: boolean;
}

interface Feature {
  key: string;
  label: string;
  description: string;
  locked?: boolean;
}

interface UsageData {
  storageBytes?: number;
  storageLimitBytes?: number;
  patients?: number;
  appointments?: number;
  sessions?: number;
  payments?: number;
  users?: number;
  doctors?: number;
}

interface SubscriptionData {
  planId?: string;
  planName?: string;
  trialEndsAt?: string;
  subscriptionEndsAt?: string;
  paymentHistory?: Array<{
    id: string;
    date: string;
    amount: number;
    status: string;
    paymobId?: string;
  }>;
}

interface HistoryEntry {
  id: string;
  changedBy?: string;
  oldStatus?: string;
  newStatus: string;
  reason?: string;
  createdAt: string;
}

const FEATURES: Feature[] = [
  { key: 'calendar', label: 'Calendar & Scheduling', description: 'Appointment scheduling and calendar view', locked: true },
  { key: 'patients', label: 'Patient Management', description: 'Patient records, details, and history', locked: true },
  { key: 'reports', label: 'Reports & Analytics', description: 'Practice dashboard reports and analytics' },
  { key: 'finance', label: 'Finance & Payments', description: 'Billing, invoicing, salary records, loans, and waste items' },
  { key: 'assessments', label: 'Clinic Assessments', description: 'Clinical assessments, pain scale monitoring, and critical alerts' },
  { key: 'exercises', label: 'Exercise Library', description: 'Standard clinical exercise assignments and session logs' },
  { key: 'investigations', label: 'Diagnostic Investigations', description: 'Diagnostic investigation library and custom biomarker panels' },
  { key: 'ai_assistant', label: 'Revive AI Assist', description: 'AI clinical analysis assistant for doctors and staff' },
  { key: 'attendance', label: 'Shift Attendance', description: 'Staff check-in, check-out, and attendance logs' },
  { key: 'branches', label: 'Multi-Branch Support', description: 'Manage multiple clinic branches and allow branch switching' },
  { key: 'users', label: 'User & Role Management', description: 'Create team members, manage permissions, and approve requests' },
];

const TABS = ['overview', 'features', 'usage', 'subscription', 'history'] as const;
type DetailTab = typeof TABS[number];

const statusBadge = (status: string) => {
  const cls: Record<string, string> = {
    active: 'badge-active',
    pending: 'badge-pending',
    suspended: 'badge-suspended',
    rejected: 'badge-rejected',
  };
  return <span className={`badge ${cls[status] ?? 'badge-rejected'}`}>{status}</span>;
};

const formatBytes = (bytes: number) => {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
};

const ClinicDetailView: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { showToast } = useToast();

  const [tenant, setTenant] = useState<Tenant | null>(null);
  const [activeTab, setActiveTab] = useState<DetailTab>('overview');
  const [loading, setLoading] = useState(true);

  // Features state
  const [features, setFeatures] = useState<Record<string, boolean>>({});
  const [featuresLoading, setFeaturesLoading] = useState(false);

  // Usage state
  const [usage, setUsage] = useState<UsageData | null>(null);
  const [health, setHealth] = useState<HealthCheck[]>([]);

  // Subscription state
  const [subscription, setSubscription] = useState<SubscriptionData | null>(null);
  const [plans, setPlans] = useState<Array<{ id: string; name: string; price: number }>>([]);
  const [extendDays, setExtendDays] = useState('');
  const [subLoading, setSubLoading] = useState(false);

  // History state
  const [history, setHistory] = useState<HistoryEntry[]>([]);

  // Action loading
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  // Reject modal
  const [rejectModal, setRejectModal] = useState(false);
  const [rejectReason, setRejectReason] = useState('');
  const [suspendModal, setSuspendModal] = useState(false);
  const [suspendReason, setSuspendReason] = useState('');

  const fetchTenant = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    try {
      const res = await adminApi.getTenant(id);
      const d = res.data?.data ?? res.data;
      setTenant(d);
      // Init features from tenant data
      setFeatures(d?.features ?? {});
    } catch {
      showToast('Failed to load clinic details', 'error');
    } finally {
      setLoading(false);
    }
  }, [id, showToast]);

  useEffect(() => { fetchTenant(); }, [fetchTenant]);

  useEffect(() => {
    if (!id) return;
    if (activeTab === 'usage') {
      Promise.all([adminApi.getTenantUsage(id), adminApi.getTenantHealth(id)])
        .then(([uRes, hRes]) => {
          setUsage(uRes.data?.data ?? uRes.data);
          const hd = hRes.data?.data ?? hRes.data;
          setHealth(Array.isArray(hd) ? hd : (hd?.checks ?? []));
        })
        .catch(() => showToast('Failed to load usage data', 'error'));
    } else if (activeTab === 'subscription') {
      Promise.all([adminApi.getSubscription(id), adminApi.listPlans()])
        .then(([sRes, pRes]) => {
          setSubscription(sRes.data?.data ?? sRes.data);
          const pd = pRes.data?.data ?? pRes.data;
          setPlans(Array.isArray(pd) ? pd : (pd?.plans ?? []));
        })
        .catch(() => showToast('Failed to load subscription data', 'error'));
    } else if (activeTab === 'history') {
      adminApi.getTenantHistory(id)
        .then(res => {
          const d = res.data?.data ?? res.data;
          setHistory(Array.isArray(d) ? d : (d?.history ?? []));
        })
        .catch(() => showToast('Failed to load history', 'error'));
    }
  }, [activeTab, id, showToast]);

  const handleAction = async (action: 'approve' | 'suspend' | 'reactivate' | 'reject') => {
    if (!id) return;
    setActionLoading(action);
    try {
      if (action === 'approve') {
        await adminApi.approveTenant(id);
        showToast('Clinic approved!', 'success');
      } else if (action === 'reactivate') {
        await adminApi.updateStatus(id, 'active', 'Reactivated by admin');
        showToast('Clinic reactivated!', 'success');
      } else if (action === 'suspend') {
        await adminApi.updateStatus(id, 'suspended', suspendReason.trim() || 'Suspended by admin');
        showToast('Clinic suspended', 'success');
        setSuspendModal(false);
        setSuspendReason('');
      } else if (action === 'reject') {
        await adminApi.rejectTenant(id, rejectReason.trim());
        showToast('Clinic rejected', 'success');
        setRejectModal(false);
        setRejectReason('');
      }
      fetchTenant();
    } catch {
      showToast(`Failed to ${action} clinic`, 'error');
    } finally {
      setActionLoading(null);
    }
  };

  const handleSaveFeatures = async () => {
    if (!id) return;
    setFeaturesLoading(true);
    try {
      await adminApi.updateFeatures(id, features);
      showToast('Features updated!', 'success');
    } catch {
      showToast('Failed to update features', 'error');
    } finally {
      setFeaturesLoading(false);
    }
  };

  const handleImpersonate = async () => {
    if (!id) return;
    setActionLoading('impersonate');
    try {
      const res = await adminApi.impersonateTenant(id);
      const d = res.data?.data ?? res.data;
      const url = d?.url ?? `https://${tenant?.subdomain}.saasclinic.com?token=${d?.token}`;
      window.open(url, '_blank', 'noopener,noreferrer');
      showToast('Impersonation session started', 'info');
    } catch {
      showToast('Failed to impersonate tenant', 'error');
    } finally {
      setActionLoading(null);
    }
  };

  const handleChangePlan = async (planId: string) => {
    if (!id) return;
    setSubLoading(true);
    try {
      await adminApi.updateSubscription(id, { planId });
      showToast('Plan updated!', 'success');
      const res = await adminApi.getSubscription(id);
      setSubscription(res.data?.data ?? res.data);
    } catch {
      showToast('Failed to update plan', 'error');
    } finally {
      setSubLoading(false);
    }
  };

  const handleExtendTrial = async () => {
    if (!id || !extendDays) return;
    const days = parseInt(extendDays, 10);
    if (isNaN(days) || days <= 0 || days > 365) {
      showToast('Enter a valid number of days (1–365)', 'error');
      return;
    }
    setSubLoading(true);
    try {
      await adminApi.updateSubscription(id, { extendTrialDays: days });
      showToast(`Trial extended by ${days} days!`, 'success');
      setExtendDays('');
      const res = await adminApi.getSubscription(id);
      setSubscription(res.data?.data ?? res.data);
    } catch {
      showToast('Failed to extend trial', 'error');
    } finally {
      setSubLoading(false);
    }
  };

  const healthScore = health.length > 0
    ? Math.round((health.filter(h => h.passed).length / health.length) * 100)
    : 0;

  const scoreColor = healthScore >= 80
    ? 'var(--success)'
    : healthScore >= 50
    ? 'var(--warning)'
    : 'var(--danger)';

  if (loading) {
    return (
      <div className="page">
        <div className="loading-center"><div className="spinner spinner-lg" /></div>
      </div>
    );
  }

  if (!tenant) {
    return (
      <div className="page">
        <div className="empty-state">
          <h3>Clinic not found</h3>
          <button className="btn btn-primary" style={{ marginTop: 16 }} onClick={() => navigate('/clinics')}>Back to Clinics</button>
        </div>
      </div>
    );
  }

  const planName = typeof tenant.plan === 'string' ? tenant.plan : (tenant.plan?.name ?? '—');

  return (
    <div className="page">
      {/* Back */}
      <button className="back-btn" onClick={() => navigate('/clinics')}>
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="15 18 9 12 15 6" />
        </svg>
        Back to Clinics
      </button>

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 28, flexWrap: 'wrap', gap: 16 }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
            <h2 style={{ fontSize: 26, fontWeight: 900, letterSpacing: '-0.5px' }}>{tenant.name}</h2>
            <span style={{ fontFamily: 'monospace', background: 'var(--surface-2)', border: '1px solid var(--border)', padding: '3px 10px', borderRadius: 8, fontSize: 12 }}>
              {tenant.subdomain}
            </span>
            {statusBadge(tenant.status)}
          </div>
          <p style={{ color: 'var(--text-muted)', fontSize: 13, marginTop: 6 }}>
            {tenant.email} · Registered {new Date(tenant.createdAt).toLocaleDateString()} · Plan: <strong style={{ color: 'var(--text-secondary)' }}>{planName}</strong>
          </p>
        </div>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          {tenant.status === 'pending' && (
            <button
              className="btn btn-success"
              disabled={actionLoading === 'approve'}
              onClick={() => handleAction('approve')}
            >
              {actionLoading === 'approve' ? <span className="spinner" style={{ width: 14, height: 14 }} /> : '✓ Approve'}
            </button>
          )}
          {tenant.status === 'pending' && (
            <button className="btn btn-danger" onClick={() => setRejectModal(true)}>❌ Reject</button>
          )}
          {tenant.status === 'active' && (
            <button className="btn btn-warning" onClick={() => setSuspendModal(true)}>⏸ Suspend</button>
          )}
          {tenant.status === 'suspended' && (
            <button
              className="btn btn-success"
              disabled={actionLoading === 'reactivate'}
              onClick={() => handleAction('reactivate')}
            >
              {actionLoading === 'reactivate' ? <span className="spinner" style={{ width: 14, height: 14 }} /> : '▶ Reactivate'}
            </button>
          )}
          <button
            className="btn btn-ghost"
            disabled={actionLoading === 'impersonate'}
            onClick={handleImpersonate}
          >
            {actionLoading === 'impersonate' ? <span className="spinner" style={{ width: 14, height: 14 }} /> : '👤 Impersonate'}
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="tabs">
        {TABS.map(tab => (
          <button
            key={tab}
            className={`tab${activeTab === tab ? ' active' : ''}`}
            onClick={() => setActiveTab(tab)}
          >
            {tab.charAt(0).toUpperCase() + tab.slice(1)}
          </button>
        ))}
      </div>

      {/* Tab: Overview */}
      {activeTab === 'overview' && (
        <div>
          <div className="grid-2">
            <div className="card">
              <div className="card-header">
                <span className="card-title">Clinic Information</span>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {[
                  ['Name', tenant.name],
                  ['Subdomain', tenant.subdomain],
                  ['Email', tenant.email],
                  ['Status', tenant.status],
                  ['Plan', planName],
                  ['Registered', new Date(tenant.createdAt).toLocaleString()],
                ].map(([label, value]) => (
                  <div key={label} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, borderBottom: '1px solid var(--border)', paddingBottom: 8 }}>
                    <span style={{ color: 'var(--text-muted)', fontWeight: 600 }}>{label}</span>
                    <span style={{ color: 'var(--text)' }}>{value}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="card">
              <div className="card-header">
                <span className="card-title">Onboarding Health</span>
                <div style={{
                  width: 64, height: 64, borderRadius: '50%',
                  background: `conic-gradient(${scoreColor} ${healthScore * 3.6}deg, var(--border) 0deg)`,
                  display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative'
                }}>
                  <div style={{
                    width: 50, height: 50, borderRadius: '50%', background: 'var(--surface-2)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 12, fontWeight: 800, color: scoreColor
                  }}>
                    {healthScore}%
                  </div>
                </div>
              </div>
              {health.length === 0 ? (
                <p style={{ color: 'var(--text-muted)', fontSize: 13 }}>
                  Switch to the Usage tab to load health data.
                </p>
              ) : (
                <div className="health-checks">
                  {health.map((h, i) => (
                    <div key={i} className="health-check-item">
                      <span style={{ fontSize: 16 }}>{h.passed ? '✅' : '❌'}</span>
                      <span>{h.label ?? h.key}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Tab: Features */}
      {activeTab === 'features' && (
        <div>
          <div className="card">
            <div className="card-header">
              <span className="card-title">Feature Toggles</span>
              <button
                className="btn btn-primary btn-sm"
                disabled={featuresLoading}
                onClick={handleSaveFeatures}
              >
                {featuresLoading ? <span className="spinner" style={{ width: 14, height: 14 }} /> : '💾 Save Changes'}
              </button>
            </div>
            <div className="features-grid">
              {FEATURES.map(f => (
                <div key={f.key} className="feature-item">
                  <div className="feature-info">
                    <div className="feature-name">
                      {f.locked && <span style={{ fontSize: 12, marginRight: 4 }}>🔒</span>}
                      {f.label}
                    </div>
                    <div className="feature-desc">{f.description}</div>
                  </div>
                  <label className="toggle">
                    <input
                      type="checkbox"
                      checked={f.locked ? true : (features[f.key] ?? false)}
                      disabled={f.locked}
                      onChange={e => {
                        if (f.locked) return;
                        setFeatures(prev => ({ ...prev, [f.key]: e.target.checked }));
                      }}
                    />
                    <span className="toggle-slider" />
                  </label>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Tab: Usage */}
      {activeTab === 'usage' && (
        <div>
          {!usage ? (
            <div className="loading-center"><div className="spinner" /></div>
          ) : (
            <>
              <div className="card" style={{ marginBottom: 16 }}>
                <div className="card-header">
                  <span className="card-title">Storage Usage</span>
                  <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                    {formatBytes(usage.storageBytes ?? 0)} / {formatBytes(usage.storageLimitBytes ?? 1073741824)}
                  </span>
                </div>
                <div className="progress-bar">
                  <div
                    className="progress-fill"
                    style={{
                      width: `${Math.min(100, ((usage.storageBytes ?? 0) / (usage.storageLimitBytes ?? 1073741824)) * 100).toFixed(1)}%`,
                      background: 'linear-gradient(90deg, var(--primary), #a78bfa)',
                    }}
                  />
                </div>
              </div>

              <div className="card">
                <div className="card-header">
                  <span className="card-title">Record Counts</span>
                </div>
                <div className="usage-grid">
                  {[
                    ['Patients', usage.patients ?? 0],
                    ['Appointments', usage.appointments ?? 0],
                    ['Sessions', usage.sessions ?? 0],
                    ['Payments', usage.payments ?? 0],
                    ['Users', usage.users ?? 0],
                    ['Doctors', usage.doctors ?? 0],
                  ].map(([label, value]) => (
                    <div key={label} className="usage-card">
                      <div className="usage-value">{Number(value).toLocaleString()}</div>
                      <div className="usage-label">{label}</div>
                    </div>
                  ))}
                </div>
              </div>
            </>
          )}
        </div>
      )}

      {/* Tab: Subscription */}
      {activeTab === 'subscription' && (
        <div>
          {!subscription ? (
            <div className="loading-center"><div className="spinner" /></div>
          ) : (
            <>
              <div className="grid-2" style={{ marginBottom: 16 }}>
                <div className="card">
                  <div className="card-header">
                    <span className="card-title">Current Plan</span>
                    <span className="badge badge-active">{subscription.planName ?? planName}</span>
                  </div>
                  <div className="form-group">
                    <label className="form-label" htmlFor="plan-select">Change Plan</label>
                    <select
                      id="plan-select"
                      className="form-select"
                      value={subscription.planId ?? ''}
                      onChange={e => handleChangePlan(e.target.value)}
                      disabled={subLoading}
                    >
                      <option value="">Select a plan…</option>
                      {plans.map(p => (
                        <option key={p.id} value={p.id}>{p.name} — ${p.price}/mo</option>
                      ))}
                    </select>
                  </div>
                  <div style={{ borderTop: '1px solid var(--border)', paddingTop: 16, marginTop: 8 }}>
                    <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 8 }}>
                      {subscription.trialEndsAt
                        ? `Trial ends: ${new Date(subscription.trialEndsAt).toLocaleDateString()}`
                        : subscription.subscriptionEndsAt
                        ? `Subscription ends: ${new Date(subscription.subscriptionEndsAt).toLocaleDateString()}`
                        : 'No active subscription'}
                    </div>
                  </div>
                </div>

                <div className="card">
                  <div className="card-header">
                    <span className="card-title">Extend Trial</span>
                  </div>
                  <div className="form-group">
                    <label className="form-label" htmlFor="extend-days">Additional Days</label>
                    <input
                      id="extend-days"
                      type="number"
                      className="form-input"
                      placeholder="e.g. 14"
                      min="1"
                      max="365"
                      value={extendDays}
                      onChange={e => setExtendDays(e.target.value)}
                    />
                  </div>
                  <button
                    className="btn btn-primary w-full"
                    disabled={subLoading || !extendDays}
                    onClick={handleExtendTrial}
                    style={{ justifyContent: 'center' }}
                  >
                    {subLoading ? <span className="spinner" style={{ width: 14, height: 14 }} /> : '⏱ Extend Trial'}
                  </button>
                </div>
              </div>

              <div className="card">
                <div className="card-header">
                  <span className="card-title">Payment History</span>
                </div>
                {!subscription.paymentHistory || subscription.paymentHistory.length === 0 ? (
                  <div className="empty-state" style={{ padding: 40 }}>
                    <p>No payment records found</p>
                  </div>
                ) : (
                  <div className="table-container">
                    <table>
                      <thead>
                        <tr>
                          <th>Date</th>
                          <th>Amount</th>
                          <th>Status</th>
                          <th>Paymob ID</th>
                        </tr>
                      </thead>
                      <tbody>
                        {subscription.paymentHistory.map(p => (
                          <tr key={p.id}>
                            <td>{new Date(p.date).toLocaleDateString()}</td>
                            <td><strong>${p.amount}</strong></td>
                            <td>
                              <span className={`badge ${p.status === 'paid' ? 'badge-active' : p.status === 'pending' ? 'badge-pending' : 'badge-rejected'}`}>
                                {p.status}
                              </span>
                            </td>
                            <td>
                              <span style={{ fontFamily: 'monospace', fontSize: 12 }}>
                                {p.paymobId ?? '—'}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      )}

      {/* Tab: History */}
      {activeTab === 'history' && (
        <div className="card">
          <div className="card-header">
            <span className="card-title">Status Change History</span>
          </div>
          {history.length === 0 ? (
            <div className="empty-state" style={{ padding: 40 }}>
              <p>No history records found</p>
            </div>
          ) : (
            <div className="timeline">
              {history.map(entry => (
                <div key={entry.id} className="timeline-item">
                  <div className={`timeline-dot ${entry.newStatus}`} />
                  <div className="timeline-content">
                    <div className="timeline-header">
                      <div className="timeline-title">
                        {entry.oldStatus
                          ? <span>{entry.oldStatus} → <strong>{entry.newStatus}</strong></span>
                          : <strong>{entry.newStatus}</strong>}
                        {entry.changedBy && (
                          <span style={{ marginLeft: 8, fontSize: 11, color: 'var(--text-muted)', fontWeight: 400 }}>
                            by {entry.changedBy}
                          </span>
                        )}
                      </div>
                      <div className="timeline-time">
                        {new Date(entry.createdAt).toLocaleString()}
                      </div>
                    </div>
                    {entry.reason && (
                      <div className="timeline-body">{entry.reason}</div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Reject Modal */}
      {rejectModal && (
        <div className="modal-overlay" onClick={() => setRejectModal(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <h3>Reject Clinic</h3>
            <p>Rejecting <strong>{tenant.name}</strong>. Please provide a reason.</p>
            <div className="form-group">
              <label className="form-label" htmlFor="reject-reason-detail">Rejection Reason</label>
              <textarea
                id="reject-reason-detail"
                className="form-textarea"
                value={rejectReason}
                onChange={e => setRejectReason(e.target.value)}
                placeholder="Reason for rejection…"
                maxLength={500}
              />
            </div>
            <div className="modal-actions">
              <button className="btn btn-ghost" onClick={() => { setRejectModal(false); setRejectReason(''); }}>Cancel</button>
              <button
                className="btn btn-danger"
                disabled={!rejectReason.trim() || actionLoading === 'reject'}
                onClick={() => handleAction('reject')}
              >
                {actionLoading === 'reject' ? <span className="spinner" style={{ width: 14, height: 14 }} /> : 'Confirm Reject'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Suspend Modal */}
      {suspendModal && (
        <div className="modal-overlay" onClick={() => setSuspendModal(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <h3>Suspend Clinic</h3>
            <p>Suspending <strong>{tenant.name}</strong> will restrict all access. Optionally provide a reason.</p>
            <div className="form-group">
              <label className="form-label" htmlFor="suspend-reason">Reason (optional)</label>
              <textarea
                id="suspend-reason"
                className="form-textarea"
                value={suspendReason}
                onChange={e => setSuspendReason(e.target.value)}
                placeholder="Reason for suspension…"
                maxLength={500}
              />
            </div>
            <div className="modal-actions">
              <button className="btn btn-ghost" onClick={() => { setSuspendModal(false); setSuspendReason(''); }}>Cancel</button>
              <button
                className="btn btn-warning"
                disabled={actionLoading === 'suspend'}
                onClick={() => handleAction('suspend')}
              >
                {actionLoading === 'suspend' ? <span className="spinner" style={{ width: 14, height: 14 }} /> : '⏸ Suspend'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ClinicDetailView;
