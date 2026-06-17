import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { adminApi } from '../api/adminApi';
import { useToast } from '../components/Toast';

interface Stats {
  total: number;
  active: number;
  pending: number;
  suspended: number;
  expiringSoon: number;
}

interface Tenant {
  id: string;
  name: string;
  subdomain: string;
  email: string;
  status: string;
  plan?: string;
  createdAt: string;
}

const statusBadge = (status: string) => {
  const cls: Record<string, string> = {
    active: 'badge-active',
    pending: 'badge-pending',
    suspended: 'badge-suspended',
    rejected: 'badge-rejected',
  };
  return <span className={`badge ${cls[status] ?? 'badge-rejected'}`}>{status}</span>;
};

const OverviewView: React.FC = () => {
  const navigate = useNavigate();
  const { showToast } = useToast();
  const [stats, setStats] = useState<Stats | null>(null);
  const [recentTenants, setRecentTenants] = useState<Tenant[]>([]);
  const [expiringTenants, setExpiringTenants] = useState<Tenant[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchAll = async () => {
      try {
        const [statsRes, tenantsRes, expiringRes] = await Promise.all([
          adminApi.getStats(),
          adminApi.listTenants({ limit: 5, sort: '-createdAt' }),
          adminApi.getExpiring(),
        ]);

        const s = statsRes.data?.data ?? statsRes.data;
        setStats({
          total: s.total ?? s.totalTenants ?? 0,
          active: s.active ?? s.activeTenants ?? 0,
          pending: s.pending ?? s.pendingTenants ?? 0,
          suspended: s.suspended ?? s.suspendedTenants ?? 0,
          expiringSoon: s.expiringSoon ?? s.expiringCount ?? 0,
        });

        const td = tenantsRes.data?.data ?? tenantsRes.data;
        setRecentTenants(Array.isArray(td) ? td : (td?.tenants ?? td?.items ?? []));

        const ed = expiringRes.data?.data ?? expiringRes.data;
        setExpiringTenants(Array.isArray(ed) ? ed : (ed?.tenants ?? ed?.items ?? []));
      } catch {
        // Log safe message — do not expose server internals
        showToast('Failed to load dashboard data', 'error');
      } finally {
        setLoading(false);
      }
    };
    fetchAll();
  }, [showToast]);

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
        <h2>Overview</h2>
        <p>Platform health and key metrics at a glance</p>
      </div>

      {expiringTenants.length > 0 && (
        <div className="alert alert-warning" style={{ marginBottom: 24 }}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
            <line x1="12" y1="9" x2="12" y2="13" /><line x1="12" y1="17" x2="12.01" y2="17" />
          </svg>
          <span>
            <strong>{expiringTenants.length}</strong> clinic{expiringTenants.length > 1 ? 's' : ''} expiring within 7 days:{' '}
            {expiringTenants.slice(0, 3).map(t => t.name).join(', ')}
            {expiringTenants.length > 3 ? ` +${expiringTenants.length - 3} more` : ''}
          </span>
        </div>
      )}

      <div className="stats-grid">
        <div className="stat-card indigo">
          <div className="stat-label">Total Clinics</div>
          <div className="stat-value">{stats?.total ?? 0}</div>
          <div className="stat-sub">All registered tenants</div>
        </div>
        <div className="stat-card green">
          <div className="stat-label">Active</div>
          <div className="stat-value">{stats?.active ?? 0}</div>
          <div className="stat-sub">Currently operational</div>
        </div>
        <div className="stat-card amber">
          <div className="stat-label">Pending</div>
          <div className="stat-value">{stats?.pending ?? 0}</div>
          <div className="stat-sub">Awaiting approval</div>
        </div>
        <div className="stat-card red">
          <div className="stat-label">Suspended</div>
          <div className="stat-value">{stats?.suspended ?? 0}</div>
          <div className="stat-sub">Access restricted</div>
        </div>
        <div className="stat-card blue">
          <div className="stat-label">Expiring Soon</div>
          <div className="stat-value">{stats?.expiringSoon ?? 0}</div>
          <div className="stat-sub">Within 7 days</div>
        </div>
      </div>

      <div className="card">
        <div className="card-header">
          <span className="card-title">Recently Registered Clinics</span>
          <button className="btn btn-ghost btn-sm" onClick={() => navigate('/clinics')}>
            View All →
          </button>
        </div>
        <div className="table-container">
          {recentTenants.length === 0 ? (
            <div className="empty-state">
              <h3>No clinics yet</h3>
              <p>Registered clinics will appear here</p>
            </div>
          ) : (
            <table>
              <thead>
                <tr>
                  <th>Clinic Name</th>
                  <th>Subdomain</th>
                  <th>Email</th>
                  <th>Status</th>
                  <th>Registered</th>
                </tr>
              </thead>
              <tbody>
                {recentTenants.map(t => (
                  <tr
                    key={t.id}
                    style={{ cursor: 'pointer' }}
                    onClick={() => navigate(`/clinics/${t.id}`)}
                  >
                    <td><strong>{t.name}</strong></td>
                    <td>
                      <span style={{ fontFamily: 'monospace', background: 'var(--surface)', padding: '2px 8px', borderRadius: 6, fontSize: 12 }}>
                        {t.subdomain}
                      </span>
                    </td>
                    <td>{t.email}</td>
                    <td>{statusBadge(t.status)}</td>
                    <td>{new Date(t.createdAt).toLocaleDateString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
};

export default OverviewView;
