import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, Search, Calendar, Coins, ShoppingBag, Heart, Target, Info, Trash2, Edit3, Eye, AlertTriangle } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { toast } from '../components/Toast';
import type { Campaign, CampaignType } from '../types';

const TYPE_CONFIG: Record<CampaignType, { label: string; icon: any; color: string; bg: string; border: string }> = {
  financial:       { label: 'تحويل مالي',    icon: Coins,       color: '#059664', bg: '#edfcf5', border: '#a7f3d0' },
  food_basket:     { label: 'كرتونة طعام',   icon: ShoppingBag, color: '#d97706', bg: '#fffbeb', border: '#fde68a' },
  clothing:        { label: 'كسوة / ملابس',  icon: Heart,       color: '#7c3aed', bg: '#f5f3ff', border: '#ddd6fe' },
  school_supplies: { label: 'أدوات مدرسية',  icon: Target,      color: '#2563eb', bg: '#eff6ff', border: '#bfdbfe' },
  other:           { label: 'عام / أخرى',    icon: Info,        color: '#64748b', bg: '#f8fafc', border: '#e2e8f0' },
};

const STATUS_CONFIG = {
  active:    { label: 'نشطة',           color: '#059664', bg: '#edfcf5', dot: '#059664' },
  draft:     { label: 'مسودة',          color: '#d97706', bg: '#fffbeb', dot: '#d97706' },
  completed: { label: 'منتهية',         color: '#64748b', bg: '#f1f5f9', dot: '#94a3b8' },
  paused:    { label: 'متوقفة',         color: '#dc2626', bg: '#fef2f2', dot: '#dc2626' },
};

interface DeleteConfirmState {
  campaign: Campaign;
  hasAssignments: boolean;
  count: number;
}

export default function AdminCampaigns() {
  const navigate = useNavigate();
  const [campaigns, setCampaigns]       = useState<Campaign[]>([]);
  const [loading, setLoading]           = useState(true);
  const [search, setSearch]             = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [deleteConfirm, setDeleteConfirm] = useState<DeleteConfirmState | null>(null);
  const [deleting, setDeleting]         = useState(false);

  useEffect(() => { fetchCampaigns(); }, []);

  async function fetchCampaigns() {
    try {
      const { data, error } = await supabase
        .from('campaigns')
        .select('*')
        .order('created_at', { ascending: false });
      if (error) throw error;
      setCampaigns(data || []);
    } catch {
      toast('حدث خطأ في تحميل الحملات', 'error');
    } finally {
      setLoading(false);
    }
  }

  async function handleDeleteClick(e: React.MouseEvent, camp: Campaign) {
    e.stopPropagation();
    // Check linked assignments
    const { count } = await supabase
      .from('case_assignments')
      .select('*', { count: 'exact', head: true })
      .eq('campaign_id', camp.id);
    setDeleteConfirm({ campaign: camp, hasAssignments: (count ?? 0) > 0, count: count ?? 0 });
  }

  async function confirmDelete() {
    if (!deleteConfirm) return;
    setDeleting(true);
    try {
      const { error } = await supabase
        .from('campaigns')
        .delete()
        .eq('id', deleteConfirm.campaign.id);
      if (error) throw error;
      setCampaigns(prev => prev.filter(c => c.id !== deleteConfirm.campaign.id));
      toast('تم حذف الحملة بنجاح', 'success');
      setDeleteConfirm(null);
    } catch (err: any) {
      toast(err.message || 'فشل الحذف، حاول مرة أخرى', 'error');
    } finally {
      setDeleting(false);
    }
  }

  const formatDate = (dateStr?: string) => {
    if (!dateStr) return 'غير محدد';
    return new Date(dateStr).toLocaleDateString('ar-EG', { day: 'numeric', month: 'short', year: 'numeric' });
  };

  const filtered = campaigns.filter(c => {
    const matchSearch = c.name.toLowerCase().includes(search.toLowerCase());
    const matchStatus = statusFilter === 'all' || c.status === statusFilter;
    return matchSearch && matchStatus;
  });

  const counts = {
    all:       campaigns.length,
    active:    campaigns.filter(c => c.status === 'active').length,
    draft:     campaigns.filter(c => c.status === 'draft').length,
    completed: campaigns.filter(c => c.status === 'completed').length,
  };

  return (
    <div className="page-content">
      {/* ── Header ── */}
      <div style={{ marginBottom: '1.5rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '1rem', marginBottom: '1rem' }}>
          <div>
            <h1 className="page-title">إدارة الحملات 🏹</h1>
            <p className="page-subtitle">{campaigns.length} حملة إجمالاً · {counts.active} نشطة</p>
          </div>
          <motion.button
            whileTap={{ scale: 0.95 }}
            className="btn btn-primary btn-sm"
            onClick={() => navigate('/admin/campaigns/new')}
            style={{ flexShrink: 0, borderRadius: '12px', padding: '0.6rem 1rem' }}
          >
            <Plus size={18} /> إضافة
          </motion.button>
        </div>

        {/* Search */}
        <div className="search-bar" style={{ marginBottom: '0.75rem' }}>
          <Search size={18} className="search-icon" color="var(--primary)" />
          <input
            type="text"
            placeholder="ابحث بالاسم..."
            className="search-input"
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>

        {/* Status Filter Chips */}
        <div style={{ display: 'flex', gap: '0.5rem', overflowX: 'auto', paddingBottom: '4px', scrollbarWidth: 'none' }}>
          {[
            { key: 'all',       label: 'الكل',    count: counts.all },
            { key: 'active',    label: 'نشطة',    count: counts.active },
            { key: 'draft',     label: 'مسودة',   count: counts.draft },
            { key: 'completed', label: 'منتهية',  count: counts.completed },
          ].map(f => (
            <button
              key={f.key}
              onClick={() => setStatusFilter(f.key)}
              style={{
                flexShrink: 0,
                padding: '6px 14px',
                borderRadius: '999px',
                border: '1.5px solid',
                borderColor: statusFilter === f.key ? 'var(--primary)' : 'var(--border)',
                background: statusFilter === f.key ? 'var(--primary)' : 'white',
                color: statusFilter === f.key ? 'white' : 'var(--text-muted)',
                fontSize: '0.8rem',
                fontWeight: 700,
                cursor: 'pointer',
                fontFamily: 'inherit',
                transition: 'all 0.2s ease',
              }}
            >
              {f.label} {f.count > 0 && <span style={{ opacity: 0.75 }}>({f.count})</span>}
            </button>
          ))}
        </div>
      </div>

      {/* ── Campaign List ── */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
        <AnimatePresence mode="popLayout">
          {loading ? (
            [1,2,3].map(i => (
              <div key={i} className="skeleton" style={{ height: 96, borderRadius: 16 }} />
            ))
          ) : filtered.length === 0 ? (
            <motion.div key="empty" initial={{ opacity: 0 }} animate={{ opacity: 1 }}
              style={{ textAlign: 'center', padding: '3rem 1rem', color: 'var(--text-muted)' }}>
              <div style={{ fontSize: '3rem', marginBottom: '0.75rem' }}>🏜️</div>
              <p style={{ fontWeight: 700 }}>لا توجد حملات تطابق بحثك</p>
            </motion.div>
          ) : (
            filtered.map((camp, idx) => {
              const TC = TYPE_CONFIG[camp.campaign_type] || TYPE_CONFIG.other;
              const SC = STATUS_CONFIG[camp.status as keyof typeof STATUS_CONFIG] || STATUS_CONFIG.draft;
              return (
                <motion.div
                  key={camp.id}
                  layout
                  initial={{ opacity: 0, y: 16 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  transition={{ delay: idx * 0.04 }}
                  style={{
                    background: 'white',
                    borderRadius: '16px',
                    border: '1px solid var(--border)',
                    borderRight: `4px solid ${TC.color}`,
                    padding: '1rem',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.875rem',
                    cursor: 'pointer',
                    boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
                    transition: 'box-shadow 0.2s, transform 0.2s',
                  }}
                  onClick={() => navigate(`/admin/campaigns/${camp.id}`)}
                  whileHover={{ boxShadow: '0 6px 20px rgba(0,0,0,0.08)', y: -1 } as any}
                  whileTap={{ scale: 0.99 } as any}
                >
                  {/* Type Icon */}
                  <div style={{
                    width: 44, height: 44, borderRadius: '12px', flexShrink: 0,
                    background: TC.bg, border: `1px solid ${TC.border}`,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    color: TC.color,
                  }}>
                    <TC.icon size={22} />
                  </div>

                  {/* Info */}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.25rem' }}>
                      <h3 style={{
                        fontWeight: 800, fontSize: '0.95rem', color: 'var(--text)',
                        overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1
                      }}>{camp.name}</h3>
                      <span style={{
                        flexShrink: 0,
                        fontSize: '0.7rem', fontWeight: 700,
                        padding: '3px 8px', borderRadius: '999px',
                        background: SC.bg, color: SC.color,
                        display: 'flex', alignItems: 'center', gap: '4px',
                      }}>
                        <span style={{ width: 6, height: 6, borderRadius: '50%', background: SC.dot, display: 'inline-block' }} />
                        {SC.label}
                      </span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
                      <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '3px' }}>
                        <Calendar size={11} /> {formatDate(camp.start_date)}
                      </span>
                      {camp.budget > 0 && (
                        <span style={{ fontSize: '0.75rem', fontWeight: 800, color: 'var(--primary)' }}>
                          {camp.budget.toLocaleString('ar-EG')} ج.م
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Actions */}
                  <div style={{ display: 'flex', gap: '0.375rem', flexShrink: 0 }} onClick={e => e.stopPropagation()}>
                    <button
                      onClick={() => navigate(`/admin/campaigns/${camp.id}`)}
                      style={iconBtnStyle('#eff6ff', '#2563eb')}
                      title="عرض"
                    >
                      <Eye size={15} />
                    </button>
                    <button
                      onClick={() => navigate(`/admin/campaigns/${camp.id}/edit`)}
                      style={iconBtnStyle('#f0fdf4', '#059664')}
                      title="تعديل"
                    >
                      <Edit3 size={15} />
                    </button>
                    <button
                      onClick={e => handleDeleteClick(e, camp)}
                      style={iconBtnStyle('#fef2f2', '#dc2626')}
                      title="حذف"
                    >
                      <Trash2 size={15} />
                    </button>
                  </div>
                </motion.div>
              );
            })
          )}
        </AnimatePresence>
      </div>

      {/* ── Delete Confirm Modal ── */}
      <AnimatePresence>
        {deleteConfirm && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            style={{
              position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.55)',
              zIndex: 900, display: 'flex', alignItems: 'flex-end',
              justifyContent: 'center', backdropFilter: 'blur(4px)',
            }}
            onClick={() => !deleting && setDeleteConfirm(null)}
          >
            <motion.div
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', damping: 28, stiffness: 300 }}
              style={{
                background: 'white', borderRadius: '24px 24px 0 0',
                padding: '1.5rem', width: '100%', maxWidth: '600px',
              }}
              onClick={e => e.stopPropagation()}
            >
              {/* Handle */}
              <div style={{ width: 40, height: 4, background: '#e2e8f0', borderRadius: '999px', margin: '0 auto 1.25rem' }} />

              {/* Icon */}
              <div style={{
                width: 60, height: 60, borderRadius: '50%',
                background: '#fef2f2', border: '2px solid #fee2e2',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                margin: '0 auto 1rem',
              }}>
                <AlertTriangle size={28} color="#dc2626" />
              </div>

              <h3 style={{ textAlign: 'center', fontSize: '1.15rem', fontWeight: 900, marginBottom: '0.5rem', color: '#1e293b' }}>
                حذف الحملة؟
              </h3>
              <p style={{ textAlign: 'center', fontSize: '0.9rem', color: 'var(--text-muted)', marginBottom: '1rem' }}>
                سيتم حذف <strong style={{ color: '#1e293b' }}>"{deleteConfirm.campaign.name}"</strong> نهائياً ولا يمكن التراجع.
              </p>

              {/* Warning if has assignments */}
              {deleteConfirm.hasAssignments && (
                <div style={{
                  background: '#fff7ed', border: '1px solid #fed7aa',
                  borderRadius: '12px', padding: '0.875rem 1rem',
                  marginBottom: '1rem', display: 'flex', gap: '0.75rem', alignItems: 'flex-start',
                }}>
                  <AlertTriangle size={18} color="#f97316" style={{ flexShrink: 0, marginTop: '2px' }} />
                  <div>
                    <p style={{ fontSize: '0.85rem', fontWeight: 700, color: '#c2410c', marginBottom: '2px' }}>
                      تحذير: هذه الحملة لها {deleteConfirm.count} مهمة مرتبطة
                    </p>
                    <p style={{ fontSize: '0.8rem', color: '#9a3412' }}>
                      يُنصح بأرشفة الحملة بدلاً من حذفها حفاظاً على سجل العمليات.
                    </p>
                  </div>
                </div>
              )}

              {/* Action Buttons */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                <button
                  onClick={() => setDeleteConfirm(null)}
                  disabled={deleting}
                  style={{
                    padding: '0.875rem', border: '1.5px solid #e2e8f0',
                    borderRadius: '12px', background: 'white', cursor: 'pointer',
                    fontFamily: 'inherit', fontSize: '0.9rem', fontWeight: 700, color: '#64748b',
                  }}
                >
                  إلغاء
                </button>
                <button
                  onClick={confirmDelete}
                  disabled={deleting}
                  style={{
                    padding: '0.875rem',
                    border: 'none', borderRadius: '12px',
                    background: deleting ? '#fca5a5' : 'linear-gradient(135deg, #dc2626, #ef4444)',
                    color: 'white', cursor: deleting ? 'not-allowed' : 'pointer',
                    fontFamily: 'inherit', fontSize: '0.9rem', fontWeight: 700,
                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem',
                    boxShadow: '0 4px 12px rgba(220,38,38,0.3)',
                  }}
                >
                  {deleting ? '⏳ جارٍ الحذف...' : <><Trash2 size={17} /> نعم، احذف</>}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function iconBtnStyle(bg: string, color: string): React.CSSProperties {
  return {
    width: 32, height: 32, borderRadius: '8px',
    border: 'none', background: bg, color: color,
    cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
    transition: 'transform 0.15s, opacity 0.15s',
  };
}
