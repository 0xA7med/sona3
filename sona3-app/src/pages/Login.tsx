import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Eye, EyeOff, LogIn, HeartHandshake, UserPlus } from 'lucide-react';
import { useAuthStore } from '../store/authStore';
import { toast } from '../lib/toast';

export default function Login() {
  const { signIn, signUp } = useAuthStore();
  const [isLogin,  setIsLogin]  = useState(true);
  const [name,     setName]     = useState('');
  const [email,    setEmail]    = useState('');
  const [password, setPassword] = useState('');
  const [phone,    setPhone]    = useState('');
  const [zone,     setZone]     = useState('');
  const [showPw,   setShowPw]   = useState(false);
  const [loading,  setLoading]  = useState(false);
  const [errors,   setErrors]   = useState<Record<string, string>>({});

  const validate = () => {
    const newErrors: Record<string, string> = {};
    
    if (!email.trim()) {
      newErrors.email = 'البريد الإلكتروني مطلوب';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      newErrors.email = 'صيغة البريد غير صحيحة';
    }

    if (!password) {
      newErrors.password = 'كلمة المرور مطلوبة';
    } else if (password.length < 6) {
      newErrors.password = 'كلمة المرور يجب أن تكون 6 أحرف على الأقل';
    }

    if (!isLogin) {
      if (!name.trim()) {
        newErrors.name = 'الاسم الثلاثي مطلوب';
      } else if (name.trim().split(/\s+/).length < 3) {
        newErrors.name = 'يرجى إدخال الاسم المكون من 3 مقاطع على الأقل';
      }

      if (!phone.trim()) {
        newErrors.phone = 'رقم الهاتف مطلوب';
      } else if (!/^01[0125][0-9]{8}$/.test(phone.trim())) {
        newErrors.phone = 'رقم هاتف مصري غير صحيح (11 رقم)';
      }

      if (!zone.trim()) {
        newErrors.zone = 'المنطقة مطلوبة';
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) {
      toast('يرجى تصحيح الأخطاء المطلوبة', 'warning');
      return;
    }
    setLoading(true);

    if (isLogin) {
      const { error } = await signIn(email.trim(), password);
      if (error) {
        const msg = error.message.toLowerCase();
        if (msg.includes('confirm') || msg.includes('verification')) {
          toast('يرجى تأكيد بريدك الإلكتروني أولاً. تفقد صندوق الوارد.', 'info', 5000);
        } else {
          toast('البريد الإلكتروني أو كلمة المرور غير صحيحة', 'error');
        }
      }
    } else {
      const { data, error } = await signUp(
        email.trim(), 
        password, 
        name.trim(), 
        phone.trim(), 
        zone.trim()
      );
      if (error) {
        toast(error.message.includes('already registered') ? 'البريد مستخدم بالفعل' : 'حدث خطأ في التسجيل', 'error');
      } else if (!(data as { session?: unknown })?.session) {
        toast('تم التسجيل! تحتاج لتأكيد بريدك الإلكتروني لتتمكن من الدخول (أو يمكن للمدير تفعيله لك).', 'info', 6000);
        setIsLogin(true);
      } else {
        toast('تم إنشاء الحساب بنجاح! سيتم تحويلك...', 'success');
      }
    }
    setLoading(false);
  };

  return (
    <div className="auth-bg">
      {/* Floating particles background stays the same */}
      {[...Array(6)].map((_, i) => (
        <motion.div
          key={i}
          style={{
            position: 'absolute',
            width: 8 + i * 6,
            height: 8 + i * 6,
            borderRadius: '50%',
            background: `rgba(212,175,55,${0.1 + i * 0.04})`,
            left: `${10 + i * 15}%`,
            top: `${20 + (i % 3) * 25}%`,
          }}
          animate={{
            y: [0, -20, 0],
            opacity: [0.4, 0.8, 0.4],
          }}
          transition={{
            duration: 3 + i * 0.5,
            repeat: Infinity,
            delay: i * 0.4,
          }}
        />
      ))}

      <motion.div
        className="auth-card"
        initial={{ opacity: 0, y: 30, scale: 0.96 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ type: 'spring', stiffness: 280, damping: 24 }}
      >
        <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: 'spring', stiffness: 400, damping: 20, delay: 0.2 }}
            style={{
              width: 72, height: 72, borderRadius: 20,
              background: 'linear-gradient(135deg, var(--gold) 0%, #9a6e1a 100%)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              margin: '0 auto 1rem', boxShadow: 'var(--shadow-gold)', fontSize: '2rem',
            }}
          >
            <HeartHandshake size={36} color="white" />
          </motion.div>
          <h1 style={{ fontSize: '1.6rem', fontWeight: 900, color: 'var(--primary-dark)', marginBottom: '0.25rem' }}>صناع السعادة</h1>
          <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>نظام إدارة التوزيعات والمساعدات — v2</p>
        </div>

        <form onSubmit={handleSubmit} noValidate>
          <AnimatePresence mode="popLayout">
            {!isLogin && (
              <motion.div
                key="signup-fields"
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                style={{ overflow: 'hidden' }}
              >
                  <div className="form-group">
                    <label className="form-label" htmlFor="name">الاسم الثلاثي</label>
                    <input
                      id="name"
                      type="text"
                      className={`form-input form-input-lg ${errors.name ? 'form-input-error' : ''}`}
                      placeholder="محمد أحمد محمود"
                      value={name}
                      onChange={e => { setName(e.target.value); if(errors.name) setErrors(prev => ({...prev, name: ''})); }}
                      disabled={loading}
                    />
                    {errors.name && <span className="form-error-text">{errors.name}</span>}
                  </div>
                  <div className="form-group">
                    <label className="form-label" htmlFor="phone">رقم الهاتف</label>
                    <input
                      id="phone"
                      type="tel"
                      className={`form-input form-input-lg ${errors.phone ? 'form-input-error' : ''}`}
                      placeholder="01xxxxxxxxx"
                      value={phone}
                      onChange={e => { setPhone(e.target.value); if(errors.phone) setErrors(prev => ({...prev, phone: ''})); }}
                      disabled={loading}
                    />
                    {errors.phone && <span className="form-error-text">{errors.phone}</span>}
                  </div>
                  <div className="form-group">
                    <label className="form-label" htmlFor="zone">المنطقة / السكن</label>
                    <input
                      id="zone"
                      type="text"
                      className={`form-input form-input-lg ${errors.zone ? 'form-input-error' : ''}`}
                      placeholder="القاهرة، شارع..."
                      value={zone}
                      onChange={e => { setZone(e.target.value); if(errors.zone) setErrors(prev => ({...prev, zone: ''})); }}
                      disabled={loading}
                    />
                    {errors.zone && <span className="form-error-text">{errors.zone}</span>}
                  </div>
              </motion.div>
            )}
          </AnimatePresence>

          <div className="form-group">
            <label className="form-label" htmlFor="email">البريد الإلكتروني</label>
            <input
              id="email"
              type="email"
              className={`form-input form-input-lg ${errors.email ? 'form-input-error' : ''}`}
              placeholder="example@domain.com"
              value={email}
              onChange={e => { setEmail(e.target.value); if(errors.email) setErrors(prev => ({...prev, email: ''})); }}
              autoComplete="email" dir="ltr"
              style={{ textAlign: 'left' }}
              disabled={loading}
            />
            {errors.email && <span className="form-error-text">{errors.email}</span>}
          </div>

          <div className="form-group" style={{ marginBottom: '1.5rem' }}>
            <label className="form-label" htmlFor="password">كلمة المرور</label>
            <div style={{ position: 'relative' }}>
              <input
                id="password"
                type={showPw ? 'text' : 'password'}
                className={`form-input form-input-lg ${errors.password ? 'form-input-error' : ''}`}
                placeholder="••••••••"
                value={password}
                onChange={e => { setPassword(e.target.value); if(errors.password) setErrors(prev => ({...prev, password: ''})); }}
                autoComplete={isLogin ? "current-password" : "new-password"}
                dir="ltr" style={{ textAlign: 'left', paddingLeft: '3rem' }}
                disabled={loading}
              />
              <button
                type="button"
                onClick={() => setShowPw(v => !v)}
                style={{
                  position: 'absolute', left: '0.875rem', top: '50%', transform: 'translateY(-50%)',
                  background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-light)', padding: '0.25rem'
                }}
                tabIndex={-1}
              >
                {showPw ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
            {errors.password && <span className="form-error-text">{errors.password}</span>}
          </div>

          <motion.button
            type="submit"
            className="btn btn-primary btn-lg btn-full"
            disabled={loading}
            whileHover={loading ? {} : { scale: 1.02 }}
            whileTap={loading ? {} : { scale: 0.98 }}
          >
            {loading ? (
              <>
                <span className="animate-spin" style={{ width: 18, height: 18, border: '2.5px solid rgba(255,255,255,0.3)', borderTop: '2.5px solid white', borderRadius: '50%', display: 'inline-block' }} />
                {isLogin ? 'جارٍ الدخول...' : 'جارٍ الإنشاء...'}
              </>
            ) : isLogin ? (
              <>
                <LogIn size={18} />
                تسجيل الدخول
              </>
            ) : (
              <>
                <UserPlus size={18} />
                إنشاء حساب متطوع
              </>
            )}
          </motion.button>
          
          <div style={{ textAlign: 'center', marginTop: '1.5rem', fontSize: '0.85rem' }}>
            <button
              type="button"
              onClick={() => { setIsLogin(!isLogin); setErrors({}); }}
              style={{
                background: 'none', border: 'none', color: 'var(--primary)',
                fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit'
              }}
            >
              {isLogin ? 'ليس لديك حساب؟ سجل كمتطوع جديد' : 'لديك حساب بالفعل؟ سجل دخول'}
            </button>
          </div>
        </form>
      </motion.div>
    </div>
  );
}
