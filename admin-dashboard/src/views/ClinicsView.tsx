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
  plan?: { name: string } | string;
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

const TABS = ['all', 'pending', 'active', 'suspended', 'rejected'] as const;
type Tab = typeof TABS[number];

const ClinicsView: React.FC = () => {
  const navigate = useNavigate();
  const { showToast } = useToast();
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<Tab>('all');
  const [search, setSearch] = useState('');
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const fetchTenants = useCallback(async () => {
    setLoading(true);
    try {
      const params: Record<string, string> = {};
      if (activeTab !== 'all') params.status = activeTab;
      if (search.trim()) params.search = search.trim();
      const res = await adminApi.listTenants(params);
      const d = res.data?.data ?? res.data;
      setTenants(Array.isArray(d) ? d : (d?.tenants ?? d?.items ?? []));
    } catch {
      showToast('Failed to load clinics', 'error');
    } finally {
      setLoading(false);
    }
  }, [activeTab, search, showToast]);

  useEffect(() => {
    const t = setTimeout(fetchTenants, 300);
    return () => clearTimeout(t);
  }, [fetchTenants]);

  const handleApprove = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setActionLoading(id + '-approve');
    try {
      await adminApi.approveTenant(id);
      showToast('Clinic approved successfully', 'success');
      fetchTenants();
    } catch {
      showToast('Failed to approve clinic', 'error');
    } finally {
      setActionLoading(null);
    }
  };

  const handleSuspend = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setActionLoading(id + '-suspend');
    try {
      await adminApi.updateStatus(id, 'suspended', 'Suspended by admin');
      showToast('Clinic suspended', 'success');
      fetchTenants();
    } catch {
      showToast('Failed to suspend clinic', 'error');
    } finally {
      setActionLoading(null);
    }
  };

  const getPlanName = (plan: Tenant['plan']) => {
    if (!plan) return '—';
    if (typeof plan === 'string') return plan;
    return plan.name ?? '—';
  };

  return (
    <div className="page">
      <div className="page-header">
        <h2>All Clinics</h2>
        <p>Manage and monitor all registered clinic tenants</p>
      </div>

      <div className="toolbar">
        <input
          type="text"
          className="search-input"
          placeholder="Search by name, subdomain or email…"
          value={search}
          onChange={e => setSearch(e.target.value)}
          maxLength={100}
        />
        <div className="filter-tabs">
          {TABS.map(tab => (
            <button
              key={tab}
              className={`filter-tab${activeTab === tab ? ' active' : ''}`}
              onClick={() => setActiveTab(tab)}
            >
              {tab.charAt(0).toUpperCase() + tab.slice(1)}
            </button>
          ))}
        </div>
      </div>

      <div className="card">
        {loading ? (
          <div className="loading-center"><div className="spinner" /></div>
        ) : tenants.length === 0 ? (
          <div className="empty-state">
            <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z" /><polyline points="9 22 9 12 15 12 15 22" />
            </svg>
            <h3>No clinics found</h3>
            <p>Try adjusting your search or filter</p>
          </div>
        ) : (
          <div className="table-container">
            <table>
              <thead>
                <tr>
                  <th>Clinic Name</th>
                  <th>Subdomain</th>
                  <th>Email</th>
                  <th>Status</th>
                  <th>Plan</th>
                  <th>Registered</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {tenants.map(t => (
                  <tr
                    key={t.id}
                    style={{ cursor: 'pointer' }}
                    onClick={() => navigate(`/clinics/${t.id}`)}
                  >
                    <td>
                      <strong
                        style={{ color: 'var(--primary)', cursor: 'pointer' }}
                        onClick={e => { e.stopPropagation(); navigate(`/clinics/${t.id}`); }}
                      >
                        {t.name}
                      </strong>
                    </td>
                    <td>
                      <span style={{ fontFamily: 'monospace', background: 'var(--surface)', padding: '2px 8px', borderRadius: 6, fontSize: 12 }}>
                        {t.subdomain}
                      </span>
                    </td>
                    <td>{t.email}</td>
                    <td>{statusBadge(t.status)}</td>
                    <td>{getPlanName(t.plan)}</td>
                    <td>{new Date(t.createdAt).toLocaleDateString()}</td>
                    <td onClick={e => e.stopPropagation()}>
                      <div className="flex gap-2">
                        <button
                          className="btn btn-ghost btn-sm"
                          onClick={() => navigate(`/clinics/${t.id}`)}
                        >
                          View
                        </button>
                        {t.status === 'pending' && (
                          <button
                            className="btn btn-success btn-sm"
                            disabled={actionLoading === t.id + '-approve'}
                            onClick={e => handleApprove(t.id, e)}
                          >
                            {actionLoading === t.id + '-approve' ? <span className="spinner" style={{ width: 12, height: 12 }} /> : '✓'}
                          </button>
                        )}
                        {t.status === 'active' && (
                          <button
                            className="btn btn-warning btn-sm"
                            disabled={actionLoading === t.id + '-suspend'}
                            onClick={e => handleSuspend(t.id, e)}
                          >
                            {actionLoading === t.id + '-suspend' ? <span className="spinner" style={{ width: 12, height: 12 }} /> : '⏸'}
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default ClinicsView;
