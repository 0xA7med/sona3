import { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Users, Calendar, CheckCircle, TrendingUp, Clock,
  Plus, ArrowLeft, Activity, RefreshCw, BarChart3
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuthStore } from '../store/authStore';
import { toast } from '../components/Toast';
import type { Campaign } from '../types';

interface DashboardStats {
  totalFamilies: number;
  activeCampaigns: number;
  completedThisMonth: number;
  pendingAssignments: number;
  totalVolunteers: number;
  totalAmountDistributed: number;
}

export default function AdminHome() {
  const navigate    = useNavigate();
  const { profile } = useAuthStore();
  const [stats,     setStats]     = useState<DashboardStats>({ 
    totalFamilies: 0, activeCampaigns: 0, completedThisMonth: 0, 
    pendingAssignments: 0, totalVolunteers: 0, totalAmountDistributed: 0 
  });
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [loading,   setLoading]   = useState(true);

  const fetchAll = useCallback(async () => {
    setLoading(true);
    try {
      const [
        { count: families },
        { data: activeCamps },
        { count: completed },
        { count: pending },
        { count: volunteers },
        { data: distributions }
      ] = await Promise.all([
        supabase.from('families').select('*', { count: 'exact', head: true }).eq('status', 'active'),
        supabase.from('campaigns').select('*').eq('status', 'active').order('created_at', { ascending: false }).limit(5),
        supabase.from('case_assignments').select('*', { count: 'exact', head: true }).eq('status', 'completed').gte('completed_at', new Date(new Date().setDate(1)).toISOString()),
        supabase.from('case_assignments').select('*', { count: 'exact', head: true }).in('status', ['pending', 'in_progress']),
        supabase.from('profiles').select('*', { count: 'exact', head: true }).eq('role', 'volunteer').eq('is_active', true),
        supabase.from('transactions').select('amount').eq('status', 'completed')
      ]);

      const distributed = (distributions ?? []).reduce((acc, curr) => acc + Number(curr.amount), 0);

      setStats({
        totalFamilies:      families ?? 0,
        activeCampaigns:    activeCamps?.length ?? 0,
        completedThisMonth: completed ?? 0,
        pendingAssignments: pending ?? 0,
        totalVolunteers:    volunteers ?? 0,
        totalAmountDistributed: distributed
      });
      setCampaigns(activeCamps ?? []);
    } catch (err) {
      console.error(err);
      toast('حدث خطأ في تعميل البيانات', 'error');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  return (
    <div className="page-content">
      {/* Greeting Section */}
      <motion.div
        className="page-header"
        initial={{ opacity: 0, y: -12 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <div>
          <h1 className="page-title">لوحة التحكم، {profile?.full_name?.split(' ')[0] ?? 'مشرف'} 👋</h1>
          <p className="page-subtitle">
            {new Date().toLocaleDateString('ar-EG', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
          </p>
        </div>
        <div style={{ display: 'flex', gap: '0.75rem' }}>
          <button className="btn btn-ghost btn-sm" onClick={fetchAll} disabled={loading}>
            <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
          </button>
          <button
            className="btn btn-primary btn-sm"
            onClick={() => navigate('/admin/campaigns/new')}
          >
            <Plus size={18} />
            حملة جديدة
          </button>
        </div>
      </motion.div>

      {/* Stats Grid - Premium Restored */}
      <div className="dashboard-grid stagger mb-lg">
        {[
          { label: 'إجمالي الأسر',       value: stats.totalFamilies,      icon: Users,      color: '#068f64', bg: '#edfcf5' },
          { label: 'مكتمل هذا الشهر',    value: stats.completedThisMonth, icon: CheckCircle, color: '#10b981', bg: '#ecfdf5' },
          { label: 'مهام معلقة',         value: stats.pendingAssignments, icon: Clock,       color: '#f59e0b', bg: '#fffbeb' },
          { label: 'إجمالي التوزيعات',   value: stats.totalAmountDistributed, icon: BarChart3, color: '#3b82f6', bg: '#eff6ff', suffix: ' ج.م' },
        ].map((s, i) => (
          <motion.div
            key={s.label}
            className="stat-card"
            style={{ gridColumn: 'span 3' }}
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: i * 0.07 }}
          >
            <div style={{ 
              width: 44, height: 44, borderRadius: 14, 
              background: s.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', color: s.color 
            }}>
              <s.icon size={22} />
            </div>
            <div>
              <div style={{ fontSize: '1.4rem', fontWeight: 900, color: 'var(--primary-dark)', lineHeight: 1 }}>
                {loading ? '...' : s.value.toLocaleString('ar-EG')}
                {s.suffix && <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>{s.suffix}</span>}
              </div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.25rem', fontWeight: 600 }}>{s.label}</div>
            </div>
          </motion.div>
        ))}
      </div>

      {/* Main Grid: Content + Side Actions */}
      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) 280px', gap: '1.5rem' }}>
        
        {/* Active Campaigns Column */}
        <div>
          <div className="section-title mb-sm" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span>🔥 الحملات النشطة حالياً</span>
            <button className="btn-link" onClick={() => navigate('/admin/campaigns')}>كل الحملات</button>
          </div>

          {loading ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              {[1, 2].map(i => <div key={i} className="skeleton" style={{ height: 100, borderRadius: 16 }} />)}
            </div>
          ) : campaigns.length === 0 ? (
            <div className="empty-state">
              <div className="empty-state-icon">🏹</div>
              <p>لا توجد حملات نشطة في الوقت الراهن</p>
              <button className="btn btn-gold btn-sm" onClick={() => navigate('/admin/campaigns/new')}>ابدأ حملة جديدة</button>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              {campaigns.map((camp) => (
                <motion.div 
                  key={camp.id} 
                  className="card p-md clickable" 
                  whileHover={{ x: -4 }}
                  onClick={() => navigate(`/admin/campaigns/${camp.id}`)}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                      <h3 style={{ fontWeight: 800, color: 'var(--primary-dark)' }}>{camp.name}</h3>
                      <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                        📅 بدأت في {new Date(camp.start_date).toLocaleDateString('ar-EG')}
                      </p>
                    </div>
                    <div className="badge badge-in-progress">نشطة</div>
                  </div>
                </motion.div>
              ))}
            </div>
          )}
        </div>

        {/* Quick Menu Grid */}
        <div>
          <div className="section-title mb-sm">⚡ أفعال سريعة</div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '0.75rem' }}>
            {[
              { label: 'إضافة أسرة', icon: '🫂', path: '/admin/families/new', color: '#edfcf5' },
              { label: 'إدارة المتطوعين', icon: '👥', path: '/admin/volunteers', color: '#eff6ff' },
              { label: 'محرك الاستهداف', icon: '🎯', path: '/admin/targeting', color: '#fffbeb' },
              { label: 'تقارير مالية', icon: '📊', path: '/admin/reports', color: '#faf5ff' },
            ].map((m, i) => (
              <motion.button
                key={m.path}
                className="card"
                style={{ 
                  display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.85rem',
                  border: 'none', background: 'white', cursor: 'pointer', textAlign: 'right'
                }}
                whileHover={{ scale: 1.02, x: -4 }}
                onClick={() => navigate(m.path)}
              >
                <div style={{ 
                  width: 40, height: 40, borderRadius: '10px', background: m.color,
                  display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.2rem'
                }}>
                  {m.icon}
                </div>
                <div style={{ fontWeight: 700, fontSize: '0.85rem' }}>{m.label}</div>
              </motion.button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
