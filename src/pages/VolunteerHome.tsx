import { useEffect, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { RefreshCw, Calendar, Coins, ShoppingBag, Heart, Target, Info } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuthStore } from '../store/authStore';
import { toast } from '../components/Toast';
import type { Campaign, CampaignType } from '../types';
import { useNavigate } from 'react-router-dom';

const TYPE_CONFIG: Record<CampaignType, { label: string; icon: any; color: string; bg: string }> = {
  financial:       { label: 'تحويل مالي', icon: Coins,       color: '#059664', bg: 'rgba(5, 150, 100, 0.1)' },
  food_basket:     { label: 'كرتونة طعام', icon: ShoppingBag, color: '#d97706', bg: 'rgba(217, 119, 6, 0.1)' },
  clothing:        { label: 'كسوة / ملابس', icon: Heart,       color: '#7c3aed', bg: 'rgba(124, 58, 237, 0.1)' },
  school_supplies: { label: 'أدوات مدرسية', icon: Target,      color: '#2563eb', bg: 'rgba(37, 99, 235, 0.1)' },
  other:           { label: 'عام / أخرى',  icon: Info,       color: '#64748b', bg: 'rgba(100, 116, 139, 0.1)' },
};

export default function VolunteerHome() {
  const { profile } = useAuthStore();
  const navigate = useNavigate();
  const [allCampaigns, setAllCampaigns] = useState<Campaign[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchCampaigns = useCallback(async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('campaigns')
        .select('*')
        .eq('status', 'active')
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      setAllCampaigns(data || []);
    } catch (err) {
      console.error('Error fetching campaigns:', err);
      toast('حدث خطأ في تحميل الحملات', 'error');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!profile) return;
    fetchCampaigns();
  }, [profile, fetchCampaigns]);

  const formatDate = (dateStr?: string) => {
    if (!dateStr) return 'غير محدد';
    return new Date(dateStr).toLocaleDateString('ar-EG', { day: 'numeric', month: 'long' });
  };

  return (
    <div className="page-content">
      {/* ── Greeting Hero ── */}
      <motion.div
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        style={{
          background: 'linear-gradient(135deg, var(--primary-dark) 0%, var(--primary) 100%)',
          borderRadius: '20px', padding: '1.25rem 1.5rem',
          color: 'white', marginBottom: '1.25rem',
          boxShadow: '0 8px 24px rgba(6,147,100,0.25)',
          position: 'relative', overflow: 'hidden',
        }}
      >
        <div style={{ position: 'absolute', top: -20, right: -20, width: 90, height: 90, borderRadius: '50%', background: 'rgba(255,255,255,0.07)' }} />
        <div style={{ position: 'relative', zIndex: 1, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <p style={{ fontSize: '0.78rem', opacity: 0.8, marginBottom: '2px' }}>أهلاً بك 🌟</p>
            <h1 style={{ fontSize: '1.3rem', fontWeight: 900, lineHeight: 1.2 }}>
              {profile?.full_name?.split(' ').slice(0, 2).join(' ')}
            </h1>
            <p style={{ fontSize: '0.7rem', opacity: 0.7, marginTop: '4px' }}>اختر الحملة التي تود العمل عليها</p>
          </div>
          <button
            onClick={fetchCampaigns}
            style={{ background: 'rgba(255,255,255,0.15)', border: '1px solid rgba(255,255,255,0.25)', borderRadius: '10px', width: 36, height: 36, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: 'white' }}
          >
            <RefreshCw size={15} className={loading && allCampaigns.length === 0 ? 'animate-spin' : ''} />
          </button>
        </div>
      </motion.div>

      {/* ── Campaign Cards ── */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.625rem' }}>
        <AnimatePresence mode="popLayout">
          {loading ? (
            [1,2,3].map(i => (
              <div key={i} className="skeleton" style={{ height: 88, borderRadius: 16 }} />
            ))
          ) : allCampaigns.length === 0 ? (
            <motion.div key="empty" initial={{ opacity: 0 }} animate={{ opacity: 1 }}
              style={{
                textAlign: 'center', padding: '3rem 1rem',
                background: '#fdfbeb', borderRadius: '16px', border: '2px dashed #f0d080'
              }}
            >
              <div style={{ fontSize: '2.5rem', marginBottom: '0.75rem' }}>🌵</div>
              <p style={{ fontWeight: 700, color: 'var(--text-muted)' }}>لا توجد حملات نشطة حالياً</p>
            </motion.div>
          ) : (
            allCampaigns.map((camp, idx) => {
              const Config = TYPE_CONFIG[camp.campaign_type] || TYPE_CONFIG.other;
              return (
                <motion.div
                  key={camp.id}
                  initial={{ opacity: 0, y: 16 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: idx * 0.05 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => navigate(`/volunteer/campaigns/${camp.id}`)}
                  style={{
                    background: 'white', borderRadius: '16px',
                    border: '1px solid var(--border)',
                    borderRight: `4px solid ${Config.color}`,
                    padding: '1rem', cursor: 'pointer',
                    display: 'flex', alignItems: 'center', gap: '0.875rem',
                    boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
                  }}
                >
                  {/* Type Icon */}
                  <div style={{
                    width: 48, height: 48, borderRadius: '14px', flexShrink: 0,
                    background: Config.bg, color: Config.color,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    boxShadow: `0 4px 12px ${Config.bg}`,
                  }}>
                    <Config.icon size={24} />
                  </div>

                  {/* Info */}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <h3 style={{ fontWeight: 800, fontSize: '0.95rem', color: 'var(--text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', marginBottom: '3px' }}>
                      {camp.name}
                    </h3>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                      <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '3px' }}>
                        <Calendar size={11} /> {formatDate(camp.start_date)}
                        {camp.end_date && <> — {formatDate(camp.end_date)}</>}
                      </span>
                      {camp.budget > 0 && (
                        <span style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--primary)' }}>
                          {camp.budget.toLocaleString('ar-EG')} ج.م
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Arrow */}
                  <div style={{ color: Config.color, opacity: 0.7, flexShrink: 0 }}>
                    ←
                  </div>
                </motion.div>
              );
            })
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
