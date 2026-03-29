import { motion, AnimatePresence } from 'framer-motion';
import { Phone, MapPin, Users, X, Check, ArrowRight, ExternalLink } from 'lucide-react';
import type { CaseAssignment } from '../types';

interface FamilyDetailProps {
  assignment: CaseAssignment;
  isOpen: boolean;
  onClose: () => void;
  onAction: (action: 'no_answer' | 'unreachable' | 'completed') => void;
}

export default function FamilyDetail({
  assignment,
  isOpen,
  onClose,
  onAction
}: FamilyDetailProps) {
  const { family } = assignment;
  if (!family) return null;

  // Calculate total amount (base + commission)
  const totalAmount = (family as any).total_amount || 0;
  const commission = totalAmount > 500 ? 10 : 5;

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            className="modal-backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            style={{
              position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 1000,
              backdropFilter: 'blur(4px)'
            }}
          />

          {/* Sheet */}
          <motion.div
            className="screen active"
            initial={{ y: '100vw' }}
            animate={{ y: 0 }}
            exit={{ y: '100vw' }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            style={{
              position: 'fixed', bottom: 0, left: 0, right: 0, top: '40px',
              background: 'var(--gray-50)', zIndex: 1001,
              borderTopLeftRadius: '24px', borderTopRightRadius: '24px',
              overflowY: 'auto', paddingBottom: 'env(safe-area-inset-bottom)'
            }}
          >
            {/* Handle */}
            <div style={{ width: 40, height: 4, background: 'var(--gray-300)', borderRadius: 2, margin: '12px auto' }} />

            <div style={{ padding: '0 16px 24px' }}>
              <button 
                className="back-btn" 
                onClick={onClose}
                style={{ marginBottom: '16px' }}
              >
                <ArrowRight size={18} /> رجوع للمهام
              </button>

              {/* Hero */}
              <div className="detail-hero">
                <div className="dh-avatar">👩‍👧</div>
                <div className="dh-name">{family.mother_name}</div>
                <div className="dh-phone">📱 {family.phone}</div>

                <div className="dh-total-box">
                  <div className="dh-total-label">إجمالي المبلغ المستحق</div>
                  <div className="dh-total-amount">{totalAmount} ج.م</div>
                  <div className="dh-total-breakdown">
                     شامل عمولة التحويل ({commission} ج)
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="action-row">
                <button 
                  className="btn btn-ghost" 
                  style={{ background: 'var(--white)', border: '1px solid var(--gray-200)' }}
                  onClick={() => onAction('no_answer')}
                >
                  📞 لم يرد
                </button>
                <button 
                  className="btn btn-ghost"
                  style={{ background: 'var(--white)', border: '1px solid var(--gray-200)' }}
                  onClick={() => onAction('unreachable')}
                >
                  🚫 مغلق
                </button>
              </div>

              <button 
                className="btn btn-primary mb-md"
                onClick={() => onAction('completed')}
                style={{ display: 'flex', gap: '8px' }}
              >
                <Check size={20} /> تم التحويل بنجاح
              </button>

              {/* Children List */}
              <div className="section-title mb-sm">👨‍👩‍👧 أفراد العائلة المستفيدون</div>
              <div className="children-card">
                <div className="children-card-header">
                  <div className="children-card-title">قائمة الأبناء</div>
                  <div className="section-count">{family.children?.length || 0}</div>
                </div>
                
                {(family.children ?? []).map((child: any) => (
                  <div key={child.id} className="child-row-item">
                    <div className="child-row-info">
                      <div className="child-row-name">{child.child_name || 'طفل(ة)'}</div>
                      <div className="child-row-meta">
                        <span>🎂 {child.age} سنوات</span>
                        <span>•</span>
                        <span>🎓 {child.school_stage || 'غير محدد'}</span>
                      </div>
                    </div>
                    <div className="child-row-amount">
                      {child.amount || 0} ج
                    </div>
                  </div>
                ))}
              </div>

              {/* Info List */}
              <div className="section-title mb-sm">📍 بيانات السكن والتواصل</div>
              <div className="info-list">
                <div className="info-row">
                  <div className="info-label">المحافظة</div>
                  <div className="info-value">{family.governorate}</div>
                </div>
                <div className="info-row">
                  <div className="info-label">المركز/المنطقة</div>
                  <div className="info-value">{family.district}</div>
                </div>
                <div className="info-row">
                  <div className="info-label">العنوان بالتفصيل</div>
                  <div className="info-value">{family.address}</div>
                </div>
                <div className="info-row">
                  <div className="info-label">رقم الهاتف</div>
                  <div className="info-value" dir="ltr">{family.phone}</div>
                </div>
              </div>

              {/* Notes */}
              {family.notes && (
                <div className="breakdown-box">
                  <div className="breakdown-box-title">📝 ملاحظات إضافية</div>
                  <div style={{ fontSize: '0.85rem', color: 'var(--gray-700)', lineHeight: 1.5 }}>
                    {family.notes}
                  </div>
                </div>
              )}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
