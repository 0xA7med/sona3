import { useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { parseNationalID, GOVERNORATES } from '../types';
import type { NIDData } from '../types';

interface NIDInputProps {
  value: string;
  onChange: (val: string, data: NIDData) => void;
  className?: string;
}

const BADGE_LABELS: Record<string, string> = {
  age:          '🎂',
  gender:       '👤',
  governorate:  '📍',
  dateOfBirth:  '📅',
};

const GENDER_LABEL = { M: 'ذكر', F: 'أنثى' };

export default function NIDInput({ value, onChange, className = '' }: NIDInputProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const nidData  = (value?.length ?? 0) === 14 ? parseNationalID(value) : null;

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value.replace(/\D/g, '').slice(0, 14);
    const parsed = raw.length === 14 ? parseNationalID(raw) : { valid: false };
    onChange(raw, parsed as NIDData);
  };

  const isValid   = nidData?.valid === true;
  const isInvalid = value.length === 14 && !isValid;

  return (
    <div className={`nid-input-wrapper ${className}`}>
      <input
        ref={inputRef}
        type="text"
        inputMode="numeric"
        pattern="\d*"
        maxLength={14}
        value={value}
        onChange={handleChange}
        placeholder="أدخل الرقم القومي (14 رقم)"
        className="form-input form-input-lg"
        dir="ltr"
        style={{
          borderColor: isValid ? 'var(--primary)' : isInvalid ? 'var(--error)' : undefined,
          boxShadow: isValid
            ? '0 0 0 3px rgba(6,143,100,0.12)'
            : isInvalid
            ? '0 0 0 3px rgba(239,68,68,0.12)'
            : undefined,
          letterSpacing: '0.06em',
          fontWeight: 600,
        }}
      />

      {/* Progress bar */}
      <div style={{ height: 3, background: '#e8f3ef', borderRadius: '999px', marginTop: 4, overflow: 'hidden' }}>
        <motion.div
          style={{
            height: '100%',
            background: isInvalid ? 'var(--error)' : 'linear-gradient(90deg, var(--primary), var(--gold))',
            borderRadius: '999px',
          }}
          animate={{ width: `${(value.length / 14) * 100}%` }}
          transition={{ type: 'spring', stiffness: 200, damping: 30 }}
        />
      </div>
      <div style={{ fontSize: '0.72rem', color: 'var(--text-light)', textAlign: 'left', marginTop: 2 }}>
        {value.length} / 14
      </div>

      {/* Extracted badges */}
      <AnimatePresence>
        {isValid && nidData && (
          <motion.div
            className="nid-badges"
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ type: 'spring', stiffness: 300, damping: 28 }}
          >
            {nidData.age !== undefined && (
              <span className="nid-badge">🎂 {nidData.age} سنة</span>
            )}
            {nidData.gender && (
              <span className="nid-badge">👤 {GENDER_LABEL[nidData.gender]}</span>
            )}
            {nidData.governorate && (
              <span className="nid-badge">📍 {nidData.governorate}</span>
            )}
            {nidData.dateOfBirth && (
              <span className="nid-badge">
                📅 {nidData.dateOfBirth.toLocaleDateString('ar-EG', { year: 'numeric', month: 'long', day: 'numeric' })}
              </span>
            )}
          </motion.div>
        )}
        {isInvalid && (
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            style={{ fontSize: '0.8rem', color: 'var(--error)', marginTop: '0.4rem' }}
          >
            ⚠️ الرقم القومي غير صحيح — يرجى المراجعة
          </motion.p>
        )}
      </AnimatePresence>
    </div>
  );
}
