import { motion, AnimatePresence } from 'framer-motion';
import { AlertCircle, X } from 'lucide-react';

interface ConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  type?: 'danger' | 'primary';
  loading?: boolean;
}

export default function ConfirmModal({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  confirmText = 'تأكيد',
  cancelText = 'إلغاء',
  type = 'primary',
  loading = false
}: ConfirmModalProps) {
  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div style={{ position: 'fixed', inset: 0, zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}>
        {/* Backdrop */}
        <motion.div
           initial={{ opacity: 0 }}
           animate={{ opacity: 1 }}
           exit={{ opacity: 0 }}
           onClick={onClose}
           style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.4)', backdropFilter: 'blur(8px)' }}
        />

        {/* Modal body */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 10 }}
          className="card"
          style={{ width: '100%', maxWidth: '400px', padding: '1.5rem', position: 'relative', zIndex: 1, background: 'white', borderRadius: '24px', boxShadow: '0 20px 40px rgba(0,0,0,0.15)' }}
        >
          <button 
            onClick={onClose} 
            style={{ position: 'absolute', top: '1rem', right: '1rem', border: 'none', background: 'none', color: 'var(--text-light)', cursor: 'pointer' }}
          >
            <X size={20} />
          </button>

          <div style={{ textAlign: 'center', marginBottom: '1.5rem' }}>
            <div style={{ 
              width: '56px', height: '56px', borderRadius: '50%', 
              background: type === 'danger' ? 'rgba(239,68,68,0.1)' : 'rgba(212,175,55,0.1)',
              color: type === 'danger' ? '#ef4444' : 'var(--primary)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              margin: '0 auto 1.25rem'
            }}>
              <AlertCircle size={32} />
            </div>
            
            <h3 style={{ fontSize: '1.25rem', fontWeight: 900, marginBottom: '0.5rem', color: 'var(--text-dark)' }}>{title}</h3>
            <p style={{ color: 'var(--text-light)', fontSize: '0.95rem', lineHeight: 1.6 }}>{message}</p>
          </div>

          <div style={{ display: 'flex', gap: '0.75rem' }}>
            <button 
              className={`btn ${type === 'danger' ? 'btn-red' : 'btn-primary'}`} 
              onClick={() => { onConfirm(); onClose(); }}
              disabled={loading}
              style={{ flex: 1, padding: '0.8rem' }}
            >
              {confirmText}
            </button>
            <button 
              className="btn btn-ghost" 
              onClick={onClose}
              disabled={loading}
              style={{ flex: 1, padding: '0.8rem' }}
            >
              {cancelText}
            </button>
          </div>
        </motion.div>
      </div>
      
      <style>{`
        .btn-red { background: #ef4444; color: white; border: none; }
        .btn-red:hover { background: #dc2626; }
      `}</style>
    </AnimatePresence>
  );
}
