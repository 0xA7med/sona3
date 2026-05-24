import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, Plus, Users, Download, Eye, Edit, ChevronDown, ChevronUp, Baby } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { toast } from '../lib/toast';
import type { Family, SocialStatus } from '../types';
import { SOCIAL_STATUS_LABELS, SCHOOL_STAGE_LABELS, getPriorityLevel, calcPriorityScore } from '../types';
import { useNavigate } from 'react-router-dom';

export default function AdminFamilies() {
  const navigate = useNavigate();
  const [families, setFamilies] = useState<Family[]>([]);
  const [loading, setLoading]   = useState(true);
  const [search, setSearch]     = useState('');
  const [statusFilter, setStatusFilter] = useState<SocialStatus | 'all'>('all');
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());
  const [searchChildren, setSearchChildren] = useState(true);

  async function fetchFamilies() {
    setLoading(true);
    let query = supabase
      .from('families')
      .select('*, children(*)')
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

  useEffect(() => {
    const id = setTimeout(() => fetchFamilies(), 0);
    return () => clearTimeout(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [statusFilter]);

  useEffect(() => {
    if (!search.trim()) {
      setExpandedRows(new Set());
      return;
    }
    if (!searchChildren) return;
    const q = search.trim().toLowerCase();
    const matchingFamilies = families.filter(f =>
      f.children?.some(c => c.child_name.toLowerCase().includes(q))
    ).map(f => f.id);
    if (matchingFamilies.length > 0) {
      setExpandedRows(prev => {
        const next = new Set(prev);
        matchingFamilies.forEach(id => next.add(id));
        return next;
      });
    }
  }, [search, families, searchChildren]);

  const toggleRow = (id: string) => {
    const next = new Set(expandedRows);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setExpandedRows(next);
  };

  const filtered = families
    .map(f => {
      const liveScore = calcPriorityScore({
        social_status: f.social_status,
        has_chronic_illness: f.has_chronic_illness,
        is_disabled: f.is_disabled,
        children_count: f.children?.length || 0,
        vulnerability_score: f.children?.filter(c => c.is_orphan).length ? f.children.filter(c => c.is_orphan).length * 10 : 0
      });
      return { ...f, liveScore };
    })
    .filter(f => {
      const q = search.trim().toLowerCase();
      const matchesSearch = !q || (
        f.mother_name?.toLowerCase().includes(q) ||
        f.national_id?.includes(q) ||
        f.phone?.includes(q) ||
        f.sequential_id?.toLowerCase().includes(q) ||
        f.governorate?.includes(q) ||
        (searchChildren && f.children?.some(c => c.child_name.toLowerCase().includes(q)))
      );

      const matchesStatus = statusFilter === 'all' || f.social_status === statusFilter;

      return matchesSearch && matchesStatus;
    })
    .sort((a, b) => b.liveScore - a.liveScore);

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

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', padding: '0 0.5rem' }}>
           <input 
             type="checkbox" id="searchChildren" 
             checked={searchChildren} onChange={e => setSearchChildren(e.target.checked)}
             style={{ width: '18px', height: '18px', cursor: 'pointer', accentColor: 'var(--primary)' }}
           />
           <label htmlFor="searchChildren" style={{ fontSize: '0.85rem', fontWeight: 700, cursor: 'pointer', color: 'var(--text-dark)' }}>
              البحث في الأبناء
           </label>
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
                <th style={{ padding: '1rem', color: 'var(--text-muted)', fontWeight: 700, fontSize: '0.85rem' }}>الأبناء</th>
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
                    const priority = getPriorityLevel(f.liveScore);
                    return (
                      <React.Fragment key={f.id}>
                        <motion.tr
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          exit={{ opacity: 0 }}
                          style={{ borderBottom: '1px solid rgba(0,0,0,0.05)', transition: 'background 0.2s', cursor: 'pointer' }}
                          whileHover={{ backgroundColor: 'rgba(0,0,0,0.01)' }}
                          onClick={() => toggleRow(f.id)}
                        >
                          <td style={{ padding: '1rem' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                               <div style={{ color: 'var(--text-light)', opacity: 0.5 }}>
                                  {expandedRows.has(f.id) ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                               </div>
                               <div>
                                  <div style={{ fontWeight: 700, color: 'var(--primary-dark)' }}>{f.mother_name}</div>
                                  <div style={{ fontSize: '0.75rem', color: 'var(--text-light)', fontFamily: 'monospace', marginTop: '0.2rem' }}>
                                    {f.sequential_id}
                                  </div>
                               </div>
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
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', fontWeight: 700 }}>
                               <Baby size={14} color="var(--primary)" />
                               <span>{f.children?.length || 0} أبناء</span>
                            </div>
                          </td>
                          <td style={{ padding: '1rem' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                              <span className={`priority-badge ${priority.css}`} style={{ padding: '0.2rem 0.6rem' }}>
                                {priority.label}
                              </span>
                              <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)' }}>
                                {f.liveScore} نقطة
                              </span>
                            </div>
                          </td>
                          <td style={{ padding: '1rem', textAlign: 'center' }}>
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}>
                              <button 
                                className="btn btn-ghost btn-sm" title="عرض الملف" 
                                onClick={(e) => { e.stopPropagation(); navigate(`/admin/families/${f.id}`); }}
                              >
                                <Eye size={16} />
                              </button>
                              <button 
                                className="btn btn-ghost btn-sm" title="تعديل البيانات" 
                                onClick={(e) => { e.stopPropagation(); navigate(`/admin/families/${f.id}/edit`); }}
                              >
                                <Edit size={16} />
                              </button>
                            </div>
                          </td>
                        </motion.tr>
                        
                        {/* Expanded Children Rows */}
                        <AnimatePresence>
                          {expandedRows.has(f.id) && (
                            <motion.tr
                              initial={{ opacity: 0, height: 0 }}
                              animate={{ opacity: 1, height: 'auto' }}
                              exit={{ opacity: 0, height: 0 }}
                              style={{ background: 'var(--surface-light)' }}
                            >
                              <td colSpan={5} style={{ padding: '1.25rem 3rem' }}>
                                {f.children && f.children.length > 0 ? (
                                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                                    {f.children.map(child => (
                                      <div key={child.id} className="card p-sm bg-white" style={{ border: '1px solid var(--border-light)', borderRadius: '12px' }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                                          <div style={{ width: 32, height: 32, borderRadius: '8px', background: 'var(--primary-light)', color: 'var(--primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.8rem' }}>
                                            {child.gender === 'M' ? '👦' : '👧'}
                                          </div>
                                          <div>
                                            <div style={{ fontWeight: 800, fontSize: '0.85rem' }}>{child.child_name}</div>
                                            <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', display: 'flex', gap: '0.5rem' }}>
                                              <span>🎂 {child.age || '---'} سنة</span>
                                              <span>🎓 {SCHOOL_STAGE_LABELS[child.school_stage!] || 'غير ملتحق'}</span>
                                            </div>
                                          </div>
                                        </div>
                                      </div>
                                    ))}
                                  </div>
                                ) : (
                                  <div style={{ textAlign: 'center', padding: '1rem', color: 'var(--text-light)', fontStyle: 'italic', fontSize: '0.85rem' }}>
                                    لا يوجد بيانات أطفال مسجلة لهذه الأسرة
                                  </div>
                                )}
                              </td>
                            </motion.tr>
                          )}
                        </AnimatePresence>
                      </React.Fragment>
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
