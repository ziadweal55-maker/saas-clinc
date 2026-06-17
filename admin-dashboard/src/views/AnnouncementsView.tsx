import React, { useEffect, useState, useCallback } from 'react';
import { adminApi } from '../api/adminApi';
import { useToast } from '../components/Toast';

interface Announcement {
  id: number;
  title: string;
  body: string;
  type: 'info' | 'warning' | 'maintenance' | 'feature';
  target: string;
  is_active: boolean;
  created_by: string;
  created_at: string;
  expires_at: string | null;
}

const typeBadge = (type: string) => {
  const cls: Record<string, string> = {
    info: 'badge-info',
    warning: 'badge-warning',
    maintenance: 'badge-maintenance',
    feature: 'badge-feature',
  };
  return <span className={`badge ${cls[type] ?? 'badge-info'}`}>{type}</span>;
};

const AnnouncementsView: React.FC = () => {
  const { showToast } = useToast();
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Form state
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [type, setType] = useState<'info' | 'warning' | 'maintenance' | 'feature'>('info');
  const [target, setTarget] = useState('all');
  const [expiresAt, setExpiresAt] = useState('');
  const [sendEmail, setSendEmail] = useState(false);
  
  const [actionLoading, setActionLoading] = useState(false);

  const fetchAnnouncements = useCallback(async () => {
    setLoading(true);
    try {
      const res = await adminApi.listAnnouncements();
      const data = res.data?.data ?? res.data;
      setAnnouncements(Array.isArray(data) ? data : []);
    } catch {
      showToast('Failed to fetch announcements', 'error');
    } finally {
      setLoading(false);
    }
  }, [showToast]);

  useEffect(() => {
    fetchAnnouncements();
  }, [fetchAnnouncements]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !body.trim()) {
      showToast('Title and body are required', 'error');
      return;
    }

    const payload = {
      title: title.trim(),
      body: body.trim(),
      type,
      target: target.trim() || 'all',
      expires_at: expiresAt ? new Date(expiresAt).toISOString() : null,
      send_email: sendEmail,
    };

    setActionLoading(true);
    try {
      await adminApi.createAnnouncement(payload);
      showToast('Announcement posted successfully!', 'success');
      
      // Reset form
      setTitle('');
      setBody('');
      setType('info');
      setTarget('all');
      setExpiresAt('');
      setSendEmail(false);
      
      fetchAnnouncements();
    } catch {
      showToast('Failed to create announcement', 'error');
    } finally {
      setActionLoading(false);
    }
  };

  const handleToggleActive = async (id: number, currentActive: boolean) => {
    try {
      await adminApi.updateAnnouncement(id, { is_active: !currentActive });
      showToast(`Announcement ${!currentActive ? 'activated' : 'deactivated'}`, 'success');
      fetchAnnouncements();
    } catch {
      showToast('Failed to update announcement status', 'error');
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Are you sure you want to delete this announcement?')) return;
    try {
      await adminApi.deleteAnnouncement(id);
      showToast('Announcement deleted', 'success');
      fetchAnnouncements();
    } catch {
      showToast('Failed to delete announcement', 'error');
    }
  };

  if (loading) {
    return (
      <div className="page">
        <div className="loading-center">
          <div className="spinner spinner-lg" />
        </div>
      </div>
    );
  }

  return (
    <div className="page" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(350px, 1fr))', gap: 32 }}>
      <div>
        <div className="page-header">
          <h2>Create Announcement</h2>
          <p>Publish news, system warnings, or feature rollouts to clinic dashboards</p>
        </div>

        <div className="card">
          <form onSubmit={handleCreate}>
            <div className="form-group">
              <label className="form-label">Announcement Title</label>
              <input
                type="text"
                className="form-input"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. Scheduled Maintenance this Friday"
                required
              />
            </div>

            <div className="grid-2">
              <div className="form-group">
                <label className="form-label">Announcement Type</label>
                <select
                  className="form-select"
                  value={type}
                  onChange={(e) => setType(e.target.value as any)}
                >
                  <option value="info">Info</option>
                  <option value="warning">Warning</option>
                  <option value="maintenance">Maintenance</option>
                  <option value="feature">New Feature</option>
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Target Audience</label>
                <input
                  type="text"
                  className="form-input"
                  value={target}
                  onChange={(e) => setTarget(e.target.value)}
                  placeholder="'all' or specific tenant ID"
                />
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">Expiration Date (Optional)</label>
              <input
                type="datetime-local"
                className="form-input"
                value={expiresAt}
                onChange={(e) => setExpiresAt(e.target.value)}
              />
            </div>

            <div className="form-group">
              <label className="form-label">Message Content</label>
              <textarea
                className="form-textarea"
                value={body}
                onChange={(e) => setBody(e.target.value)}
                placeholder="Write the message text here. Markdown and text formatting is supported in the client view..."
                rows={5}
                required
              />
            </div>

            <div className="form-group" style={{ margin: '20px 0' }}>
              <label className="flex items-center gap-2" style={{ cursor: 'pointer' }}>
                <span className="toggle">
                  <input
                    type="checkbox"
                    checked={sendEmail}
                    onChange={(e) => setSendEmail(e.target.checked)}
                  />
                  <span className="toggle-slider" />
                </span>
                <span style={{ fontSize: 13, fontWeight: 600 }}>Broadcast via Email (Resend)</span>
              </label>
              <p className="text-muted text-sm" style={{ marginLeft: 48, marginTop: 4 }}>
                This sends a formatted notification email to all active clinic administrators.
              </p>
            </div>

            <button
              type="submit"
              className="btn btn-primary w-full"
              style={{ justifyContent: 'center', marginTop: 16 }}
              disabled={actionLoading}
            >
              {actionLoading ? 'Publishing...' : 'Publish Announcement'}
            </button>
          </form>
        </div>
      </div>

      <div>
        <div className="page-header">
          <h2>Active Announcements</h2>
          <p>Current broadcasts visible on clinic dashboards</p>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {announcements.length === 0 ? (
            <div className="card">
              <div className="empty-state">
                <h3>No announcements published</h3>
                <p>Use the form on the left to post the first broadcast.</p>
              </div>
            </div>
          ) : (
            announcements.map((ann) => (
              <div key={ann.id} className="announcement-card" style={{ opacity: ann.is_active ? 1 : 0.6 }}>
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8 }}>
                    <h4 style={{ fontSize: 14, fontWeight: 800 }}>{ann.title}</h4>
                    <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                      {typeBadge(ann.type)}
                      <span className={`badge ${ann.is_active ? 'badge-active' : 'badge-suspended'}`}>
                        {ann.is_active ? 'Active' : 'Inactive'}
                      </span>
                    </div>
                  </div>
                  
                  <p className="announcement-body-text" style={{ whiteSpace: 'pre-wrap', marginTop: 8, color: 'var(--text-secondary)' }}>
                    {ann.body}
                  </p>
                  
                  <div className="divider" style={{ margin: '12px 0' }} />
                  
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 11, color: 'var(--text-muted)' }}>
                    <span>Target: <code>{ann.target}</code></span>
                    <span>Posted on {new Date(ann.created_at).toLocaleDateString()}</span>
                  </div>
                  
                  <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 12 }}>
                    <button
                      className="btn btn-ghost btn-sm"
                      onClick={() => handleToggleActive(ann.id, ann.is_active)}
                    >
                      {ann.is_active ? 'Deactivate' : 'Activate'}
                    </button>
                    <button
                      className="btn btn-danger btn-sm"
                      onClick={() => handleDelete(ann.id)}
                    >
                      Delete
                    </button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};

export default AnnouncementsView;
