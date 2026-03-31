import { useEffect, useState } from 'react';
import { 
  Search, Download, CreditCard, User, History, 
  MapPin, CheckCircle2, Clock
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import { toast } from '../components/Toast';
import { motion } from 'framer-motion';

export default function AdminTransactions() {
  const [assignments, setAssignments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterCampaign, setFilterCampaign] = useState('all');
  const [campaigns, setCampaigns] = useState<any[]>([]);

  useEffect(() => {
    fetchData();
  }, []);

  async function fetchData() {
    try {
      setLoading(true);
      
      // Fetch completed assignments as "Transactions"
      const { data: assignmentsData, error: assignmentsError } = await supabase
        .from('case_assignments')
        .select(`
          id,
          status,
          updated_at,
          volunteer_id,
          volunteer:profiles(full_name),
          family:families(id, mother_name, sequential_id, district, governorate),
          campaign:campaigns(id, name, amount_per_family)
        `)
        .eq('status', 'completed')
        .order('updated_at', { ascending: false });

      if (assignmentsError) throw assignmentsError;
      setAssignments(assignmentsData || []);

      // Fetch campaigns for filtering
      const { data: campaignsData } = await supabase.from('campaigns').select('id, name');
      setCampaigns(campaignsData || []);

    } catch (err: any) {
      toast('تعذر تحميل السجل المالي', 'error');
    } finally {
      setLoading(false);
    }
  }

  const filtered = assignments.filter(a => {
    const term = searchTerm.toLowerCase();
    const matchesSearch = 
      a.family?.mother_name?.toLowerCase().includes(term) ||
      a.family?.sequential_id?.toLowerCase().includes(term) ||
      a.volunteer?.full_name?.toLowerCase().includes(term);
    
    const matchesCampaign = filterCampaign === 'all' || a.campaign?.id === filterCampaign;
    return matchesSearch && matchesCampaign;
  });

  const totalAmount = filtered.reduce((sum, a) => sum + (a.campaign?.amount_per_family || 0), 0);

  return (
    <div className="page-content">
      <motion.div 
        className="page-header"
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <div>
          <h1 className="page-title">السجل المالي العام 💎</h1>
          <p className="page-subtitle">تتبع كافة التحويلات المالية وعمليات التوزيع الميدانية</p>
        </div>
        <div style={{ display: 'flex', gap: '0.75rem' }}>
          <button className="btn btn-ghost" onClick={fetchData}>
            <History size={18} /> تحديث البيانات
          </button>
          <button className="btn btn-primary" onClick={() => toast('سيتم تفعيل التصدير قريباً')}>
            <Download size={18} /> تصدير Excel
          </button>
        </div>
      </motion.div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <StatCard 
          icon={<CreditCard size={24} />} 
          label="إجمالي المبالغ المحولة" 
          value={`${totalAmount.toLocaleString('ar-EG')} ج.م`}
          subValue={`${filtered.length} حوالة مكتملة`}
          color="var(--primary)"
        />
        <StatCard 
          icon={<User size={24} />} 
          label="المتطوعون النشطون" 
          value={new Set(filtered.map(a => a.volunteer_id).filter(Boolean)).size}
          subValue="شاركوا في التوزيع مؤخراً"
          color="var(--gold)"
        />
        <StatCard 
          icon={<MapPin size={24} />} 
          label="المناطق الجغرافية" 
          value={new Set(filtered.map(a => a.family?.governorate).filter(Boolean)).size}
          subValue="محافظات مستهدفة"
          color="var(--info)"
        />
      </div>

      {/* Filters Bar */}
      <div className="glass-card mb-8 px-6 py-4 stagger" style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', alignItems: 'center' }}>
        <div style={{ flex: 1, minWidth: '280px', position: 'relative' }}>
          <Search style={{ position: 'absolute', right: '1rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} size={18} />
          <input 
            type="text" 
            className="form-input" 
            style={{ paddingRight: '2.5rem' }}
            placeholder="بحث باسم الأسرة أو المتطوع أو الكود..." 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <select 
          className="form-select" 
          style={{ width: 'auto', minWidth: '180px' }}
          value={filterCampaign}
          onChange={(e) => setFilterCampaign(e.target.value)}
        >
          <option value="all">كل الحملات</option>
          {campaigns.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
      </div>

      {/* Transactions Table */}
      <div className="glass-card" style={{ padding: 0, overflow: 'hidden' }}>
        <div style={{ overflowX: 'auto' }}>
          <table className="w-full text-right" style={{ minWidth: '900px', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: 'rgba(6,143,100,0.03)', borderBottom: '1px solid var(--border)' }}>
                <th style={{ padding: '1.25rem', fontSize: '0.8rem', color: 'var(--text-muted)' }}>التاريخ والوقت</th>
                <th style={{ padding: '1.25rem', fontSize: '0.8rem', color: 'var(--text-muted)' }}>الأسرة المستفيدة</th>
                <th style={{ padding: '1.25rem', fontSize: '0.8rem', color: 'var(--text-muted)' }}>الحملة</th>
                <th style={{ padding: '1.25rem', fontSize: '0.8rem', color: 'var(--text-muted)' }}>المتطوع</th>
                <th style={{ padding: '1.25rem', fontSize: '0.8rem', color: 'var(--text-muted)' }}>المبلغ</th>
                <th style={{ padding: '1.25rem', fontSize: '0.8rem', color: 'var(--text-muted)' }}>الحالة</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                [...Array(5)].map((_, i) => (
                  <tr key={i}><td colSpan={6} style={{ padding: '1rem' }}><div className="skeleton" style={{ height: '50px' }} /></td></tr>
                ))
              ) : filtered.length === 0 ? (
                <tr><td colSpan={6} style={{ padding: '5rem', textAlign: 'center', color: 'var(--text-light)' }}>
                  <History size={48} style={{ opacity: 0.1, marginBottom: '1rem' }} />
                  <p>لا توجد بيانات مطابقة للبحث</p>
                </td></tr>
              ) : (
                filtered.map((a, i) => (
                  <motion.tr 
                    key={a.id} 
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.03 }}
                    style={{ borderBottom: '1px solid var(--border)', background: i % 2 === 0 ? 'transparent' : 'rgba(0,0,0,0.01)' }}
                  >
                    <td style={{ padding: '1.25rem' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.85rem' }}>
                        <Clock size={14} color="var(--text-muted)" />
                        {new Date(a.updated_at).toLocaleDateString('ar-EG')}
                      </div>
                      <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)', marginTop: '0.2rem' }}>
                         الساعة {new Date(a.updated_at).toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' })}
                      </div>
                    </td>
                    <td style={{ padding: '1.25rem' }}>
                      <div style={{ fontWeight: 800, fontSize: '0.95rem' }}>{a.family?.mother_name}</div>
                      <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                        <MapPin size={10} /> {a.family?.district}
                      </div>
                    </td>
                    <td style={{ padding: '1.25rem' }}>
                      <span style={{ fontSize: '0.85rem', fontWeight: 600 }}>{a.campaign?.name}</span>
                    </td>
                    <td style={{ padding: '1.25rem' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                        <div style={{ width: 28, height: 28, borderRadius: '50%', background: 'var(--primary-light)', color: 'var(--primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.75rem', fontWeight: 900 }}>
                          {a.volunteer?.full_name?.[0] || 'V'}
                        </div>
                        <span style={{ fontSize: '0.85rem', fontWeight: 500 }}>{a.volunteer?.full_name}</span>
                      </div>
                    </td>
                    <td style={{ padding: '1.25rem' }}>
                      <div style={{ fontWeight: 900, color: 'var(--primary)', fontSize: '1.1rem' }}>
                        {a.campaign?.amount_per_family || 0} <span style={{ fontSize: '0.7rem' }}>ج.م</span>
                      </div>
                    </td>
                    <td style={{ padding: '1.25rem' }}>
                      <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem', color: 'var(--success)', fontWeight: 800, fontSize: '0.8rem', background: 'rgba(16,185,129,0.08)', padding: '0.4rem 0.8rem', borderRadius: '10px' }}>
                        <CheckCircle2 size={14} /> ناجح
                      </div>
                    </td>
                  </motion.tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function StatCard({ icon, label, value, subValue, color }: any) {
  return (
    <div className="glass-card" style={{ display: 'flex', flexDirection: 'column', gap: '1rem', borderRight: `4px solid ${color}` }}>
      <div style={{ width: 44, height: 44, borderRadius: '12px', background: 'var(--surface)', display: 'flex', alignItems: 'center', justifyContent: 'center', color, boxShadow: '0 4px 10px rgba(0,0,0,0.03)' }}>
        {icon}
      </div>
      <div>
        <div style={{ fontSize: '1.75rem', fontWeight: 900, color: 'var(--text)', lineHeight: 1 }}>{value}</div>
        <div style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)', marginTop: '0.4rem' }}>{label}</div>
        <div style={{ fontSize: '0.68rem', color: 'var(--text-light)', marginTop: '0.2rem' }}>{subValue}</div>
      </div>
    </div>
  );
}
