import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Eye, EyeOff, LogIn, HeartHandshake, UserPlus } from 'lucide-react';
import { useAuthStore } from '../store/authStore';
import { toast } from '../components/Toast';

export default function Login() {
  const { signIn, signUp } = useAuthStore();
  const [isLogin,  setIsLogin]  = useState(true);
  const [name,     setName]     = useState('');
  const [email,    setEmail]    = useState('');
  const [password, setPassword] = useState('');
  const [showPw,   setShowPw]   = useState(false);
  const [loading,  setLoading]  = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password || (!isLogin && !name)) {
      toast('يرجى إدخال جميع البيانات المطلوبة', 'warning');
      return;
    }
    setLoading(true);

    if (isLogin) {
      const { error } = await signIn(email.trim(), password);
      if (error) toast('البريد الإلكتروني أو كلمة المرور غير صحيحة', 'error');
    } else {
      const { error } = await signUp(email.trim(), password, name.trim());
      if (error) {
        toast(error.message.includes('already registered') ? 'البريد مستخدم بالفعل' : 'حدث خطأ في التسجيل', 'error');
      } else {
        toast('تم إنشاء الحساب بنجاح! سيتم تحويلك...', 'success');
      }
    }
    setLoading(false);
  };

  return (
    <div className="auth-bg">
      {/* Floating particles */}
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
        {/* Logo */}
        <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: 'spring', stiffness: 400, damping: 20, delay: 0.2 }}
            style={{
              width: 72,
              height: 72,
              borderRadius: 20,
              background: 'linear-gradient(135deg, var(--gold) 0%, #9a6e1a 100%)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              margin: '0 auto 1rem',
              boxShadow: 'var(--shadow-gold)',
              fontSize: '2rem',
            }}
          >
            <HeartHandshake size={36} color="white" />
          </motion.div>
          <h1 style={{ fontSize: '1.6rem', fontWeight: 900, color: 'var(--primary-dark)', marginBottom: '0.25rem' }}>
            صناع السعادة
          </h1>
          <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
            نظام إدارة التوزيعات والمساعدات — v2
          </p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} noValidate>
          <AnimatePresence mode="popLayout">
            {!isLogin && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="form-group"
              >
                <label className="form-label" htmlFor="name">الاسم الثلاثي</label>
                <input
                  id="name"
                  type="text"
                  className="form-input form-input-lg"
                  placeholder="محمد أحمد محمود"
                  value={name}
                  onChange={e => setName(e.target.value)}
                  disabled={loading}
                />
              </motion.div>
            )}
          </AnimatePresence>

          <div className="form-group">
            <label className="form-label" htmlFor="email">البريد الإلكتروني</label>
            <input
              id="email"
              type="email"
              className="form-input form-input-lg"
              placeholder="example@domain.com"
              value={email}
              onChange={e => setEmail(e.target.value)}
              autoComplete="email"
              dir="ltr"
              style={{ textAlign: 'left' }}
              disabled={loading}
            />
          </div>

          <div className="form-group" style={{ marginBottom: '1.5rem' }}>
            <label className="form-label" htmlFor="password">كلمة المرور</label>
            <div style={{ position: 'relative' }}>
              <input
                id="password"
                type={showPw ? 'text' : 'password'}
                className="form-input form-input-lg"
                placeholder="••••••••"
                value={password}
                onChange={e => setPassword(e.target.value)}
                autoComplete={isLogin ? "current-password" : "new-password"}
                dir="ltr"
                style={{ textAlign: 'left', paddingLeft: '3rem' }}
                disabled={loading}
              />
              <button
                type="button"
                onClick={() => setShowPw(v => !v)}
                style={{
                  position: 'absolute', left: '0.875rem', top: '50%',
                  transform: 'translateY(-50%)',
                  background: 'none', border: 'none', cursor: 'pointer',
                  color: 'var(--text-light)', padding: '0.25rem',
                }}
                tabIndex={-1}
              >
                {showPw ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
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
        </form>

        <div style={{ textAlign: 'center', marginTop: '1.5rem', fontSize: '0.85rem' }}>
          <button
            type="button"
            onClick={() => setIsLogin(!isLogin)}
            style={{
              background: 'none', border: 'none', color: 'var(--primary)',
              fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit'
            }}
          >
            {isLogin ? 'ليس لديك حساب؟ سجل كمتطوع جديد' : 'لديك حساب بالفعل؟ سجل دخول'}
          </button>
        </div>
      </motion.div>
    </div>
  );
}
