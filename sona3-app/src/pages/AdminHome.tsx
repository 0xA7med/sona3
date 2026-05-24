import { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { 
  Users, CheckCircle, BarChart3, Plus, RefreshCw, 
  Baby, Heart, BookOpen, Megaphone, Edit3 
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuthStore } from '../store/authStore';
import { toast } from '../components/Toast';
import { calculateDistribution } from '../lib/distributionService';
import type { Campaign, Family } from '../types';

interface DashboardStats {
  totalFamilies: number;
  activeCampaigns: number;
  completedThisMonth: number;
  totalVolunteers: number;
  totalAmountDistributed: number;
  totalChildren: number;
}

const QUICK_ACTIONS = [
  { label: 'إضافة أسرة',    icon: Heart,     path: '/admin/families/new',   color: '#edfcf5', iconColor: '#059664' },
  { label: 'السجل المالي',   icon: BarChart3, path: '/admin/transactions',   color: '#eff6ff', iconColor: '#2563eb' },
  { label: 'محرك الاستهداف', icon: Users,     path: '/admin/targeting',      color: '#fef9ee', iconColor: '#d97706' },
  { label: 'تقارير مالية',   icon: BookOpen,  path: '/admin/reports',        color: '#f5f3ff', iconColor: '#7c3aed' },
];

export default function AdminHome() {
  const navigate    = useNavigate();
  const { profile } = useAuthStore();
  const [stats, setStats] = useState<DashboardStats>({
    totalFamilies: 0, activeCampaigns: 0, completedThisMonth: 0,
    totalVolunteers: 0, totalAmountDistributed: 0, totalChildren: 0,
  });
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [pendingVolunteers, setPendingVolunteers] = useState(0);
  const [pendingUpdates, setPendingUpdates] = useState(0);
  const [loading,   setLoading]   = useState(true);

  const fetchAll = useCallback(async () => {
    setLoading(true);
    try {
      const results = await Promise.all([
        supabase.from('families').select('*', { count: 'exact', head: true }).eq('status', 'active'),
        supabase.from('campaigns').select('*').eq('status', 'active').order('created_at', { ascending: false }).limit(5),
        supabase.from('case_assignments').select('*', { count: 'exact', head: true }).eq('status', 'completed').gte('completed_at', new Date(new Date().setDate(1)).toISOString()),
        supabase.from('profiles').select('*', { count: 'exact', head: true }).eq('role', 'volunteer').eq('is_active', true),
        // Fetch completed assignments WITH campaign brackets + family children for accurate calculation
        supabase.from('case_assignments')
          .select(`
            campaign:campaigns(id, amount_per_family, is_auto_calculate, distribution_mode,
              age_brackets, stage_brackets, children_brackets, commission_rules, targeting_rules),
            family:families(id, children(id, child_name, age, is_orphan, school_stage, birth_date, national_id))
          `)
          .eq('status', 'completed'),
        supabase.from('children').select('*', { count: 'exact', head: true }),
        supabase.from('profiles').select('*', { count: 'exact', head: true }).eq('role', 'volunteer').eq('is_active', false),
        supabase.from('data_update_requests').select('*', { count: 'exact', head: true }).eq('status', 'pending')
      ]);

      // Accurate distributed amount — uses dynamic calculateDistribution for auto-calculate campaigns
      const distributed = (results[4].data ?? []).reduce((acc: number, curr: any) => {
        if (!curr.campaign) return acc;
        if (curr.campaign.is_auto_calculate && curr.family) {
          const dist = calculateDistribution(curr.family as Family, curr.campaign as Campaign);
          return acc + dist.baseAmount;
        }
        return acc + (curr.campaign.amount_per_family || 0);
      }, 0);
      
      setStats({
        totalFamilies: results[0].count ?? 0,
        activeCampaigns: results[1].data?.length ?? 0,
        completedThisMonth: results[2].count ?? 0,
        totalVolunteers: results[3].count ?? 0,
        totalAmountDistributed: distributed,
        totalChildren: results[5].count ?? 0,
      });
      setCampaigns(results[1].data ?? []);
      setPendingVolunteers(results[6].count ?? 0);
      setPendingUpdates(results[7].count ?? 0);
    } catch {
      toast('حدث خطأ في تحميل البيانات', 'error');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  const greeting = () => {
    const h = new Date().getHours();
    if (h < 12) return 'صباح الخير';
    if (h < 17) return 'مساء الخير';
    return 'مساء النور';
  };

  return (
    <div className="page-content">

      {/* ── Pending Volunteers Alert ── */}
      {pendingVolunteers > 0 && (
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          onClick={() => navigate('/admin/volunteers')}
          className="alert-banner danger"
          style={{ marginBottom: '0.75rem', cursor: 'pointer' }}
        >
          <div className="alert-icon"><Users size={20} /></div>
          <div className="alert-body">
            <div className="alert-title">تنبيه: متطوعون جدد! 📢</div>
            <div className="alert-text">هناك {pendingVolunteers} طلبات تسجيل جديدة بحاجة للمراجعة.</div>
          </div>
          <div className="alert-action">مراجعة ←</div>
        </motion.div>
      )}

      {/* ── Pending Updates Alert ── */}
      {pendingUpdates > 0 && (
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          onClick={() => navigate('/admin/updates')}
          className="alert-banner warning"
          style={{ marginBottom: '1rem', cursor: 'pointer' }}
        >
          <div className="alert-icon" style={{ background: 'var(--gold)', color: 'white' }}><Edit3 size={20} /></div>
          <div className="alert-body">
            <div className="alert-title" style={{ color: '#92400e' }}>طلبات تعديل بيانات ✏️</div>
            <div className="alert-text" style={{ color: '#b45309' }}>هناك {pendingUpdates} طلبات تعديل مرسلة من المتطوعين بانتظار موافقتك.</div>
          </div>
          <div className="alert-action" style={{ color: '#92400e' }}>مراجعة ←</div>
        </motion.div>
      )}

      {/* ── Greeting ── */}
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}
        style={{
          background: 'linear-gradient(135deg, var(--primary-dark) 0%, var(--primary) 100%)',
          borderRadius: '20px', padding: '1.25rem 1.5rem',
          color: 'white', marginBottom: '1.25rem', position: 'relative', overflow: 'hidden',
          boxShadow: '0 8px 24px rgba(6,147,100,0.25)',
        }}
      >
        <div style={{ position: 'absolute', top: -20, left: -20, width: 100, height: 100, borderRadius: '50%', background: 'rgba(255,255,255,0.06)' }} />
        <div style={{ position: 'absolute', bottom: -15, right: 20, width: 70, height: 70, borderRadius: '50%', background: 'rgba(212,175,55,0.15)' }} />
        <div style={{ position: 'relative', zIndex: 1, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <p style={{ fontSize: '0.8rem', opacity: 0.8, marginBottom: '2px', fontWeight: 500 }}>{greeting()} 👋</p>
            <h1 style={{ fontSize: '1.35rem', fontWeight: 900, lineHeight: 1.2 }}>
              {profile?.full_name?.split(' ').slice(0, 2).join(' ') ?? 'المشرف'}
            </h1>
            <p style={{ fontSize: '0.72rem', opacity: 0.7, marginTop: '4px' }}>
              {new Date().toLocaleDateString('ar-EG', { weekday: 'long', day: 'numeric', month: 'long' })}
            </p>
          </div>
          <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
            <button
              onClick={fetchAll} disabled={loading}
              style={{ background: 'rgba(255,255,255,0.15)', border: '1px solid rgba(255,255,255,0.25)', borderRadius: '10px', width: 36, height: 36, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: 'white' }}
            >
              <RefreshCw size={15} className={loading ? 'animate-spin' : ''} />
            </button>
            <button
              onClick={() => navigate('/admin/campaigns/new')}
              style={{ background: 'rgba(255,255,255,0.2)', border: '1px solid rgba(255,255,255,0.3)', borderRadius: '10px', height: 36, padding: '0 0.875rem', display: 'flex', alignItems: 'center', gap: '5px', cursor: 'pointer', color: 'white', fontFamily: 'inherit', fontWeight: 700, fontSize: '0.8rem' }}
            >
              <Plus size={15} /> حملة جديدة
            </button>
          </div>
        </div>
      </motion.div>

      {/* ── Stats Grid 2×2 ── */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.625rem', marginBottom: '1.25rem' }}>
        {[
          { label: 'إجمالي الأسر',    value: stats.totalFamilies,          icon: Heart,      color: '#059664', bg: '#edfcf5' },
          { label: 'إجمالي الأطفال',  value: stats.totalChildren,          icon: Baby,       color: '#7c3aed', bg: '#f5f3ff' },
          { label: 'أُنجز هذا الشهر', value: stats.completedThisMonth,     icon: CheckCircle, color: '#2563eb', bg: '#eff6ff' },
          { label: 'المتطوعون النشطون', value: stats.totalVolunteers,      icon: Users,      color: '#d97706', bg: '#fffbeb' },
        ].map((s, i) => (
          <motion.div
            key={s.label}
            initial={{ opacity: 0, scale: 0.92 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: i * 0.06 }}
            style={{
              background: 'white', borderRadius: '16px',
              padding: '1rem', boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
              display: 'flex', alignItems: 'center', gap: '0.75rem',
              border: '1px solid rgba(0,0,0,0.04)',
            }}
          >
            <div style={{ width: 40, height: 40, borderRadius: '12px', background: s.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, color: s.color }}>
              <s.icon size={20} />
            </div>
            <div>
              <div style={{ fontSize: '1.5rem', fontWeight: 900, color: 'var(--primary-dark)', lineHeight: 1 }}>
                {loading ? <span style={{ fontSize: '1rem', color: 'var(--text-muted)' }}>…</span> : s.value.toLocaleString('ar-EG')}
              </div>
              <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: '3px', fontWeight: 600 }}>{s.label}</div>
            </div>
          </motion.div>
        ))}
      </div>

      {/* ── Total Distributed — Full Width ── */}
      {stats.totalAmountDistributed > 0 && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3 }}
          style={{
            background: 'linear-gradient(135deg, #fdfbeb 0%, #fff9d6 100%)',
            borderRadius: '16px', padding: '1rem 1.25rem',
            border: '1.5px solid #f0d080',
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            marginBottom: '1.25rem',
          }}
        >
          <div>
            <p style={{ fontSize: '0.75rem', color: '#9a6e1a', fontWeight: 600, marginBottom: '2px' }}>إجمالي ما تم توزيعه</p>
            <p style={{ fontSize: '1.5rem', fontWeight: 900, color: '#7a5a00', lineHeight: 1 }}>
              {loading ? '…' : stats.totalAmountDistributed.toLocaleString('ar-EG')}
              <span style={{ fontSize: '0.8rem', fontWeight: 500, marginRight: '4px' }}>ج.م</span>
            </p>
          </div>
          <BarChart3 size={32} color="#d4af37" style={{ opacity: 0.6 }} />
        </motion.div>
      )}

      {/* ── Quick Actions 2×2 ── */}
      <div style={{ marginBottom: '1.25rem' }}>
        <div style={{ fontSize: '0.85rem', fontWeight: 800, color: 'var(--primary-dark)', marginBottom: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          ⚡ أفعال سريعة
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.625rem' }}>
          {QUICK_ACTIONS.map((action, i) => (
            <motion.button
              key={action.path}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 + i * 0.05 }}
              whileTap={{ scale: 0.97 }}
              onClick={() => navigate(action.path)}
              style={{
                background: 'white', border: '1px solid rgba(0,0,0,0.05)',
                borderRadius: '14px', padding: '1rem',
                display: 'flex', alignItems: 'center', gap: '0.75rem',
                cursor: 'pointer', textAlign: 'right', fontFamily: 'inherit',
                boxShadow: '0 2px 6px rgba(0,0,0,0.04)',
              }}
            >
              <div style={{ width: 38, height: 38, borderRadius: '10px', background: action.color, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, color: action.iconColor }}>
                <action.icon size={19} />
              </div>
              <span style={{ fontSize: '0.82rem', fontWeight: 700, color: 'var(--text)' }}>{action.label}</span>
            </motion.button>
          ))}
        </div>
      </div>

      {/* ── Active Campaigns ── */}
      <div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
          <div style={{ fontSize: '0.85rem', fontWeight: 800, color: 'var(--primary-dark)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Megaphone size={16} color="var(--primary)" /> الحملات النشطة
          </div>
          <button
            onClick={() => navigate('/admin/campaigns')}
            style={{ fontSize: '0.78rem', color: 'var(--primary)', fontWeight: 700, background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'inherit' }}
          >
            كل الحملات ←
          </button>
        </div>

        {loading ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            {[1, 2].map(i => <div key={i} className="skeleton" style={{ height: 72, borderRadius: 14 }} />)}
          </div>
        ) : campaigns.length === 0 ? (
          <div style={{
            background: '#fdfbeb', border: '2px dashed #f0d080',
            borderRadius: '16px', padding: '1.5rem', textAlign: 'center',
          }}>
            <div style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>🏹</div>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', fontWeight: 600, marginBottom: '0.75rem' }}>لا توجد حملات نشطة حالياً</p>
            <button
              onClick={() => navigate('/admin/campaigns/new')}
              style={{ background: 'var(--primary)', color: 'white', border: 'none', borderRadius: '10px', padding: '0.5rem 1.25rem', cursor: 'pointer', fontFamily: 'inherit', fontWeight: 700, fontSize: '0.82rem' }}
            >
              + ابدأ حملة جديدة
            </button>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            {campaigns.map((camp, i) => (
              <motion.div
                key={camp.id}
                initial={{ opacity: 0, x: 10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.3 + i * 0.06 }}
                whileTap={{ scale: 0.99 }}
                onClick={() => navigate(`/admin/campaigns/${camp.id}`)}
                style={{
                  background: 'white', borderRadius: '14px',
                  border: '1px solid var(--border)', borderRight: '3px solid var(--primary)',
                  padding: '0.875rem 1rem', cursor: 'pointer',
                  display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                  boxShadow: '0 1px 4px rgba(0,0,0,0.04)',
                }}
              >
                <div style={{ flex: 1, minWidth: 0 }}>
                  <h3 style={{ fontWeight: 800, fontSize: '0.9rem', color: 'var(--text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{camp.name}</h3>
                  <p style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: '2px' }}>
                    📅 {new Date(camp.start_date).toLocaleDateString('ar-EG')}
                  </p>
                </div>
                <span style={{ fontSize: '0.68rem', fontWeight: 700, padding: '3px 10px', borderRadius: '999px', background: '#edfcf5', color: '#059664', flexShrink: 0, marginRight: '0.75rem' }}>
                  ● نشطة
                </span>
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
