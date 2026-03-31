import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { 
  ArrowRight, Users, CreditCard, Activity, 
  CheckCircle, Search, ExternalLink, Zap, RefreshCw, XCircle, PlayCircle 
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import { toast } from '../components/Toast';
import type { Campaign } from '../types';

export default function AdminCampaignView() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [campaign, setCampaign] = useState<Campaign | null>(null);
  const [assignments, setAssignments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    if (id) fetchDetails();
  }, [id]);

  async function fetchDetails() {
    try {
      setLoading(true);
      const [cRes, aRes] = await Promise.all([
        supabase.from('campaigns').select('*').eq('id', id).single(),
        supabase.from('case_assignments')
          .select(`
            *,
            family:families(*, children(*)),
            volunteer:profiles(full_name)
          `)
          .eq('campaign_id', id)
      ]);

      if (cRes.error) throw cRes.error;
      setCampaign(cRes.data);
      setAssignments(aRes.data || []);
    } catch (err) {
      toast('تعذر تحميل تفاصيل الحملة', 'error');
      navigate('/admin/campaigns');
    } finally {
      setLoading(false);
    }
  }

  async function generateAssignments() {
    if (!campaign || !id) return;
    setGenerating(true);
    try {
      // Fetch all active families
      const { data: families, error: fErr } = await supabase
        .from('families')
        .select('id')
        .eq('status', 'active');

      if (fErr) throw fErr;
      if (!families || families.length === 0) {
        toast('لا توجد أسر نشطة في النظام حالياً', 'warning');
        return;
      }

      // Get existing assignment family_ids to avoid duplicates
      const { data: existingRaw } = await supabase
        .from('case_assignments')
        .select('family_id')
        .eq('campaign_id', id);

      const existingIds = new Set((existingRaw || []).map((e: any) => e.family_id));

      const newAssignments = families
        .filter((f: any) => !existingIds.has(f.id))
        .map((f: any) => ({
          campaign_id: id,
          family_id: f.id,
          status: 'pending',
          assigned_at: new Date().toISOString(),
        }));

      if (newAssignments.length === 0) {
        toast('جميع الأسر موجودة بالفعل في الحملة', 'info');
        return;
      }

      // Insert in batches of 100
      const BATCH = 100;
      let inserted = 0;
      for (let i = 0; i < newAssignments.length; i += BATCH) {
        const batch = newAssignments.slice(i, i + BATCH);
        const { error: iErr } = await supabase.from('case_assignments').insert(batch);
        if (iErr) throw iErr;
        inserted += batch.length;
      }

      toast(`✅ تم إضافة ${inserted} أسرة للحملة بنجاح`, 'success');
      fetchDetails();
    } catch (err: any) {
      console.error(err);
      toast(`خطأ أثناء توليد الحالات: ${err.message}`, 'error');
    } finally {
      setGenerating(false);
    }
  }

  async function toggleStatus(assignmentId: string, currentStatus: string) {
    try {
      if (currentStatus === 'completed') {
        toast('لا يمكن استبعاد حالة مكتملة', 'warning');
        return;
      }
      
      const newStatus = currentStatus === 'skipped' ? 'pending' : 'skipped';
      
      const { error } = await supabase
        .from('case_assignments')
        .update({ 
          status: newStatus,
          ...(newStatus === 'skipped' ? { volunteer_id: null, assigned_at: null } : {})
        })
        .eq('id', assignmentId);

      if (error) throw error;
      
      // Update local state without full reload
      setAssignments(prev => prev.map(a => 
        a.id === assignmentId 
        ? { ...a, status: newStatus, volunteer_id: newStatus === 'skipped' ? null : a.volunteer_id } 
        : a
      ));
      
      toast(newStatus === 'skipped' ? 'تم استبعاد الأسرة بنجاح' : 'تمت إعادة الأسرة للحملة', 'success');
    } catch (err: any) {
      console.error(err);
      toast('حدث خطأ أثناء تغيير الحالة', 'error');
    }
  }

  if (loading) return <div className="page-content"><div className="skeleton" style={{ height: 600 }} /></div>;
  if (!campaign) return null;

  // Ignore skipped in completed calculations
  const completed = assignments.filter(a => a.status === 'completed').length;
  // Ignore skipped in total active
  const activeAssignments = assignments.filter(a => a.status !== 'skipped');
  const progress = activeAssignments.length > 0 ? (completed / activeAssignments.length) * 100 : 0;
  const totalAllocated = activeAssignments.length * (campaign.amount_per_family || 0);

  const filtered = assignments.filter(a => 
    a.family?.mother_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    a.family?.sequential_id?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="page-content">
      {/* Header */}
      <div className="page-header">
        <div>
          <button className="btn btn-ghost btn-sm mb-sm" onClick={() => navigate('/admin/campaigns')}>
            <ArrowRight size={18} /> العودة للحملات
          </button>
          <h1 className="page-title">{campaign.name}</h1>
          <p className="page-subtitle">{campaign.description || 'لا يوجد وصف لهذه الحملة'}</p>
        </div>
        <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', alignItems: 'center' }}>
          {/* Generate / Add Assignments Button */}
          {assignments.length === 0 ? (
            <button 
              className="btn btn-primary" 
              onClick={generateAssignments}
              disabled={generating}
              style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}
            >
              {generating ? <RefreshCw size={16} className="animate-spin" /> : <Zap size={16} />}
              {generating ? 'جارٍ التحميل...' : 'تحميل الأسر للحملة'}
            </button>
          ) : (
            <button 
              className="btn btn-ghost btn-sm" 
              onClick={generateAssignments}
              disabled={generating}
              title="إضافة أسر جديدة غير موجودة في الحملة"
              style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}
            >
              {generating ? <RefreshCw size={14} className="animate-spin" /> : <Zap size={14} />}
              إضافة أسر جديدة
            </button>
          )}
          <button className="btn btn-secondary" onClick={() => navigate(`/admin/campaigns/${id}/edit`)}>تعديل الحملة</button>
          <span className={`badge badge-lg ${campaign.status === 'active' ? 'badge-success' : 'badge-warning'}`}>
            {campaign.status === 'active' ? 'نشطة' : 'مسودة'}
          </span>
        </div>
      </div>

      {/* Empty State — no assignments yet */}
      {assignments.length === 0 && !loading && (
        <div style={{
          textAlign: 'center', padding: '3rem 1.5rem', marginBottom: '2rem',
          background: 'linear-gradient(135deg, #fffbeb, #fff)',
          borderRadius: '20px', border: '2px dashed #fcd34d'
        }}>
          <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>📋</div>
          <h2 style={{ fontWeight: 900, color: '#92400e', marginBottom: '0.5rem' }}>لم يتم تحميل الأسر بعد</h2>
          <p style={{ color: '#78350f', maxWidth: 400, margin: '0 auto 1.5rem' }}>
            اضغط على "تحميل الأسر للحملة" لإضافة جميع الأسر النشطة في النظام لهذه الحملة حتى يتمكن المتطوعون من البدء.
          </p>
          <button className="btn btn-primary" onClick={generateAssignments} disabled={generating}>
            {generating ? <RefreshCw size={16} className="animate-spin" /> : <Zap size={16} />}
            {generating ? 'جارٍ الإنشاء...' : 'تحميل الأسر للحملة الآن'}
          </button>
        </div>
      )}

      {/* Campaign Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <StatCard icon={<Users />} label="إجمالي الأسر (النشطة)" value={activeAssignments.length} color="var(--primary)" />
        <StatCard icon={<CheckCircle />} label="تم التوزيع" value={completed} color="var(--success)" />
        <StatCard icon={<CreditCard />} label="الميزانية المقدرة" value={`${totalAllocated.toLocaleString()} ج.م`} color="var(--gold)" />
        <StatCard icon={<Activity />} label="نسبة الإنجاز" value={`${progress.toFixed(1)}%`} color="var(--primary)" />
      </div>

      {/* Main Breakdown */}
      {assignments.length > 0 && (
        <div className="card shadow-sm overflow-hidden" style={{ background: 'white', borderRadius: '24px', border: 'none' }}>
          <div style={{ 
            padding: '1.5rem 2rem', 
            borderBottom: '1px solid #f1f5f9', 
            display: 'flex', 
            justifyContent: 'space-between', 
            alignItems: 'center', 
            flexWrap: 'wrap', 
            gap: '1rem',
            background: 'linear-gradient(to right, #ffffff, #f8fafc)'
          }}>
            <div>
              <h2 style={{ fontSize: '1.1rem', fontWeight: 900, margin: 0, color: 'var(--primary-dark)' }}>سجل توزيع الحملة التفصيلي</h2>
              <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', margin: '0.25rem 0 0' }}>متابعة حالة التنفيذ لكل أسرة في هذه الحملة</p>
            </div>
            <div className="search-bar" style={{ margin: 0, width: '100%', maxWidth: '320px', background: '#f1f5f9' }}>
              <Search className="search-icon" size={18} />
              <input 
                type="text" 
                className="search-input" 
                placeholder="بحث باسم الأسرة أو الكود..." 
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="custom-table">
              <thead>
                <tr style={{ background: '#f8fafc' }}>
                  <th style={{ padding: '1rem 2rem' }}>كود الأسرة</th>
                  <th>اسم الأم</th>
                  <th>المتطوع المسئول</th>
                  <th>الحالة</th>
                  <th>المبلغ المخصص</th>
                  <th style={{ padding: '1rem 2rem' }}></th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((a) => (
                  <tr key={a.id}>
                    <td style={{ padding: '1.25rem 2rem', fontWeight: 900, color: 'var(--primary)', fontSize: '0.85rem' }}>{a.family?.sequential_id}</td>
                    <td>
                      <div style={{ fontWeight: 800, fontSize: '0.95rem', color: '#1e293b' }}>{a.family?.mother_name}</div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.1rem' }}>{a.family?.children?.length || 0} أبناء • {a.family?.district}</div>
                    </td>
                    <td>
                      {a.volunteer ? (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                          <div style={{ width: 28, height: 28, borderRadius: '8px', background: 'var(--primary-light)', color: 'var(--primary)', fontSize: '0.8rem', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700 }}>
                            {a.volunteer.full_name?.charAt(0)}
                          </div>
                          <span style={{ fontSize: '0.85rem', fontWeight: 600 }}>{a.volunteer.full_name}</span>
                        </div>
                      ) : (
                        <span style={{ fontSize: '0.85rem', color: 'var(--text-light)', fontStyle: 'italic' }}>غير مسند</span>
                      )}
                    </td>
                    <td>
                      <StatusBadge status={a.status} />
                    </td>
                    <td>
                      <div style={{ fontWeight: 900, color: 'var(--primary)', fontSize: '1rem' }}>
                        {campaign.amount_per_family?.toLocaleString()} <span style={{ fontSize: '0.7rem', fontWeight: 700 }}>ج.م</span>
                      </div>
                    </td>
                    <td style={{ padding: '1rem 2rem', textAlign: 'left' }}>
                      <div style={{ display: 'flex', gap: '0.4rem', justifyContent: 'flex-end' }}>
                        {a.status !== 'completed' && (
                          <button 
                            className="btn btn-ghost btn-sm" 
                            style={{ 
                              color: a.status === 'skipped' ? 'var(--primary)' : 'var(--error)', 
                              background: a.status === 'skipped' ? 'var(--primary-light)' : '#fee2e2', 
                              borderRadius: '10px' 
                            }}
                            onClick={() => toggleStatus(a.id, a.status)}
                            title={a.status === 'skipped' ? 'إعادة للحملة' : 'استبعاد'}
                          >
                            {a.status === 'skipped' ? <PlayCircle size={16} /> : <XCircle size={16} />}
                          </button>
                        )}
                        <button 
                          className="btn btn-ghost btn-sm" 
                          style={{ color: 'var(--primary)', background: 'var(--primary-light)', borderRadius: '10px' }}
                          onClick={() => navigate(`/admin/families/${a.family_id}`)}
                          title="عرض ملف الأسرة"
                        >
                          <ExternalLink size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
                {filtered.length === 0 && (
                  <tr>
                    <td colSpan={6}>
                      <div className="empty-state">
                        <div className="empty-state-icon">🔍</div>
                        <p>لا توجد بيانات مطابقة للبحث حالياً</p>
                      </div>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

function StatCard({ icon, label, value, color }: any) {
  return (
    <div className="stat-card">
      <div className="stat-icon" style={{ background: `${color}15`, color }}>{icon}</div>
      <div className="stat-value" style={{ fontSize: '1.5rem' }}>{value}</div>
      <div className="stat-label">{label}</div>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const config: any = {
    completed: { label: 'مكتمل', css: 'badge-success' },
    in_progress: { label: 'قيد التنفيذ', css: 'badge-primary' },
    pending: { label: 'معلق', css: 'badge-outline' },
    no_answer: { label: 'لم يرد', css: 'badge-warning' },
    unreachable: { label: 'غير متاح', css: 'badge-error' },
    skipped: { label: 'مستبعدة', css: 'badge-error' },
  };
  const { label, css } = config[status] || { label: status, css: '' };
  return <span className={`badge ${css}`}>{label}</span>;
}
