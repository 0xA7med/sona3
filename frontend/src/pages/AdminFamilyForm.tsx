import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Save, AlertCircle, Plus, Trash2, ArrowRight } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuthStore } from '../store/authStore';
import { toast } from '../components/Toast';
import NIDInput from '../components/NIDInput';
import { 
  type Family, type Child, type NIDData, type SocialStatus, type SchoolStage,
  calcPriorityScore, SOCIAL_STATUS_LABELS, SCHOOL_STAGE_LABELS,
  parseNationalID
} from '../types';
import { detectSchoolStage } from '../lib/distributionService';

export default function AdminFamilyForm() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { profile } = useAuthStore();
  const isEdit = Boolean(id);

  const [loading, setLoading] = useState(isEdit);
  const [saving, setSaving]   = useState(false);

  // Form State
  const [motherName, setMotherName] = useState('');
  const [nationalId, setNationalId] = useState('');
  
  const [phone, setPhone] = useState('');
  const [governorate, setGovernorate] = useState('');
  const [district, setDistrict] = useState('');
  const [address, setAddress] = useState('');
  
  const [socialStatus, setSocialStatus] = useState<SocialStatus>('married');
  const [husbandName, setHusbandName] = useState('');
  const [husbandNid, setHusbandNid] = useState('');
  
  const [hasChronicIllness, setHasChronicIllness] = useState(false);
  const [isDisabled, setIsDisabled] = useState(false);
  const [medicalNotes, setMedicalNotes] = useState('');
  
  const [children, setChildren] = useState<Partial<Child>[]>([]);
  const [notes, setNotes] = useState('');

  // Live Priority Calculation
  const currentPriority = calcPriorityScore({
    social_status: socialStatus,
    has_chronic_illness: hasChronicIllness,
    is_disabled: isDisabled,
    children_count: children.length,
    vulnerability_score: children.filter(c => c.is_orphan).length * 10,
  });

  useEffect(() => {
    if (isEdit) fetchFamily();
  }, [id]);

  async function fetchFamily() {
    try {
      const { data, error } = await supabase
        .from('families')
        .select('*, children(*)')
        .eq('id', id)
        .single();

      if (error) throw error;
      
      const f = data as Family;
      setMotherName(f.mother_name);
      setNationalId(f.national_id || '');
      setPhone(f.phone || '');
      setGovernorate(f.governorate || '');
      setDistrict(f.district || '');
      setAddress(f.address || '');
      setSocialStatus(f.social_status);
      setHusbandName(f.husband_name || '');
      setHusbandNid(f.husband_national_id || '');
      setHasChronicIllness(f.has_chronic_illness);
      setIsDisabled(f.is_disabled);
      setMedicalNotes(f.medical_notes || '');
      setNotes(f.notes || '');
      setChildren(f.children || []);
      
    } catch (err) {
      toast('تعذر تحميل بيانات الأسرة', 'error');
      navigate('/admin/families');
    } finally {
      setLoading(false);
    }
  }

  const addChild = () => {
    setChildren(prev => [...prev, { child_name: '', age: 0, is_orphan: false, school_stage: 'not_in_school' }]);
  };

  const updateChild = (index: number, updates: Partial<Child>) => {
    setChildren(prev => {
      const copy = [...prev];
      let newChild = { ...copy[index], ...updates };

      // Auto-populate from NID if provided
      if (updates.national_id && updates.national_id.length === 14) {
        const data = parseNationalID(updates.national_id);
        if (data.valid && data.age !== undefined) {
          newChild.age = data.age;
          newChild.gender = data.gender;
          newChild.birth_date = data.dateOfBirth?.toISOString().split('T')[0];
          newChild.school_stage = detectSchoolStage(data.age);
        }
      }

      copy[index] = newChild;
      return copy;
    });
  };

  const removeChild = (index: number) => {
    setChildren(prev => prev.filter((_, i) => i !== index));
  };

  const handleNIDChange = (val: string, data: NIDData) => {
    setNationalId(val);
    if (data.valid && data.governorate && !governorate) {
      setGovernorate(data.governorate);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!motherName || nationalId.length !== 14) {
      toast('يرجى استكمال الاسم والرقم القومي الصحيح', 'warning');
      return;
    }
    
    setSaving(true);
    try {
      const familyData = {
        mother_name: motherName,
        national_id: nationalId,
        phone: phone || null,
        governorate,
        district,
        address,
        social_status: socialStatus,
        husband_name: husbandName || null,
        husband_national_id: husbandNid || null,
        has_chronic_illness: hasChronicIllness,
        is_disabled: isDisabled,
        medical_notes: medicalNotes,
        notes,
        priority_score: currentPriority,
      };

      let familyId = id;

      if (isEdit) {
        const { error } = await supabase.from('families').update(familyData).eq('id', id);
        if (error) throw error;
      } else {
        const { data, error } = await supabase.from('families').insert(familyData).select('id').single();
        if (error) throw error;
        familyId = data.id;
        
        // سجل الإنشاء
        await supabase.from('case_history').insert({
          family_id: familyId,
          user_id: profile?.id,
          user_name: profile?.full_name,
          action_type: 'CREATED',
          description: 'تم تسجيل العائلة في النظام'
        });
      }

      // أطفال (طريقة سريعة: حذف القديم وإضافة الجديد للتحديث)
      if (isEdit) {
        await supabase.from('children').delete().eq('family_id', familyId);
      }
      
      const childrenToInsert = children.filter(c => c.child_name).map(c => ({
        family_id: familyId,
        child_name: c.child_name,
        national_id: c.national_id || null,
        birth_date: c.birth_date || null,
        gender: c.gender || null,
        age: c.age || 0,
        school_stage: c.school_stage || 'not_in_school',
        is_orphan: c.is_orphan || false
      }));

      if (childrenToInsert.length > 0) {
        await supabase.from('children').insert(childrenToInsert);
      }

      toast(isEdit ? 'تم تحديث البيانات بنجاح' : 'تم إضافة الأسرة بنجاح', 'success');
      navigate('/admin/families');
      
    } catch (err: any) {
      toast(err.message || 'حدث خطأ أثناء الحفظ', 'error');
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className="page-content"><div className="skeleton" style={{ height: 400, borderRadius: 16 }} /></div>;

  return (
    <div className="page-content">
      <motion.div className="page-header" initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}>
        <div>
          <button className="btn btn-ghost btn-sm" style={{ padding: 0, marginBottom: '0.4rem' }} onClick={() => navigate(-1)}>
            <ArrowRight size={18} /> عودة
          </button>
          <h1 className="page-title">{isEdit ? 'تعديل بيانات الأسرة' : 'تسجيل أسرة جديدة'}</h1>
        </div>
        
        {/* Priority Indicator */}
        <div style={{ background: 'var(--surface)', padding: '0.75rem 1.25rem', borderRadius: '12px', border: '1px solid var(--border-light)', display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <div style={{ textAlign: 'left' }}>
            <div style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-light)' }}>نقاط الأولوية</div>
            <div style={{ fontSize: '1.25rem', fontWeight: 900, color: 'var(--primary)', lineHeight: 1 }}>{currentPriority}</div>
          </div>
          <div style={{ width: 40, height: 40, background: 'var(--primary-light)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--primary)' }}>
            <AlertCircle size={20} />
          </div>
        </div>
      </motion.div>

      <form onSubmit={handleSubmit} className="stagger">
        {/* البيانات الأساسية */}
        <motion.div className="glass-card" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
          <h2 style={{ fontSize: '1.1rem', fontWeight: 800, marginBottom: '1.25rem', color: 'var(--primary-dark)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <span style={{ width: 24, height: 24, borderRadius: '50%', background: 'var(--primary-light)', color: 'var(--primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.85rem' }}>1</span>
            البيانات الأساسية لرب/ربة الأسرة
          </h2>
          
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1.25rem' }}>
            <div className="form-group" style={{ margin: 0 }}>
              <label className="form-label">الاسم بالكامل</label>
              <input type="text" className="form-input" required value={motherName} onChange={e => setMotherName(e.target.value)} />
            </div>
            <div className="form-group" style={{ margin: 0 }}>
              <label className="form-label">الرقم القومي (14 رقم)</label>
              <NIDInput value={nationalId || ''} onChange={handleNIDChange} />
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1.25rem', marginTop: '1.25rem' }}>
            <div className="form-group" style={{ margin: 0 }}>
              <label className="form-label">الحالة الاجتماعية</label>
              <select className="form-select" value={socialStatus} onChange={e => setSocialStatus(e.target.value as SocialStatus)}>
                {Object.entries(SOCIAL_STATUS_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
              </select>
            </div>
            <div className="form-group" style={{ margin: 0 }}>
              <label className="form-label">رقم الهاتف</label>
              <input type="tel" className="form-input" dir="ltr" value={phone || ''} onChange={e => setPhone(e.target.value)} />
            </div>
          </div>

          {['married', 'divorced'].includes(socialStatus) && (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1.25rem', marginTop: '1.25rem', padding: '1rem', background: 'rgba(0,0,0,0.02)', borderRadius: '12px' }}>
              <div className="form-group" style={{ margin: 0 }}>
                <label className="form-label">اسم الزوج</label>
                <input type="text" className="form-input" value={husbandName || ''} onChange={e => setHusbandName(e.target.value)} />
              </div>
              <div className="form-group" style={{ margin: 0 }}>
                <label className="form-label">الرقم القومي للزوج</label>
                <input type="text" className="form-input" dir="ltr" maxLength={14} pattern="\d*" value={husbandNid || ''} onChange={e => setHusbandNid(e.target.value.replace(/\D/g, ''))} />
              </div>
            </div>
          )}
        </motion.div>

        {/* السكن والصحة */}
        <motion.div className="glass-card" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} style={{ marginTop: '1.5rem' }}>
          <h2 style={{ fontSize: '1.1rem', fontWeight: 800, marginBottom: '1.25rem', color: 'var(--primary-dark)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <span style={{ width: 24, height: 24, borderRadius: '50%', background: 'var(--primary-light)', color: 'var(--primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.85rem' }}>2</span>
            تفاصيل السكن والحالة الصحية
          </h2>
          
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1.25rem' }}>
            <div className="form-group" style={{ margin: 0 }}>
              <label className="form-label">المحافظة</label>
              <input type="text" className="form-input" value={governorate || ''} onChange={e => setGovernorate(e.target.value)} />
            </div>
            <div className="form-group" style={{ margin: 0 }}>
              <label className="form-label">المركز / الحي</label>
              <input type="text" className="form-input" value={district || ''} onChange={e => setDistrict(e.target.value)} />
            </div>
            <div className="form-group" style={{ margin: 0, gridColumn: '1 / -1' }}>
              <label className="form-label">العنوان التفصيلي</label>
              <input type="text" className="form-input" value={address || ''} onChange={e => setAddress(e.target.value)} />
            </div>
          </div>

          <div style={{ display: 'flex', gap: '2rem', marginTop: '1.5rem', flexWrap: 'wrap' }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', fontWeight: 600 }}>
              <input type="checkbox" checked={hasChronicIllness} onChange={e => setHasChronicIllness(e.target.checked)} style={{ width: 20, height: 20, accentColor: 'var(--primary)' }} />
              يوجد فرد مصاب بمرض مزمن
            </label>
            <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', fontWeight: 600 }}>
              <input type="checkbox" checked={isDisabled} onChange={e => setIsDisabled(e.target.checked)} style={{ width: 20, height: 20, accentColor: 'var(--primary)' }} />
              يوجد فرد من ذوي الهمم
            </label>
          </div>

          {(hasChronicIllness || isDisabled) && (
            <div className="form-group" style={{ margin: '1rem 0 0' }}>
              <label className="form-label">تفاصيل الحالة الصحية (الأدوية المطلوبة الخ)</label>
              <textarea className="form-input" rows={2} value={medicalNotes} onChange={e => setMedicalNotes(e.target.value)} />
            </div>
          )}
        </motion.div>

        {/* الأبناء */}
        <motion.div className="glass-card" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }} style={{ marginTop: '1.5rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
            <h2 style={{ fontSize: '1.1rem', fontWeight: 800, color: 'var(--primary-dark)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <span style={{ width: 24, height: 24, borderRadius: '50%', background: 'var(--primary-light)', color: 'var(--primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.85rem' }}>3</span>
              الأبناء والمُعالين ({children.length})
            </h2>
            <button type="button" className="btn btn-primary btn-sm" onClick={addChild}>
              <Plus size={16} /> إضافة ابن
            </button>
          </div>

          <AnimatePresence>
            {children.map((c, i) => (
              <motion.div key={i} initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} 
                style={{ background: 'var(--surface)', border: '1px solid var(--border-light)', padding: '1rem', borderRadius: '12px', marginBottom: '1rem' }}
              >
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '1rem', alignItems: 'end' }}>
                  <div className="form-group" style={{ margin: 0, flex: 2 }}>
                    <label className="form-label">الاسم بالكامل</label>
                    <input type="text" className="form-input" required value={c.child_name || ''} onChange={e => updateChild(i, { child_name: e.target.value })} />
                  </div>
                  <div className="form-group" style={{ margin: 0, flex: 2 }}>
                    <label className="form-label">الرقم القومي (اختياري)</label>
                    <input 
                      type="text" className="form-input" maxLength={14} placeholder="14 رقم"
                      value={c.national_id || ''} 
                      onChange={e => updateChild(i, { national_id: e.target.value.replace(/\D/g, '') })} 
                    />
                  </div>
                  <div className="form-group" style={{ margin: 0, flex: 0.8 }}>
                    <label className="form-label">العمر</label>
                    <input type="number" className="form-input" min={0} value={c.age} onChange={e => updateChild(i, { age: Number(e.target.value) })} />
                  </div>
                  <div className="form-group" style={{ margin: 0, flex: 2 }}>
                    <label className="form-label">المرحلة الدراسية</label>
                    <select className="form-select" value={c.school_stage} onChange={e => updateChild(i, { school_stage: e.target.value as SchoolStage })}>
                      {Object.entries(SCHOOL_STAGE_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                    </select>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', fontWeight: 600 }}>
                      <input type="checkbox" checked={c.is_orphan} onChange={e => updateChild(i, { is_orphan: e.target.checked })} style={{ width: 18, height: 18 }} />
                      يتيم
                    </label>
                    <button type="button" onClick={() => removeChild(i)} style={{ background: 'rgba(239,68,68,0.1)', color: 'var(--error)', border: 'none', padding: '0.6rem', borderRadius: '8px', cursor: 'pointer' }}>
                      <Trash2 size={18} />
                    </button>
                  </div>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
          {children.length === 0 && <p style={{ textAlign: 'center', color: 'var(--text-light)', fontSize: '0.85rem' }}>لا يوجد أبناء مضافين</p>}
        </motion.div>

        {/* الملاحظات */}
        <motion.div className="glass-card" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }} style={{ marginTop: '1.5rem', marginBottom: '2rem' }}>
          <div className="form-group" style={{ margin: 0 }}>
            <label className="form-label">ملاحظات إضافية عن الأسرة أو حالة البحث المتعمق</label>
            <textarea className="form-input" rows={4} value={notes} onChange={e => setNotes(e.target.value)} />
          </div>
        </motion.div>

        {/* Actions */}
        <div style={{ position: 'sticky', bottom: 0, background: 'rgba(237, 241, 239, 0.9)', backdropFilter: 'blur(10px)', padding: '1rem 0', display: 'flex', justifyContent: 'flex-end', gap: '1rem', borderTop: '1px solid var(--border-light)', zIndex: 10 }}>
          <button type="button" className="btn btn-ghost" onClick={() => navigate(-1)} disabled={saving}>إلغاء</button>
          <button type="submit" className="btn btn-primary btn-lg" disabled={saving}>
            {saving ? <span className="skeleton" style={{ width: 20, height: 20, borderRadius: '50%', background: 'transparent', border: '2px solid white', borderTopColor: 'transparent', animation: 'spin 1s linear infinite' }} /> : <Save size={20} />}
            {isEdit ? 'حفظ التعديلات' : 'إضافة الأسرة وقيدها'}
          </button>
        </div>
      </form>
    </div>
  );
}
