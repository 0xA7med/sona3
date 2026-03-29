import { useNavigate, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  LayoutDashboard, Users, Calendar, User, LogOut,
  Heart, ChevronDown, Settings, History as HistoryIcon
} from 'lucide-react';
import { useAuthStore } from '../store/authStore';

interface NavItem {
  label: string;
  icon: React.ReactNode;
  path: string;
  roles: string[];
}

const NAV_ITEMS: NavItem[] = [
  { label: 'الرئيسية',  icon: <LayoutDashboard size={20} />, path: '/admin',           roles: ['admin'] },
  { label: 'الأسر',     icon: <Users size={20} />,            path: '/admin/families',  roles: ['admin'] },
  { label: 'السجل المالي', icon: <HistoryIcon size={20} />,       path: '/admin/transactions', roles: ['admin'] },
  { label: 'الحملات',   icon: <Calendar size={20} />,         path: '/admin/campaigns', roles: ['admin'] },
  { label: 'الإعدادات', icon: <Settings size={20} />,         path: '/admin/settings',  roles: ['admin'] },
  { label: 'الرئيسية',  icon: <LayoutDashboard size={20} />, path: '/volunteer',       roles: ['volunteer'] },
  { label: 'مهامي',     icon: <Heart size={20} />,           path: '/volunteer/tasks', roles: ['volunteer'] },
  { label: 'حسابي',     icon: <User size={20} />,            path: '/profile',         roles: ['admin', 'volunteer'] },
];

export default function Navigation() {
  const navigate = useNavigate();
  const location = useLocation();
  const { profile, signOut } = useAuthStore();
  const role = profile?.role || 'volunteer';

  const items = NAV_ITEMS.filter(i => i.roles.includes(role));
  const isActive = (path: string) => {
    if (path === '/admin' || path === '/volunteer') {
      return location.pathname === path;
    }
    return location.pathname.startsWith(path);
  };

  const handleSignOut = () => {
    if (window.confirm('هل أنت متأكد من تسجيل الخروج؟')) {
      signOut();
    }
  };

  return (
    <>
      {/* ── Desktop Sidebar ──────────────────────────────────── */}
      <aside className="sidebar hidden md:flex flex-col" id="desktop-sidebar">
        {/* Logo */}
        <div className="sidebar-logo">
          <div className="sidebar-logo-icon">🌙</div>
          <div>
            <div className="sidebar-logo-text">صناع السعادة</div>
            <div className="sidebar-logo-sub">نظام إدارة المساعدات v2</div>
          </div>
        </div>

        {/* Role Tag */}
        <div style={{ margin: '0 0.5rem 1rem', padding: '0.4rem 0.75rem', borderRadius: 'var(--radius-sm)', background: 'rgba(212,175,55,0.15)', border: '1px solid rgba(212,175,55,0.25)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <div style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--gold)', flexShrink: 0 }} />
          <span style={{ color: 'rgba(255,255,255,0.85)', fontSize: '0.78rem', fontWeight: 600 }}>
            {profile?.full_name || 'مستخدم'}
          </span>
          <span style={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.7rem', marginRight: 'auto' }}>
            {role === 'admin' ? 'مدير' : 'متطوع'}
          </span>
        </div>

        {/* Nav Links */}
        <nav style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem', flex: 1 }}>
          {items.filter(i => i.label !== 'حسابي').map((item) => {
            const active = isActive(item.path);
            return (
              <motion.button
                key={item.path}
                className={`nav-link ${active ? 'active' : ''}`}
                onClick={() => navigate(item.path)}
                whileHover={{ x: -3 }}
                whileTap={{ scale: 0.97 }}
                style={{ border: 'none', cursor: 'pointer', width: '100%', textAlign: 'right', fontFamily: 'inherit' }}
              >
                <span style={{ flexShrink: 0 }}>{item.icon}</span>
                <span>{item.label}</span>
                {active && (
                  <motion.div
                    layoutId="active-indicator"
                    style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--gold)', marginRight: 'auto' }}
                  />
                )}
              </motion.button>
            );
          })}
        </nav>

        {/* Bottom: Profile + Logout */}
        <div style={{ borderTop: '1px solid rgba(255,255,255,0.1)', paddingTop: '1rem', marginTop: '1rem', display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
          <button
            className="nav-link"
            onClick={() => navigate('/profile')}
            style={{ border: 'none', cursor: 'pointer', width: '100%', textAlign: 'right', fontFamily: 'inherit' }}
          >
            <User size={18} />
            <span>ملفي الشخصي</span>
          </button>
          <button
            className="nav-link"
            onClick={handleSignOut}
            style={{ border: 'none', cursor: 'pointer', width: '100%', textAlign: 'right', fontFamily: 'inherit', color: 'rgba(239,68,68,0.8)' }}
          >
            <LogOut size={18} />
            <span>تسجيل الخروج</span>
          </button>
        </div>
      </aside>

      {/* ── Mobile Bottom Nav ─────────────────────────────────── */}
      <nav className="bottom-nav md:hidden" id="bottom-nav">
        {items.map((item) => {
          const active = isActive(item.path);
          return (
            <button
              key={item.path}
              className={`bottom-nav-item ${active ? 'active' : ''}`}
              onClick={() => navigate(item.path)}
            >
              <motion.div
                className="nav-icon-wrap"
                animate={{ scale: active ? 1.1 : 1 }}
                transition={{ type: 'spring', stiffness: 400, damping: 25 }}
              >
                {item.icon}
              </motion.div>
              <span>{item.label}</span>
            </button>
          );
        })}
      </nav>
    </>
  );
}
