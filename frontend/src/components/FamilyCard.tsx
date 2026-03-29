import { motion } from 'framer-motion';
import type { CaseAssignment, CaseLock } from '../types';
import { getPriorityLevel } from '../types';

interface FamilyCardProps {
  assignment: CaseAssignment;
  lock?: CaseLock | null;
  currentUserId?: string;
  onAction?: (action: 'no_answer' | 'unreachable' | 'completed' | 'view' | 'claim', assignmentId: string) => void;
  showQuickActions?: boolean;
  index?: number;
}

export default function FamilyCard({
  assignment,
  lock,
  currentUserId,
  onAction,
  index = 0,
}: FamilyCardProps) {
  const { family } = assignment;
  if (!family) return null;

  const isAssigned       = !!assignment.volunteer_id;
  const isAssignedToMe   = assignment.volunteer_id === currentUserId;
  const isAssignedToOther = isAssigned && !isAssignedToMe;
  const isLockedByOther   = !!lock && lock.locked_by !== currentUserId;
  
  const priority = getPriorityLevel(family.priority_score);
  
  const handleAction = (e: React.MouseEvent, action: Parameters<NonNullable<typeof onAction>>[0]) => {
    e.stopPropagation();
    onAction?.(action, assignment.id);
  };

  const statusClass = assignment.status === 'completed' ? 'status-done' 
    : (isAssignedToOther || isLockedByOther) ? 'status-locked' 
    : isAssignedToMe ? 'status-mine'
    : 'status-available';

  const badgeClass = assignment.status === 'completed' ? 'badge-done'
    : (isAssignedToOther || isLockedByOther) ? 'badge-locked'
    : isAssignedToMe ? 'badge-mine'
    : 'badge-available';

  const statusLabel = assignment.status === 'completed' ? 'تم التحويل ✅'
    : isLockedByOther ? `جارٍ العرض الآن 👁️‍🗨️`
    : isAssignedToOther ? `قيد التنفيذ 🔒`
    : isAssignedToMe ? 'موكلة إليك ⭐️'
    : 'متاحة للحجز 📥';

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
      onClick={() => onAction?.('view', assignment.id)}
    >
      <div className="mc-top">
        <div className="mc-info">
          <div className="mc-name">{family.mother_name}</div>
          <div className="mc-phone">
            <span>📱</span>
            <span>{family.phone || 'بدون هاتف'}</span>
          </div>
        </div>
        <div className={`status-badge ${badgeClass} ${priority.css}`}>
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

      {(isAssignedToOther || isLockedByOther) && (
        <div className="mc-by-line">
          🔒 قيد {isLockedByOther ? 'المراجعة' : 'التنفيذ'} بواسطة: <b>{lock?.locked_by_name || assignment.volunteer?.full_name || 'زميل آخر'}</b>
        </div>
      )}
      
      {isAssignedToMe && !assignment.status.includes('completed') && (
        <div className="mc-by-line" style={{ color: 'var(--green)', borderTopColor: 'rgba(0,0,0,0.05)', background: 'rgba(34, 197, 94, 0.05)' }}>
          ⭐️ هذه الحالة ضمن قائمة مهامك الحالية
        </div>
      )}

      {!isAssigned && (
        <div style={{ padding: '0.75rem', borderTop: '1px dashed var(--border)', marginTop: '0.5rem' }}>
          <button 
            className="btn btn-primary btn-sm w-full"
            onClick={(e) => handleAction(e, 'claim')}
          >
            📥 احجز هذه الحالة لى
          </button>
        </div>
      )}
    </motion.div>
  );
}
