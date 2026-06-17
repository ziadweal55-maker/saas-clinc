import React, { useEffect, useState } from 'react';
import { NavLink } from 'react-router-dom';
import { adminApi } from '../api/adminApi';

interface SidebarProps {
  user: { name?: string; email: string } | null;
  onLogout: () => void;
}

const Sidebar: React.FC<SidebarProps> = ({ user, onLogout }) => {
  const [pendingCount, setPendingCount] = useState<number>(0);

  useEffect(() => {
    adminApi.getStats()
      .then(res => {
        const data = res.data?.data ?? res.data;
        setPendingCount(data?.pending ?? data?.pendingCount ?? 0);
      })
      .catch(() => {}); // Silently fail — badge is cosmetic
  }, []);

  const handleLogout = () => {
    // Secure session lifecycle: clear all client state before redirect
    localStorage.removeItem('admin_token');
    localStorage.removeItem('admin_user');
    onLogout();
    window.location.href = '/login';
  };

  const adminName = user?.name ?? user?.email ?? 'Admin';
  const avatarLetter = adminName.charAt(0).toUpperCase();

  return (
    <aside className="sidebar">
      <div className="sidebar-brand">
        <h1>🏥 SaaS Clinic</h1>
        <p>Super Admin Panel</p>
      </div>

      <nav className="sidebar-nav">
        <div className="nav-section-label">Main</div>

        <NavLink
          to="/overview"
          className={({ isActive }) => `nav-item${isActive ? ' active' : ''}`}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <rect x="3" y="3" width="7" height="7" /><rect x="14" y="3" width="7" height="7" />
            <rect x="14" y="14" width="7" height="7" /><rect x="3" y="14" width="7" height="7" />
          </svg>
          Overview
        </NavLink>

        <NavLink
          to="/clinics"
          className={({ isActive }) => `nav-item${isActive ? ' active' : ''}`}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z" />
            <polyline points="9 22 9 12 15 12 15 22" />
          </svg>
          All Clinics
        </NavLink>

        <NavLink
          to="/clinics/pending"
          className={({ isActive }) => `nav-item${isActive ? ' active' : ''}`}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" />
          </svg>
          Pending Approvals
          {pendingCount > 0 && (
            <span className="nav-badge">{pendingCount}</span>
          )}
        </NavLink>

        <div className="nav-section-label">Management</div>

        <NavLink
          to="/plans"
          className={({ isActive }) => `nav-item${isActive ? ' active' : ''}`}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" />
            <polyline points="14 2 14 8 20 8" /><line x1="16" y1="13" x2="8" y2="13" />
            <line x1="16" y1="17" x2="8" y2="17" /><polyline points="10 9 9 9 8 9" />
          </svg>
          Plans
        </NavLink>

        <NavLink
          to="/announcements"
          className={({ isActive }) => `nav-item${isActive ? ' active' : ''}`}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07A19.5 19.5 0 013 7.81" />
            <path d="M22 12A10 10 0 0012 2" /><circle cx="12" cy="12" r="4" />
          </svg>
          Announcements
        </NavLink>

        <NavLink
          to="/audit"
          className={({ isActive }) => `nav-item${isActive ? ' active' : ''}`}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" />
            <polyline points="14 2 14 8 20 8" /><line x1="16" y1="13" x2="8" y2="13" />
            <line x1="16" y1="17" x2="8" y2="17" />
          </svg>
          Audit Log
        </NavLink>
      </nav>

      <div className="sidebar-footer">
        <div className="admin-badge">
          <div className="admin-avatar">{avatarLetter}</div>
          <div className="admin-info">
            {/* Safe text rendering — React JSX auto-escapes */}
            <div className="name">{adminName}</div>
            <div className="role">Super Admin</div>
          </div>
        </div>
        <button
          className="btn btn-ghost btn-sm w-full"
          onClick={handleLogout}
          style={{ marginTop: 8, justifyContent: 'center' }}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4" />
            <polyline points="16 17 21 12 16 7" /><line x1="21" y1="12" x2="9" y2="12" />
          </svg>
          Sign Out
        </button>
      </div>
    </aside>
  );
};

export default Sidebar;
