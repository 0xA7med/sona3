import { useEffect, useState } from 'react';
import { 
  Search, Filter, Download, Calendar, 
  ArrowUpRight, CreditCard, User, History 
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import { toast } from '../components/Toast';
import { TRANSACTION_TYPE_LABELS } from '../types';
import type { TransactionType } from '../types';

export default function AdminTransactions() {
  const [txs, setTxs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState<TransactionType | 'all'>('all');

  useEffect(() => {
    fetchTransactions();
  }, []);

  async function fetchTransactions() {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('transactions')
        .select(`
          *,
          family:families(mother_name, sequential_id),
          campaign:campaigns(name),
          volunteer:profiles(full_name)
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setTxs(data || []);
    } catch (err) {
      toast('تعذر تحميل سجل المعاملات', 'error');
    } finally {
      setLoading(false);
    }
  }

  const filtered = txs.filter(t => {
    const matchesSearch = 
      t.family?.mother_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      t.family?.sequential_id?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      t.volunteer?.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      t.campaign?.name?.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesType = filterType === 'all' || t.transaction_type === filterType;
    return matchesSearch && matchesType;
  });

  const totalAmount = filtered.reduce((sum, t) => sum + (t.amount || 0), 0);

  return (
    <div className="page-content">
      <div className="page-header">
        <div>
          <h1 className="page-title">السجل المالي العام</h1>
          <p className="page-subtitle">مراجعة وتدقيق كافة عمليات التوزيع والتحويلات</p>
        </div>
        <button className="btn btn-secondary" onClick={() => toast('سيتم تفعيل تصدير Excel قريباً')}>
          <Download size={20} /> تصدير السجل
        </button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="stat-card">
          <div className="stat-icon" style={{ background: 'rgba(57,144,255,0.1)', color: 'var(--primary)' }}>
            <History size={24} />
          </div>
          <div className="stat-value">{filtered.length}</div>
          <div className="stat-label">إجمالي العمليات</div>
        </div>
        <div className="stat-card">
          <div className="stat-icon" style={{ background: 'rgba(34,197,94,0.1)', color: 'var(--success)' }}>
            <CreditCard size={24} />
          </div>
          <div className="stat-value">{totalAmount.toLocaleString()} ج.م</div>
          <div className="stat-label">إجمالي المبالغ الموزعة</div>
        </div>
        <div className="stat-card">
          <div className="stat-icon" style={{ background: 'rgba(234,179,8,0.1)', color: 'var(--gold)' }}>
            <User size={24} />
          </div>
          <div className="stat-value">{new Set(filtered.map(t => t.volunteer_id)).size}</div>
          <div className="stat-label">متطوعون مساهمون</div>
        </div>
      </div>

      {/* Filters */}
      <div className="glass-card mb-8 px-6 py-4" style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', alignItems: 'center' }}>
        <div style={{ flex: 1, minWidth: '300px', position: 'relative' }}>
          <Search style={{ position: 'absolute', right: '1rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} size={18} />
          <input 
            type="text" 
            className="input pr-10" 
            placeholder="بحث باسم الأسرة، المتطوع، أو الحملة..." 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <select 
          className="input" 
          style={{ width: 'auto' }}
          value={filterType}
          onChange={(e) => setFilterType(e.target.value as any)}
        >
          <option value="all">كل الأنواع</option>
          <option value="financial_transfer">تحويل مالي</option>
          <option value="food_basket">كرتونة مواد غذائية</option>
          <option value="clothing">كسوة</option>
        </select>
        <button className="btn btn-ghost">
          <Filter size={18} /> تصفية متقدمة
        </button>
      </div>

      {/* Table */}
      <div className="glass-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="table">
            <thead>
              <tr>
                <th>التاريخ</th>
                <th>الأسرة</th>
                <th>الحملة</th>
                <th>المتطوع</th>
                <th>النوع</th>
                <th>المبلغ</th>
                <th>الحالة</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                [...Array(5)].map((_, i) => (
                  <tr key={i}>
                    <td colSpan={8}><div className="skeleton" style={{ height: '40px' }} /></td>
                  </tr>
                ))
              ) : filtered.map((tx) => (
                <tr key={tx.id}>
                  <td style={{ fontSize: '0.8rem', whiteSpace: 'nowrap' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <Calendar size={14} className="text-muted" />
                      {new Date(tx.created_at).toLocaleDateString('ar-EG')}
                    </div>
                  </td>
                  <td>
                    <div style={{ fontWeight: 700 }}>{tx.family?.mother_name}</div>
                    <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>{tx.family?.sequential_id}</div>
                  </td>
                  <td>
                    <div className="badge badge-outline">{tx.campaign?.name || 'حملة عامة'}</div>
                  </td>
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <div style={{ width: 24, height: 24, borderRadius: '50%', background: 'var(--surface)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.7rem', fontWeight: 800 }}>
                        {tx.volunteer?.full_name?.[0]}
                      </div>
                      <span style={{ fontSize: '0.85rem' }}>{tx.volunteer?.full_name}</span>
                    </div>
                  </td>
                  <td>
                    <span style={{ fontSize: '0.8rem' }}>
                      {TRANSACTION_TYPE_LABELS[tx.transaction_type as TransactionType] || tx.transaction_type}
                    </span>
                  </td>
                  <td>
                    <div style={{ fontWeight: 900, color: 'var(--primary)', fontSize: '1rem' }}>
                      {tx.amount} <span style={{ fontSize: '0.7rem' }}>ج.م</span>
                    </div>
                  </td>
                  <td>
                    <span className={`badge ${tx.status === 'completed' ? 'badge-success' : 'badge-warning'}`}>
                      {tx.status === 'completed' ? 'مكتمل' : 'قيد المراجعة'}
                    </span>
                  </td>
                  <td>
                    <button className="btn btn-ghost btn-sm">
                      <ArrowUpRight size={16} />
                    </button>
                  </td>
                </tr>
              ))}
              {!loading && filtered.length === 0 && (
                <tr>
                  <td colSpan={8} style={{ textAlign: 'center', padding: '4rem', color: 'var(--text-muted)' }}>
                    <History size={48} style={{ opacity: 0.2, marginBottom: '1rem' }} />
                    <p>لا يوجد عمليات مطابقة لخيارات البحث</p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
