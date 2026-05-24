import { motion, AnimatePresence } from 'framer-motion';
import { CheckCircle, AlertCircle, AlertTriangle, Info, X } from 'lucide-react';
import { useEffect, useState } from 'react';
import { setToastDispatch, clearToastDispatch } from '../lib/toast';

export type ToastType = 'success' | 'error' | 'warning' | 'info';

export interface Toast {
  id: string;
  type: ToastType;
  message: string;
  duration?: number;
}

const ICONS = {
  success: CheckCircle,
  error:   AlertCircle,
  warning: AlertTriangle,
  info:    Info,
};

function ToastItem({ toast: t, onDismiss }: { toast: Toast; onDismiss: () => void }) {
  const Icon = ICONS[t.type];

  useEffect(() => {
    const timer = setTimeout(onDismiss, t.duration ?? 3500);
    return () => clearTimeout(timer);
  }, [t.duration, onDismiss]);

  return (
    <motion.div
      layout
      initial={{ opacity: 0, x: -40, scale: 0.9 }}
      animate={{ opacity: 1, x: 0,  scale: 1 }}
      exit={{    opacity: 0, x: -40, scale: 0.8 }}
      transition={{ type: 'spring', stiffness: 500, damping: 30 }}
      className={`toast toast-${t.type}`}
      role="alert"
    >
      <Icon size={18} style={{ flexShrink: 0 }} />
      <span style={{ flex: 1, fontSize: '0.875rem' }}>{t.message}</span>
      <button
        onClick={onDismiss}
        style={{ background: 'none', border: 'none', color: 'inherit', cursor: 'pointer', opacity: 0.75, padding: '0 0.25rem' }}
      >
        <X size={15} />
      </button>
    </motion.div>
  );
}

export function ToastProvider() {
  const [toasts, setToasts] = useState<Toast[]>([]);

  useEffect(() => {
    setToastDispatch((t) => setToasts((prev) => [...prev.slice(-4), t]));
    return () => { clearToastDispatch(); };
  }, []);

  const dismiss = (id: string) => setToasts((prev) => prev.filter((t) => t.id !== id));

  return (
    <div className="toast-container" aria-live="polite">
      <AnimatePresence mode="popLayout">
        {toasts.map((t) => (
          <ToastItem key={t.id} toast={t} onDismiss={() => dismiss(t.id)} />
        ))}
      </AnimatePresence>
    </div>
  );
}
