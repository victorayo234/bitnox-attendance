-- =====================================================================
-- Bitnox Attendance - Migration 003_auth_trigger_and_role_changes.sql
-- 1. Create role_changes audit table
-- 2. Create trigger on auth.users for safe profile creation
-- 3. Strict RLS verification
-- =====================================================================

-- 1. Create role_changes audit table
CREATE TABLE IF NOT EXISTS public.role_changes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  changed_by uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  target_user uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  old_role text NOT NULL CHECK (old_role IN ('student', 'admin')),
  new_role text NOT NULL CHECK (new_role IN ('student', 'admin')),
  created_at timestamptz DEFAULT now()
);

-- Index for querying role changes
CREATE INDEX IF NOT EXISTS idx_role_changes_target ON public.role_changes(target_user);
CREATE INDEX IF NOT EXISTS idx_role_changes_created_at ON public.role_changes(created_at);

-- Enable RLS on role_changes
ALTER TABLE public.role_changes ENABLE ROW LEVEL SECURITY;

-- Role changes: readable by admins only through RLS
CREATE POLICY "Admins can view role changes"
  ON public.role_changes
  FOR SELECT
  TO authenticated
  USING (public.is_admin());

-- (No client INSERT/UPDATE/DELETE policies: writes only via server service role)


-- 2. Auth Trigger on auth.users
-- Automatically creates a profile when an auth user is created.
-- STRICT SECURITY: ALWAYS forces role='student' and status='pending'.
-- Reads ONLY full_name from metadata, completely ignoring any 'role' or 'status' in metadata.
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, email, role, status, is_active)
  VALUES (
    new.id,
    COALESCE(NULLIF(TRIM(new.raw_user_meta_data->>'full_name'), ''), 'Student'),
    new.email,
    'student', -- ALWAYS 'student', never from metadata
    'pending', -- ALWAYS 'pending', never from metadata
    true
  )
  ON CONFLICT (id) DO UPDATE SET
    -- If profile already exists, do NOT allow changing role or status from metadata
    email = EXCLUDED.email;

  RETURN new;
END;
$$;

-- Drop and recreate the trigger
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
