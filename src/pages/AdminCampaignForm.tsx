import { useState, useEffect, useMemo } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Save, ArrowRight, DollarSign, FileText, Plus, Lightbulb, Users, Calculator, GraduationCap, Baby } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { toast } from '../components/Toast';
import type { Campaign, CampaignType, CampaignStatus, AgeBracket, StageBracket, CommissionRule, Child } from '../types';

const GRADES = [
  { value: 1, label: 'الأول الابتدائي' },
  { value: 2, label: 'الثاني الابتدائي' },
  { value: 3, label: 'الثالث الابتدائي' },
  { value: 4, label: 'الرابع الابتدائي' },
  { value: 5, label: 'الخامس الابتدائي' },
  { value: 6, label: 'السادس الابتدائي' },
  { value: 7, label: 'الأول الإعدادي' },
  { value: 8, label: 'الثاني الإعدادي' },
  { value: 9, label: 'الثالث الإعدادي' },
  { value: 10, label: 'الأول الثانوي' },
  { value: 11, label: 'الثاني الثانوي' },
  { value: 12, label: 'الثالث الثانوي' },
];

export default function AdminCampaignForm() {
  const { id } = useParams();
  const navigate = useNavigate();
  const isEdit = Boolean(id);

  const [loading, setLoading] = useState(isEdit);
  const [saving, setSaving]   = useState(false);
  const [children, setChildren] = useState<Child[]>([]);

  // Form State
  const [name, setName]               = useState('');
  const [description, setDescription] = useState('');
  const [type, setType]               = useState<CampaignType>('financial');
  const [startDate, setStartDate]     = useState(new Date().toISOString().split('T')[0]);
  const [endDate, setEndDate]         = useState('');
  const [amountPerFamily, setAmountPerFamily] = useState(0);
  const [status, setStatus]           = useState<CampaignStatus>('draft');
  
  // Advanced Targeting & Distribution
  const [isAutoCalculate, setIsAutoCalculate] = useState(true);
  const [distributionMode, setDistributionMode] = useState<'age' | 'school_stage'>('age');
  const [isOrphansOnly, setIsOrphansOnly] = useState(false);
  
  const [ageBrackets, setAgeBrackets] = useState<AgeBracket[]>([
    { from: 0, to: 6, amount: 200, label: 'أطفال' },
    { from: 7, to: 12, amount: 400, label: 'ابتدائي' },
    { from: 13, to: 18, amount: 600, label: 'إعدادي/ثانوي' }
  ]);

  const [stageBrackets, setStageBrackets] = useState<StageBracket[]>([
    { fromGrade: 1, toGrade: 6, amount: 500 },
    { fromGrade: 7, toGrade: 9, amount: 700 }
  ]);

  const [commissionRules, setCommissionRules] = useState<CommissionRule[]>([
    { fromAmount: 0, toAmount: 500, fee: 0 },
    { fromAmount: 501, toAmount: 1000, fee: 5 },
    { fromAmount: 1001, toAmount: 1500, fee: 10 }
  ]);

  useEffect(() => {
    fetchMetadata();
    if (isEdit) fetchCampaign();
  }, [id]);

  async function fetchMetadata() {
    try {
      const { data } = await supabase.from('children').select('*');
      if (data) setChildren(data);
    } catch (err) {
      console.error('Error fetching children for calculation', err);
    }
  }

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
      setDistributionMode(c.distribution_mode || 'age');
      setIsOrphansOnly(c.targeting_rules?.some(r => r.field === 'is_orphan' && r.value === true) ?? false);
      
      if (c.age_brackets?.length) setAgeBrackets(c.age_brackets);
      if (c.stage_brackets?.length) setStageBrackets(c.stage_brackets);
      if (c.commission_rules?.length) setCommissionRules(c.commission_rules);
    } catch (err) {
      toast('تعذر تحميل بيانات الحملة', 'error');
      navigate('/admin/campaigns');
    } finally {
      setLoading(false);
    }
  }

  // Budget Estimation Logic
  const budgetEstimate = useMemo(() => {
    if (!isAutoCalculate) return 0;

    let total = 0;
    const filteredChildren = isOrphansOnly 
      ? children.filter(c => c.is_orphan) 
      : children;

    // Group by family to apply commission
    const familyDistributions: Record<string, number> = {};

    filteredChildren.forEach(child => {
      let childAmount = 0;
      if (distributionMode === 'age' && child.age !== undefined) {
        const bracket = ageBrackets.find(b => child.age! >= b.from && child.age! <= b.to);
        if (bracket) childAmount = bracket.amount;
      } else if (distributionMode === 'school_stage') {
        const grade = child.age ? Math.max(1, Math.min(12, child.age - 5)) : 1;
        const bracket = stageBrackets.find(b => {
          if (b.stage) return b.stage === child.school_stage;
          return grade >= (b.fromGrade || 1) && grade <= (b.toGrade || 12);
        });
        if (bracket) childAmount = bracket.amount;
      }

      if (childAmount > 0) {
        familyDistributions[child.family_id] = (familyDistributions[child.family_id] || 0) + childAmount;
      }
    });

    // Sum all families + their fees
    Object.values(familyDistributions).forEach(familyTotal => {
      const rule = commissionRules.find(r => {
        if (r.threshold !== undefined) return familyTotal <= r.threshold;
        const fromA = r.fromAmount || 0;
        const toA = r.toAmount || 999999;
        return familyTotal >= fromA && familyTotal <= toA;
      });
      
      total += familyTotal + (rule ? rule.fee : 0);
    });

    return total;
  }, [isAutoCalculate, children, isOrphansOnly, distributionMode, ageBrackets, stageBrackets, commissionRules]);

  const beneficiariesCount = useMemo(() => {
    const list = isOrphansOnly ? children.filter(c => c.is_orphan) : children;
    const families = new Set();
    list.forEach(c => {
      if (distributionMode === 'age' && c.age !== undefined) {
        if (ageBrackets.some(b => c.age! >= b.from && c.age! <= b.to)) families.add(c.family_id);
      } else if (distributionMode === 'school_stage') {
        const grade = c.age ? Math.max(1, Math.min(12, c.age - 5)) : 1;
        const valid = stageBrackets.some(b => {
          if (b.stage) return b.stage === c.school_stage;
          return grade >= (b.fromGrade || 1) && grade <= (b.toGrade || 12);
        });
        if (valid) families.add(c.family_id);
      }
    });
    return families.size;
  }, [children, isOrphansOnly, distributionMode, ageBrackets, stageBrackets]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name) {
      toast('يرجى إدخال اسم الحملة', 'warning');
      return;
    }

    setSaving(true);
    try {
      const targetingRules = isOrphansOnly ? [{ field: 'is_orphan', operator: 'eq', value: true }] : [];
      
      const campaignData = {
        name,
        description,
        campaign_type: type,
        start_date: new Date(startDate).toISOString(),
        end_date: endDate ? new Date(endDate).toISOString() : null,
        amount_per_family: amountPerFamily,
        budget: isAutoCalculate ? budgetEstimate : (amountPerFamily * (beneficiariesCount || 1)),
        status,
        is_auto_calculate: isAutoCalculate,
        distribution_mode: distributionMode,
        targeting_rules: targetingRules,
        age_brackets: ageBrackets,
        stage_brackets: stageBrackets,
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
        
        {/* Real-time Stats Card */}
        <div className="glass-card stagger-1" style={{ padding: '0.75rem 1.5rem', border: '2px solid var(--gold)', background: 'rgba(212,175,55,0.05)', display: 'flex', gap: '1rem', alignItems: 'center', flexWrap: 'wrap', justifyContent: 'center' }}>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '0.25rem' }}>الميزانية المتوقعة</div>
            <div style={{ fontSize: '1.25rem', fontWeight: 900, color: 'var(--gold)' }}>
              {budgetEstimate.toLocaleString()} <span style={{ fontSize: '0.85rem' }}>ج.م</span>
            </div>
          </div>
          <div style={{ width: 1, height: 30, background: 'var(--border)', flexShrink: 0 }} className="hidden sm:block" />
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '0.25rem' }}>الأسر المستهدفة</div>
            <div style={{ fontSize: '1.25rem', fontWeight: 900 }}>{beneficiariesCount}</div>
          </div>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="stagger">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Main Info */}
          <section className="glass-card">
            <h2 className="section-title"><FileText size={18} /> تفاصيل المبادرة</h2>
            
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

          {/* Targeting & Dates */}
          <section className="glass-card">
            <h2 className="section-title"><Users size={18} /> استهداف المستفيدين</h2>

            <div className="form-group" style={{ marginBottom: '1.5rem' }}>
              <label className="form-label">الفئات المستهدفة</label>
              <div className="grid grid-cols-2 gap-3">
                <button 
                  type="button" 
                  className={`btn ${!isOrphansOnly ? 'btn-primary' : 'btn-ghost'}`}
                  onClick={() => setIsOrphansOnly(false)}
                  style={{ fontSize: '0.85rem' }}
                >الجميع</button>
                <button 
                  type="button" 
                  className={`btn ${isOrphansOnly ? 'btn-primary' : 'btn-ghost'}`}
                  onClick={() => setIsOrphansOnly(true)}
                  style={{ fontSize: '0.85rem' }}
                >الأيتام فقط</button>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
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

            {!isAutoCalculate && (
              <div className="form-group mt-md">
                <label className="form-label">المبلغ الثابت لكل أسرة</label>
                <div style={{ position: 'relative' }}>
                  <input 
                    type="number" className="form-input" min={0}
                    value={amountPerFamily} onChange={e => setAmountPerFamily(Number(e.target.value))} 
                    style={{ paddingRight: '2.5rem' }}
                  />
                  <DollarSign size={18} style={{ position: 'absolute', right: '1rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                </div>
              </div>
            )}
          </section>

          {/* Advanced Distribution Rules */}
          <section className="glass-card lg:col-span-2">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
              <h2 className="section-title" style={{ margin: 0 }}><Calculator size={18} /> منطق التوزيع المخصص</h2>
              
              <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                  <span style={{ fontSize: '0.85rem', fontWeight: 700 }}>تفعيل التوزيع التلقائي؟</span>
                  <label className="switch">
                    <input type="checkbox" checked={isAutoCalculate} onChange={e => setIsAutoCalculate(e.target.checked)} />
                    <span className="slider round"></span>
                  </label>
                </div>
              </div>
            </div>

            {!isAutoCalculate ? (
              <div className="empty-state-card" style={{ padding: '3rem' }}>
                <p>⚠️ تم تعطيل التوزيع التلقائي. سيتم منح كل أسرة مستهدفة مبلغاً ثابتاً.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-[1fr_350px] gap-8">
                <div>
                  <div style={{ background: 'var(--surface-light)', padding: '0.5rem', borderRadius: '12px', display: 'flex', gap: '0.5rem', marginBottom: '1.5rem' }}>
                    <button 
                      type="button" 
                      className={`btn btn-sm ${distributionMode === 'age' ? 'btn-primary' : 'btn-ghost'}`}
                      style={{ flex: 1 }}
                      onClick={() => setDistributionMode('age')}
                    >
                      <Baby size={16} /> حسب السن
                    </button>
                    <button 
                      type="button" 
                      className={`btn btn-sm ${distributionMode === 'school_stage' ? 'btn-primary' : 'btn-ghost'}`}
                      style={{ flex: 1 }}
                      onClick={() => setDistributionMode('school_stage')}
                    >
                      <GraduationCap size={16} /> حسب الفصل الدراسي
                    </button>
                  </div>

                  {distributionMode === 'age' ? (
                    <div className="bracket-list">
                      <div className="flex justify-between items-center mb-4">
                        <h3 style={{ fontSize: '0.9rem', fontWeight: 800 }}>توزيع مخصص للأعمار</h3>
                        <button type="button" className="btn btn-ghost btn-xs" onClick={() => setAgeBrackets([...ageBrackets, { from: 0, to: 0, amount: 0 }])}>
                          <Plus size={14} /> إضافة فئة
                        </button>
                      </div>
                      <div className="grid gap-3">
                        {ageBrackets.map((b, i) => (
                          <div key={i} className="bracket-card">
                             <div className="bracket-inputs">
                                <div className="form-group mb-0">
                                  <label className="form-label-xs">من عمر</label>
                                  <input type="number" className="form-input form-input-sm" value={b.from} onChange={e => {
                                    const nb = [...ageBrackets]; nb[i].from = Number(e.target.value); setAgeBrackets(nb);
                                  }} />
                                </div>
                                <div className="form-group mb-0">
                                  <label className="form-label-xs">إلى عمر</label>
                                  <input type="number" className="form-input form-input-sm" value={b.to} onChange={e => {
                                    const nb = [...ageBrackets]; nb[i].to = Number(e.target.value); setAgeBrackets(nb);
                                  }} />
                                </div>
                                <div className="form-group mb-0">
                                  <label className="form-label-xs">المبلغ (ج.م)</label>
                                  <input type="number" className="form-input form-input-sm" value={b.amount} onChange={e => {
                                    const nb = [...ageBrackets]; nb[i].amount = Number(e.target.value); setAgeBrackets(nb);
                                  }} />
                                </div>
                             </div>
                             <button type="button" className="btn btn-ghost btn-sm text-error" onClick={() => setAgeBrackets(ageBrackets.filter((_, idx) => idx !== i))}>✕</button>
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : (
                    <div className="bracket-list">
                      <div className="flex justify-between items-center mb-4">
                        <h3 style={{ fontSize: '0.9rem', fontWeight: 800 }}>توزيع مخصص للسنوات الدراسية</h3>
                        <button type="button" className="btn btn-ghost btn-xs" onClick={() => setStageBrackets([...stageBrackets, { fromGrade: 1, toGrade: 6, amount: 0 }])}>
                          <Plus size={14} /> إضافة مرحلة
                        </button>
                      </div>
                      <div className="grid gap-3">
                        {stageBrackets.map((b, i) => (
                          <div key={i} className="bracket-card">
                             <div className="bracket-inputs">
                                <div className="form-group mb-0">
                                  <label className="form-label-xs">من الصف</label>
                                  <select className="form-select form-select-sm" value={b.fromGrade || 1} onChange={e => {
                                    const nb = [...stageBrackets]; nb[i].fromGrade = Number(e.target.value); delete nb[i].stage; setStageBrackets(nb);
                                  }}>
                                    {GRADES.map(g => <option key={g.value} value={g.value}>{g.label}</option>)}
                                  </select>
                                </div>
                                <div className="form-group mb-0">
                                  <label className="form-label-xs">إلى الصف</label>
                                  <select className="form-select form-select-sm" value={b.toGrade || 12} onChange={e => {
                                    const nb = [...stageBrackets]; nb[i].toGrade = Number(e.target.value); delete nb[i].stage; setStageBrackets(nb);
                                  }}>
                                    {GRADES.map(g => <option key={g.value} value={g.value}>{g.label}</option>)}
                                  </select>
                                </div>
                                <div className="form-group mb-0">
                                  <label className="form-label-xs">المبلغ (ج.م)</label>
                                  <input type="number" className="form-input form-input-sm" value={b.amount} onChange={e => {
                                    const nb = [...stageBrackets]; nb[i].amount = Number(e.target.value); setStageBrackets(nb);
                                  }} />
                                </div>
                             </div>
                             <button type="button" className="btn btn-ghost btn-sm text-error" onClick={() => setStageBrackets(stageBrackets.filter((_, idx) => idx !== i))}>✕</button>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                {/* Right Bank: Commission & Advice */}
                <div className="glass-card" style={{ background: 'rgba(212,175,55,0.03)', border: '1px solid var(--gold-light)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
                    <h3 style={{ fontSize: '0.9rem', fontWeight: 800 }}>رسوم التحويل</h3>
                    <button type="button" className="btn btn-ghost btn-xs" onClick={() => setCommissionRules([...commissionRules, { fromAmount: 0, toAmount: 500, fee: 10 }])}>
                      <Plus size={14} /> إضافة
                    </button>
                  </div>
                  
                  <div className="grid gap-2">
                    {commissionRules.map((r, i) => (
                      <div key={i} className="bracket-card" style={{ padding: '0.75rem', flexWrap: 'wrap' }}>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem', width: '100%' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                            <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>من:</span>
                            <input type="number" className="form-input form-input-sm w-full" value={r.fromAmount || 0} onChange={e => {
                              const nr = [...commissionRules]; nr[i].fromAmount = Number(e.target.value); delete nr[i].threshold; setCommissionRules(nr);
                            }} />
                          </div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                            <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>إلى:</span>
                            <input type="number" className="form-input form-input-sm w-full" value={r.toAmount || 99999} onChange={e => {
                              const nr = [...commissionRules]; nr[i].toAmount = Number(e.target.value); delete nr[i].threshold; setCommissionRules(nr);
                            }} />
                          </div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', gridColumn: '1 / -1' }}>
                            <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>الرسوم:</span>
                            <input type="number" className="form-input form-input-sm w-full" value={r.fee} onChange={e => {
                              const nr = [...commissionRules]; nr[i].fee = Number(e.target.value); setCommissionRules(nr);
                            }} />
                          </div>
                        </div>
                        <button type="button" className="btn btn-ghost btn-sm text-error w-full mt-2" style={{ background: 'rgba(239,68,68,0.1)' }} onClick={() => setCommissionRules(commissionRules.filter((_, idx) => idx !== i))} disabled={commissionRules.length <= 1}>إزالة الرسوم</button>
                      </div>
                    ))}
                  </div>

                  <div className="advice-card mt-8" style={{ border: 'none', background: 'white' }}>
                    <div className="advice-icon" style={{ background: 'var(--gold)' }}><Lightbulb size={18} color="white" /></div>
                    <div className="advice-content">
                      <span className="advice-title">نصيحة الميزانية</span>
                      <p className="advice-text" style={{ fontSize: '0.7rem' }}>
                        يتم حساب إجمالي كل أسرة أولاً، ثم إضافة الرسوم بناءً على إجمالي المبالغ للأطفال داخل الحملة.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </section>
        </div>

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '1rem', marginTop: '3rem', borderTop: '1px solid var(--border-light)', paddingTop: '2rem', flexWrap: 'wrap' }}>
          <button type="button" className="btn btn-ghost" onClick={() => navigate(-1)} disabled={saving}>إلغاء</button>
          <button type="submit" className="btn btn-primary btn-lg px-8 flex-1 sm:flex-none justify-center" disabled={saving}>
            <Save size={20} />
            {isEdit ? 'حفظ التغييرات' : 'إنشاء الحملة الآن'}
          </button>
        </div>
      </form>
      
      <style>{`
        .section-title {
          font-size: 1.1rem;
          font-weight: 800;
          margin-bottom: 1.5rem;
          display: flex;
          align-items: center;
          gap: 0.5rem;
          color: var(--primary-dark);
        }
        .bracket-card {
          background: white;
          border-radius: 12px;
          border: 1px solid var(--border-light);
          padding: 1rem;
          display: flex;
          align-items: center;
          gap: 1rem;
          flex-wrap: wrap; /* Fixed flex wrap for small screens */
        }
        .bracket-inputs {
          display: grid;
          grid-template-columns: 1fr 1fr 1fr;
          gap: 1rem;
          flex: 1;
          min-width: 250px;
        }
        .bracket-inputs-stage {
          display: grid;
          grid-template-columns: 2fr 1fr;
          gap: 1rem;
          flex: 1;
        }
        .form-label-xs {
          font-size: 0.65rem;
          font-weight: 800;
          color: var(--text-muted);
          margin-bottom: 0.25rem;
          display: block;
        }
        @media (max-width: 768px) {
          .bracket-inputs, .bracket-inputs-stage {
            grid-template-columns: 1fr;
            gap: 0.5rem;
          }
          .bracket-card {
            align-items: flex-start;
          }
        }
      `}</style>
    </div>
  );
}
