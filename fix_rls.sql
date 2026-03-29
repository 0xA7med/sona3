-- ==========================================
-- Fix Infinite Recursion in Profiles RLS
-- ==========================================

-- 1. Create a secure function to read the user's role bypassing RLS
CREATE OR REPLACE FUNCTION public.get_my_role()
RETURNS text
LANGUAGE sql
SECURITY DEFINER 
SET search_path = public
AS $$
  SELECT role FROM public.profiles WHERE id = auth.uid();
$$;

-- 2. Drop all existing policies on the profiles table securely
DO $$ 
DECLARE 
  pol RECORD;
BEGIN 
  FOR pol IN SELECT policyname FROM pg_policies WHERE tablename = 'profiles' AND schemaname = 'public' 
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.profiles', pol.policyname);
  END LOOP;
END $$;

-- 3. Ensure RLS is enabled
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- 4. Create new safe policies that don't cause infinite loops
CREATE POLICY "Users can view their own profile" 
ON public.profiles FOR SELECT 
USING ( auth.uid() = id );

CREATE POLICY "Admins can view all profiles" 
ON public.profiles FOR SELECT 
USING ( public.get_my_role() = 'admin' );

CREATE POLICY "Admins can update all profiles" 
ON public.profiles FOR UPDATE 
USING ( public.get_my_role() = 'admin' );

CREATE POLICY "Users can update own profile" 
ON public.profiles FOR UPDATE 
USING ( auth.uid() = id );

CREATE POLICY "Users can insert their own profile" 
ON public.profiles FOR INSERT 
WITH CHECK ( auth.uid() = id );

CREATE POLICY "Admins can delete profiles" 
ON public.profiles FOR DELETE 
USING ( public.get_my_role() = 'admin' );
