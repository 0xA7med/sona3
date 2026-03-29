import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { 
  ArrowRight, Users, CreditCard, Activity, 
  CheckCircle, Search, ExternalLink 
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

  if (loading) return <div className="page-content"><div className="skeleton" style={{ height: 600 }} /></div>;
  if (!campaign) return null;

  const completed = assignments.filter(a => a.status === 'completed').length;
  const progress = assignments.length > 0 ? (completed / assignments.length) * 100 : 0;
  
  // Simple calculation for UI - in a real app, we'd query transactions
  const totalAllocated = assignments.length * (campaign.amount_per_family || 0);

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
        <div style={{ display: 'flex', gap: '1rem' }}>
          <button className="btn btn-secondary" onClick={() => navigate(`/admin/campaigns/${id}/edit`)}>تعديل الحملة</button>
          <span className={`badge badge-lg ${campaign.status === 'active' ? 'badge-success' : 'badge-warning'}`}>
            {campaign.status === 'active' ? 'نشطة' : 'مسودة'}
          </span>
        </div>
      </div>

      {/* Campaign Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <StatCard icon={<Users />} label="إجمالي الأسر" value={assignments.length} color="var(--primary)" />
        <StatCard icon={<CheckCircle />} label="تم التوزيع" value={completed} color="var(--success)" />
        <StatCard icon={<CreditCard />} label="الميزانية المقدرة" value={`${totalAllocated.toLocaleString()} ج.م`} color="var(--gold)" />
        <StatCard icon={<Activity />} label="نسبة الإنجاز" value={`${progress.toFixed(1)}%`} color="var(--primary)" />
      </div>

      {/* Main Breakdown */}
      <div className="glass-card">
        <div className="p-6 border-b" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
          <h2 className="section-title">سجل توزيع الحملة التفصيلي</h2>
          <div style={{ position: 'relative', width: '300px' }}>
            <Search style={{ position: 'absolute', right: '1rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} size={16} />
            <input 
              type="text" 
              className="input input-sm pr-10" 
              placeholder="بحث باسم الأسرة..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="table">
            <thead>
              <tr>
                <th>كود الأسرة</th>
                <th>اسم الأم</th>
                <th>المتطوع المسئول</th>
                <th>الحالة</th>
                <th>المبلغ المخصص</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((a) => (
                <tr key={a.id}>
                  <td style={{ fontWeight: 800, fontSize: '0.85rem' }}>{a.family?.sequential_id}</td>
                  <td>
                    <div style={{ fontWeight: 600 }}>{a.family?.mother_name}</div>
                    <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>{a.family?.children?.length || 0} أبناء</div>
                  </td>
                  <td>
                    {a.volunteer ? (
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <div style={{ width: 20, height: 20, borderRadius: '50%', background: 'var(--surface)', fontSize: '0.6rem', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                          👤
                        </div>
                        <span style={{ fontSize: '0.8rem' }}>{a.volunteer.full_name}</span>
                      </div>
                    ) : (
                      <span style={{ fontSize: '0.8rem', fontStyle: 'italic', color: 'var(--text-light)' }}>غير مسند</span>
                    )}
                  </td>
                  <td>
                    <StatusBadge status={a.status} />
                  </td>
                  <td>
                    <div style={{ fontWeight: 700, color: 'var(--primary)' }}>
                      {campaign.amount_per_family} ج.م
                    </div>
                  </td>
                  <td>
                    <button className="btn btn-ghost btn-sm" onClick={() => navigate(`/admin/families/${a.family_id}`)}>
                      <ExternalLink size={16} />
                    </button>
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={6} style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>
                    لا يوجد بيانات مطابقة للبحث
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
  };
  const { label, css } = config[status] || { label: status, css: '' };
  return <span className={`badge ${css}`}>{label}</span>;
}
