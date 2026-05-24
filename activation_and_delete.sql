-- ================================================================
-- 1. Update New User Trigger to default to INACTIVE
-- ================================================================
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP FUNCTION IF EXISTS public.handle_new_user();

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, role, is_active)
  VALUES (
    new.id,
    COALESCE(new.raw_user_meta_data->>'full_name', new.email),
    COALESCE(new.raw_user_meta_data->>'role', 'volunteer'),
    false -- Default to INACTIVE
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();

-- ================================================================
-- 2. Secure User Deletion & Activation Functions
-- ================================================================
DROP FUNCTION IF EXISTS delete_user_secure(uuid);
DROP FUNCTION IF EXISTS activate_user_secure(uuid);

-- Function to confirm email and activate profile
CREATE OR REPLACE FUNCTION activate_user_secure(target_user_id uuid)
RETURNS void AS $$
BEGIN
  -- 1. Confirm email in auth.users
  UPDATE auth.users 
  SET email_confirmed_at = NOW(),
      updated_at = NOW()
  WHERE id = target_user_id;

  -- 2. Set profile as active
  UPDATE public.profiles
  SET is_active = true
  WHERE id = target_user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to delete user entirely
CREATE OR REPLACE FUNCTION delete_user_secure(target_user_id uuid)
RETURNS void AS $$
BEGIN
  DELETE FROM auth.users WHERE id = target_user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
