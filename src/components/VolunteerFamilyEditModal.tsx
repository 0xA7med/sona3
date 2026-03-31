import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Save, Plus, Trash2, AlertCircle } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuthStore } from '../store/authStore';
import { toast } from '../components/Toast';
import type { Family, Child } from '../types';

interface VolunteerFamilyEditModalProps {
  isOpen: boolean;
  onClose: () => void;
  family: Family;
  currentAssignmentId?: string;
}

export default function VolunteerFamilyEditModal({
  isOpen,
  onClose,
  family
}: VolunteerFamilyEditModalProps) {
  const { profile } = useAuthStore();
  const [submitting, setSubmitting] = useState(false);

  // Editable fields
  const [motherName, setMotherName] = useState(family.mother_name);
  const [phone, setPhone] = useState(family.phone || '');
  const [address, setAddress] = useState(family.address || '');
  const [children, setChildren] = useState<Partial<Child>[]>(family.children || []);

  const addChild = () => {
    setChildren(prev => [...prev, { child_name: '', age: 0, educational_grade: '' }]);
  };

  const updateChild = (index: number, updates: Partial<Child>) => {
    setChildren(prev => {
      const copy = [...prev];
      copy[index] = { ...copy[index], ...updates };
      return copy;
    });
  };

  const removeChild = (index: number) => {
    setChildren(prev => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile) return;

    setSubmitting(true);
    try {
      const requestedChanges = {
        family: {
          mother_name: motherName,
          phone: phone,
          address: address
        },
        children: children.map(c => ({
          id: c.id, // Include ID if it's an existing child
          child_name: c.child_name,
          age: c.age,
          educational_grade: c.educational_grade
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
              position: 'fixed', top: '10%', left: '5%', right: '5%', 
              maxHeight: '80vh', background: 'white', borderRadius: '24px', 
              zIndex: 2001, overflowY: 'auto', padding: '1.5rem',
              boxShadow: '0 20px 50px rgba(0,0,0,0.2)'
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
              <div>
                <h2 style={{ fontSize: '1.25rem', fontWeight: 900, color: 'var(--primary-dark)', margin: 0 }}>تعديل بيانات الأسرة</h2>
                <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>سيتم مراجعة هذه التعديلات من قبل الإدارة</p>
              </div>
              <button onClick={onClose} className="btn btn-ghost" style={{ padding: '0.5rem', borderRadius: '50%' }}><X size={24} /></button>
            </div>

            <form onSubmit={handleSubmit}>
              <div style={{ display: 'grid', gap: '1rem', marginBottom: '2rem' }}>
                <div className="form-group">
                  <label className="form-label">اسم الأم (الجديد)</label>
                  <input type="text" className="form-input" value={motherName} onChange={e => setMotherName(e.target.value)} required />
                </div>
                <div className="form-group">
                  <label className="form-label">رقم الهاتف (الجديد)</label>
                  <input type="tel" className="form-input" dir="ltr" value={phone} onChange={e => setPhone(e.target.value)} required />
                </div>
                <div className="form-group">
                  <label className="form-label">العنوان (الجديد)</label>
                  <input type="text" className="form-input" value={address} onChange={e => setAddress(e.target.value)} required />
                </div>
              </div>

              <div style={{ borderTop: '1px solid var(--border)', paddingTop: '1.5rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                  <h3 style={{ fontSize: '1rem', fontWeight: 800, margin: 0 }}>تحديث بيانات الأبناء</h3>
                  <button type="button" className="btn btn-primary btn-sm" onClick={addChild}><Plus size={16} /> إضافة ابن</button>
                </div>

                <div style={{ display: 'grid', gap: '1rem' }}>
                  {children.map((c, i) => (
                    <div key={i} style={{ background: 'var(--gray-50)', padding: '1rem', borderRadius: '16px', border: '1px solid var(--border)' }}>
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', marginBottom: '0.75rem' }}>
                        <div className="form-group">
                          <label className="form-label">الاسم</label>
                          <input type="text" className="form-input" value={c.child_name} onChange={e => updateChild(i, { child_name: e.target.value })} required />
                        </div>
                        <div className="form-group">
                          <label className="form-label">العمر</label>
                          <input type="number" className="form-input" value={c.age} onChange={e => updateChild(i, { age: Number(e.target.value) })} required />
                        </div>
                      </div>
                      <div className="form-group">
                        <label className="form-label">الفصل الدراسي (مثال: تانية إعدادي)</label>
                        <input 
                          type="text" 
                          className="form-input" 
                          placeholder="مثلاً: أولى ابتدائي، تانية إعدادي..." 
                          value={c.educational_grade || ''} 
                          onChange={e => updateChild(i, { educational_grade: e.target.value })} 
                        />
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '0.5rem' }}>
                        <button type="button" onClick={() => removeChild(i)} style={{ color: 'var(--error)', background: 'transparent', border: 'none', display: 'flex', alignItems: 'center', gap: '0.25rem', fontSize: '0.75rem', fontWeight: 700 }}>
                          <Trash2 size={14} /> حذف
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div style={{ 
                marginTop: '2rem', padding: '1rem', background: '#fffbeb', 
                borderRadius: '16px', border: '1px solid #fef3c7', color: '#92400e',
                fontSize: '0.8rem', display: 'flex', gap: '0.75rem', alignItems: 'flex-start'
              }}>
                <AlertCircle size={20} style={{ flexShrink: 0 }} />
                <div>
                  يتم إرسال هذه البيانات **كطلب معلق**. لن تظهر التغييرات للآخرين حتى يوافق عليها المسؤول.
                </div>
              </div>

              <div style={{ marginTop: '2rem', display: 'flex', gap: '1rem' }}>
                <button type="button" onClick={onClose} className="btn btn-ghost" style={{ flex: 1 }}>إلغاء</button>
                <button type="submit" disabled={submitting} className="btn btn-primary" style={{ flex: 2 }}>
                  {submitting ? 'جارٍ الإرسال...' : 'إرسال طلب التعديل'}
                  <Save size={18} style={{ marginLeft: '0.5rem' }} />
                </button>
              </div>
            </form>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
