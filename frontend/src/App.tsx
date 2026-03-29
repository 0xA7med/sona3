import { BrowserRouter as Router, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { useEffect } from 'react';
import { supabase } from './lib/supabase';
import { useAuthStore } from './store/authStore';
import { ToastProvider } from './components/Toast';

// Navigation
import Navigation from './components/Navigation';

// Pages
import Login           from './pages/Login';
import AdminHome       from './pages/AdminHome';
import VolunteerHome   from './pages/VolunteerHome';
import AdminFamilies   from './pages/AdminFamilies';
import AdminFamilyForm from './pages/AdminFamilyForm';

function AppContent() {
  const { user, loading, profile } = useAuthStore();
  const location   = useLocation();
  const isLoginPage = location.pathname === '/login';
  const role        = profile?.role || 'volunteer';
  const isDesktop   = window.innerWidth >= 768;

  if (loading && !user) {
    return (
      <div style={{
        display: 'flex', height: '100dvh', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center',
        background: 'linear-gradient(160deg, #032a1e 0%, #074b36 100%)',
        gap: '1rem',
      }}>
        <div style={{ fontSize: '2.5rem' }}>🌙</div>
        <div style={{
          width: 40, height: 40,
          border: '3.5px solid rgba(212,175,55,0.25)',
          borderTop: '3.5px solid #d4af37',
          borderRadius: '50%',
          animation: 'spin 0.8s linear infinite',
        }} />
        <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.85rem' }}>جارٍ التحميل...</p>
      </div>
    );
  }

  return (
    <div style={{
      display: 'flex',
      flexDirection: isDesktop && user && !isLoginPage ? 'row' : 'column',
      minHeight: '100dvh',
    }}>
      {/* Sidebar (desktop) injects itself as fixed, no explicit slot needed */}
      {!isLoginPage && user && <Navigation />}

      {/* Main content area */}
      <div style={{
        flex: 1,
        // Offset from sidebar on desktop
        marginRight: user && !isLoginPage && isDesktop ? '270px' : 0,
        // Offset from bottom nav on mobile
        paddingBottom: user && !isLoginPage && !isDesktop ? `calc(64px + env(safe-area-inset-bottom))` : 0,
        transition: 'margin-right 0.3s ease',
      }}>
        <Routes>
          {/* Public */}
          <Route path="/login" element={!user ? <Login /> : <Navigate to="/" />} />

          {/* Admin Routes */}
          <Route path="/admin"                 element={user && role === 'admin' ? <AdminHome />       : <Navigate to="/login" />} />
          <Route path="/admin/families"        element={user && role === 'admin' ? <AdminFamilies />   : <Navigate to="/login" />} />
          <Route path="/admin/families/new"    element={user && role === 'admin' ? <AdminFamilyForm /> : <Navigate to="/login" />} />
          <Route path="/admin/families/:id/edit" element={user && role === 'admin' ? <AdminFamilyForm /> : <Navigate to="/login" />} />
          <Route path="/admin/campaigns"       element={user && role === 'admin' ? <AdminHome />       : <Navigate to="/login" />} />
          <Route path="/admin/*"               element={user && role === 'admin' ? <AdminHome />       : <Navigate to="/login" />} />

          {/* Volunteer Routes */}
          <Route path="/volunteer"       element={user ? <VolunteerHome /> : <Navigate to="/login" />} />
          <Route path="/volunteer/*"     element={user ? <VolunteerHome /> : <Navigate to="/login" />} />

          {/* Root redirect */}
          <Route
            path="/"
            element={
              user
                ? role === 'admin'
                  ? <Navigate to="/admin" />
                  : <Navigate to="/volunteer" />
                : <Navigate to="/login" />
            }
          />

          {/* Catch-all */}
          <Route path="*" element={<Navigate to="/" />} />
        </Routes>
      </div>
    </div>
  );
}

export default function App() {
  const { setUser, loadProfile } = useAuthStore();

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        setUser(session.user);
        loadProfile(session.user.id);
      } else {
        // stop loading if no session
        useAuthStore.setState({ loading: false });
      }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user) {
        setUser(session.user);
        loadProfile(session.user.id);
      } else {
        setUser(null);
        useAuthStore.setState({ loading: false });
      }
    });

    return () => subscription.unsubscribe();
  }, [setUser, loadProfile]);

  return (
    <Router>
      <AppContent />
      <ToastProvider />
    </Router>
  );
}
