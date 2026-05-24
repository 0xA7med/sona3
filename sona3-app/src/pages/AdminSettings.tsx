import { useState } from 'react';
import { motion } from 'framer-motion';
import { Save, Bell, Database, Globe } from 'lucide-react';
import { toast } from '../lib/toast';

export default function AdminSettings() {
  const [saving, setSaving] = useState(false);
  
  const handleSave = () => {
    setSaving(true);
    setTimeout(() => {
      setSaving(false);
      toast('تم حفظ الإعدادات بنجاح', 'success');
    }, 1000);
  };

  return (
    <div className="page-content">
      <div className="page-header">
        <div>
          <h1 className="page-title">إعدادات النظام ⚙️</h1>
          <p className="page-subtitle">تخصيص قواعد العمل وقيم النقاط الافتراضية</p>
        </div>
        <button className="btn btn-primary" onClick={handleSave} disabled={saving}>
          <Save size={20} />
          {saving ? 'جارٍ الحفظ...' : 'حفظ الإعدادات'}
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Priority Points Config */}
        <section className="glass-card">
          <h2 style={{ fontWeight: 800, marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Database size={18} /> قواعد احتساب الأولوية
          </h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            <SettingRow label="نقاط حالة (أرملة)" defaultVal={20} />
            <SettingRow label="نقاط حالة (مطلقة)" defaultVal={15} />
            <SettingRow label="نقاط عجز / إعاقة" defaultVal={20} />
            <SettingRow label="نقاط مرض مزمن" defaultVal={15} />
            <SettingRow label="نقاط لكل طفل" defaultVal={5} />
          </div>
        </section>

        {/* System & Notifications */}
        <section className="glass-card">
          <h2 style={{ fontWeight: 800, marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Bell size={18} /> التنبيهات والتقارير
          </h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            <ToggleRow label="أرسل تقرير يومي للمدير" checked />
            <ToggleRow label="تنبيه عند تسجيل متطوع جديد" checked />
            <ToggleRow label="تنبيه عند اكتمال حملة" checked />
            <ToggleRow label="السماح للمتطوعين بتعديل الملف" checked={false} />
          </div>
        </section>

        {/* Localization & General */}
        <section className="glass-card">
          <h2 style={{ fontWeight: 800, marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Globe size={18} /> الإعدادات العامة
          </h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            <div className="form-group">
              <label className="form-label">العملة الافتراضية</label>
              <input type="text" className="form-input" defaultValue="جنية مصري (ج.م)" />
            </div>
            <div className="form-group">
              <label className="form-label">اللغة الافتراضية</label>
              <select className="form-select">
                <option value="ar">العربية (الأصلية)</option>
                <option value="en">English (Coming Soon)</option>
              </select>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}

function SettingRow({ label, defaultVal }: { label: string; defaultVal: number }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.5rem 0', borderBottom: '1px solid var(--border-light)' }}>
      <span style={{ fontWeight: 600 }}>{label}</span>
      <input 
        type="number" 
        defaultValue={defaultVal} 
        style={{ width: 80, padding: '0.4rem', borderRadius: '8px', border: '1px solid var(--border)', textAlign: 'center', fontWeight: 800 }} 
      />
    </div>
  );
}

function ToggleRow({ label, checked: defaultChecked }: { label: string; checked: boolean }) {
  const [checked, setChecked] = useState(defaultChecked);
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
      <span style={{ fontWeight: 600 }}>{label}</span>
      <button 
        onClick={() => setChecked(!checked)}
        style={{ 
          width: 48, height: 24, borderRadius: '99px', 
          background: checked ? 'var(--primary)' : '#e5e7eb', 
          border: 'none', cursor: 'pointer', position: 'relative',
          transition: 'all 0.2s'
        }}
      >
        <motion.div 
          animate={{ x: checked ? 24 : 4 }}
          style={{ width: 16, height: 16, background: 'white', borderRadius: '50%', boxShadow: '0 2px 4px rgba(0,0,0,0.1)' }}
        />
      </button>
    </div>
  );
}
