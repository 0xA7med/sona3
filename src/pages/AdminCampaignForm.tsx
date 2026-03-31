import { useState, useEffect, useMemo } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Save, ArrowRight, DollarSign, FileText, Plus, Users, Calculator, GraduationCap, Baby, CheckCircle, ChevronRight, ChevronLeft } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { toast } from '../components/Toast';
import type { Campaign, CampaignType, CampaignStatus, Child } from '../types';

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
  
  // Wizard State
  const [currentStep, setCurrentStep] = useState(1);

  // Form State
  const [name, setName]               = useState('');
  const [description, setDescription] = useState('');
  const [type, setType]               = useState<CampaignType>('financial');
  const [startDate, setStartDate]     = useState(new Date().toISOString().split('T')[0]);
  const [endDate, setEndDate]         = useState('');
  const [amountPerFamily, setAmountPerFamily] = useState<number | string>(0);
  const [status, setStatus]           = useState<CampaignStatus>('draft');
  
  // Advanced Targeting & Distribution
  const [isAutoCalculate, setIsAutoCalculate] = useState(true);
  const [distributionMode, setDistributionMode] = useState<'age' | 'school_stage'>('age');
  const [isOrphansOnly, setIsOrphansOnly] = useState(false);
  
  const [ageBrackets, setAgeBrackets] = useState<any[]>([
    { from: 0, to: 6, amount: 300, label: 'أطفال' },
    { from: 7, to: 12, amount: 400, label: 'ابتدائي' },
    { from: 13, to: 18, amount: 500, label: 'إعدادي/ثانوي' }
  ]);

  const [stageBrackets, setStageBrackets] = useState<any[]>([
    { fromGrade: 1, toGrade: 6, amount: 500 },
    { fromGrade: 7, toGrade: 9, amount: 700 }
  ]);

  const [commissionRules, setCommissionRules] = useState<any[]>([
    { fromAmount: 0, toAmount: 1000, fee: 5 },
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
        const bracket = ageBrackets.find(b => child.age! >= (Number(b.from)||0) && child.age! <= (Number(b.to)||0));
        if (bracket) childAmount = Number(bracket.amount) || 0;
      } else if (distributionMode === 'school_stage') {
        const grade = child.age ? Math.max(1, Math.min(12, child.age - 5)) : 1;
        const bracket = stageBrackets.find(b => {
          if (b.stage) return b.stage === child.school_stage;
          return grade >= (Number(b.fromGrade)||1) && grade <= (Number(b.toGrade)||12);
        });
        if (bracket) childAmount = Number(bracket.amount) || 0;
      }

      if (childAmount > 0) {
        familyDistributions[child.family_id] = (familyDistributions[child.family_id] || 0) + childAmount;
      }
    });

    // Sum all families + their fees
    Object.values(familyDistributions).forEach(familyTotal => {
      const rule = commissionRules.find(r => {
        if (r.threshold !== undefined) return familyTotal <= (Number(r.threshold)||0);
        const fromA = Number(r.fromAmount) || 0;
        const toA = Number(r.toAmount) || 999999;
        return familyTotal >= fromA && familyTotal <= toA;
      });
      
      total += familyTotal + (rule ? (Number(rule.fee)||0) : 0);
    });

    return total;
  }, [isAutoCalculate, children, isOrphansOnly, distributionMode, ageBrackets, stageBrackets, commissionRules]);

  const beneficiariesCount = useMemo(() => {
    const list = isOrphansOnly ? children.filter(c => c.is_orphan) : children;
    const families = new Set();
    list.forEach(c => {
      if (distributionMode === 'age' && c.age !== undefined) {
        if (ageBrackets.some(b => c.age! >= (Number(b.from)||0) && c.age! <= (Number(b.to)||0))) families.add(c.family_id);
      } else if (distributionMode === 'school_stage') {
        const grade = c.age ? Math.max(1, Math.min(12, c.age - 5)) : 1;
        const valid = stageBrackets.some(b => {
          if (b.stage) return b.stage === c.school_stage;
          return grade >= (Number(b.fromGrade)||1) && grade <= (Number(b.toGrade)||12);
        });
        if (valid) families.add(c.family_id);
      }
    });
    return families.size;
  }, [children, isOrphansOnly, distributionMode, ageBrackets, stageBrackets]);

  // Bug Fix: Handle empty inputs properly so they don't immediately transform to '0'
  const handleNumChange = (val: string) => val === '' ? '' : Number(val);

  const handleSubmit = async () => {
    if (!name) {
      toast('يرجى إدخال اسم الحملة', 'warning');
      return;
    }

    setSaving(true);
    try {
      const targetingRules = isOrphansOnly ? [{ field: 'is_orphan', operator: 'eq', value: true }] : [];
      // Clean up brackets before saving (ensure they are numbers)
      const cleanAgeBrackets = ageBrackets.map(b => ({ ...b, from: Number(b.from)||0, to: Number(b.to)||0, amount: Number(b.amount)||0 }));
      const cleanStageBrackets = stageBrackets.map(b => ({ ...b, fromGrade: Number(b.fromGrade)||1, toGrade: Number(b.toGrade)||12, amount: Number(b.amount)||0 }));
      const cleanCommissionRules = commissionRules.map(r => ({ ...r, fromAmount: Number(r.fromAmount)||0, toAmount: Number(r.toAmount)||0, fee: Number(r.fee)||0 }));

      const campaignData = {
        name,
        description,
        campaign_type: type,
        start_date: new Date(startDate).toISOString(),
        end_date: endDate ? new Date(endDate).toISOString() : null,
        amount_per_family: Number(amountPerFamily) || 0,
        budget: isAutoCalculate ? budgetEstimate : ((Number(amountPerFamily) || 0) * (beneficiariesCount || 1)),
        status,
        is_auto_calculate: isAutoCalculate,
        distribution_mode: distributionMode,
        targeting_rules: targetingRules,
        age_brackets: cleanAgeBrackets,
        stage_brackets: cleanStageBrackets,
        commission_rules: cleanCommissionRules,
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

  const handleNextStep = () => {
    if (currentStep === 1 && !name) {
      toast('يرجى إدخال اسم الحملة للانتقال للخطوة التالية', 'warning');
      return;
    }
    if (currentStep < 3) setCurrentStep(c => c + 1);
  };

  if (loading) return <div className="page-content"><div className="skeleton" style={{ height: 400 }} /></div>;

  const steps = [
    { id: 1, title: 'البيانات الأساسية', icon: FileText },
    { id: 2, title: 'الاستهداف والتوزيع', icon: Calculator },
    { id: 3, title: 'المراجعة والحفظ', icon: CheckCircle },
  ];

  return (
    <div className="page-content">
      <div className="page-header" style={{ marginBottom: '1.5rem' }}>
        <div>
          <button className="btn btn-ghost btn-sm mb-sm" onClick={() => navigate(-1)}>
            <ArrowRight size={18} /> العودة
          </button>
          <h1 className="page-title">{isEdit ? 'تعديل الحملة' : 'إنشاء حملة جديدة 🏹'}</h1>
        </div>
      </div>

      {/* Wizard Progress Bar */}
      <div style={{ marginBottom: '2rem', display: 'flex', justifyContent: 'center' }}>
        <div style={{ display: 'flex', alignItems: 'center', width: '100%', maxWidth: '600px', position: 'relative' }}>
          {/* Connecting Line */}
          <div style={{ position: 'absolute', top: '50%', left: '10%', right: '10%', height: '4px', background: 'var(--border)', zIndex: 0, transform: 'translateY(-50%)', borderRadius: '2px' }} />
          <div style={{ position: 'absolute', top: '50%', right: '10%', width: `${(currentStep - 1) * 40}%`, height: '4px', background: 'var(--primary)', zIndex: 0, transform: 'translateY(-50%)', borderRadius: '2px', transition: 'width 0.4s ease' }} />
          
          {steps.map((s) => {
            const isActive = s.id === currentStep;
            const isCompleted = s.id < currentStep;
            return (
              <div key={s.id} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', position: 'relative', zIndex: 1 }}>
                <div style={{ 
                  width: 44, height: 44, borderRadius: '50%', 
                  background: isActive ? 'var(--primary)' : isCompleted ? 'var(--primary-dark)' : 'white',
                  border: `3px solid ${isActive || isCompleted ? 'var(--primary-dark)' : 'var(--border)'}`,
                  color: isActive || isCompleted ? 'white' : 'var(--text-muted)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  boxShadow: isActive ? '0 0 0 4px rgba(6,147,100,0.2)' : 'none',
                  transition: 'all 0.3s ease'
                }}>
                  {isCompleted ? <CheckCircle size={20} /> : <s.icon size={20} />}
                </div>
                <div style={{ 
                  marginTop: '0.5rem', fontSize: '0.75rem', fontWeight: isActive ? 800 : 600, 
                  color: isActive ? 'var(--primary-dark)' : 'var(--text-muted)', textAlign: 'center'
                }}>
                  {s.title}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <div className="glass-card" style={{ padding: '1.5rem', overflow: 'hidden' }}>
        <AnimatePresence mode="wait">
          
          {/* STEP 1: Basic Info */}
          {currentStep === 1 && (
            <motion.div key="step1" initial={{ x: -20, opacity: 0 }} animate={{ x: 0, opacity: 1 }} exit={{ x: 20, opacity: 0 }}>
              <h2 className="section-title"><FileText size={18} /> البيانات الأساسية</h2>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="form-group col-span-1 md:col-span-2">
                  <label className="form-label">اسم الحملة</label>
                  <input type="text" className="form-input" required value={name} onChange={e => setName(e.target.value)} placeholder="مثال: شنطة رمضان 2024" />
                </div>
                <div className="form-group col-span-1 md:col-span-2">
                  <label className="form-label">وصف الحملة / الهدف</label>
                  <textarea className="form-input" rows={3} value={description} onChange={e => setDescription(e.target.value)} placeholder="توزيع المساعدات على الأسر..." />
                </div>
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
                  <label className="form-label">تاريخ البدء</label>
                  <input type="date" className="form-input" required value={startDate} onChange={e => setStartDate(e.target.value)} />
                </div>
                <div className="form-group">
                  <label className="form-label">تاريخ الانتهاء</label>
                  <input type="date" className="form-input" value={endDate} onChange={e => setEndDate(e.target.value)} />
                </div>
              </div>
            </motion.div>
          )}

          {/* STEP 2: Targeting & Distribution */}
          {currentStep === 2 && (
            <motion.div key="step2" initial={{ x: -20, opacity: 0 }} animate={{ x: 0, opacity: 1 }} exit={{ x: 20, opacity: 0 }}>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                
                {/* Left Column: Targeting */}
                <div>
                  <h2 className="section-title"><Users size={18} /> الفئات المستهدفة</h2>
                  <div className="grid grid-cols-2 gap-3 mb-6">
                    <button type="button" className={`btn ${!isOrphansOnly ? 'btn-primary' : 'btn-ghost'}`} onClick={() => setIsOrphansOnly(false)}>الجميع</button>
                    <button type="button" className={`btn ${isOrphansOnly ? 'btn-primary' : 'btn-ghost'}`} onClick={() => setIsOrphansOnly(true)}>الأيتام فقط</button>
                  </div>
                  
                  <div className="glass-card" style={{ background: 'rgba(6,147,100,0.03)', border: '1px solid rgba(6,147,100,0.1)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div>
                        <h3 style={{ fontSize: '0.9rem', fontWeight: 800, color: 'var(--primary-dark)' }}>التوزيع التلقائي</h3>
                        <p style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>حساب القيم والرسوم آلياً لكل أسرة</p>
                      </div>
                      <label className="switch">
                        <input type="checkbox" checked={isAutoCalculate} onChange={e => setIsAutoCalculate(e.target.checked)} />
                        <span className="slider round"></span>
                      </label>
                    </div>
                  </div>

                  {!isAutoCalculate && (
                    <div className="form-group mt-md">
                      <label className="form-label">المبلغ الثابت لكل أسرة (بدون حسابات تلقائية)</label>
                      <div style={{ position: 'relative' }}>
                        <input type="number" className="form-input" min={0} value={amountPerFamily} onChange={e => setAmountPerFamily(handleNumChange(e.target.value))} style={{ paddingRight: '2.5rem' }} />
                        <DollarSign size={18} style={{ position: 'absolute', right: '1rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                      </div>
                    </div>
                  )}

                  {isAutoCalculate && (
                    <div className="mt-8">
                       <h3 style={{ fontSize: '1rem', fontWeight: 900, color: 'var(--gold)', display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem' }}>
                         قواعد رسوم التحويل
                       </h3>
                       {commissionRules.map((r, i) => (
                          <div key={i} className="glass-card mb-4" style={{ padding: '1rem', position: 'relative', borderLeft: '3px solid var(--gold)' }}>
                            <button type="button" className="btn btn-ghost text-error" style={{ position: 'absolute', top: '0.5rem', left: '0.5rem', width: 28, height: 28, padding: 0 }} onClick={() => setCommissionRules(commissionRules.filter((_, idx) => idx !== i))} disabled={commissionRules.length <= 1}>✕</button>
                            <div className="grid grid-cols-2 gap-3 mt-2">
                              <div>
                                <label style={{ fontSize: '0.65rem', color: 'var(--text-muted)' }}>إجمالي من (ج.م)</label>
                                <input type="number" className="form-input" style={{ padding: '6px 10px', fontSize: '0.8rem' }} value={r.fromAmount ?? ''} onChange={e => {
                                  const nr = [...commissionRules]; nr[i].fromAmount = handleNumChange(e.target.value); delete nr[i].threshold; setCommissionRules(nr);
                                }}/>
                              </div>
                              <div>
                                <label style={{ fontSize: '0.65rem', color: 'var(--text-muted)' }}>إجمالي إلى (ج.م)</label>
                                <input type="number" className="form-input" style={{ padding: '6px 10px', fontSize: '0.8rem' }} value={r.toAmount ?? ''} onChange={e => {
                                  const nr = [...commissionRules]; nr[i].toAmount = handleNumChange(e.target.value); delete nr[i].threshold; setCommissionRules(nr);
                                }}/>
                              </div>
                              <div className="col-span-2">
                                <label style={{ fontSize: '0.65rem', color: 'var(--text-muted)' }}>الرسوم المضافة (ج.م)</label>
                                <input type="number" className="form-input" style={{ padding: '6px 10px', fontSize: '0.85rem', fontWeight: 'bold', color: 'var(--orange)' }} value={r.fee ?? ''} onChange={e => {
                                  const nr = [...commissionRules]; nr[i].fee = handleNumChange(e.target.value); setCommissionRules(nr);
                                }}/>
                              </div>
                            </div>
                          </div>
                       ))}
                       <button type="button" className="btn btn-gold btn-sm w-full" onClick={() => setCommissionRules([...commissionRules, { fromAmount: '', toAmount: '', fee: '' }])}>
                         <Plus size={16} /> إضافة شريحة رسوم
                       </button>
                    </div>
                  )}
                </div>

                {/* Right Column: Brackets */}
                {isAutoCalculate && (
                  <div>
                    <h2 className="section-title"><Calculator size={18} /> شرائح التوزيع</h2>
                    <div style={{ background: 'var(--surface-light)', padding: '0.5rem', borderRadius: '12px', display: 'flex', gap: '0.5rem', marginBottom: '1.5rem' }}>
                      <button type="button" className={`btn btn-sm ${distributionMode === 'age' ? 'btn-primary' : 'btn-ghost'}`} style={{ flex: 1 }} onClick={() => setDistributionMode('age')}>
                        <Baby size={16} /> حسب السن
                      </button>
                      <button type="button" className={`btn btn-sm ${distributionMode === 'school_stage' ? 'btn-primary' : 'btn-ghost'}`} style={{ flex: 1 }} onClick={() => setDistributionMode('school_stage')}>
                        <GraduationCap size={16} /> حسب الفصل
                      </button>
                    </div>

                    {distributionMode === 'age' ? (
                      <div className="flex flex-col gap-4">
                        {ageBrackets.map((b, i) => (
                          <div key={i} className="glass-card" style={{ padding: '1rem', borderLeft: '3px solid var(--primary)', position: 'relative' }}>
                            <button type="button" className="btn btn-ghost text-error" style={{ position: 'absolute', top: '0.5rem', left: '0.5rem', width: 28, height: 28, padding: 0 }} onClick={() => setAgeBrackets(ageBrackets.filter((_, idx) => idx !== i))}>✕</button>
                            <label style={{ fontSize: '0.75rem', fontWeight: 800, color: 'var(--primary)', display: 'block', marginBottom: '8px' }}>الشريحة #{i+1}</label>
                            <div className="grid grid-cols-2 gap-3">
                              <div><label style={{ fontSize: '0.65rem' }}>من عمر</label><input type="number" className="form-input" style={{ padding: '6px 10px' }} value={b.from ?? ''} onChange={e => { const nb = [...ageBrackets]; nb[i].from = handleNumChange(e.target.value); setAgeBrackets(nb); }}/></div>
                              <div><label style={{ fontSize: '0.65rem' }}>إلى عمر</label><input type="number" className="form-input" style={{ padding: '6px 10px' }} value={b.to ?? ''} onChange={e => { const nb = [...ageBrackets]; nb[i].to = handleNumChange(e.target.value); setAgeBrackets(nb); }}/></div>
                              <div className="col-span-2"><label style={{ fontSize: '0.65rem' }}>المبلغ المخصص (ج.م)</label><input type="number" className="form-input" style={{ padding: '6px 10px', fontWeight: 'bold', color: 'var(--primary-dark)' }} value={b.amount ?? ''} onChange={e => { const nb = [...ageBrackets]; nb[i].amount = handleNumChange(e.target.value); setAgeBrackets(nb); }}/></div>
                            </div>
                          </div>
                        ))}
                        <button type="button" className="btn btn-primary btn-sm w-full" onClick={() => setAgeBrackets([...ageBrackets, { from: '', to: '', amount: '' }])}><Plus size={16}/> إضافة شريحة</button>
                      </div>
                    ) : (
                      <div className="flex flex-col gap-4">
                        {stageBrackets.map((b, i) => (
                          <div key={i} className="glass-card" style={{ padding: '1rem', borderLeft: '3px solid var(--primary)', position: 'relative' }}>
                            <button type="button" className="btn btn-ghost text-error" style={{ position: 'absolute', top: '0.5rem', left: '0.5rem', width: 28, height: 28, padding: 0 }} onClick={() => setStageBrackets(stageBrackets.filter((_, idx) => idx !== i))}>✕</button>
                            <label style={{ fontSize: '0.75rem', fontWeight: 800, color: 'var(--primary)', display: 'block', marginBottom: '8px' }}>الشريحة #{i+1}</label>
                            <div className="grid grid-cols-2 gap-3">
                              <div className="col-span-2"><label style={{ fontSize: '0.65rem' }}>من الصف</label><select className="form-select" style={{ padding: '6px 10px' }} value={b.fromGrade || 1} onChange={e => { const nb = [...stageBrackets]; nb[i].fromGrade = Number(e.target.value); delete nb[i].stage; setStageBrackets(nb); }}>{GRADES.map(g=><option key={g.value} value={g.value}>{g.label}</option>)}</select></div>
                              <div className="col-span-2"><label style={{ fontSize: '0.65rem' }}>إلى الصف</label><select className="form-select" style={{ padding: '6px 10px' }} value={b.toGrade || 12} onChange={e => { const nb = [...stageBrackets]; nb[i].toGrade = Number(e.target.value); delete nb[i].stage; setStageBrackets(nb); }}>{GRADES.map(g=><option key={g.value} value={g.value}>{g.label}</option>)}</select></div>
                              <div className="col-span-2"><label style={{ fontSize: '0.65rem' }}>المبلغ المخصص (ج.م)</label><input type="number" className="form-input" style={{ padding: '6px 10px', fontWeight: 'bold', color: 'var(--primary-dark)' }} value={b.amount ?? ''} onChange={e => { const nb = [...stageBrackets]; nb[i].amount = handleNumChange(e.target.value); setStageBrackets(nb); }}/></div>
                            </div>
                          </div>
                        ))}
                        <button type="button" className="btn btn-primary btn-sm w-full" onClick={() => setStageBrackets([...stageBrackets, { fromGrade: 1, toGrade: 12, amount: '' }])}><Plus size={16}/> إضافة شريحة</button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </motion.div>
          )}

          {/* STEP 3: Review */}
          {currentStep === 3 && (
            <motion.div key="step3" initial={{ x: -20, opacity: 0 }} animate={{ x: 0, opacity: 1 }} exit={{ x: 20, opacity: 0 }}>
              <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
                <div style={{ display: 'inline-flex', width: 64, height: 64, borderRadius: '50%', background: 'linear-gradient(135deg, var(--gold) 0%, var(--gold-light) 100%)', color: 'white', alignItems: 'center', justifyContent: 'center', marginBottom: '1rem', boxShadow: '0 8px 16px rgba(212,175,55,0.3)' }}>
                  <Save size={32} />
                </div>
                <h2 style={{ fontSize: '1.5rem', fontWeight: 900, color: 'var(--primary-dark)' }}>جاهز للحفظ!</h2>
                <p style={{ color: 'var(--text-muted)' }}>يرجى مراجعة تفاصيل و ميزانية الحملة قبل إنشاءها في المنظومة.</p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="glass-card" style={{ padding: '1.5rem', background: 'white' }}>
                  <h3 style={{ fontSize: '0.85rem', fontWeight: 800, color: 'var(--primary-dark)', marginBottom: '1rem', borderBottom: '1px solid var(--border)', paddingBottom: '0.5rem' }}>ملخص البيانات</h3>
                  <div style={{ display: 'grid', gap: '0.75rem', fontSize: '0.85rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}><span style={{ color: 'var(--text-muted)' }}>الاسم:</span> <strong style={{ textAlign: 'left' }}>{name}</strong></div>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}><span style={{ color: 'var(--text-muted)' }}>النوع:</span> <strong>{type === 'financial' ? 'مساعدات مالية' : 'أخرى'}</strong></div>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}><span style={{ color: 'var(--text-muted)' }}>الفئة:</span> <strong>{isOrphansOnly ? 'الأيتام فقط' : 'جميع المستحقين'}</strong></div>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}><span style={{ color: 'var(--text-muted)' }}>التاريخ:</span> <strong>{startDate} {endDate ? `إلى ${endDate}` : ''}</strong></div>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}><span style={{ color: 'var(--text-muted)' }}>طريقة الحساب:</span> <strong>{isAutoCalculate ? 'تلقائي (معقد)' : 'ثابت مبسط'}</strong></div>
                  </div>
                </div>

                <div className="glass-card" style={{ padding: '1.5rem', background: 'linear-gradient(135deg, var(--primary-dark) 0%, var(--primary) 100%)', color: 'white', border: 'none' }}>
                  <h3 style={{ fontSize: '0.85rem', fontWeight: 800, color: 'rgba(255,255,255,0.8)', marginBottom: '1.5rem' }}>الحسبة الإجمالية المتوقعة</h3>
                  
                  <div style={{ textAlign: 'center', marginBottom: '1.5rem' }}>
                    <div style={{ fontSize: '0.8rem', opacity: 0.8, marginBottom: '0.25rem' }}>الميزانية المقدرة</div>
                    <div style={{ fontSize: '2.5rem', fontWeight: 900, lineHeight: 1, letterSpacing: '-1px' }}>
                      {isAutoCalculate ? budgetEstimate.toLocaleString() : (Number(amountPerFamily) * (beneficiariesCount || 1)).toLocaleString()} 
                      <span style={{ fontSize: '1rem', fontWeight: 600, marginRight: '6px' }}>ج.م</span>
                    </div>
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'space-between', background: 'rgba(255,255,255,0.1)', padding: '1rem', borderRadius: '12px' }}>
                    <div style={{ textAlign: 'center' }}>
                      <div style={{ fontSize: '0.7rem', opacity: 0.8 }}>الأسر المستهدفة</div>
                      <div style={{ fontSize: '1.2rem', fontWeight: 800 }}>{beneficiariesCount}</div>
                    </div>
                    <div style={{ width: 1, background: 'rgba(255,255,255,0.2)' }} />
                    <div style={{ textAlign: 'center' }}>
                      <div style={{ fontSize: '0.7rem', opacity: 0.8 }}>الأطفال / الأفراد</div>
                      <div style={{ fontSize: '1.2rem', fontWeight: 800 }}>{isOrphansOnly ? children.filter(c => c.is_orphan).length : children.length}</div>
                    </div>
                  </div>
                </div>
                <div className="glass-card col-span-1 md:col-span-2" style={{ padding: '1.5rem', background: 'white', marginTop: '1rem' }}>
                  <label className="form-label" style={{ fontWeight: 800, color: 'var(--primary-dark)' }}>حالة الحملة النهائية</label>
                  <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '1rem' }}>حدد حالة الحملة عند الحفظ (نشرها للمتطوعين أو إبقاؤها كمسودة)</p>
                  <select className="form-select" value={status} onChange={e => setStatus(e.target.value as CampaignStatus)}>
                    <option value="draft">📁 مسودة (تحت التخطيط)</option>
                    <option value="active">🚀 نشطة (بدأ التوزيع الآن)</option>
                    <option value="completed">✅ منتهية (إغلاق الأرشفة)</option>
                    <option value="paused">⏸️ متوقفة مؤقتاً</option>
                  </select>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Wizard Footer Controls */}
        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '2rem', paddingTop: '1.5rem', borderTop: '1px solid var(--border)' }}>
          <button 
            type="button" 
            className="btn btn-ghost" 
            onClick={() => currentStep > 1 ? setCurrentStep(c => c - 1) : navigate(-1)}
            disabled={saving}
          >
            {currentStep > 1 ? <><ChevronRight size={18}/> السابق</> : 'إلغاء'}
          </button>
          
          {currentStep < 3 ? (
            <button type="button" className="btn btn-primary" onClick={handleNextStep}>
              التالي <ChevronLeft size={18}/>
            </button>
          ) : (
            <button type="button" className="btn btn-primary" style={{ background: 'var(--gold)' }} onClick={handleSubmit} disabled={saving}>
              {saving ? 'جاري الحفظ...' : isEdit ? 'حفظ التحديث 🚀' : 'إنشاء الحملة 🚀'}
            </button>
          )}
        </div>
      </div>
      
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
      `}</style>
    </div>
  );
}
