import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  Users, Calendar, CheckCircle, TrendingUp, Clock,
  AlertCircle, Plus, ArrowLeft, Activity
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuthStore } from '../store/authStore';
import type { Campaign } from '../types';

interface DashboardStats {
  totalFamilies: number;
  activeCampaigns: number;
  completedThisMonth: number;
  pendingAssignments: number;
  totalVolunteers: number;
}

const STAT_ITEMS = (s: DashboardStats) => [
  { label: 'إجمالي الأسر',       value: s.totalFamilies,      icon: Users,        color: '#068f64', bg: '#edfcf5' },
  { label: 'حملات نشطة',         value: s.activeCampaigns,    icon: Calendar,     color: '#3b82f6', bg: '#eff6ff' },
  { label: 'مكتمل هذا الشهر',    value: s.completedThisMonth, icon: CheckCircle,  color: '#10b981', bg: '#ecfdf5' },
  { label: 'مهام معلقة',         value: s.pendingAssignments, icon: Clock,        color: '#f59e0b', bg: '#fffbeb' },
  { label: 'متطوعون نشطون',      value: s.totalVolunteers,    icon: Activity,     color: '#8b5cf6', bg: '#faf5ff' },
];

export default function AdminHome() {
  const navigate    = useNavigate();
  const { profile } = useAuthStore();
  const [stats,     setStats]     = useState<DashboardStats>({ totalFamilies: 0, activeCampaigns: 0, completedThisMonth: 0, pendingAssignments: 0, totalVolunteers: 0 });
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [loading,   setLoading]   = useState(true);

  useEffect(() => {
    fetchAll();
  }, []);

  async function fetchAll() {
    setLoading(true);
    try {
      const [
        { count: families },
        { data: activeCamps },
        { count: completed },
        { count: pending },
        { count: volunteers },
      ] = await Promise.all([
        supabase.from('families').select('*', { count: 'exact', head: true }).eq('status', 'active'),
        supabase.from('campaigns').select('*').eq('status', 'active').order('created_at', { ascending: false }).limit(5),
        supabase.from('case_assignments').select('*', { count: 'exact', head: true }).eq('status', 'completed').gte('completed_at', new Date(new Date().setDate(1)).toISOString()),
        supabase.from('case_assignments').select('*', { count: 'exact', head: true }).in('status', ['pending', 'in_progress']),
        supabase.from('profiles').select('*', { count: 'exact', head: true }).eq('role', 'volunteer').eq('is_active', true),
      ]);

      setStats({
        totalFamilies:      families ?? 0,
        activeCampaigns:    activeCamps?.length ?? 0,
        completedThisMonth: completed ?? 0,
        pendingAssignments: pending ?? 0,
        totalVolunteers:    volunteers ?? 0,
      });
      setCampaigns(activeCamps ?? []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  const statItems = STAT_ITEMS(stats);

  return (
    <div className="page-content">
      {/* Greeting */}
      <motion.div
        className="page-header"
        initial={{ opacity: 0, y: -12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ type: 'spring', stiffness: 300, damping: 28 }}
      >
        <div>
          <h1 className="page-title">مرحباً، {profile?.full_name?.split(' ')[0] ?? 'مشرف'} 👋</h1>
          <p className="page-subtitle">
            {new Date().toLocaleDateString('ar-EG', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
          </p>
        </div>
        <motion.button
          className="btn btn-primary"
          onClick={() => navigate('/admin/campaigns/new')}
          whileHover={{ scale: 1.04 }}
          whileTap={{ scale: 0.96 }}
        >
          <Plus size={18} />
          حملة جديدة
        </motion.button>
      </motion.div>

      {/* Stats Grid */}
      <div className="dashboard-grid stagger" style={{ marginBottom: '1.75rem' }}>
        {statItems.map(({ label, value, icon: Icon, color, bg }, i) => (
          <motion.div
            key={label}
            className="stat-card"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: i * 0.07, type: 'spring', stiffness: 300, damping: 24 }}
          >
            <div style={{
              width: 44, height: 44, borderRadius: 12,
              background: bg, display: 'flex', alignItems: 'center', justifyContent: 'center',
              flexShrink: 0, color,
            }}>
              <Icon size={22} />
            </div>
            <div>
              <div style={{ fontSize: '1.6rem', fontWeight: 900, color, lineHeight: 1 }}>
                {loading ? <span className="skeleton" style={{ width: 40, height: 28, display: 'inline-block', borderRadius: 6 }} /> : value.toLocaleString('ar-EG')}
              </div>
              <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: '0.2rem', fontWeight: 600 }}>{label}</div>
            </div>
          </motion.div>
        ))}
      </div>

      {/* Active Campaigns */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.35, type: 'spring', stiffness: 280, damping: 26 }}
      >
        <div className="page-header" style={{ marginBottom: '1rem' }}>
          <h2 style={{ fontSize: '1.1rem', fontWeight: 800 }}>الحملات النشطة</h2>
          <button
            className="btn btn-ghost btn-sm"
            onClick={() => navigate('/admin/campaigns')}
          >
            عرض الكل
            <ArrowLeft size={14} />
          </button>
        </div>

        {loading ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            {[1, 2].map(i => <div key={i} className="skeleton" style={{ height: 90, borderRadius: 16 }} />)}
          </div>
        ) : campaigns.length === 0 ? (
          <div className="empty-state">
            <div className="empty-state-icon"><Calendar size={28} /></div>
            <p style={{ fontWeight: 600 }}>لا توجد حملات نشطة</p>
            <button className="btn btn-primary btn-sm" onClick={() => navigate('/admin/campaigns/new')}>
              <Plus size={16} />
              إنشاء أول حملة
            </button>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            {campaigns.map((camp, i) => (
              <motion.div
                key={camp.id}
                className="card"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.4 + i * 0.07 }}
                style={{ padding: '1rem 1.25rem', cursor: 'pointer' }}
                onClick={() => navigate(`/admin/campaigns/${camp.id}`)}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.75rem' }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: 700, marginBottom: '0.25rem' }} className="truncate-1">{camp.name}</div>
                    <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', display: 'flex', gap: '1rem' }}>
                      <span>📅 {new Date(camp.start_date).toLocaleDateString('ar-EG')}</span>
                      {camp.amount_per_family > 0 && (
                        <span>💰 {camp.amount_per_family.toLocaleString('ar-EG')} ج.م / أسرة</span>
                      )}
                    </div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <span className="badge badge-in-progress">نشطة</span>
                    <ArrowLeft size={16} color="var(--text-light)" />
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </motion.div>

      {/* Quick Links */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5, type: 'spring', stiffness: 280, damping: 26 }}
        style={{ marginTop: '1.75rem' }}
      >
        <h2 style={{ fontSize: '1.1rem', fontWeight: 800, marginBottom: '1rem' }}>روابط سريعة</h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '0.75rem' }}>
          {[
            { label: 'إضافة أسرة جديدة',    icon: '➕', path: '/admin/families/new',    color: '#edfcf5', textColor: '#065f46' },
            { label: 'عرض كل الأسر',         icon: '👨‍👩‍👧‍👦', path: '/admin/families',          color: '#eff6ff', textColor: '#1e40af' },
            { label: 'تقارير المتطوعين',     icon: '📊', path: '/admin/volunteers',       color: '#faf5ff', textColor: '#6d28d9' },
            { label: 'محرك الاستهداف',       icon: '🎯', path: '/admin/targeting',        color: '#fffbeb', textColor: '#92400e' },
          ].map((link) => (
            <motion.button
              key={link.path}
              onClick={() => navigate(link.path)}
              className="card"
              style={{ background: link.color, border: 'none', cursor: 'pointer', textAlign: 'center', padding: '1.25rem 1rem' }}
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.97 }}
            >
              <div style={{ fontSize: '1.75rem', marginBottom: '0.4rem' }}>{link.icon}</div>
              <div style={{ fontSize: '0.82rem', fontWeight: 700, color: link.textColor }}>{link.label}</div>
            </motion.button>
          ))}
        </div>
      </motion.div>
    </div>
  );
}
