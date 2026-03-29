import { motion } from 'framer-motion';
import { Phone, MapPin, Lock, Users, Star, ChevronLeft } from 'lucide-react';
import type { CaseAssignment, CaseLock } from '../types';
import { SOCIAL_STATUS_LABELS, getPriorityLevel } from '../types';

interface FamilyCardProps {
  assignment: CaseAssignment;
  lock?: CaseLock | null;
  currentUserId?: string;
  onAction?: (action: 'no_answer' | 'unreachable' | 'completed' | 'view', assignmentId: string) => void;
  showQuickActions?: boolean;
  index?: number;
}

export default function FamilyCard({
  assignment,
  lock,
  currentUserId,
  onAction,
  showQuickActions = true,
  index = 0,
}: FamilyCardProps) {
  const { family } = assignment;
  if (!family) return null;

  const isLockedByOther = lock && lock.locked_by !== currentUserId;
  const isLockedByMe    = lock && lock.locked_by === currentUserId;
  const priority        = getPriorityLevel(family.priority_score);

  const handleAction = (action: Parameters<NonNullable<typeof onAction>>[0]) => {
    onAction?.(action, assignment.id);
  };

  return (
    <motion.div
      className={`case-card ${isLockedByOther ? 'locked' : ''}`}
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.04, type: 'spring', stiffness: 320, damping: 28 }}
      layout
    >
      {/* Lock overlay */}
      {isLockedByOther && (
        <div className="lock-badge animate-locked">
          <Lock size={11} />
          {lock.locked_by_name}
        </div>
      )}

      {/* Header */}
      <div className="case-card-header">
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.2rem', flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <span style={{ fontSize: '0.7rem', color: 'var(--text-light)', fontWeight: 600 }}>
              {family.sequential_id}
            </span>
            {isLockedByMe && (
              <span style={{ fontSize: '0.65rem', background: 'var(--primary-light)', color: 'var(--primary)', padding: '0.1rem 0.4rem', borderRadius: '9999px', fontWeight: 700 }}>
                لديك
              </span>
            )}
          </div>
          <h3 style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--text)' }} className="truncate-1">
            {family.mother_name}
          </h3>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '0.3rem', flexShrink: 0 }}>
          <span className={`priority-badge ${priority.css}`}>
            <Star size={10} />
            {priority.label}
          </span>
          <span style={{ fontSize: '0.72rem', color: 'var(--text-light)', fontWeight: 700 }}>
            {family.priority_score} نقطة
          </span>
        </div>
      </div>

      {/* Body */}
      <div className="case-card-body">
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
          {family.phone && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.85rem', color: 'var(--text-muted)' }}>
              <Phone size={14} style={{ flexShrink: 0, color: 'var(--primary)' }} />
              <span dir="ltr">{family.phone}</span>
            </div>
          )}
          {(family.governorate || family.district) && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.85rem', color: 'var(--text-muted)' }}>
              <MapPin size={14} style={{ flexShrink: 0, color: 'var(--primary)' }} />
              <span className="truncate-1">
                {[family.governorate, family.district].filter(Boolean).join(' — ')}
              </span>
            </div>
          )}
          {family._children_count !== undefined && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.85rem', color: 'var(--text-muted)' }}>
              <Users size={14} style={{ flexShrink: 0, color: 'var(--primary)' }} />
              <span>{family._children_count} أطفال</span>
            </div>
          )}
        </div>

        {/* Tags */}
        <div className="gap-wrap" style={{ marginTop: '0.75rem' }}>
          <span className="badge badge-pending">
            {SOCIAL_STATUS_LABELS[family.social_status]}
          </span>
          {family.has_chronic_illness && (
            <span className="badge" style={{ background: '#fff7ed', color: '#c2410c' }}>مريض مزمن</span>
          )}
          {family.is_disabled && (
            <span className="badge" style={{ background: '#faf5ff', color: '#7c3aed' }}>ذوي الهمم</span>
          )}
          {(family.children ?? []).some(c => c.is_orphan) && (
            <span className="badge" style={{ background: '#fef2f2', color: '#991b1b' }}>يتيم</span>
          )}
        </div>
      </div>

      {/* Quick Actions Footer */}
      {showQuickActions && !isLockedByOther && (
        <div className="case-card-footer">
          <button
            className="quick-btn quick-btn-warning"
            onClick={() => handleAction('no_answer')}
            title="جرس ولم يرد"
          >
            <span style={{ fontSize: '1rem' }}>📞</span>
            <span>لم يرد</span>
          </button>
          <button
            className="quick-btn quick-btn-error"
            onClick={() => handleAction('unreachable')}
            title="مغلق / تعذر التواصل"
          >
            <span style={{ fontSize: '1rem' }}>🚫</span>
            <span>مغلق</span>
          </button>
          <button
            className="quick-btn quick-btn-success"
            onClick={() => handleAction('completed')}
            title="تم التحويل"
          >
            <span style={{ fontSize: '1rem' }}>✅</span>
            <span>تم</span>
          </button>
          <button
            className="quick-btn quick-btn-info"
            onClick={() => handleAction('view')}
            title="عرض التفاصيل"
            style={{ marginRight: 'auto' }}
          >
            <ChevronLeft size={18} />
            <span>تفاصيل</span>
          </button>
        </div>
      )}

      {isLockedByOther && (
        <div className="case-card-footer" style={{ justifyContent: 'center', background: '#fff5f5' }}>
          <span style={{ fontSize: '0.78rem', color: '#991b1b', fontWeight: 600 }}>
            🔒 يعمل عليها {lock?.locked_by_name} الآن
          </span>
        </div>
      )}
    </motion.div>
  );
}
