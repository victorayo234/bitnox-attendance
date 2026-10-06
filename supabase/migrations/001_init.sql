-- =====================================================================
-- Bitnox Attendance - Migration 001_init.sql
-- Source of truth: PROJECT_BRIEF.md
-- =====================================================================

-- 1. Create profiles table
CREATE TABLE IF NOT EXISTS public.profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name text NOT NULL,
  email text NOT NULL,
  role text NOT NULL CHECK (role IN ('student', 'admin')) DEFAULT 'student',
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz DEFAULT now()
);

-- 2. Create attendance table
CREATE TABLE IF NOT EXISTS public.attendance (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  attendance_date date NOT NULL, -- Africa/Lagos calendar date set by the server
  check_in_at timestamptz,
  check_out_at timestamptz,
  status text NOT NULL CHECK (status IN ('present', 'late')),
  marked_by_admin boolean NOT NULL DEFAULT false,
  created_at timestamptz DEFAULT now(),
  CONSTRAINT attendance_student_date_unique UNIQUE (student_id, attendance_date),
  CONSTRAINT check_out_after_check_in CHECK (
    check_out_at IS NULL OR check_in_at IS NULL OR check_out_at >= check_in_at
  )
);

-- 3. Indexes for performance
CREATE INDEX IF NOT EXISTS idx_attendance_date ON public.attendance(attendance_date);
CREATE INDEX IF NOT EXISTS idx_attendance_student_id ON public.attendance(student_id);

-- 4. Enable Row Level Security (RLS) on both tables
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.attendance ENABLE ROW LEVEL SECURITY;

-- 5. Helper function: is_admin()
-- SECURITY DEFINER runs with the privileges of the creator to bypass RLS recursion
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.profiles
    WHERE id = auth.uid()
      AND role = 'admin'
      AND is_active = true
  );
$$;

-- 6. RLS Policies for profiles table
-- A user can SELECT their own profile
CREATE POLICY "Users can view own profile"
  ON public.profiles
  FOR SELECT
  TO authenticated
  USING (auth.uid() = id);

-- Admins can SELECT all profiles
CREATE POLICY "Admins can view all profiles"
  ON public.profiles
  FOR SELECT
  TO authenticated
  USING (public.is_admin());

-- No client INSERT/UPDATE/DELETE policies (All modifications are server-side via service role)

-- 7. RLS Policies for attendance table
-- A student can SELECT only their own attendance records
CREATE POLICY "Students can view own attendance"
  ON public.attendance
  FOR SELECT
  TO authenticated
  USING (auth.uid() = student_id);

-- Admins can SELECT all attendance records
CREATE POLICY "Admins can view all attendance"
  ON public.attendance
  FOR SELECT
  TO authenticated
  USING (public.is_admin());

-- No client INSERT/UPDATE/DELETE policies (All writes are server-side via service role)
