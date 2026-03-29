import { useState, useEffect } from 'react';
import { useAuthStore } from '../store/authStore';
import { supabase } from '../lib/supabase';
import { 
  LogOut, User, Phone, MapPin, Shield, Calendar, 
  CheckCircle, Clock, Heart, RefreshCw, Save, Edit2, X
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from '../components/Toast';

export default function Profile() {
  const { profile, signOut, setProfile, loadProfile } = useAuthStore();
  const [stats, setStats] = useState({
    completed: 0,
    active: 0,
    total: 0,
  });
  const [loading, setLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [form, setForm] = useState({
    full_name: '',
    phone: '',
    zone: ''
  });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (profile?.id) {
      fetchStats();
      setForm({
        full_name: profile.full_name || '',
        phone: profile.phone || '',
        zone: profile.zone || ''
      });
    }
  }, [profile]);

  async function fetchStats() {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('case_assignments')
        .select('status')
        .eq('volunteer_id', profile?.id);

      if (error) throw error;

      if (data) {
        setStats({
          completed: data.filter(a => a.status === 'completed').length,
          active:    data.filter(a => ['pending', 'in_progress'].includes(a.status)).length,
          total:     data.length,
        });
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  const handleUpdateProfile = async () => {
    if (!profile?.id) return;
    setSaving(true);
    try {
      const { error } = await supabase
        .from('profiles')
        .update({
          full_name: form.full_name,
          phone: form.phone,
          zone: form.zone
        })
        .eq('id', profile.id);

      if (error) throw error;
      
      setProfile({ ...profile, ...form });
      setIsEditing(false);
      toast('✅ تم تحديث البيانات بنجاح', 'success');
    } catch (err: any) {
      console.error(err);
      toast('❌ فشل تحديث البيانات: ' + (err.message || 'خطأ غير معروف'), 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleRefreshIdentity = async () => {
    if (!profile?.id) return;
    setLoading(true);
    try {
      await loadProfile(profile.id);
      toast('🔄 تم تحديث الهوية من النظام', 'success');
    } catch (err) {
      toast('❌ فشل التحديث', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleSignOut = () => {
    if (window.confirm('هل أنت متأكد أنك تريد تسجيل الخروج؟')) {
      signOut();
    }
  };

  return (
    <div className="page-content">
      {/* Header */}
      <div className="page-header" style={{ marginBottom: '2rem' }}>
        <div>
          <h1 className="page-title">ملفي الشخصي</h1>
          <p className="page-subtitle">إحصائيات الأداء والبيانات الشخصية</p>
        </div>
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <button 
            className="btn btn-ghost btn-sm" 
            onClick={handleRefreshIdentity}
            disabled={loading}
            title="تحديث البيانات من السيرفر"
          >
            <RefreshCw size={18} className={loading ? 'animate-spin' : ''} />
          </button>
        </div>
      </div>

      <div className="dashboard-grid stagger">
        {/* Profile Card */}
        <motion.div 
          className="card" 
          style={{ gridColumn: 'span 12', padding: '1.5rem', display: 'flex', alignItems: 'center', gap: '1.25rem' }}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <div style={{ 
            width: 80, height: 80, borderRadius: '24px', 
            background: 'linear-gradient(135deg, var(--primary) 0%, var(--primary-dark) 100%)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', flexShrink: 0
          }}>
            <User size={40} />
          </div>
          <div style={{ flex: 1 }}>
            {isEditing ? (
              <input 
                className="input" 
                value={form.full_name} 
                onChange={e => setForm({...form, full_name: e.target.value})}
                style={{ fontSize: '1.2rem', fontWeight: 800, padding: '4px 8px', marginBottom: '8px' }}
              />
            ) : (
              <h2 style={{ fontSize: '1.4rem', fontWeight: 900, marginBottom: '0.25rem' }}>{profile?.full_name}</h2>
            )}
            <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
              <span className={`badge ${profile?.role === 'admin' ? 'badge-in-progress' : 'badge-gold'}`}>
                {profile?.role === 'admin' ? 'مدير نظام' : 'متطوع ميداني'}
              </span>
              <span className="badge" style={{ background: 'var(--gray-100)', color: 'var(--gray-700)' }}>
                {profile?.is_active ? 'نشط حالياً' : 'غير نشط'}
              </span>
            </div>
          </div>
          <button 
            className="btn btn-ghost btn-sm" 
            onClick={() => setIsEditing(!isEditing)}
            style={{ alignSelf: 'flex-start' }}
          >
            {isEditing ? <X size={18} /> : <Edit2 size={18} />}
          </button>
        </motion.div>

        {/* Stats Grid */}
        {[
          { label: 'إجمالي الحالات', value: stats.total,     icon: Heart,       color: 'var(--primary)',      bg: 'var(--blue-light)' },
          { label: 'مهام مكتملة',    value: stats.completed, icon: CheckCircle, color: 'var(--green-light)',   bg: 'var(--green-light-bg)' },
          { label: 'حالات قيد العمل', value: stats.active,    icon: Clock,       color: 'var(--gold)',      bg: 'var(--gold-bg)' },
        ].map((s, i) => (
          <motion.div 
            key={s.label}
            className="stat-card"
            style={{ gridColumn: 'span 4' }}
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.1 + i * 0.1 }}
          >
            <div style={{ padding: '0.5rem', background: 'var(--gray-50)', borderRadius: '12px', color: s.color }}>
              <s.icon size={24} />
            </div>
            <div>
              <div style={{ fontSize: '1.5rem', fontWeight: 900, color: 'var(--primary-dark)' }}>{loading ? '...' : s.value}</div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 600 }}>{s.label}</div>
            </div>
          </motion.div>
        ))}

        {/* Personal Info Edit */}
        <motion.div 
          className="card" 
          style={{ gridColumn: 'span 12', padding: '1.5rem' }}
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
            <h3 style={{ fontSize: '1rem', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Shield size={18} color="var(--primary)" />
              بيانات التواصل والمنطقة
            </h3>
          </div>
          
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
            <div className="info-group">
              <label style={{ fontSize: '0.7rem', color: 'var(--text-muted)', display: 'block', marginBottom: '0.25rem' }}>رقم الهاتف</label>
              {isEditing ? (
                <input 
                  className="input" 
                  value={form.phone} 
                  onChange={e => setForm({...form, phone: e.target.value})}
                  placeholder="01xxxxxxxxx"
                />
              ) : (
                <div style={{ fontWeight: 700, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <Phone size={14} color="var(--gray-400)" />
                  {profile?.phone || 'غير مسجل'}
                </div>
              )}
            </div>
            <div className="info-group">
              <label style={{ fontSize: '0.7rem', color: 'var(--text-muted)', display: 'block', marginBottom: '0.25rem' }}>منطقة العمل</label>
              {isEditing ? (
                <input 
                  className="input" 
                  value={form.zone} 
                  onChange={e => setForm({...form, zone: e.target.value})}
                  placeholder="القاهرة، الجيزة..."
                />
              ) : (
                <div style={{ fontWeight: 700, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <MapPin size={14} color="var(--gray-400)" />
                  {profile?.zone || 'غير محددة'}
                </div>
              )}
            </div>
            <div className="info-group">
              <label style={{ fontSize: '0.7rem', color: 'var(--text-muted)', display: 'block', marginBottom: '0.25rem' }}>تاريخ الانضمام</label>
              <div style={{ fontWeight: 700, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Calendar size={14} color="var(--gray-400)" />
                {profile?.created_at ? new Date(profile.created_at).toLocaleDateString('ar-EG') : '---'}
              </div>
            </div>
          </div>
          
          <AnimatePresence>
            {isEditing && (
              <motion.div 
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                style={{ marginTop: '1.5rem', paddingTop: '1rem', borderTop: '1px solid var(--gray-100)' }}
              >
                <button 
                  className="btn btn-primary btn-full"
                  disabled={saving}
                  onClick={handleUpdateProfile}
                >
                  {saving ? <RefreshCw size={18} className="animate-spin" /> : <Save size={18} />}
                  حفظ التعديلات
                </button>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>

        {/* Root Actions */}
        <div style={{ gridColumn: 'span 12', marginTop: '1rem' }}>
          <button 
            className="btn btn-outline btn-full"
            style={{ color: '#ef4444', borderColor: '#fee2e2', background: '#fff5f5' }}
            onClick={handleSignOut}
          >
            <LogOut size={18} />
            تسجيل الخروج من النظام
          </button>
        </div>
      </div>
    </div>
  );
}
