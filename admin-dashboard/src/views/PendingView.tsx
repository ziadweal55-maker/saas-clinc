import React, { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { adminApi } from '../api/adminApi';
import { useToast } from '../components/Toast';

interface Tenant {
  id: string;
  name: string;
  subdomain: string;
  email: string;
  status: string;
  createdAt: string;
}

const timeAgo = (date: string) => {
  const diff = Date.now() - new Date(date).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
};

const PendingView: React.FC = () => {
  const navigate = useNavigate();
  const { showToast } = useToast();
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [loading, setLoading] = useState(true);
  const [rejectModal, setRejectModal] = useState<{ id: string; name: string } | null>(null);
  const [rejectReason, setRejectReason] = useState('');
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const fetchPending = useCallback(async () => {
    setLoading(true);
    try {
      const res = await adminApi.listTenants({ status: 'pending' });
      const d = res.data?.data ?? res.data;
      setTenants(Array.isArray(d) ? d : (d?.tenants ?? d?.items ?? []));
    } catch {
      showToast('Failed to load pending clinics', 'error');
    } finally {
      setLoading(false);
    }
  }, [showToast]);

  useEffect(() => { fetchPending(); }, [fetchPending]);

  const handleApprove = async (id: string) => {
    setActionLoading(id + '-approve');
    try {
      await adminApi.approveTenant(id);
      showToast('Clinic approved!', 'success');
      fetchPending();
    } catch {
      showToast('Failed to approve clinic', 'error');
    } finally {
      setActionLoading(null);
    }
  };

  const handleRejectConfirm = async () => {
    if (!rejectModal) return;
    if (!rejectReason.trim()) {
      showToast('Please provide a rejection reason', 'error');
      return;
    }
    setActionLoading(rejectModal.id + '-reject');
    try {
      await adminApi.rejectTenant(rejectModal.id, rejectReason.trim());
      showToast('Clinic rejected', 'success');
      setRejectModal(null);
      setRejectReason('');
      fetchPending();
    } catch {
      showToast('Failed to reject clinic', 'error');
    } finally {
      setActionLoading(null);
    }
  };

  if (loading) {
    return (
      <div className="page">
        <div className="loading-center"><div className="spinner spinner-lg" /></div>
      </div>
    );
  }

  return (
    <div className="page">
      <div className="page-header">
        <h2>Pending Approvals</h2>
        <p>{tenants.length} clinic{tenants.length !== 1 ? 's' : ''} awaiting your review</p>
      </div>

      {tenants.length === 0 ? (
        <div className="empty-state" style={{ padding: '100px 20px' }}>
          <div style={{ fontSize: 64, marginBottom: 16 }}>🎉</div>
          <h3 style={{ fontSize: 20, marginBottom: 8 }}>All caught up!</h3>
          <p style={{ fontSize: 14 }}>No clinics are pending approval right now.</p>
          <button
            className="btn btn-primary"
            style={{ marginTop: 20 }}
            onClick={() => navigate('/clinics')}
          >
            View All Clinics
          </button>
        </div>
      ) : (
        <div className="pending-cards">
          {tenants.map(t => (
            <div key={t.id} className="pending-card">
              <div className="pending-card-header">
                <div>
                  <div className="pending-card-name">{t.name}</div>
                  <div className="pending-card-meta">
                    <span style={{ fontFamily: 'monospace', background: 'var(--surface)', padding: '1px 6px', borderRadius: 4, fontSize: 11 }}>
                      {t.subdomain}
                    </span>
                    <span style={{ marginLeft: 8 }}>{t.email}</span>
                  </div>
                </div>
                <span className="badge badge-pending">Pending</span>
              </div>

              <div style={{ fontSize: 12, color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: 6 }}>
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" />
                </svg>
                Registered {timeAgo(t.createdAt)}
              </div>

              <div className="pending-card-actions">
                <button
                  className="btn btn-success btn-sm"
                  disabled={actionLoading === t.id + '-approve'}
                  onClick={() => handleApprove(t.id)}
                  style={{ flex: 1, justifyContent: 'center' }}
                >
                  {actionLoading === t.id + '-approve'
                    ? <span className="spinner" style={{ width: 14, height: 14 }} />
                    : '✅ Approve'}
                </button>
                <button
                  className="btn btn-danger btn-sm"
                  onClick={() => setRejectModal({ id: t.id, name: t.name })}
                  style={{ flex: 1, justifyContent: 'center' }}
                >
                  ❌ Reject
                </button>
                <button
                  className="btn btn-ghost btn-sm"
                  onClick={() => navigate(`/clinics/${t.id}`)}
                >
                  Details
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Reject Modal */}
      {rejectModal && (
        <div className="modal-overlay" onClick={() => setRejectModal(null)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <h3>Reject Clinic</h3>
            <p>You are about to reject <strong>{rejectModal.name}</strong>. Please provide a reason.</p>
            <div className="form-group">
              <label className="form-label" htmlFor="reject-reason">Rejection Reason</label>
              <textarea
                id="reject-reason"
                className="form-textarea"
                placeholder="e.g. Incomplete documentation, invalid business registration…"
                value={rejectReason}
                onChange={e => setRejectReason(e.target.value)}
                maxLength={500}
              />
            </div>
            <div className="modal-actions">
              <button className="btn btn-ghost" onClick={() => { setRejectModal(null); setRejectReason(''); }}>
                Cancel
              </button>
              <button
                className="btn btn-danger"
                disabled={!rejectReason.trim() || actionLoading === rejectModal.id + '-reject'}
                onClick={handleRejectConfirm}
              >
                {actionLoading === rejectModal.id + '-reject'
                  ? <span className="spinner" style={{ width: 14, height: 14 }} />
                  : 'Reject Clinic'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PendingView;
