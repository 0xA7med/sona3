import { BrowserRouter as Router, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { useEffect } from 'react';
import { supabase } from './lib/supabase';
import { useAuthStore } from './store/authStore';
import { ToastProvider } from './components/Toast';
import { SyncManager } from './components/SyncManager';

// Navigation
import Navigation from './components/Navigation';

// Pages
import Login           from './pages/Login';
import AdminHome       from './pages/AdminHome';
import VolunteerHome   from './pages/VolunteerHome';
import AdminFamilies   from './pages/AdminFamilies';
import AdminFamilyForm   from './pages/AdminFamilyForm';
import AdminFamilyView   from './pages/AdminFamilyView';
import AdminCampaigns from './pages/AdminCampaigns';
import AdminCampaignView from './pages/AdminCampaignView';
import AdminCampaignForm from './pages/AdminCampaignForm';
import AdminVolunteers from './pages/AdminVolunteers';
import AdminTargeting from './pages/AdminTargeting';
import AdminReports from './pages/AdminReports';
import AdminTransactions from './pages/AdminTransactions';
import AdminSettings from './pages/AdminSettings';
import Profile         from './pages/Profile';
import VolunteerTasks  from './pages/VolunteerTasks';
import VolunteerCampaignTasks from './pages/VolunteerCampaignTasks';
import AdminVolunteerLog from './pages/AdminVolunteerLog';

function AppContent() {
  const { user, loading, profile } = useAuthStore();
  const location   = useLocation();
  const isLoginPage = location.pathname === '/login';
  const role        = profile?.role || 'volunteer';
  const isDesktop   = window.innerWidth >= 768;



  if (loading) {
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
          <Route path="/admin/families/:id"    element={user && role === 'admin' ? <AdminFamilyView /> : <Navigate to="/login" />} />
          <Route path="/admin/families/:id/edit" element={user && role === 'admin' ? <AdminFamilyForm /> : <Navigate to="/login" />} />
          <Route path="/admin/campaigns"       element={user && role === 'admin' ? <AdminCampaigns />    : <Navigate to="/login" />} />
          <Route path="/admin/campaigns/new"   element={user && role === 'admin' ? <AdminCampaignForm /> : <Navigate to="/login" />} />
          <Route path="/admin/campaigns/:id"   element={user && role === 'admin' ? <AdminCampaignView /> : <Navigate to="/login" />} />
          <Route path="/admin/campaigns/:id/edit" element={user && role === 'admin' ? <AdminCampaignForm /> : <Navigate to="/login" />} />
          <Route path="/admin/volunteers"      element={user && role === 'admin' ? <AdminVolunteers />   : <Navigate to="/login" />} />
          <Route path="/admin/volunteers/:id"  element={user && role === 'admin' ? <AdminVolunteerLog /> : <Navigate to="/login" />} />
          <Route path="/admin/targeting"       element={user && role === 'admin' ? <AdminTargeting />  : <Navigate to="/login" />} />
          <Route path="/admin/transactions"    element={user && role === 'admin' ? <AdminTransactions /> : <Navigate to="/login" />} />
          <Route path="/admin/reports"         element={user && role === 'admin' ? <AdminReports />    : <Navigate to="/login" />} />
          <Route path="/admin/settings"        element={user && role === 'admin' ? <AdminSettings />   : <Navigate to="/login" />} />
          <Route path="/admin/*"               element={user && role === 'admin' ? <AdminHome />       : <Navigate to="/login" />} />

          {/* Volunteer Routes */}
          <Route path="/volunteer"       element={user ? <VolunteerHome />  : <Navigate to="/login" />} />
          <Route path="/volunteer/tasks" element={user ? <VolunteerTasks /> : <Navigate to="/login" />} />
          <Route path="/volunteer/campaigns/:id" element={user ? <VolunteerCampaignTasks /> : <Navigate to="/login" />} />
          <Route path="/volunteer/*"     element={user ? <VolunteerHome />  : <Navigate to="/login" />} />

          {/* Root redirect */}
          <Route path="/profile" element={user ? <Profile /> : <Navigate to="/login" />} />
          <Route
            path="/"
            element={
              user
                ? role === 'admin' 
                  ? <Navigate to="/admin" replace /> 
                  : <Navigate to="/volunteer" replace />
                : <Navigate to="/login" replace />
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
    let mounted = true;

    async function initAuth() {
      // 1. Get initial session explicitly
      const { data: { session } } = await supabase.auth.getSession();
      
      if (mounted) {
        if (session?.user) {
          setUser(session.user);
          await loadProfile(session.user.id);
        } else {
          // No session, stop loading immediately
          useAuthStore.setState({ loading: false });
        }
      }

      // 2. Listen for changes
      const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
        if (!mounted) return;

        if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
          if (session?.user) {
            setUser(session.user);
            await loadProfile(session.user.id);
          }
        } else if (event === 'SIGNED_OUT') {
          setUser(null);
          useAuthStore.setState({ profile: null, loading: false });
        }
      });

      return subscription;
    }

    const authSubPromise = initAuth();

    // Timeout fallback (shorter now)
    const timeoutId = setTimeout(() => {
      if (mounted && useAuthStore.getState().loading) {
        console.warn('Auth loading timeout - forcing non-loading state');
        useAuthStore.setState({ loading: false });
      }
    }, 5000);

    return () => {
      mounted = false;
      authSubPromise.then(sub => sub.unsubscribe());
      clearTimeout(timeoutId);
    };
  }, [setUser, loadProfile]);

  return (
    <Router>
      <SyncManager />
      <AppContent />
      <ToastProvider />
    </Router>
  );
}
