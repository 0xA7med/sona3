import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, Plus, Filter, Users, Download, Eye, Edit } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { toast } from '../components/Toast';
import type { Family, SocialStatus } from '../types';
import { SOCIAL_STATUS_LABELS, getPriorityLevel } from '../types';
import { useNavigate } from 'react-router-dom';

export default function AdminFamilies() {
  const navigate = useNavigate();
  const [families, setFamilies] = useState<Family[]>([]);
  const [loading, setLoading]   = useState(true);
  const [search, setSearch]     = useState('');
  const [statusFilter, setStatusFilter] = useState<SocialStatus | 'all'>('all');

  useEffect(() => {
    fetchFamilies();
  }, [statusFilter]);

  async function fetchFamilies() {
    setLoading(true);
    let query = supabase
      .from('families')
      .select('*, children(count)')
      .order('priority_score', { ascending: false });

    if (statusFilter !== 'all') {
      query = query.eq('social_status', statusFilter);
    }

    const { data, error } = await query;
    if (error) {
      toast('حدث خطأ أثناء تحميل البيانات', 'error');
    } else {
      setFamilies(data as unknown as Family[]);
    }
    setLoading(false);
  }

  const filtered = families.filter(f => {
    const q = search.trim().toLowerCase();
    if (!q) return true;
    return (
      f.mother_name?.toLowerCase().includes(q) ||
      f.national_id?.includes(q) ||
      f.phone?.includes(q) ||
      f.sequential_id?.toLowerCase().includes(q) ||
      f.governorate?.includes(q)
    );
  });

  return (
    <div className="page-content">
      {/* Header */}
      <motion.div
        className="page-header"
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <div>
          <h1 className="page-title">إدارة الأسر</h1>
          <p className="page-subtitle">عرض وإدارة قاعدة بيانات الأسر المستفيدة</p>
        </div>
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <button className="btn btn-ghost" title="تصدير Excel">
            <Download size={18} />
          </button>
          <button className="btn btn-primary" onClick={() => navigate('/admin/families/new')}>
            <Plus size={18} />
            إضافة أسرة
          </button>
        </div>
      </motion.div>

      {/* Filters */}
      <div className="glass-card" style={{ padding: '1rem 1.25rem', marginBottom: '1.5rem', display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
        <div className="form-group" style={{ flex: '1 1 300px', margin: 0 }}>
          <div style={{ position: 'relative' }}>
            <Search size={18} className="search-icon" style={{ top: '50%', transform: 'translateY(-50%)' }} />
            <input
              type="search"
              className="form-input"
              placeholder="بحث بالاسم، الرقم القومي، الهاتف، أو الكود..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              style={{ paddingRight: '2.5rem' }}
            />
          </div>
        </div>

        <div className="form-group" style={{ flex: '0 0 auto', margin: 0, minWidth: '180px' }}>
          <select
            className="form-select"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as SocialStatus | 'all')}
          >
            <option value="all">جميع الحالات الاجتماعية</option>
            {Object.entries(SOCIAL_STATUS_LABELS).map(([val, label]) => (
              <option key={val} value={val}>{label}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Table / List */}
      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'right' }}>
            <thead>
              <tr style={{ background: 'var(--surface)', borderBottom: '2px solid rgba(0,0,0,0.05)' }}>
                <th style={{ padding: '1rem', color: 'var(--text-muted)', fontWeight: 700, fontSize: '0.85rem' }}>الكود / الاسم</th>
                <th style={{ padding: '1rem', color: 'var(--text-muted)', fontWeight: 700, fontSize: '0.85rem' }}>الحالة والمنطقة</th>
                <th style={{ padding: '1rem', color: 'var(--text-muted)', fontWeight: 700, fontSize: '0.85rem' }}>الأولوية</th>
                <th style={{ padding: '1rem', color: 'var(--text-muted)', fontWeight: 700, fontSize: '0.85rem', textAlign: 'center' }}>الإجراءات</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={4} style={{ padding: '2rem', textAlign: 'center' }}>
                    <span className="skeleton" style={{ width: 40, height: 40, borderRadius: '50%', display: 'inline-block' }} />
                  </td>
                </tr>
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={4} style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-light)' }}>
                    <Users size={32} style={{ margin: '0 auto 1rem', opacity: 0.5 }} />
                    <p style={{ fontWeight: 600 }}>لا توجد بيانات مطابقة للبحث</p>
                  </td>
                </tr>
              ) : (
                <AnimatePresence>
                  {filtered.map(f => {
                    const priority = getPriorityLevel(f.priority_score);
                    return (
                      <motion.tr
                        key={f.id}
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        style={{ borderBottom: '1px solid rgba(0,0,0,0.05)', transition: 'background 0.2s' }}
                        whileHover={{ backgroundColor: 'rgba(0,0,0,0.01)' }}
                      >
                        <td style={{ padding: '1rem' }}>
                          <div style={{ fontWeight: 700, color: 'var(--primary-dark)' }}>{f.mother_name}</div>
                          <div style={{ fontSize: '0.75rem', color: 'var(--text-light)', fontFamily: 'monospace', marginTop: '0.2rem' }}>
                            {f.sequential_id}
                          </div>
                        </td>
                        <td style={{ padding: '1rem' }}>
                          <div className="gap-wrap">
                            <span className="badge badge-pending">{SOCIAL_STATUS_LABELS[f.social_status]}</span>
                            {(f.governorate || f.district) && (
                              <span className="badge" style={{ background: '#f3f4f6', color: '#4b5563' }}>
                                {[f.governorate, f.district].filter(Boolean).join(' - ')}
                              </span>
                            )}
                          </div>
                        </td>
                        <td style={{ padding: '1rem' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                            <span className={`priority-badge ${priority.css}`} style={{ padding: '0.2rem 0.6rem' }}>
                              {priority.label}
                            </span>
                            <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)' }}>
                              {f.priority_score} نقطة
                            </span>
                          </div>
                        </td>
                        <td style={{ padding: '1rem', textAlign: 'center' }}>
                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}>
                            <button className="btn btn-ghost btn-sm" title="عرض الملف" onClick={() => navigate(`/admin/families/${f.id}`)}>
                              <Eye size={16} />
                            </button>
                            <button className="btn btn-ghost btn-sm" title="تعديل البيانات" onClick={() => navigate(`/admin/families/${f.id}/edit`)}>
                              <Edit size={16} />
                            </button>
                          </div>
                        </td>
                      </motion.tr>
                    );
                  })}
                </AnimatePresence>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
