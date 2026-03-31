import { useState, useEffect } from 'react';
import { Filter, MapPin, AlertCircle, Target } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { SOCIAL_STATUS_LABELS, calcPriorityScore } from '../types';

export default function AdminTargeting() {
  const [families, setFamilies] = useState<any[]>([]);
  const [loading, setLoading]     = useState(true);
  
  // Filters
  const [minPriority, setMinPriority] = useState(30);
  const [selectedZone, setSelectedZone] = useState('all');
  const [status, setStatus]             = useState('all');
  
  const [zones, setZones] = useState<string[]>([]);

  useEffect(() => {
    fetchFamilies();
  }, []);

  async function fetchFamilies() {
    try {
      const { data, error } = await supabase
        .from('families')
        .select('*, children(id, is_orphan)')
        .eq('status', 'active');

      if (error) throw error;
      
      const enriched = (data || []).map((f: any) => {
        const children = f.children || [];
        const orphanCount = children.filter((c: any) => c.is_orphan).length;
        
        // Calculate dynamic accurate score just in case DB is stale
        const score = calcPriorityScore({
          social_status: f.social_status,
          has_chronic_illness: f.has_chronic_illness,
          is_disabled: f.is_disabled,
          children_count: children.length,
          vulnerability_score: orphanCount * 10
        });

        return {
          ...f,
          _children_count: children.length,
          _orphan_count: orphanCount,
          _dynamic_score: score
        };
      });

      setFamilies(enriched);
      
      const uniqueZones = Array.from(new Set(enriched.map(f => f.governorate).filter(Boolean))) as string[];
      setZones(uniqueZones);
    } finally {
      setLoading(false);
    }
  }

  const filtered = families.filter(f => {
    if (f._dynamic_score < minPriority) return false;
    if (selectedZone !== 'all' && f.governorate !== selectedZone) return false;
    if (status !== 'all' && f.social_status !== status) return false;
    return true;
  });

  return (
    <div className="page-content">
      <div className="page-header">
        <div>
          <h1 className="page-title">محرك الاستهداف 🎯</h1>
          <p className="page-subtitle">تحديد الفئات الأكثر احتياجاً لحملات التوزيع</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[320px_1fr] gap-8">
        {/* Filters Panel */}
        <aside>
          <div className="glass-card sticky top-sm">
            <h2 style={{ fontWeight: 800, marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Filter size={18} /> تصفية النتائج
            </h2>

            <div className="form-group">
              <label className="form-label">الحد الأدنى للنقاط ({minPriority})</label>
              <input 
                type="range" min={0} max={100} step={5} 
                className="w-full"
                value={minPriority} 
                onChange={(e) => setMinPriority(Number(e.target.value))} 
              />
            </div>

            <div className="form-group">
              <label className="form-label">المحافظة / المنطقة</label>
              <select className="form-select" value={selectedZone} onChange={e => setSelectedZone(e.target.value)}>
                <option value="all">الكل</option>
                {zones.map(z => <option key={z} value={z}>{z}</option>)}
              </select>
            </div>

            <div className="form-group">
              <label className="form-label">الحالة الاجتماعية</label>
              <select className="form-select" value={status} onChange={e => setStatus(e.target.value)}>
                <option value="all">الكل</option>
                {Object.entries(SOCIAL_STATUS_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
              </select>
            </div>

            <button className="btn btn-primary w-full mt-md">
              <Target size={18} /> تطبيق الفلاتر
            </button>
          </div>
        </aside>

        {/* Results Panel */}
        <main>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem', marginBottom: '1.5rem' }}>
            <div className="stat-card" style={{ padding: '1rem' }}>
              <div style={{ color: 'var(--primary)', fontWeight: 800, fontSize: '1.5rem' }}>{filtered.length}</div>
              <div style={{ color: 'var(--text-muted)', fontSize: '0.75rem' }}>عائلة مستهدفة</div>
            </div>
            <div className="stat-card" style={{ padding: '1rem' }}>
              <div style={{ color: 'var(--gold)', fontWeight: 800, fontSize: '1.5rem' }}>
                {(filtered.reduce((acc, f) => acc + (f._children_count || 0), 0)).toLocaleString('ar-EG')}
              </div>
              <div style={{ color: 'var(--text-muted)', fontSize: '0.75rem' }}>طفل مستفيد</div>
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            {loading ? (
              <div className="skeleton" style={{ height: 300 }} />
            ) : filtered.length === 0 ? (
              <div className="empty-state">
                <AlertCircle size={40} color="var(--text-muted)" />
                <p>لا توجد نتائج تطابق الفلاتر المحددة</p>
              </div>
            ) : (
              filtered.slice(0, 50).map((f) => (
                <div key={f.id} className="card p-md" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <div style={{ fontWeight: 800 }}>{f.mother_name}</div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'flex', gap: '1rem', marginTop: '0.2rem' }}>
                      <span><MapPin size={12} /> {f.governorate} / {f.district}</span>
                      <span>⚖️ {SOCIAL_STATUS_LABELS[f.social_status as keyof typeof SOCIAL_STATUS_LABELS]}</span>
                    </div>
                  </div>
                  <div style={{ 
                    padding: '0.4rem 0.8rem', borderRadius: '8px', 
                    background: f._dynamic_score >= 70 ? 'var(--error-light)' : 'var(--primary-light)',
                    color: f._dynamic_score >= 70 ? 'var(--error)' : 'var(--primary)',
                    fontWeight: 900, fontSize: '0.9rem'
                  }}>
                    {f._dynamic_score} نقطة
                  </div>
                </div>
              ))
            )}
            {filtered.length > 50 && (
              <p style={{ textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.8rem' }}>
                + {filtered.length - 50} أسرة أخرى
              </p>
            )}
          </div>
        </main>
      </div>
    </div>
  );
}
