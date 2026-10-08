-- =====================================================================
-- Bitnox Attendance - Migration 004_approval_decisions.sql
-- 1. Create approval_decisions table for rejection history & decision tracking
-- 2. Indexes and RLS policies (Admins can SELECT, server-only writes)
-- 3. Backfill existing approved/rejected accounts
-- 4. Atomic stored procedure public.decide_student_approval
-- =====================================================================

-- 1. Create table approval_decisions
CREATE TABLE IF NOT EXISTS public.approval_decisions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  decided_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  decision text NOT NULL CHECK (decision IN ('approved', 'rejected')),
  note text CHECK (note IS NULL OR length(note) <= 200),
  previous_status text,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Indexes for fast student timeline and recent audit history queries
CREATE INDEX IF NOT EXISTS idx_approval_decisions_student ON public.approval_decisions(student_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_approval_decisions_created_at ON public.approval_decisions(created_at);

-- 2. Enable Row Level Security (RLS)
ALTER TABLE public.approval_decisions ENABLE ROW LEVEL SECURITY;

-- Admins can SELECT all rows (using existing is_admin() function)
DROP POLICY IF EXISTS "Admins can view approval decisions" ON public.approval_decisions;
CREATE POLICY "Admins can view approval decisions"
  ON public.approval_decisions
  FOR SELECT
  TO authenticated
  USING (public.is_admin());

-- Note: No INSERT, UPDATE, or DELETE policies exist for any client.
-- Only the server using the service_role key can insert or modify approval_decisions.
-- Students cannot read this table at all.

-- 3. Backfill: for profiles that are already status 'rejected' or 'approved' and have no row in approval_decisions,
-- insert one initial row with decided_by = null, decision matching status, note = null, and created_at from profile.
INSERT INTO public.approval_decisions (student_id, decided_by, decision, note, previous_status, created_at)
SELECT p.id, NULL, p.status, NULL, 'pending', COALESCE(p.created_at, now())
FROM public.profiles p
WHERE p.status IN ('approved', 'rejected')
  AND NOT EXISTS (
    SELECT 1 FROM public.approval_decisions d WHERE d.student_id = p.id
  );

-- 4. Atomic stored procedure: public.decide_student_approval
-- Performs guarded transition + audit log write in a single Postgres transaction.
CREATE OR REPLACE FUNCTION public.decide_student_approval(
  p_decided_by uuid,
  p_student_id uuid,
  p_decision text,
  p_note text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_caller_role text;
  v_caller_active boolean;
  v_caller_status text;
  v_target_role text;
  v_current_status text;
  v_clean_note text;
  v_new_status text;
  v_new_active boolean;
BEGIN
  -- Strict validation on decision argument
  IF p_decision NOT IN ('approved', 'rejected') THEN
    RETURN jsonb_build_object(
      'success', false,
      'status', 400,
      'error', 'Invalid decision. Must be approved or rejected.'
    );
  END IF;

  -- Clean and validate note (max 200 characters)
  v_clean_note := NULLIF(TRIM(p_note), '');
  IF v_clean_note IS NOT NULL AND length(v_clean_note) > 200 THEN
    RETURN jsonb_build_object(
      'success', false,
      'status', 400,
      'error', 'Note exceeds maximum length of 200 characters.'
    );
  END IF;

  -- Verify caller is an active, approved admin
  SELECT role, is_active, status INTO v_caller_role, v_caller_active, v_caller_status
  FROM public.profiles
  WHERE id = p_decided_by;

  IF NOT FOUND OR v_caller_role <> 'admin' OR NOT v_caller_active OR v_caller_status <> 'approved' THEN
    RETURN jsonb_build_object(
      'success', false,
      'status', 403,
      'error', 'Forbidden: Active administrator access required.'
    );
  END IF;

  -- Prevent self-decision
  IF p_decided_by = p_student_id THEN
    RETURN jsonb_build_object(
      'success', false,
      'status', 400,
      'error', 'Administrators cannot decide their own enrollment.'
    );
  END IF;

  -- Lock target row to serialize concurrent decisions on the same student
  SELECT role, status INTO v_target_role, v_current_status
  FROM public.profiles
  WHERE id = p_student_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object(
      'success', false,
      'status', 404,
      'error', 'Student not found.'
    );
  END IF;

  -- Target must be a student
  IF v_target_role <> 'student' THEN
    RETURN jsonb_build_object(
      'success', false,
      'status', 400,
      'error', 'Only student enrollments can be decided from this workflow.'
    );
  END IF;

  -- Enforce allowed transitions:
  -- 1. pending -> approved
  -- 2. pending -> rejected
  -- 3. rejected -> approved
  -- Any attempt to modify an already approved account is forbidden here (managed in /admin/students)
  IF v_current_status = 'approved' THEN
    RETURN jsonb_build_object(
      'success', false,
      'status', 409,
      'error', 'This request has already been decided.'
    );
  END IF;

  -- Attempting to reject an already rejected account is a 409
  IF v_current_status = 'rejected' AND p_decision = 'rejected' THEN
    RETURN jsonb_build_object(
      'success', false,
      'status', 409,
      'error', 'Only rejected requests can be approved from here.'
    );
  END IF;

  -- Prepare new state
  IF p_decision = 'approved' THEN
    v_new_status := 'approved';
    v_new_active := true;
  ELSE
    v_new_status := 'rejected';
    v_new_active := true; -- Keep active so they can see /pending rejected status and be approved later
  END IF;

  -- Guarded atomic update
  UPDATE public.profiles
  SET status = v_new_status,
      is_active = v_new_active
  WHERE id = p_student_id AND status = v_current_status;

  IF NOT FOUND THEN
    RETURN jsonb_build_object(
      'success', false,
      'status', 409,
      'error', 'This request has already been decided.'
    );
  END IF;

  -- Atomic insert into approval_decisions
  INSERT INTO public.approval_decisions (
    student_id,
    decided_by,
    decision,
    note,
    previous_status,
    created_at
  )
  VALUES (
    p_student_id,
    p_decided_by,
    p_decision,
    v_clean_note,
    v_current_status,
    now()
  );

  RETURN jsonb_build_object(
    'success', true,
    'status', 200,
    'decision', p_decision,
    'previous_status', v_current_status
  );
END;
$$;
