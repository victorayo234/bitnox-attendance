-- =====================================================================
-- Bitnox Attendance - Migration 004_atomic_role_and_deactivate.sql
-- 1. Atomic, race-safe stored procedure for changing roles
-- 2. Atomic, race-safe stored procedure for deactivating users
-- =====================================================================

-- 1. change_user_role function
CREATE OR REPLACE FUNCTION public.change_user_role(
  p_changed_by uuid,
  p_target_user uuid,
  p_new_role text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_old_role text;
  v_is_active boolean;
  v_status text;
  v_caller_role text;
  v_caller_active boolean;
  v_caller_status text;
  v_admin_count int;
BEGIN
  -- Strict validation on role argument
  IF p_new_role NOT IN ('student', 'admin') THEN
    RETURN jsonb_build_object('success', false, 'error', 'Invalid role. Must be admin or student.');
  END IF;

  -- Verify caller is an active, approved admin
  SELECT role, is_active, status INTO v_caller_role, v_caller_active, v_caller_status
  FROM public.profiles
  WHERE id = p_changed_by;

  IF NOT FOUND OR v_caller_role <> 'admin' OR NOT v_caller_active OR v_caller_status <> 'approved' THEN
    RETURN jsonb_build_object('success', false, 'error', 'Forbidden: Active administrator access required.');
  END IF;

  -- Prevent self-role modification
  IF p_changed_by = p_target_user THEN
    RETURN jsonb_build_object('success', false, 'error', 'You cannot change your own role.');
  END IF;

  -- Acquire transaction-level advisory lock to serialize concurrent role changes
  PERFORM pg_advisory_xact_lock(424242);

  -- Fetch target profile
  SELECT role, is_active, status INTO v_old_role, v_is_active, v_status
  FROM public.profiles
  WHERE id = p_target_user;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'User not found.');
  END IF;

  -- Promotion conditions
  IF p_new_role = 'admin' THEN
    IF NOT v_is_active THEN
      RETURN jsonb_build_object('success', false, 'error', 'Cannot promote a deactivated account.');
    END IF;
    IF v_status <> 'approved' THEN
      RETURN jsonb_build_object('success', false, 'error', 'Only approved, active students can be promoted.');
    END IF;
  END IF;

  -- Demotion conditions: Protect last admin
  IF p_new_role = 'student' AND v_old_role = 'admin' THEN
    SELECT count(*) INTO v_admin_count
    FROM public.profiles
    WHERE role = 'admin' AND is_active = true;

    IF v_admin_count <= 1 THEN
      RETURN jsonb_build_object('success', false, 'error', 'Cannot remove the last admin.');
    END IF;
  END IF;

  -- Idempotency check
  IF v_old_role = p_new_role THEN
    RETURN jsonb_build_object(
      'success', true,
      'noop', true,
      'message', 'User is already a ' || p_new_role
    );
  END IF;

  -- Update target profile role
  UPDATE public.profiles
  SET role = p_new_role
  WHERE id = p_target_user;

  -- Insert audit log into role_changes
  INSERT INTO public.role_changes (changed_by, target_user, old_role, new_role)
  VALUES (p_changed_by, p_target_user, v_old_role, p_new_role);

  RETURN jsonb_build_object(
    'success', true,
    'message', 'Role changed successfully to ' || p_new_role,
    'old_role', v_old_role,
    'new_role', p_new_role
  );
END;
$$;

-- 2. deactivate_user function
CREATE OR REPLACE FUNCTION public.deactivate_user(
  p_changed_by uuid,
  p_target_user uuid,
  p_is_active boolean
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_target_role text;
  v_admin_count int;
BEGIN
  -- Prevent deactivating self
  IF p_changed_by = p_target_user AND NOT p_is_active THEN
    RETURN jsonb_build_object('success', false, 'error', 'You cannot deactivate your own account.');
  END IF;

  -- Acquire transaction-level advisory lock
  PERFORM pg_advisory_xact_lock(424242);

  SELECT role INTO v_target_role
  FROM public.profiles
  WHERE id = p_target_user;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'User not found.');
  END IF;

  -- If deactivating an admin, ensure at least one other active admin remains
  IF v_target_role = 'admin' AND NOT p_is_active THEN
    SELECT count(*) INTO v_admin_count
    FROM public.profiles
    WHERE role = 'admin' AND is_active = true AND id <> p_target_user;

    IF v_admin_count = 0 THEN
      RETURN jsonb_build_object('success', false, 'error', 'Cannot deactivate the last active administrator.');
    END IF;
  END IF;

  UPDATE public.profiles
  SET is_active = p_is_active
  WHERE id = p_target_user;

  RETURN jsonb_build_object('success', true);
END;
$$;
