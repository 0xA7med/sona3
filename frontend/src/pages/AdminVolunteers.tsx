import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Search, UserCheck, UserX, Mail, Phone, Calendar } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { toast } from '../components/Toast';
import type { Profile } from '../types';

export default function AdminVolunteers() {
  const [volunteers, setVolunteers] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  useEffect(() => {
    fetchVolunteers();
  }, []);

  async function fetchVolunteers() {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('role', 'volunteer')
        .order('full_name');

      if (error) throw error;
      setVolunteers(data || []);
    } catch (err) {
      toast('حدث خطأ في تحميل المتطوعين', 'error');
    } finally {
      setLoading(false);
    }
  }

  const toggleStatus = async (id: string, current: boolean) => {
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ is_active: !current })
        .eq('id', id);

      if (error) throw error;
      setVolunteers(prev => prev.map(v => v.id === id ? { ...v, is_active: !current } : v));
      toast(`تم ${!current ? 'تفعيل' : 'تعطيل'} الحساب بنجاح`, 'success');
    } catch (err) {
      toast('حدث خطأ أثناء التحديث', 'error');
    }
  };

  const filtered = volunteers.filter(v => 
    v.full_name?.toLowerCase().includes(search.toLowerCase()) ||
    v.phone?.includes(search)
  );

  return (
    <div className="page-content">
      <div className="page-header">
        <div>
          <h1 className="page-title">إدارة المتطوعين 👥</h1>
          <p className="page-subtitle">مراجعة وتوثيق حسابات المتطوعين في الميدان</p>
        </div>
      </div>

      <div className="search-bar mb-md">
        <Search size={20} className="search-icon" />
        <input 
          type="text" 
          placeholder="ابحث بالاسم أو رقم الهاتف..." 
          className="search-input"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '0.75rem' }}>
        {loading ? (
          [1,2,3].map(i => <div key={i} className="skeleton" style={{ height: 120, borderRadius: 16 }} />)
        ) : filtered.length === 0 ? (
          <div className="empty-state">
            <div className="empty-state-icon">👤</div>
            <p>لا يوجد متطوعين مسجلين متاحين</p>
          </div>
        ) : (
          filtered.map((v) => (
            <motion.div 
              key={v.id} 
              className="card p-md"
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderRight: `4px solid ${v.is_active ? 'var(--primary)' : 'var(--error)'}` }}
            >
              <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
                <div style={{ width: 48, height: 48, borderRadius: '14px', background: 'var(--surface)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.4rem' }}>
                  👤
                </div>
                <div>
                  <h3 style={{ fontWeight: 800 }}>{v.full_name}</h3>
                  <div style={{ display: 'flex', gap: '1.5rem', marginTop: '0.2rem', color: 'var(--text-muted)', fontSize: '0.8rem' }}>
                    <span style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}><Phone size={14} /> {v.phone || 'غير متاح'}</span>
                    <span style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}><Calendar size={14} /> انضم في {new Date(v.created_at).toLocaleDateString('ar-EG')}</span>
                  </div>
                </div>
              </div>

              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <button 
                  className={`btn btn-sm ${v.is_active ? 'btn-ghost' : 'btn-primary'}`}
                  style={{ color: v.is_active ? 'var(--error)' : 'white' }}
                  onClick={() => toggleStatus(v.id, v.is_active)}
                >
                  {v.is_active ? <UserX size={18} /> : <UserCheck size={18} />}
                  {v.is_active ? 'تعطيل الحساب' : 'تفعيل الحساب'}
                </button>
              </div>
            </motion.div>
          ))
        )}
      </div>
    </div>
  );
}
