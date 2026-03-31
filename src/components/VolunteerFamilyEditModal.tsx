import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Save, Plus, Trash2, AlertCircle, ChevronDown, User, Users, MapPin, ClipboardList } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuthStore } from '../store/authStore';
import { toast } from '../components/Toast';
import type { Family, Child, SocialStatus } from '../types';

interface VolunteerFamilyEditModalProps {
  isOpen: boolean;
  onClose: () => void;
  family: Family;
  currentAssignmentId?: string;
}

const SOCIAL_STATUS_OPTIONS: { value: SocialStatus; label: string }[] = [
  { value: 'married',  label: 'متزوجة' },
  { value: 'widow',    label: 'أرملة' },
  { value: 'divorced', label: 'مطلقة' },
  { value: 'single',   label: 'عزباء' },
  { value: 'unknown',  label: 'غير محدد' },
];

function CollapsibleSection({ 
  title, 
  icon: Icon, 
  children, 
  isOpen, 
  onToggle 
}: { 
  title: string; 
  icon: any; 
  children: React.ReactNode; 
  isOpen: boolean; 
  onToggle: () => void;
}) {
  return (
    <div style={{ border: '1px solid var(--border)', borderRadius: '16px', overflow: 'hidden', marginBottom: '0.75rem', background: 'var(--white)' }}>
      <button
        type="button"
        onClick={onToggle}
        style={{
          width: '100%', padding: '1rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          background: isOpen ? 'var(--primary-light)' : 'transparent', border: 'none', transition: 'all 0.2s'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', fontWeight: 800, color: isOpen ? 'var(--primary-dark)' : 'var(--text-main)' }}>
          <Icon size={20} />
          {title}
        </div>
        <ChevronDown size={20} style={{ transform: isOpen ? 'rotate(180deg)' : 'none', transition: 'transform 0.3s', color: 'var(--text-muted)' }} />
      </button>
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3 }}
          >
            <div style={{ padding: '1.25rem', borderTop: '1px solid var(--border)' }}>
              {children}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default function VolunteerFamilyEditModal({
  isOpen,
  onClose,
  family
}: VolunteerFamilyEditModalProps) {
  const { profile } = useAuthStore();
  const [submitting, setSubmitting] = useState(false);
  const [openSections, setOpenSections] = useState<Set<string>>(new Set(['mother']));

  // Form State
  const [formData, setFormData] = useState({
    mother_name: family.mother_name,
    national_id: family.national_id || '',
    phone: family.phone || '',
    social_status: family.social_status || ('unknown' as SocialStatus),
    has_chronic_illness: family.has_chronic_illness || false,
    is_disabled: family.is_disabled || false,
    husband_name: family.husband_name || '',
    husband_national_id: family.husband_national_id || '',
    governorate: family.governorate || '',
    district: family.district || '',
    address: family.address || '',
    notes: family.notes || '',
    medical_notes: family.medical_notes || ''
  });

  const [children, setChildren] = useState<Partial<Child>[]>(family.children || []);

  const toggleSection = (id: string) => {
    setOpenSections(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const updateChild = (index: number, updates: Partial<Child>) => {
    setChildren(prev => {
      const copy = [...prev];
      copy[index] = { ...copy[index], ...updates };
      return copy;
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile) return;

    setSubmitting(true);
    try {
      const requestedChanges = {
        family: formData,
        children: children.map(c => ({
          id: c.id,
          child_name: c.child_name,
          age: c.age,
          educational_grade: c.educational_grade || '',
          school_stage: c.school_stage || '',
          is_orphan: c.is_orphan || false,
        }))
      };

      const { error } = await supabase.from('data_update_requests').insert({
        family_id: family.id,
        volunteer_id: profile.id,
        requested_changes: requestedChanges,
        status: 'pending'
      });

      if (error) throw error;

      toast('تم إرسال طلب التعديل بنجاح وبانتظار موافقة الإدارة', 'success');
      onClose();
    } catch (err: any) {
      toast(err.message || 'حدث خطأ أثناء إرسال الطلب', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div 
            className="modal-backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', zIndex: 2000, backdropFilter: 'blur(8px)' }}
          />
          <motion.div 
            className="modal-content"
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            style={{ 
              position: 'fixed', top: '5%', left: '4%', right: '4%', bottom: '5%',
              background: 'var(--white)', borderRadius: '28px', 
              zIndex: 2001, overflowY: 'auto', padding: '1.25rem',
              boxShadow: '0 20px 50px rgba(0,0,0,0.3)',
              display: 'flex', flexDirection: 'column'
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem', flexShrink: 0 }}>
              <div>
                <h2 style={{ fontSize: '1.25rem', fontWeight: 900, color: 'var(--primary-dark)', margin: 0 }}>تعديل بيانات الأسرة ✏️</h2>
                <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>كود الأسرة: {family.sequential_id || family.id.slice(0, 8)}</p>
              </div>
              <button 
                type="button"
                onClick={onClose} 
                className="btn-ghost" 
                style={{ padding: '0.5rem', borderRadius: '50%', background: 'var(--gray-100)', border: 'none' }}
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSubmit} style={{ flex: 1, overflowY: 'auto', paddingBottom: '1rem' }}>
              <CollapsibleSection title="👤 معلومات الزوجة (الأم)" icon={User} isOpen={openSections.has('mother')} onToggle={() => toggleSection('mother')}>
                <div style={{ display: 'grid', gap: '1rem' }}>
                  <div className="form-group">
                    <label className="form-label">الاسم الكامل</label>
                    <input type="text" className="form-input" value={formData.mother_name} onChange={e => setFormData({...formData, mother_name: e.target.value})} required />
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                    <div className="form-group">
                      <label className="form-label">الرقم القومي</label>
                      <input type="text" className="form-input" value={formData.national_id} onChange={e => setFormData({...formData, national_id: e.target.value})} />
                    </div>
                    <div className="form-group">
                      <label className="form-label">رقم الهاتف</label>
                      <input type="tel" className="form-input" dir="ltr" value={formData.phone} onChange={e => setFormData({...formData, phone: e.target.value})} required />
                    </div>
                  </div>
                  <div className="form-group">
                    <label className="form-label">الحالة الاجتماعية</label>
                    <select className="form-input" value={formData.social_status} onChange={e => setFormData({...formData, social_status: e.target.value as SocialStatus})}>
                      {SOCIAL_STATUS_OPTIONS.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
                    </select>
                  </div>
                  <div style={{ display: 'flex', gap: '1rem' }}>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.85rem', fontWeight: 600 }}>
                      <input type="checkbox" checked={formData.has_chronic_illness} onChange={e => setFormData({...formData, has_chronic_illness: e.target.checked})} />
                      أمراض مزمنة
                    </label>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.85rem', fontWeight: 600 }}>
                      <input type="checkbox" checked={formData.is_disabled} onChange={e => setFormData({...formData, is_disabled: e.target.checked})} />
                      إعاقة / عجز
                    </label>
                  </div>
                </div>
              </CollapsibleSection>

              <CollapsibleSection title="🧔 معلومات الزوج (الأب)" icon={User} isOpen={openSections.has('husband')} onToggle={() => toggleSection('husband')}>
                <div style={{ display: 'grid', gap: '1rem' }}>
                  <div className="form-group">
                    <label className="form-label">اسم الزوج / الأب</label>
                    <input type="text" className="form-input" value={formData.husband_name} onChange={e => setFormData({...formData, husband_name: e.target.value})} />
                  </div>
                  <div className="form-group">
                    <label className="form-label">الرقم القومي للزوج</label>
                    <input type="text" className="form-input" value={formData.husband_national_id} onChange={e => setFormData({...formData, husband_national_id: e.target.value})} />
                  </div>
                </div>
              </CollapsibleSection>

              <CollapsibleSection title="📍 معلومات السكن والموقع" icon={MapPin} isOpen={openSections.has('location')} onToggle={() => toggleSection('location')}>
                <div style={{ display: 'grid', gap: '1rem' }}>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                    <div className="form-group">
                      <label className="form-label">المحافظة</label>
                      <input type="text" className="form-input" value={formData.governorate} onChange={e => setFormData({...formData, governorate: e.target.value})} />
                    </div>
                    <div className="form-group">
                      <label className="form-label">المركز / المنطقة</label>
                      <input type="text" className="form-input" value={formData.district} onChange={e => setFormData({...formData, district: e.target.value})} />
                    </div>
                  </div>
                  <div className="form-group">
                    <label className="form-label">العنوان بالتفصيل</label>
                    <input type="text" className="form-input" value={formData.address} onChange={e => setFormData({...formData, address: e.target.value})} />
                  </div>
                </div>
              </CollapsibleSection>

              <CollapsibleSection title="👧 معلومات الأبناء" icon={Users} isOpen={openSections.has('children')} onToggle={() => toggleSection('children')}>
                <div style={{ display: 'grid', gap: '1rem' }}>
                  {children.map((c, i) => (
                    <div key={i} style={{ background: 'var(--gray-50)', padding: '1rem', borderRadius: '16px', border: '1px solid var(--border)' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.75rem' }}>
                        <span style={{ fontWeight: 800, fontSize: '0.8rem', color: 'var(--primary)' }}>الابن #{i+1}</span>
                        <button type="button" onClick={() => setChildren(prev => prev.filter((_, idx) => idx !== i))} style={{ color: 'var(--error)', background: 'transparent', border: 'none' }}><Trash2 size={16} /></button>
                      </div>
                      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '0.75rem', marginBottom: '0.75rem' }}>
                        <input type="text" className="form-input" placeholder="الاسم" value={c.child_name || ''} onChange={e => updateChild(i, { child_name: e.target.value })} required />
                        <input type="number" className="form-input" placeholder="العمر" value={c.age || 0} onChange={e => updateChild(i, { age: Number(e.target.value) })} required />
                      </div>
                      <input type="text" className="form-input mb-sm" placeholder="الفصل الدراسي (مثال: تانية ابتدائي)" value={c.educational_grade || ''} onChange={e => updateChild(i, { educational_grade: e.target.value })} />
                      <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.8rem', fontWeight: 600 }}>
                        <input type="checkbox" checked={c.is_orphan || false} onChange={e => updateChild(i, { is_orphan: e.target.checked })} />
                        يتيم الأب
                      </label>
                    </div>
                  ))}
                  <button type="button" className="btn btn-ghost w-full" style={{ border: '1px dashed var(--primary)', color: 'var(--primary)', height: '44px' }} onClick={() => setChildren([...children, { child_name: '', age: 0, is_orphan: false }])}>
                    <Plus size={18} /> إضافة ابن آخر
                  </button>
                </div>
              </CollapsibleSection>

              <CollapsibleSection title="📝 ملاحظات إضافية" icon={ClipboardList} isOpen={openSections.has('notes')} onToggle={() => toggleSection('notes')}>
                <div style={{ display: 'grid', gap: '1rem' }}>
                  <div className="form-group">
                    <label className="form-label">ملاحظات اجتماعية / عامة</label>
                    <textarea className="form-input" rows={3} value={formData.notes || ''} onChange={e => setFormData({...formData, notes: e.target.value})} />
                  </div>
                  <div className="form-group">
                    <label className="form-label">ملاحظات طبية</label>
                    <textarea className="form-input" rows={2} value={formData.medical_notes || ''} onChange={e => setFormData({...formData, medical_notes: e.target.value})} />
                  </div>
                </div>
              </CollapsibleSection>

              <div style={{ 
                marginTop: '1.5rem', padding: '1rem', background: '#fff7ed', 
                borderRadius: '16px', border: '1px solid #ffedd5', color: '#9a3412',
                fontSize: '0.75rem', display: 'flex', gap: '0.6rem', alignItems: 'flex-start'
              }}>
                <AlertCircle size={18} style={{ flexShrink: 0 }} />
                <span>سيتم مراجعة هذه البيانات من قبل مدير النظام قبل اعتمادها رسمياً في سجلات الجمعية.</span>
              </div>
            </form>

            <div style={{ display: 'flex', gap: '0.75rem', marginTop: '1.25rem', paddingTop: '1rem', borderTop: '1px solid var(--border)', flexShrink: 0 }}>
              <button type="button" onClick={onClose} className="btn-ghost" style={{ flex: 1, height: '48px', fontWeight: 700, border: 'none', background: 'transparent' }}>إلغاء</button>
              <button type="button" onClick={handleSubmit} disabled={submitting} className="btn btn-primary" style={{ flex: 2, height: '48px', fontWeight: 800 }}>
                {submitting ? 'جارٍ الإرسال...' : 'إرسال التعديلات'}
                <Save size={20} style={{ marginLeft: '0.5rem' }} />
              </button>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
