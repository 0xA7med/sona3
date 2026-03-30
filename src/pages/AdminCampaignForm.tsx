import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Save, ArrowRight, DollarSign, FileText, Tag, Activity, Trash2, Plus, Lightbulb } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { toast } from '../components/Toast';
import type { Campaign, CampaignType, CampaignStatus } from '../types';

export default function AdminCampaignForm() {
  const { id } = useParams();
  const navigate = useNavigate();
  const isEdit = Boolean(id);

  const [loading, setLoading] = useState(isEdit);
  const [saving, setSaving]   = useState(false);

  // Form State
  const [name, setName]               = useState('');
  const [description, setDescription] = useState('');
  const [type, setType]               = useState<CampaignType>('financial');
  const [startDate, setStartDate]     = useState(new Date().toISOString().split('T')[0]);
  const [endDate, setEndDate]         = useState('');
  const [amountPerFamily, setAmountPerFamily] = useState(0);
  const [status, setStatus]           = useState<CampaignStatus>('draft');
  
  // Advanced Distribution
  const [isAutoCalculate, setIsAutoCalculate] = useState(true);
  const [ageBrackets, setAgeBrackets] = useState<any[]>([
    { from: 0, to: 6, amount: 200, label: 'أطفال' },
    { from: 7, to: 12, amount: 400, label: 'ابتدائي' },
    { from: 13, to: 18, amount: 600, label: 'إعدادي/ثانوي' }
  ]);
  const [commissionRules, setCommissionRules] = useState<any[]>([
    { threshold: 999999, fee: 5 }
  ]);

  useEffect(() => {
    if (isEdit) fetchCampaign();
  }, [id]);

  async function fetchCampaign() {
    try {
      const { data, error } = await supabase
        .from('campaigns')
        .select('*')
        .eq('id', id)
        .single();

      if (error) throw error;
      const c = data as Campaign;
      setName(c.name);
      setDescription(c.description || '');
      setType(c.campaign_type);
      setStartDate(c.start_date.split('T')[0]);
      setEndDate(c.end_date?.split('T')[0] || '');
      setAmountPerFamily(c.amount_per_family || 0);
      setStatus(c.status);
      setIsAutoCalculate(c.is_auto_calculate ?? true);
      if (c.age_brackets?.length) setAgeBrackets(c.age_brackets);
      if (c.commission_rules?.length) setCommissionRules(c.commission_rules);
    } catch (err) {
      toast('تعذر تحميل بيانات الحملة', 'error');
      navigate('/admin/campaigns');
    } finally {
      setLoading(false);
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || (isAutoCalculate === false && amountPerFamily <= 0)) {
      toast('يرجى إكمال البيانات الأساسية', 'warning');
      return;
    }

    setSaving(true);
    try {
      const campaignData = {
        name,
        description,
        campaign_type: type,
        start_date: new Date(startDate).toISOString(),
        end_date: endDate ? new Date(endDate).toISOString() : null,
        amount_per_family: amountPerFamily,
        budget: 0,
        status,
        is_auto_calculate: isAutoCalculate,
        age_brackets: ageBrackets,
        commission_rules: commissionRules,
      };

      if (isEdit) {
        const { error } = await supabase.from('campaigns').update(campaignData).eq('id', id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('campaigns').insert(campaignData);
        if (error) throw error;
      }

      toast(isEdit ? 'تم تحديث الحملة بنجاح' : 'تم إنشاء الحملة بنجاح', 'success');
      navigate('/admin/campaigns');
    } catch (err: any) {
      toast(err.message || 'حدث خطأ أثناء الحفظ', 'error');
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className="page-content"><div className="skeleton" style={{ height: 400 }} /></div>;

  return (
    <div className="page-content">
      <div className="page-header">
        <div>
          <button className="btn btn-ghost btn-sm mb-sm" onClick={() => navigate(-1)}>
            <ArrowRight size={18} /> العودة
          </button>
          <h1 className="page-title">{isEdit ? 'تعديل بيانات الحملة' : 'إنشاء حملة جديدة 🏹'}</h1>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="stagger">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Main Info */}
          <section className="glass-card">
            <h2 style={{ fontSize: '1.1rem', fontWeight: 800, marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <FileText size={18} /> تفاصيل المبادرة
            </h2>
            
            <div className="form-group">
              <label className="form-label">اسم الحملة</label>
              <input 
                type="text" className="form-input" required 
                value={name} onChange={e => setName(e.target.value)} 
                placeholder="مثال: شنطة رمضان 2024"
              />
            </div>

            <div className="form-group">
              <label className="form-label">وصف الحملة / الهدف</label>
              <textarea 
                className="form-input" rows={4} 
                value={description} onChange={e => setDescription(e.target.value)} 
                placeholder="توزيع المساعدات الغذائية على الأسر الأكثر احتياجاً في..."
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="form-group">
                <label className="form-label">نوع الحملة</label>
                <select className="form-select" value={type} onChange={e => setType(e.target.value as CampaignType)}>
                  <option value="financial">مساعدات مالية</option>
                  <option value="food_basket">كرتونة مواد غذائية</option>
                  <option value="clothing">ملابس وأغطية</option>
                  <option value="school_supplies">أدوات مدرسية</option>
                  <option value="other">أخرى</option>
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">حالة الحملة</label>
                <select className="form-select" value={status} onChange={e => setStatus(e.target.value as CampaignStatus)}>
                  <option value="draft">تحت التخطيط (مسودة)</option>
                  <option value="active">نشطة (بدأ التوزيع)</option>
                  <option value="completed">منتهية (أغلقت)</option>
                  <option value="paused">متوقفة مؤقتاً</option>
                </select>
              </div>
            </div>
          </section>

          {/* Configuration & Dates */}
          <section className="glass-card">
            <h2 style={{ fontSize: '1.1rem', fontWeight: 800, marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <DollarSign size={18} /> الميزانية والجدول الزمني
            </h2>

            <div className="form-group">
              <label className="form-label">المبلغ الثابت للاسرة (في حال التعطيل التلقائي)</label>
              <div style={{ position: 'relative' }}>
                <input 
                  type="number" className="form-input" min={0}
                  value={amountPerFamily} onChange={e => setAmountPerFamily(Number(e.target.value))} 
                  style={{ paddingRight: '2.5rem' }}
                />
                <DollarSign size={18} style={{ position: 'absolute', right: '1rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4 mt-md">
              <div className="form-group">
                <label className="form-label">تاريخ البدء</label>
                <input 
                  type="date" className="form-input" required 
                  value={startDate} onChange={e => setStartDate(e.target.value)} 
                />
              </div>
              <div className="form-group">
                <label className="form-label">تاريخ الانتهاء</label>
                <input 
                  type="date" className="form-input" 
                  value={endDate} onChange={e => setEndDate(e.target.value)} 
                />
              </div>
            </div>

            <div className="mt-6 p-4 rounded-xl bg-primary-light border border-primary-border">
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', color: 'var(--primary)', marginBottom: '0.5rem' }}>
                <Tag size={18} />
                <span style={{ fontWeight: 800, fontSize: '0.85rem' }}>نظام التوزيع الذكي</span>
              </div>
              <p style={{ fontSize: '0.75rem', color: 'var(--primary-dark)', lineHeight: 1.5 }}>
                يمكنك تفعيل التوزيع التلقائي بناءً على سن أطفال الأسرة من القسم المتواجد في الأسفل.
              </p>
            </div>
          </section>

          {/* Advanced Distribution Rules */}
          <section className="glass-card lg:col-span-2">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
              <h2 style={{ fontSize: '1.1rem', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '0.5rem', margin: 0 }}>
                <Activity size={18} /> منطق التوزيع الذكي (شرائح السن)
              </h2>
              <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                <span style={{ fontSize: '0.85rem', fontWeight: 600 }}>توزيع تلقائي حسب السن؟</span>
                <label className="switch">
                  <input 
                    type="checkbox" 
                    checked={isAutoCalculate} 
                    onChange={e => setIsAutoCalculate(e.target.checked)} 
                  />
                  <span className="slider round"></span>
                </label>
              </div>
            </div>

            {!isAutoCalculate ? (
              <div style={{ padding: '3rem', textAlign: 'center', background: 'var(--surface)', borderRadius: '16px', border: '2px dashed var(--border)' }}>
                <p style={{ color: 'var(--text-muted)', fontWeight: 600 }}>⚠️ تم تعطيل التوزيع التلقائي. سيتم منح كل أسرة مبلغاً ثابتاً.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-[1fr_350px] gap-8">
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1.25rem', alignItems: 'center' }}>
                    <h3 style={{ fontSize: '0.9rem', fontWeight: 700 }}>شرائح الدعم المالي</h3>
                    <button 
                      type="button" className="btn btn-ghost btn-xs"
                      onClick={() => setAgeBrackets([...ageBrackets, { from: 19, to: 25, amount: 800 }])}
                    >
                      + إضافة شريحة جديدة
                    </button>
                  </div>
                  
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                    {ageBrackets.map((b, i) => (
                      <div key={i} className="card p-md shadow-sm" style={{ display: 'grid', gridTemplateColumns: '80px 80px 1fr auto', gap: '1rem', alignItems: 'end', background: 'white' }}>
                        <div>
                          <label className="form-label" style={{ fontSize: '0.65rem' }}>من عمر</label>
                          <input 
                            type="number" className="form-input form-input-sm" 
                            value={b.from} onChange={e => {
                              const newB = [...ageBrackets];
                              newB[i].from = Number(e.target.value);
                              setAgeBrackets(newB);
                            }}
                          />
                        </div>
                        <div>
                          <label className="form-label" style={{ fontSize: '0.65rem' }}>إلى عمر</label>
                          <input 
                            type="number" className="form-input form-input-sm" 
                            value={b.to} onChange={e => {
                              const newB = [...ageBrackets];
                              newB[i].to = Number(e.target.value);
                              setAgeBrackets(newB);
                            }}
                          />
                        </div>
                        <div>
                          <label className="form-label" style={{ fontSize: '0.65rem' }}>المبلـــغ (ج.م)</label>
                          <input 
                            type="number" className="form-input form-input-sm" 
                            value={b.amount} onChange={e => {
                              const newB = [...ageBrackets];
                              newB[i].amount = Number(e.target.value);
                              setAgeBrackets(newB);
                            }}
                          />
                        </div>
                        <button 
                          type="button" className="btn btn-ghost btn-sm text-error"
                          onClick={() => setAgeBrackets(ageBrackets.filter((_, idx) => idx !== i))}
                        >
                          ✕
                        </button>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="glass-card" style={{ background: 'rgba(var(--primary-rgb), 0.03)', border: '1px solid var(--primary-border)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
                    <h3 style={{ fontSize: '0.9rem', fontWeight: 700, margin: 0 }}>قواعد رسوم التحويل</h3>
                    <button 
                      type="button" className="btn btn-ghost btn-xs"
                      onClick={() => setCommissionRules([...commissionRules, { threshold: 1000, fee: 10 }])}
                    >
                      <Plus size={14} /> إضافة قاعدة
                    </button>
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                    {commissionRules.map((r, i) => (
                      <div key={i} className="card p-sm shadow-sm" style={{ display: 'grid', gridTemplateColumns: '1fr 80px auto', gap: '0.75rem', alignItems: 'center', background: 'white' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                          <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>حتى مبلغ:</span>
                          <input 
                            type="number" className="form-input form-input-sm" 
                            value={r.threshold} onChange={e => {
                              const newR = [...commissionRules];
                              newR[i].threshold = Number(e.target.value);
                              setCommissionRules(newR);
                            }}
                          />
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                          <input 
                            type="number" className="form-input form-input-sm" style={{ textAlign: 'center' }}
                            value={r.fee} onChange={e => {
                              const newR = [...commissionRules];
                              newR[i].fee = Number(e.target.value);
                              setCommissionRules(newR);
                            }}
                          />
                          <span style={{ fontSize: '0.7rem', fontWeight: 700 }}>ج.م</span>
                        </div>
                        <button 
                          type="button" className="btn btn-ghost btn-xs text-error"
                          onClick={() => setCommissionRules(commissionRules.filter((_, idx) => idx !== i))}
                          disabled={commissionRules.length <= 1}
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    ))}
                  </div>

                  <div className="advice-card mt-8">
                    <div className="advice-icon">
                      <Lightbulb size={20} />
                    </div>
                    <div className="advice-content">
                      <span className="advice-title">نصيحة تقنية</span>
                      <p className="advice-text">
                        يتم حساب مجموع مبالغ أطفال الأسرة أولاً، ثم تُضاف العمولة المناسبة بناءً على أقرب "سقف مبلغ" للشريحة المختارة. هذا يضمن دقة الحسابات المالية.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </section>
        </div>

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '1rem', marginTop: '3rem', borderTop: '1px solid var(--border-light)', paddingTop: '2rem' }}>
          <button type="button" className="btn btn-ghost" onClick={() => navigate(-1)} disabled={saving}>إلغاء</button>
          <button type="submit" className="btn btn-primary btn-lg px-8" disabled={saving}>
            <Save size={20} />
            {isEdit ? 'حفظ التغييرات' : 'إنشاء المبادرة الآن'}
          </button>
        </div>
      </form>
    </div>
  );
}
