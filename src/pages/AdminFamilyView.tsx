import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { 
  ArrowRight, Phone, MapPin, Heart, 
  Edit3, History, Users, Activity 
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import { toast } from '../components/Toast';
import { 
  SOCIAL_STATUS_LABELS, getPriorityLevel, calcPriorityScore,
  type Family, type CaseHistoryEvent
} from '../types';
import { formatDetailedGrade } from '../lib/distributionService';

export default function AdminFamilyView() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [family, setFamily] = useState<Family | null>(null);
  const [history, setHistory] = useState<CaseHistoryEvent[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (id) fetchAll();
  }, [id]);

  async function fetchAll() {
    try {
      const [fRes, hRes] = await Promise.all([
        supabase.from('families').select('*, children(*)').eq('id', id).single(),
        supabase.from('case_history').select('*').eq('family_id', id).order('created_at', { ascending: false })
      ]);

      if (fRes.error) throw fRes.error;
      setFamily(fRes.data);
      setHistory(hRes.data || []);
    } catch (err) {
      toast('تعذر تحميل بيانات الأسرة', 'error');
      navigate('/admin/families');
    } finally {
      setLoading(false);
    }
  }

  if (loading) return <div className="page-content"><div className="skeleton" style={{ height: 600 }} /></div>;
  if (!family) return null;

  const liveScore = calcPriorityScore({
    social_status: family.social_status,
    has_chronic_illness: family.has_chronic_illness,
    is_disabled: family.is_disabled,
    children_count: family.children?.length || 0,
    vulnerability_score: family.children?.filter(c => c.is_orphan).length ? family.children.filter(c => c.is_orphan).length * 10 : 0
  });

  const priority = getPriorityLevel(liveScore);

  return (
    <div className="page-content">
      {/* Header */}
      <div className="page-header">
        <div>
          <button className="btn btn-ghost btn-sm mb-sm" onClick={() => navigate('/admin/families')}>
            <ArrowRight size={18} /> العودة للأسر
          </button>
          <h1 className="page-title">{family.mother_name}</h1>
          <p className="page-subtitle">كود الأسرة: {family.sequential_id || family.id.slice(0, 8)}</p>
        </div>
        <button className="btn btn-primary" onClick={() => navigate(`/admin/families/${family.id}/edit`)}>
          <Edit3 size={20} /> تعديل البيانات
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-8">
        {/* Main Content */}
        <div className="stagger">
          {/* Quick Info Bar */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
            <InfoCard icon={<Phone size={20} />} label="رقم الهاتف" value={family.phone || 'غير متاح'} />
            <InfoCard icon={<MapPin size={20} />} label="الموقع" value={`${family.governorate} / ${family.district}`} />
            <InfoCard 
              icon={<Activity size={20} />} 
              label="الحالة الاجتماعية" 
              value={SOCIAL_STATUS_LABELS[family.social_status] || 'غير محدد'} 
            />
          </div>

          {/* Social & Health Section */}
          <section className="glass-card mb-8">
            <h2 className="section-title mb-md" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Heart size={20} /> الحالة الاجتماعية والصحية
            </h2>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '2rem' }}>
              <div>
                <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>اسم الزوج / الأب</label>
                <div style={{ fontWeight: 700 }}>{family.husband_name || '—'}</div>
              </div>
              <div>
                <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>الأمراض المزمنة</label>
                <div style={{ fontWeight: 700, color: family.has_chronic_illness ? 'var(--error)' : 'inherit' }}>
                  {family.has_chronic_illness ? 'نعم (يوجد حالة مرضية)' : 'لا يوجد'}
                </div>
              </div>
              <div>
                <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>إعاقة / ذوي همم</label>
                <div style={{ fontWeight: 700, color: family.is_disabled ? 'var(--error)' : 'inherit' }}>
                  {family.is_disabled ? 'نعم (يوجد إعاقة)' : 'لا يوجد'}
                </div>
              </div>
            </div>
            {family.medical_notes && (
              <div style={{ marginTop: '1.5rem', background: 'rgba(239,68,68,0.05)', padding: '1rem', borderRadius: '12px', border: '1px solid rgba(239,68,68,0.1)' }}>
                <p style={{ fontSize: '0.85rem', fontWeight: 600 }}>📝 ملاحظات طبية:</p>
                <p style={{ fontSize: '0.82rem', marginTop: '0.2rem' }}>{family.medical_notes}</p>
              </div>
            )}
          </section>

          {/* Children List */}
          <section className="glass-card mb-8">
            <h2 className="section-title mb-md" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Users size={20} /> الأبناء ({family.children?.length || 0})
            </h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              {family.children?.map((c) => (
                <div key={c.id} className="card p-md" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <div style={{ fontWeight: 700 }}>{c.child_name}</div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'flex', gap: '1rem' }}>
                      <span>🎂 {c.age} سنة</span>
                      <span>🏫 {formatDetailedGrade(c.age || 0, c.school_stage)}</span>
                      {c.is_orphan && <span style={{ color: 'var(--gold)', fontWeight: 800 }}>⭐ يتيم</span>}
                    </div>
                  </div>
                </div>
              ))}
              {(!family.children || family.children.length === 0) && (
                <p style={{ textAlign: 'center', color: 'var(--text-light)', padding: '1rem' }}>لا يوجد أبناء مسجلين</p>
              )}
            </div>
          </section>
        </div>

        {/* Sidebar */}
        <aside>
          {/* Priority Score Card */}
          <div className="glass-card mb-6" style={{ textAlign: 'center' }}>
            <h3 style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '1rem' }}>أولوية الحالة (نقاط)</h3>
            <div style={{ fontSize: '3rem', fontWeight: 900, color: 'var(--primary)', lineHeight: 1 }}>{liveScore}</div>
            <div className={`badge badge-lg mt-sm ${priority.css}`} style={{ display: 'inline-flex' }}>{priority.label}</div>
          </div>

          {/* Timeline / History */}
          <div className="glass-card">
            <h3 style={{ fontSize: '0.9rem', fontWeight: 800, marginBottom: '1.25rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <History size={18} /> سجل التاريخ
            </h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', position: 'relative' }}>
              {/* Vertical line */}
              <div style={{ position: 'absolute', right: '11px', top: '10px', bottom: '10px', width: '2px', background: 'var(--surface)' }} />
              
              {history.map((h, i) => (
                <div key={h.id} style={{ display: 'flex', gap: '1rem', position: 'relative', zIndex: 1 }}>
                  <div style={{ width: 24, height: 24, borderRadius: '50%', background: 'white', border: '2px solid var(--primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.7rem' }}>
                    {i + 1}
                  </div>
                  <div>
                    <div style={{ fontSize: '0.8rem', fontWeight: 700 }}>{h.description || h.action_type}</div>
                    <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)' }}>
                      {new Date(h.created_at).toLocaleDateString('ar-EG', { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}

function InfoCard({ icon, label, value }: any) {
  return (
    <div className="stat-card" style={{ padding: '0.85rem' }}>
      <div style={{ color: 'var(--primary)', marginBottom: '0.2rem' }}>{icon}</div>
      <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontWeight: 600 }}>{label}</div>
      <div style={{ fontWeight: 800, fontSize: '0.9rem' }}>{value}</div>
    </div>
  );
}
