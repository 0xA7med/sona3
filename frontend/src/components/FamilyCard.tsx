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

  const statusClass = assignment.status === 'completed' ? 'status-done' 
    : isLockedByOther ? 'status-locked' 
    : 'status-pending';

  const badgeClass = assignment.status === 'completed' ? 'badge-done'
    : isLockedByOther ? 'badge-locked'
    : 'badge-pending';

  const statusLabel = assignment.status === 'completed' ? 'تم التحويل ✅'
    : isLockedByOther ? `قيد العمل 🔒`
    : 'لم تُحوَّل ⏳';

  // Calculate total amount (base + commission)
  // Since we don't have the exact campaign logic here yet, we'll use a placeholder or derived value
  // In the real app, this should come from the assignment/family data
  const totalAmount = (family as any).total_amount || 0;

  return (
    <motion.div
      className={`mother-card ${statusClass}`}
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05 }}
      onClick={() => handleAction('view')}
    >
      <div className="mc-top">
        <div className="mc-info">
          <div className="mc-name">{family.mother_name}</div>
          <div className="mc-phone">
            <span>📱</span>
            <span>{family.phone || 'بدون هاتف'}</span>
          </div>
        </div>
        <div className={`status-badge ${badgeClass}`}>
          {statusLabel}
        </div>
      </div>

      <div className="mc-bottom">
        <div className="mc-children-count">
          <span>👨‍👩‍👧</span>
          <span>{family._children_count || 0} أطفال</span>
          <span style={{ margin: '0 4px', opacity: 0.3 }}>|</span>
          <span style={{ fontSize: '0.7rem', opacity: 0.8 }}>{family.district}</span>
        </div>

        <div className="mc-amount-chip">
          {totalAmount} <span style={{ fontSize: '0.65rem', fontWeight: 700 }}>ج.م</span>
        </div>
      </div>

      {isLockedByOther && (
        <div className="mc-by-line">
          🔒 تعمل عليها الآن: <b>{lock?.locked_by_name}</b>
        </div>
      )}
      
      {isLockedByMe && !assignment.status.includes('completed') && (
        <div className="mc-by-line" style={{ color: 'var(--green)', borderTopColor: 'var(--green-mid)' }}>
          ⭐️ أنتِ تعملين على هذا الملف الآن
        </div>
      )}
    </motion.div>
  );
}
