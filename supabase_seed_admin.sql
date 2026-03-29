-- ================================================================
-- سكريبت إنشاء مدير مؤسسة صناع السعادة الأولي
-- انسخ هذا الكود وقم بتشغيله في SQL Editor داخل لوحة تحكم Supabase
-- ================================================================

DO $$
DECLARE
  new_user_id uuid := gen_random_uuid();
  admin_email text := 'admin@sona3.org';
  admin_password text := 'admin123456'; -- غيرها إذا أردت
BEGIN
  -- 1. Create the user in auth.users
  INSERT INTO auth.users (
    id, instance_id, email, encrypted_password, email_confirmed_at, 
    raw_app_meta_data, raw_user_meta_data, created_at, updated_at, 
    confirmation_token, email_change, email_change_token_new, recovery_token,
    aud, role
  )
  VALUES (
    new_user_id, 
    '00000000-0000-0000-0000-000000000000', 
    admin_email, 
    crypt(admin_password, gen_salt('bf')), 
    now(), 
    '{"provider": "email", "providers": ["email"]}', 
    '{"full_name": "المدير العام"}', 
    now(), 
    now(), 
    '', '', '', '',
    'authenticated',
    'authenticated'
  );

  -- 2. Create the profile in public.profiles (as admin)
  INSERT INTO public.profiles (id, full_name, role, is_active)
  VALUES (new_user_id, 'المدير العام', 'admin', true)
  ON CONFLICT (id) DO UPDATE SET role = 'admin';

  RAISE NOTICE 'تم إنشاء حساب المدير بنجاح: %', admin_email;
END $$;
