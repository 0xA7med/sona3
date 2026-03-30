import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, Search, Filter, Calendar, Info, ArrowLeft, Target, Clock, Coins, ShoppingBag, Heart, MoreHorizontal } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { toast } from '../components/Toast';
import type { Campaign, CampaignType } from '../types';

const TYPE_CONFIG: Record<CampaignType, { label: string; icon: any; color: string; bg: string }> = {
  financial:       { label: 'تحويل مالي', icon: Coins,       color: '#059664', bg: 'rgba(5, 150, 100, 0.1)' },
  food_basket:     { label: 'كرتونة طعام', icon: ShoppingBag, color: '#d97706', bg: 'rgba(217, 119, 6, 0.1)' },
  clothing:        { label: 'كسوة / ملابس', icon: Heart,       color: '#7c3aed', bg: 'rgba(124, 58, 237, 0.1)' },
  school_supplies: { label: 'أدوات مدرسية', icon: Target,      color: '#2563eb', bg: 'rgba(37, 99, 235, 0.1)' },
  other:           { label: 'عام / أخرى',  icon: Info,       color: '#64748b', bg: 'rgba(100, 116, 139, 0.1)' },
};

export default function AdminCampaigns() {
  const navigate = useNavigate();
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  useEffect(() => {
    fetchCampaigns();
  }, []);

  async function fetchCampaigns() {
    try {
      const { data, error } = await supabase
        .from('campaigns')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setCampaigns(data || []);
    } catch (err) {
      toast('حدث خطأ في تحميل الحملات', 'error');
    } finally {
      setLoading(false);
    }
  }

  const filtered = campaigns.filter(c => 
    c.name.toLowerCase().includes(search.toLowerCase())
  );

  const formatDate = (dateStr?: string) => {
    if (!dateStr) return 'غير محدد';
    return new Date(dateStr).toLocaleDateString('ar-EG', {
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    });
  };

  return (
    <div className="page-content">
      <div className="page-header" style={{ marginBottom: '2rem' }}>
        <motion.div
           initial={{ opacity: 0, x: 20 }}
           animate={{ opacity: 1, x: 0 }}
        >
          <h1 className="page-title">إدارة الحملات 🏹</h1>
          <p className="page-subtitle">تتبع المبادرات النشطة والمخطط لها بكل دقة</p>
        </motion.div>
        <motion.button 
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          className="btn btn-primary" 
          onClick={() => navigate('/admin/campaigns/new')}
          style={{ height: '48px', padding: '0 1.5rem', borderRadius: '14px' }}
        >
          <Plus size={20} />
          إضافة حملة جديدة
        </motion.button>
      </div>

      <div className="search-bar mb-lg" style={{ background: 'white', borderRadius: '16px', boxShadow: '0 2px 10px rgba(0,0,0,0.02)' }}>
        <Search size={20} className="search-icon" color="var(--primary)" />
        <input 
          type="text" 
          placeholder="ابحث عن حملة بالاسم..." 
          className="search-input"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <button className="btn btn-ghost btn-sm" style={{ padding: '0.5rem', borderRadius: '10px' }}>
          <Filter size={18} />
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
        <AnimatePresence mode="popLayout">
        {loading ? (
          [1,2,3].map(i => (
            <div key={i} className="skeleton" style={{ height: 280, borderRadius: 24 }} />
          ))
        ) : filtered.length === 0 ? (
          <div className="empty-state col-span-full py-xl">
            <div className="empty-state-icon" style={{ fontSize: '4rem' }}>🏜️</div>
            <p className="text-muted mt-md">لا توجد حملات تطابق بحثك حالياً</p>
          </div>
        ) : (
          filtered.map((camp, idx) => {
            const Config = TYPE_CONFIG[camp.campaign_type] || TYPE_CONFIG.other;
            return (
              <motion.div 
                key={camp.id} 
                className="campaign-card-premium clickable"
                layout
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.05 }}
                onClick={() => navigate(`/admin/campaigns/${camp.id}`)}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
                  <div 
                    className="campaign-type-icon" 
                    style={{ background: Config.bg, color: Config.color }}
                  >
                    <Config.icon size={26} />
                  </div>
                  <div className={`badge badge-${
                    camp.status === 'active' ? 'in-progress' : camp.status === 'completed' ? 'completed' : 'pending'
                  }`} style={{ fontSize: '0.75rem', padding: '6px 12px' }}>
                    {camp.status === 'active' ? 'نشطة حالياً' : camp.status === 'completed' ? 'تمت بنجاح' : 'جاري التخطيط'}
                  </div>
                </div>

                <div style={{ flex: 1 }}>
                  <h3 style={{ fontWeight: 800, fontSize: '1.25rem', marginBottom: '0.75rem', color: '#1a1f1e' }}>
                    {camp.name}
                  </h3>
                  <p style={{ 
                    fontSize: '0.875rem', 
                    color: 'var(--text-muted)', 
                    lineHeight: '1.6',
                    marginBottom: '1.5rem',
                    display: '-webkit-box',
                    WebkitLineClamp: 2,
                    WebkitBoxOrient: 'vertical',
                    overflow: 'hidden'
                  }}>
                    {camp.description || 'لا يوجد وصف متاح لهذه الحملة حالياً'}
                  </p>
                </div>

                <div style={{ background: 'rgba(0,0,0,0.02)', margin: '0 -1.75rem 1.25rem', padding: '1rem 1.75rem' }}>
                  <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--text-muted)', fontSize: '0.8rem' }}>
                      <Calendar size={14} />
                      {formatDate(camp.start_date)}
                    </div>
                    {camp.end_date && (
                      <>
                        <div style={{ width: 10, height: 1, background: '#cbd5e1' }} />
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--text-muted)', fontSize: '0.8rem' }}>
                          <Clock size={14} />
                          {formatDate(camp.end_date)}
                        </div>
                      </>
                    )}
                  </div>
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <span style={{ fontSize: '0.7rem', color: 'var(--text-light)', display: 'block' }}>إجمالي الميزانية</span>
                    <span style={{ fontWeight: 900, color: 'var(--primary)', fontSize: '1.1rem' }}>
                      {camp.budget.toLocaleString('ar-EG')} <span style={{ fontSize: '0.75rem', fontWeight: 500 }}>ج.م</span>
                    </span>
                  </div>
                  <div style={{ textAlign: 'left' }}>
                    <span style={{ fontSize: '0.7rem', color: 'var(--text-light)', display: 'block' }}>حالة الحالات</span>
                    <span style={{ fontSize: '0.85rem', fontWeight: 600 }}>إسناد تلقائي</span>
                  </div>
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
