import { useState, useEffect } from 'react';
import { useAuthStore } from '../store/authStore';
import { supabase } from '../lib/supabase';
import { 
  LogOut, User, Phone, MapPin, Shield, Calendar, 
  CheckCircle, Clock, Heart, RefreshCw, Save, Edit2, X,
  Zap, Star
} from 'lucide-react';
import { motion, AnimatePresence, type Variants } from 'framer-motion';
import { toast } from '../components/Toast';
import { useNavigate } from 'react-router-dom';
import ConfirmModal from '../components/ui/ConfirmModal';

export default function Profile() {
  const { profile, signOut, setProfile, loadProfile } = useAuthStore();
  const navigate = useNavigate();
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
  const [isLogoutModalOpen, setIsLogoutModalOpen] = useState(false);

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
      if (!profile?.id) return;
      const { data, error } = await supabase
        .from('case_assignments')
        .select('status')
        .eq('volunteer_id', profile.id);

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

  const handleSignOut = async () => {
    try {
      await signOut();
      navigate('/login');
    } catch (err) {
      toast('❌ فشل تسجيل الخروج', 'error');
    }
  };

  const containerVariants: Variants = {
    hidden: { opacity: 0 },
    visible: { 
      opacity: 1,
      transition: { staggerChildren: 0.1, delayChildren: 0.1 }
    }
  };

  const cardVariants: Variants = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0, transition: { type: 'spring', damping: 25, stiffness: 200 } }
  };

  return (
    <div className="page-content" style={{ padding: 0 }}>
      {/* Premium Hero Header - No fixed height, padding at bottom creates space for the overlapping card */}
      <div style={{ 
        position: 'relative', 
        background: 'linear-gradient(160deg, #032a1e 0%, #074b36 100%)',
        padding: '2.5rem 1.5rem 6rem',
        color: 'white',
        overflow: 'hidden'
      }}>
        {/* Animated backdrop elements */}
        <motion.div 
          animate={{ scale: [1, 1.1, 1], opacity: [0.05, 0.12, 0.05] }}
          transition={{ duration: 8, repeat: Infinity, ease: "linear" }}
          style={{ 
            position: 'absolute', top: -50, right: -50, fontSize: '180px', pointerEvents: 'none',
            filter: 'blur(10px)'
          }}
        >
          🌙
        </motion.div>
        
        <div style={{ position: 'relative', zIndex: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', maxWidth: '1000px', margin: '0 auto' }}>
          <div>
            <motion.h1 
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              style={{ fontSize: '1.8rem', fontWeight: 900, marginBottom: '0.5rem', letterSpacing: '-1px' }}
            >
              ملفي الشخصي
            </motion.h1>
            <motion.p 
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.1 }}
              style={{ fontSize: '0.9rem', color: 'rgba(255,255,255,0.7)', fontWeight: 500 }}
            >
              مرحباً بك مجدداً في منظومة صناع السعادة
            </motion.p>
          </div>
          
          <button 
            className="btn btn-ghost" 
            onClick={handleRefreshIdentity}
            disabled={loading}
            style={{ 
              background: 'rgba(255,255,255,0.1)', 
              border: '1px solid rgba(255,255,255,0.2)', 
              color: 'white',
              borderRadius: '50%',
              width: '40px', height: '40px',
              padding: 0,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}
          >
            <RefreshCw size={18} className={loading ? 'animate-spin' : ''} />
          </button>
        </div>
      </div>

      <motion.div 
        variants={containerVariants}
        initial="hidden"
        animate="visible"
        style={{ padding: '0 1.5rem 2rem', maxWidth: '1000px', margin: '0 auto' }}
      >
        {/* Overlapping Identity Card */}
        <motion.div 
          variants={cardVariants}
          className="glass-profile"
          style={{ 
            marginTop: '-4rem',
            marginBottom: '2rem',
            background: 'white',
            padding: '1.5rem', 
            display: 'flex', alignItems: 'center', gap: '1.25rem', flexWrap: 'wrap',
            zIndex: 10,
            position: 'relative',
            borderRadius: '24px',
            boxShadow: '0 10px 40px rgba(0,0,0,0.08)'
          }}
        >
          <div style={{ position: 'relative' }}>
            <div style={{ 
              width: 70, height: 70, borderRadius: '22px', 
              background: 'linear-gradient(45deg, var(--gold) 0%, var(--gold-light) 100%)',
              display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--primary-dark)',
              boxShadow: '0 8px 20px rgba(212,175,55,0.4)',
              border: '3px solid white'
            }}>
              <User size={34} strokeWidth={2.5} />
            </div>
            <div style={{ 
              position: 'absolute', bottom: -5, right: -5, 
              width: 26, height: 26, borderRadius: '50%', background: '#10b981',
              border: '3px solid white', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white'
            }}>
              <Zap size={14} fill="currentColor" />
            </div>
          </div>
          
          <div style={{ flex: 1, minWidth: '200px' }}>
            {isEditing ? (
              <input 
                className="input" 
                value={form.full_name} 
                onChange={e => setForm({...form, full_name: e.target.value})}
                style={{ background: '#f8fafc', padding: '8px 12px', borderRadius: '10px', border: '1px solid var(--border)', width: '100%', marginBottom: '0.5rem', fontWeight: 700 }}
              />
            ) : (
              <h2 style={{ fontSize: '1.4rem', fontWeight: 900, marginBottom: '0.4rem', color: 'var(--primary-dark)' }}>
                {profile?.full_name}
              </h2>
            )}
            <div style={{ display: 'flex', gap: '0.6rem', flexWrap: 'wrap' }}>
              <span style={{ 
                background: profile?.role === 'admin' ? '#eff6ff' : '#fef9c3', 
                color: profile?.role === 'admin' ? '#1e40af' : '#854d0e',
                fontSize: '0.75rem', fontWeight: 800, padding: '4px 10px', borderRadius: '8px'
              }}>
                {profile?.role === 'admin' ? 'مدير نظام' : 'متطوع ميداني'}
              </span>
              <span style={{ 
                background: '#f1f5f9', color: '#475569',
                fontSize: '0.75rem', fontWeight: 700, padding: '4px 10px', borderRadius: '8px'
              }}>
                 ID: {profile?.id.substring(0, 8).toUpperCase()}
              </span>
            </div>
          </div>
          
          <button 
            className="btn" 
            onClick={() => setIsEditing(!isEditing)}
            style={{ 
              background: isEditing ? '#f3f4f6' : 'var(--primary-light)', 
              color: 'var(--primary)',
              borderRadius: '12px', width: 44, height: 44, padding: 0,
              display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0
            }}
          >
            {isEditing ? <X size={20} /> : <Edit2 size={20} />}
          </button>
        </motion.div>

        {/* Stats Grid - Premium Version */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(100px, 1fr))', gap: '1rem', marginBottom: '2rem' }}>
          {[
            { label: 'إجمالي الحالات', value: stats.total,     icon: Heart,       color: '#3b82f6' },
            { label: 'مهام مكتملة',    value: stats.completed, icon: CheckCircle, color: '#10b981' },
            { label: 'قيد العمل',      value: stats.active,    icon: Clock,       color: '#f59e0b' },
          ].map((s) => (
            <motion.div 
              key={s.label}
              variants={cardVariants}
              className="stat-card-premium"
              style={{ padding: '1rem', display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center' }}
            >
              <div style={{ 
                width: '44px', height: '44px', borderRadius: '14px', 
                background: s.color + '15', color: s.color,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                marginBottom: '0.5rem'
              }}>
                <s.icon size={24} />
              </div>
              <div style={{ fontSize: '1.6rem', fontWeight: 950, color: 'var(--primary-dark)', lineHeight: 1 }}>
                {loading ? '...' : s.value}
              </div>
              <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', fontWeight: 700 }}>
                {s.label}
              </div>
            </motion.div>
          ))}
        </div>

        {/* Personal Details Card */}
        <motion.div 
          variants={cardVariants}
          className="card"
          style={{ padding: '1.5rem', border: 'none', boxShadow: '0 4px 20px rgba(0,0,0,0.04)', borderRadius: '24px' }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.5rem' }}>
            <div style={{ width: 40, height: 40, borderRadius: '12px', background: 'var(--primary-light)', color: 'var(--primary)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Shield size={20} />
            </div>
            <div>
              <h3 style={{ fontSize: '1.1rem', fontWeight: 800 }}>بيانات الشخصية</h3>
              <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>معلومات التواصل والمنطقه المسجله</p>
            </div>
          </div>

          <div style={{ display: 'grid', gap: '1.25rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
              <div style={{ width: 36, height: 36, borderRadius: '10px', background: '#f8fafc', color: '#64748b', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Phone size={18} />
              </div>
              <div style={{ flex: 1 }}>
                <p style={{ fontSize: '0.7rem', color: 'var(--text-muted)', fontWeight: 600 }}>رقم الهاتف</p>
                {isEditing ? (
                  <input 
                    className="form-input" 
                    value={form.phone} 
                    style={{ width: '100%', padding: '4px 0', border: 'none', borderBottom: '2px solid var(--primary)', borderRadius: 0, outline: 'none' }}
                    onChange={e => setForm({...form, phone: e.target.value})}
                  />
                ) : (
                  <p style={{ fontWeight: 800, fontSize: '1rem' }}>{profile?.phone || 'غير مسجل'}</p>
                )}
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
              <div style={{ width: 36, height: 36, borderRadius: '10px', background: '#f8fafc', color: '#64748b', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <MapPin size={18} />
              </div>
              <div style={{ flex: 1 }}>
                <p style={{ fontSize: '0.7rem', color: 'var(--text-muted)', fontWeight: 600 }}>منطقة العمل</p>
                {isEditing ? (
                  <input 
                    className="form-input" 
                    value={form.zone} 
                    style={{ width: '100%', padding: '4px 0', border: 'none', borderBottom: '2px solid var(--primary)', borderRadius: 0, outline: 'none' }}
                    onChange={e => setForm({...form, zone: e.target.value})}
                  />
                ) : (
                  <p style={{ fontWeight: 800, fontSize: '1rem' }}>{profile?.zone || 'غير محددة'}</p>
                )}
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
              <div style={{ width: 36, height: 36, borderRadius: '10px', background: '#f8fafc', color: '#64748b', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Calendar size={18} />
              </div>
              <div style={{ flex: 1 }}>
                <p style={{ fontSize: '0.7rem', color: 'var(--text-muted)', fontWeight: 600 }}>تاريخ الانضمام</p>
                <p style={{ fontWeight: 800, fontSize: '1rem' }}>
                  {profile?.created_at ? new Date(profile.created_at).toLocaleDateString('ar-EG', { day: 'numeric', month: 'long', year: 'numeric' }) : '---'}
                </p>
              </div>
            </div>
          </div>

          <AnimatePresence>
            {isEditing && (
              <motion.div 
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                style={{ marginTop: '1.5rem' }}
              >
                <button 
                  className="btn btn-primary btn-full"
                  disabled={saving}
                  onClick={handleUpdateProfile}
                  style={{ borderRadius: '14px', height: '50px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}
                >
                  {saving ? <RefreshCw size={20} className="animate-spin" /> : <Save size={20} />}
                  حفظ التعديلات الجديدة
                </button>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>

        {/* Achievement Level — Real Data */}
        {profile?.role !== 'admin' && (() => {
          const completed = stats.completed;
          const levels = [
            { min: 0,   max: 50,   label: 'مبتدئ',   next: 'فضي',    icon: '🌱', color: '#64748b', bg: 'linear-gradient(135deg, #f8fafc 0%, #e2e8f0 100%)', bar: '#94a3b8', nextAt: 50   },
            { min: 50,  max: 150,  label: 'فضي',     next: 'ذهبي',   icon: '🥈', color: '#475569', bg: 'linear-gradient(135deg, #f1f5f9 0%, #e2e8f0 100%)', bar: '#94a3b8', nextAt: 150  },
            { min: 150, max: 400,  label: 'ذهبي',    next: 'بلاتيني', icon: '🥇', color: '#b45309', bg: 'linear-gradient(135deg, #fefce8 0%, #fef9c3 100%)', bar: '#d4af37', nextAt: 400  },
            { min: 400, max: 9999, label: 'بلاتيني', next: null,      icon: '💎', color: '#0891b2', bg: 'linear-gradient(135deg, #ecfeff 0%, #cffafe 100%)', bar: '#06b6d4', nextAt: null },
          ];
          const level = levels.find(l => completed >= l.min && completed < l.max) || levels[0];
          const progress = level.nextAt
            ? Math.min(100, Math.round(((completed - level.min) / (level.nextAt - level.min)) * 100))
            : 100;
          const remaining = level.nextAt ? level.nextAt - completed : 0;

          return (
            <motion.div
              variants={cardVariants}
              style={{
                marginTop: '1.5rem', padding: '1.25rem', borderRadius: '20px',
                background: level.bg,
                display: 'flex', alignItems: 'center', gap: '1rem',
                border: '1px solid rgba(0,0,0,0.05)',
                boxShadow: '0 2px 10px rgba(0,0,0,0.04)',
              }}
            >
              <div style={{
                width: 52, height: 52, borderRadius: '50%',
                background: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: '1.6rem', boxShadow: '0 4px 12px rgba(0,0,0,0.08)', flexShrink: 0,
              }}>
                {level.icon}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                  <h4 style={{ fontSize: '0.92rem', fontWeight: 800, color: 'var(--primary-dark)' }}>
                    المستوى: {level.label}
                  </h4>
                  <span style={{ fontSize: '0.75rem', fontWeight: 800, color: level.color }}>
                    {loading ? '…' : completed} مهمة
                  </span>
                </div>
                <div style={{ height: 7, background: 'rgba(0,0,0,0.07)', borderRadius: 4, overflow: 'hidden' }}>
                  <div style={{
                    height: '100%', width: `${loading ? 0 : progress}%`,
                    background: level.bar, borderRadius: 4,
                    transition: 'width 0.8s cubic-bezier(0.34,1.56,0.64,1)',
                  }} />
                </div>
                <p style={{ fontSize: '0.65rem', color: 'var(--text-muted)', marginTop: 5 }}>
                  {level.nextAt
                    ? loading ? '...' : `تحتاج ${remaining} مهمة إضافية للوصول للمستوى «${level.next}» ${level.next === 'ذهبي' ? '🥇' : '💎'}`
                    : '🏆 أنت في القمة! المستوى الأعلى'
                  }
                </p>
              </div>
            </motion.div>
          );
        })()}

        {/* Admin System Management */}
        {profile?.role === 'admin' && (
          <motion.div 
            variants={cardVariants}
            className="card"
            style={{ 
               padding: '1.5rem', marginTop: '1.5rem',
               background: 'linear-gradient(135deg, #16302a 0%, #032a1e 100%)', 
               color: 'white', borderRadius: '24px', border: 'none'
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
               <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                  <Star size={24} color="var(--gold)" fill="var(--gold)" />
                  <h3 style={{ fontSize: '1.1rem', fontWeight: 800 }}>إدارة المنظومة</h3>
               </div>
               <button className="btn btn-sm" style={{ background: 'var(--gold)', color: 'black', borderRadius: '10px' }} onClick={() => navigate('/admin/settings')}>
                 دخول الإعدادات
               </button>
            </div>
            <p style={{ fontSize: '0.8rem', opacity: 0.8 }}>أنت تملك صلاحيات إدارة المنظومة بالكامل، يرجى التعامل بحذر مع الإعدادات المتقدمة.</p>
          </motion.div>
        )}

        <div style={{ marginTop: '2rem' }}>
          <button 
            className="btn"
            style={{ color: '#ef4444', background: '#fef2f2', border: '1px solid #fee2e2', width: '100%', borderRadius: '16px', height: '54px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}
            onClick={() => setIsLogoutModalOpen(true)}
          >
            <LogOut size={20} />
            تسجيل الخروج الآمن
          </button>
        </div>

        <ConfirmModal 
          isOpen={isLogoutModalOpen}
          onClose={() => setIsLogoutModalOpen(false)}
          onConfirm={handleSignOut}
          title="تسجيل الخروج؟"
          message="هل أنت متأكد أنك تريد مغادرة النظام حالياً؟"
          type="danger"
        />
      </motion.div>
    </div>
  );
}
