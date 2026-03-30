import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Search, Phone, Eye, DollarSign } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useNavigate } from 'react-router-dom';
import { toast } from '../components/Toast';
import type { Profile } from '../types';

export default function AdminVolunteers() {
  const [volunteers, setVolunteers] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    fetchVolunteers();
  }, []);

  async function fetchVolunteers() {
    setLoading(true);
    try {
      // 1. Fetch Profiles
      const { data: profs, error: pErr } = await supabase
        .from('profiles')
        .select('*')
        .eq('role', 'volunteer')
        .order('full_name');
      if (pErr) throw pErr;

      // 2. Fetch all related financial data in parallel
      const [txRes, transRes] = await Promise.all([
        supabase.from('transactions').select('volunteer_id, total_amount, amount'),
        supabase.from('volunteer_fund_transfers').select('receiver_id, amount')
      ]);

      if (txRes.error) throw txRes.error;
      if (transRes.error) throw transRes.error;

      // 3. Map financial data to profiles
      const txMap = (txRes.data || []).reduce((acc: any, t) => {
        acc[t.volunteer_id] = (acc[t.volunteer_id] || 0) + (t.total_amount || t.amount || 0);
        return acc;
      }, {});

      const transMap = (transRes.data || []).reduce((acc: any, t) => {
        acc[t.receiver_id] = (acc[t.receiver_id] || 0) + (t.amount || 0);
        return acc;
      }, {});

      const enriched = (profs || []).map(p => ({
        ...p,
        volunteer_fund_transfers: [{ amount: transMap[p.id] || 0 }],
        transactions: [{ total_amount: txMap[p.id] || 0 }]
      }));

      setVolunteers(enriched as Profile[]);
    } catch (err) {
      console.error('List fetch error:', err);
      toast('حدث خطأ في تحميل قائمة المتطوعين', 'error');
    } finally {
      setLoading(false);
    }
  }

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
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                    <h3 style={{ fontWeight: 800 }}>{v.full_name}</h3>
                    {!v.is_active && <span className="badge badge-inactive">بانتظار التفعيل</span>}
                  </div>
                  <div style={{ display: 'flex', gap: '1.5rem', marginTop: '0.2rem', color: 'var(--text-muted)', fontSize: '0.8rem' }}>
                    <span style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}><Phone size={14} /> {v.phone || 'غير متاح'}</span>
                    <span style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                       <DollarSign size={14} color="var(--primary)" /> 
                       <b>
                         {(() => {
                           const transfers = (v as any).volunteer_fund_transfers?.reduce((acc: number, t: any) => acc + (t.amount || 0), 0) || 0;
                           const spent = (v as any).transactions?.reduce((acc: number, t: any) => acc + (t.total_amount || t.amount || 0), 0) || 0;
                           return transfers - spent;
                         })()} 
                         ج.م
                       </b>
                    </span>
                  </div>
                </div>
              </div>

                <button 
                  className="btn btn-primary btn-sm"
                  onClick={() => navigate(`/admin/volunteers/${v.id}`)}
                >
                  <Eye size={18} /> التفاصيل والتحكم
                </button>
            </motion.div>
          ))
        )}
      </div>
    </div>
  );
}
