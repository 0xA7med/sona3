import { motion } from 'framer-motion';
import { formatDistanceToNow } from 'date-fns';
import { ar } from 'date-fns/locale';
import type { CaseHistoryEvent } from '../types';
import { HISTORY_ACTION_LABELS } from '../types';

interface TimelineProps {
  events: CaseHistoryEvent[];
  loading?: boolean;
}

const ACTION_COLORS: Record<string, string> = {
  CREATED:          '#068f64',
  UPDATED:          '#3b82f6',
  CALLED_NO_ANSWER: '#f59e0b',
  UNREACHABLE:      '#ef4444',
  CONTACTED:        '#10b981',
  TRANSFER_DONE:    '#d4af37',
  ASSIGNED:         '#8b5cf6',
  NOTE_ADDED:       '#6b7280',
  STATUS_CHANGED:   '#0ea5e9',
};

export default function Timeline({ events, loading }: TimelineProps) {
  if (loading) {
    return (
      <div className="timeline">
        {[1, 2, 3].map(i => (
          <div key={i} className="timeline-item" style={{ opacity: 1 - i * 0.2 }}>
            <div className="skeleton" style={{ height: 70, borderRadius: 12, marginBottom: 4 }} />
          </div>
        ))}
      </div>
    );
  }

  if (!events.length) {
    return (
      <div className="empty-state">
        <div className="empty-state-icon">📋</div>
        <p style={{ fontWeight: 600, color: 'var(--text-muted)' }}>لا يوجد سجل بعد</p>
        <p style={{ fontSize: '0.8rem', color: 'var(--text-light)' }}>ستظهر هنا جميع التفاعلات مع هذه الأسرة</p>
      </div>
    );
  }

  return (
    <div className="timeline stagger">
      {events.map((event, i) => {
        const meta = HISTORY_ACTION_LABELS[event.action_type];
        const color = ACTION_COLORS[event.action_type] || 'var(--primary)';
        const timeAgo = formatDistanceToNow(new Date(event.created_at), { locale: ar, addSuffix: true });

        return (
          <motion.div
            key={event.id}
            className="timeline-item"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: i * 0.06, type: 'spring', stiffness: 300, damping: 28 }}
          >
            {/* Dot */}
            <div
              className="timeline-dot"
              style={{ background: color, boxShadow: `0 0 0 2px ${color}40` }}
            >
              <span style={{ fontSize: '8px' }}>{meta?.emoji}</span>
            </div>

            {/* Content */}
            <div className="timeline-content">
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.5rem', flexWrap: 'wrap' }}>
                <span style={{ fontWeight: 700, fontSize: '0.85rem', color }}>
                  {meta?.label ?? event.action_type}
                </span>
                <time className="timeline-meta">{timeAgo}</time>
              </div>

              {event.description && (
                <p style={{ marginTop: '0.3rem', fontSize: '0.82rem', color: 'var(--text-muted)', lineHeight: 1.5 }}>
                  {event.description}
                </p>
              )}

              {/* Metadata extras (amount, campaign, etc.) */}
              {event.metadata && Object.keys(event.metadata).length > 0 && (
                <div className="gap-wrap" style={{ marginTop: '0.5rem' }}>
                  {(event.metadata.amount as number) && (
                    <span className="nid-badge">💰 {(event.metadata.amount as number).toLocaleString('ar-EG')} ج.م</span>
                  )}
                  {(event.metadata.campaign_name as string) && (
                    <span className="nid-badge">📋 {event.metadata.campaign_name as string}</span>
                  )}
                </div>
              )}

              <div className="timeline-meta" style={{ marginTop: '0.4rem' }}>
                بواسطة: {event.user_name ?? 'مجهول'}
              </div>
            </div>
          </motion.div>
        );
      })}
    </div>
  );
}
