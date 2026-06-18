import React, { useEffect, useState } from 'react';
import { Routes, Route, Navigate, useLocation } from 'react-router-dom';
import Sidebar from './components/Sidebar';
import { ToastProvider } from './components/Toast';

// Views
import LoginView from './views/LoginView';
import OverviewView from './views/OverviewView';
import ClinicsView from './views/ClinicsView';
import PendingView from './views/PendingView';
import ClinicDetailView from './views/ClinicDetailView';
import PlansView from './views/PlansView';
import AnnouncementsView from './views/AnnouncementsView';
import AuditLogView from './views/AuditLogView';

// Protected Route Wrapper Component
interface PrivateRouteProps {
  children: React.ReactNode;
}

const PrivateRoute: React.FC<PrivateRouteProps> = ({ children }) => {
  const token = localStorage.getItem('admin_token');
  const location = useLocation();

  if (!token) {
    // Redirect to login page but save the current location they tried to go to
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  return <>{children}</>;
};

const App: React.FC = () => {
  const [user, setUser] = useState<{ email: string; name?: string } | null>(null);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const location = useLocation();

  // Load user from localStorage on init/boot
  useEffect(() => {
    const storedUser = localStorage.getItem('admin_user');
    if (storedUser) {
      try {
        setUser(JSON.parse(storedUser));
      } catch {
        setUser(null);
      }
    }
  }, [location]);

  // Close sidebar on navigation change
  useEffect(() => {
    setIsSidebarOpen(false);
  }, [location.pathname]);

  const handleLogout = () => {
    setUser(null);
  };

  // Determine if we should show the sidebar (hide on login page)
  const isLoginPage = location.pathname === '/login';

  return (
    <ToastProvider>
      {isLoginPage ? (
        <Routes>
          <Route path="/login" element={<LoginView />} />
          <Route path="*" element={<Navigate to="/login" replace />} />
        </Routes>
      ) : (
        <PrivateRoute>
          <div className={`app-layout ${isSidebarOpen ? 'sidebar-open' : ''}`}>
            {isSidebarOpen && <div className="sidebar-overlay" onClick={() => setIsSidebarOpen(false)} />}
            <Sidebar user={user} onLogout={handleLogout} />
            <main className="main-content">
              <header className="mobile-header">
                <button className="mobile-menu-toggle" onClick={() => setIsSidebarOpen(true)}>
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <line x1="3" y1="12" x2="21" y2="12"></line>
                    <line x1="3" y1="6" x2="21" y2="6"></line>
                    <line x1="3" y1="18" x2="21" y2="18"></line>
                  </svg>
                </button>
                <h2>🏥 SaaS Clinic Panel</h2>
              </header>
              <Routes>
                <Route path="/overview" element={<OverviewView />} />
                <Route path="/clinics" element={<ClinicsView />} />
                <Route path="/clinics/pending" element={<PendingView />} />
                <Route path="/clinics/:id" element={<ClinicDetailView />} />
                <Route path="/plans" element={<PlansView />} />
                <Route path="/announcements" element={<AnnouncementsView />} />
                <Route path="/audit" element={<AuditLogView />} />
                <Route path="*" element={<Navigate to="/overview" replace />} />
              </Routes>
            </main>
          </div>
        </PrivateRoute>
      )}
    </ToastProvider>
  );
};

export default App;
