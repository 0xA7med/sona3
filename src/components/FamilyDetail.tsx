import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Phone, Check, ArrowRight, Zap } from 'lucide-react';
import type { CaseAssignment } from '../types';
import { calculateDistribution, formatDetailedGrade } from '../lib/distributionService';
import VolunteerFamilyEditModal from './VolunteerFamilyEditModal';

interface FamilyDetailProps {
  assignment: CaseAssignment;
  isOpen: boolean;
  currentUserId?: string;
  onClose: () => void;
  onAction: (action: 'no_answer' | 'unreachable' | 'completed') => void;
}

export default function FamilyDetail({
  assignment,
  isOpen,
  currentUserId,
  onClose,
  onAction
}: FamilyDetailProps) {
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const { family, campaign } = assignment;
  if (!family || !campaign) return null;

  const breakdown = calculateDistribution(family as any, campaign);
  const totalAmount = breakdown.total;
  const commission = breakdown.fee;
  
  const isMyAssignment = assignment.volunteer_id === currentUserId;

  const handleCall = () => {
    window.location.href = `tel:${family.phone}`;
  };

  const handleVodafoneTransfer = () => {
    // USSD: *9*7*phone*amount#
    // # needs to be encoded as %23 for tel: links
    const ussd = `*9*7*${family.phone}*${totalAmount}%23`;
    window.location.href = `tel:${ussd}`;
  };

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

              {/* Center Operations - Primary Actions */}
              <div style={{ background: 'var(--white)', padding: '1.25rem', borderRadius: '20px', border: '1px solid var(--border)', marginBottom: '1.5rem', boxShadow: '0 4px 12px rgba(0,0,0,0.03)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.9rem', fontWeight: 800, color: 'var(--primary)', marginBottom: '1rem' }}>
                  <Zap size={16} fill="var(--primary)" /> مركز العمليات السريع
                </div>
                
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', marginBottom: '1rem' }}>
                  <button 
                    className="btn" 
                    onClick={handleCall}
                    style={{ background: '#f0f9ff', color: '#0369a1', border: '1px solid #bae6fd', display: 'flex', flexDirection: 'column', padding: '0.75rem', height: 'auto', gap: '0.25rem' }}
                  >
                    <Phone size={20} />
                    <span style={{ fontSize: '0.75rem', fontWeight: 800 }}>اتصال هاتفى</span>
                  </button>
                  
                  <button 
                    className="btn" 
                    onClick={handleVodafoneTransfer}
                    style={{ background: '#fef2f2', color: '#b91c1c', border: '1px solid #fecaca', display: 'flex', flexDirection: 'column', padding: '0.75rem', height: 'auto', gap: '0.25rem' }}
                  >
                    <Zap size={20} />
                    <span style={{ fontSize: '0.7rem', fontWeight: 800 }}>فودافون كاش</span>
                  </button>
                </div>

                {isMyAssignment ? (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                    <button 
                      className="btn btn-primary w-full"
                      onClick={() => onAction('completed')}
                      style={{ height: '52px', fontSize: '1rem', fontWeight: 800 }}
                    >
                      <Check size={20} /> تأكيد إتمام التحويل
                    </button>
                    
                    <button 
                      className="btn btn-secondary w-full"
                      onClick={() => setIsEditModalOpen(true)}
                      style={{ height: '48px', fontSize: '0.9rem', fontWeight: 800, background: 'var(--white)', color: 'var(--primary)', border: '1px solid var(--primary)' }}
                    >
                      ✏️ تعديل بيانات الأسرة المعلقة
                    </button>
                    
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
                      <button 
                         className="btn btn-ghost" 
                         style={{ fontSize: '0.8rem', background: '#f8fafc', border: '1px solid #e2e8f0' }}
                         onClick={() => onAction('no_answer')}
                      >
                         📞 لم يرد
                      </button>
                      <button 
                         className="btn btn-ghost" 
                         style={{ fontSize: '0.8rem', background: '#f8fafc', border: '1px solid #e2e8f0' }}
                         onClick={() => onAction('unreachable')}
                      >
                         🚫 تعذر الوصول
                      </button>
                    </div>
                  </div>
                ) : (
                  <div style={{ textAlign: 'center', padding: '1rem', background: '#fffbeb', border: '1px solid #fef3c7', borderRadius: '12px', color: '#92400e', fontSize: '0.85rem', fontWeight: 700 }}>
                    🔒 هذه الحالة محجوزة لزميل آخر.<br/>يمكنك الاطلاع فقط.
                  </div>
                )}
              </div>

              {/* Children List */}
              <div className="section-title mb-sm">👨‍👩‍👧 تفاصيل استحقاق الأبناء</div>
              <div className="children-card">
                <div className="children-card-header">
                  <div className="children-card-title">توزيع المبالغ حسب الفئات</div>
                  <div className="section-count">{breakdown.childrenBreakdown.length}</div>
                </div>
                
                {breakdown.childrenBreakdown.map((child: any) => (
                  <div key={child.childId} className="child-row-item">
                    <div className="child-row-info">
                      <div className="child-row-name">{child.name || 'طفل(ة)'}</div>
                      <div className="child-row-meta">
                        <span>🎂 {child.age} سنوات</span>
                        <span>•</span>
                        <span>🎓 {formatDetailedGrade(child)}</span>
                      </div>
                    </div>
                    <div className="child-row-amount">
                      {child.amount.toLocaleString()} ج
                    </div>
                  </div>
                ))}

                <div 
                  style={{ 
                    marginTop: '1rem', padding: '0.75rem', 
                    background: 'var(--gray-50)', borderRadius: '12px',
                    display: 'flex', justifyContent: 'space-between',
                    fontSize: '0.85rem', fontWeight: 700, color: 'var(--gray-600)'
                  }}
                >
                  <span>رسوم خدمة التحويل</span>
                  <span>{breakdown.fee} ج.م</span>
                </div>

                <div 
                  style={{ 
                    marginTop: '0.5rem', padding: '1rem', 
                    background: 'var(--primary-light)', borderRadius: '14px',
                    display: 'flex', justifyContent: 'space-between',
                    fontSize: '1.1rem', fontWeight: 900, color: 'var(--primary-dark)'
                  }}
                >
                  <span>الإجمالي النهائي</span>
                  <span>{breakdown.total.toLocaleString()} ج.م</span>
                </div>
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
          
          {/* Volunteer Update Request Modal */}
          <VolunteerFamilyEditModal 
            isOpen={isEditModalOpen} 
            onClose={() => setIsEditModalOpen(false)} 
            family={family}
            currentAssignmentId={assignment.id}
          />
        </>
      )}
    </AnimatePresence>
  );
}
