import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Plus, Search, Filter, Calendar } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { toast } from '../components/Toast';
import type { Campaign } from '../types';

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

  return (
    <div className="page-content">
      <div className="page-header">
        <div>
          <h1 className="page-title">إدارة الحملات 🏹</h1>
          <p className="page-subtitle">تتبع المبادرات النشطة والمخطط لها</p>
        </div>
        <button className="btn btn-primary" onClick={() => navigate('/admin/campaigns/new')}>
          <Plus size={20} />
          حملة جديدة
        </button>
      </div>

      <div className="search-bar mb-md">
        <Search size={20} className="search-icon" />
        <input 
          type="text" 
          placeholder="ابحث عن حملة بالاسم..." 
          className="search-input"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <button className="btn btn-ghost btn-sm">
          <Filter size={18} />
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {loading ? (
          [1,2,3].map(i => <div key={i} className="skeleton" style={{ height: 200, borderRadius: 20 }} />)
        ) : filtered.length === 0 ? (
          <div className="empty-state col-span-full">
            <div className="empty-state-icon">🏜️</div>
            <p>لا توجد حملات تطابق بحثك</p>
          </div>
        ) : (
          filtered.map((camp) => (
            <motion.div 
              key={camp.id} 
              className="glass-card clickable"
              whileHover={{ y: -5 }}
              onClick={() => navigate(`/admin/campaigns/${camp.id}`)}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1rem' }}>
                <div className={`badge badge-${camp.status === 'active' ? 'in-progress' : camp.status === 'completed' ? 'completed' : 'pending'}`}>
                  {camp.status === 'active' ? 'نشطة' : camp.status === 'completed' ? 'منتهية' : 'مسودة'}
                </div>
                <Calendar size={18} color="var(--text-muted)" />
              </div>

              <h3 style={{ fontWeight: 800, fontSize: '1.2rem', marginBottom: '0.5rem' }}>{camp.name}</h3>
              <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '1.5rem', minHeight: '3em' }}>
                {camp.description || 'لا يوجد وصف متاح لهذه الحملة'}
              </p>

              <div style={{ borderTop: '1px solid var(--border-light)', paddingTop: '1rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <div style={{ fontSize: '0.7rem', color: 'var(--text-light)' }}>الميزانية المقدرة</div>
                  <div style={{ fontWeight: 900, color: 'var(--primary)' }}>{camp.budget.toLocaleString('ar-EG')} ج.م</div>
                </div>
                <div style={{ textAlign: 'left' }}>
                  <div style={{ fontSize: '0.7rem', color: 'var(--text-light)' }}>نوع الحملة</div>
                  <div style={{ fontWeight: 700 }}>{camp.campaign_type === 'financial' ? 'مادية' : 'عينية'}</div>
                </div>
              </div>
            </motion.div>
          ))
        )}
      </div>
    </div>
  );
}
