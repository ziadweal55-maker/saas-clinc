import React, { useEffect, useState, useCallback } from 'react';
import { adminApi } from '../api/adminApi';
import { useToast } from '../components/Toast';

interface AuditLog {
  id: number;
  admin_email: string;
  action: string;
  target_tenant_id: string | null;
  metadata: Record<string, any> | null;
  ip_address: string | null;
  created_at: string;
}

const getActionBadge = (action: string) => {
  let cls = 'badge-info';
  if (action.includes('approve')) cls = 'badge-approve';
  else if (action.includes('reject')) cls = 'badge-reject';
  else if (action.includes('suspend')) cls = 'badge-suspend';
  else if (action.includes('impersonate')) cls = 'badge-impersonate';
  else if (action.includes('create')) cls = 'badge-create';
  else if (action.includes('update') || action.includes('change')) cls = 'badge-update';
  else if (action.includes('delete') || action.includes('remove')) cls = 'badge-delete';

  return <span className={`badge ${cls}`}>{action.replace(/_/g, ' ')}</span>;
};

const AuditLogView: React.FC = () => {
  const { showToast } = useToast();
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  
  // Filters
  const [searchAction, setSearchAction] = useState('');
  const [searchTenant, setSearchTenant] = useState('');
  const [page, setPage] = useState(1);
  const limit = 20;

  const fetchLogs = useCallback(async () => {
    setLoading(true);
    try {
      const params: Record<string, any> = {
        page,
        limit,
      };
      if (searchAction.trim()) params.action = searchAction.trim();
      if (searchTenant.trim()) params.tenant_id = searchTenant.trim();

      const res = await adminApi.getAuditLogs(params);
      const data = res.data?.data ?? res.data;
      setLogs(data?.logs ?? []);
      setTotal(data?.total ?? 0);
    } catch {
      showToast('Failed to load audit logs', 'error');
    } finally {
      setLoading(false);
    }
  }, [page, searchAction, searchTenant, showToast]);

  useEffect(() => {
    const t = setTimeout(fetchLogs, 300);
    return () => clearTimeout(t);
  }, [fetchLogs]);

  // Reset page when filters change
  const handleFilterChange = () => {
    setPage(1);
  };

  const formatMetadata = (meta: Record<string, any> | null) => {
    if (!meta) return '-';
    try {
      return (
        <pre style={{ margin: 0, fontSize: 11, background: 'rgba(0,0,0,0.2)', padding: '4px 8px', borderRadius: 6, overflowX: 'auto', maxWidth: 350 }}>
          {JSON.stringify(meta, null, 2)}
        </pre>
      );
    } catch {
      return String(meta);
    }
  };

  const totalPages = Math.ceil(total / limit);

  return (
    <div className="page">
      <div className="page-header">
        <h2>Admin Audit Logs</h2>
        <p>Security trail and operation records of all platform-wide administrative actions</p>
      </div>

      <div className="toolbar">
        <input
          type="text"
          className="search-input"
          placeholder="Filter by action (e.g. approve_tenant)..."
          value={searchAction}
          onChange={(e) => { setSearchAction(e.target.value); handleFilterChange(); }}
        />
        <input
          type="text"
          className="search-input"
          placeholder="Filter by Clinic ID..."
          value={searchTenant}
          onChange={(e) => { setSearchTenant(e.target.value); handleFilterChange(); }}
        />
        <button className="btn btn-ghost" onClick={() => { setSearchAction(''); setSearchTenant(''); setPage(1); }}>
          Clear Filters
        </button>
      </div>

      <div className="card">
        {loading ? (
          <div className="loading-center">
            <div className="spinner spinner-lg" />
          </div>
        ) : logs.length === 0 ? (
          <div className="empty-state">
            <h3>No audit records found</h3>
            <p>Admin actions will be logged here once operations are performed.</p>
          </div>
        ) : (
          <div className="table-container">
            <table>
              <thead>
                <tr>
                  <th>Admin</th>
                  <th>Action</th>
                  <th>Target Clinic</th>
                  <th>Details/Metadata</th>
                  <th>IP Address</th>
                  <th>Time</th>
                </tr>
              </thead>
              <tbody>
                {logs.map((log) => (
                  <tr key={log.id}>
                    <td>
                      <strong>{log.admin_email}</strong>
                    </td>
                    <td>{getActionBadge(log.action)}</td>
                    <td>
                      {log.target_tenant_id ? (
                        <span style={{ fontFamily: 'monospace', background: 'var(--surface)', padding: '2px 8px', borderRadius: 6, fontSize: 12 }}>
                          {log.target_tenant_id}
                        </span>
                      ) : (
                        <span className="text-muted">-</span>
                      )}
                    </td>
                    <td>{formatMetadata(log.metadata)}</td>
                    <td>
                      <span className="text-muted" style={{ fontFamily: 'monospace', fontSize: 12 }}>
                        {log.ip_address ?? 'Unknown'}
                      </span>
                    </td>
                    <td>
                      {new Date(log.created_at).toLocaleString('en-US', {
                        month: 'short',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                        second: '2-digit',
                      })}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {/* Pagination Controls */}
            {totalPages > 1 && (
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 20 }}>
                <span className="text-muted text-sm">
                  Showing page <strong>{page}</strong> of <strong>{totalPages}</strong> (<strong>{total}</strong> entries)
                </span>
                <div style={{ display: 'flex', gap: 8 }}>
                  <button
                    className="btn btn-ghost btn-sm"
                    onClick={() => setPage((p) => Math.max(p - 1, 1))}
                    disabled={page === 1}
                  >
                    Previous
                  </button>
                  <button
                    className="btn btn-ghost btn-sm"
                    onClick={() => setPage((p) => Math.min(p + 1, totalPages))}
                    disabled={page === totalPages}
                  >
                    Next
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default AuditLogView;
