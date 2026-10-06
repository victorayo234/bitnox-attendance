-- =====================================================================
-- Bitnox Attendance - Migration 002_student_enrollment.sql
-- Adds status column to profiles ('pending', 'approved', 'rejected')
-- Ensures self-registered students start in 'pending' status
-- =====================================================================

-- 1. Add enrollment status column to profiles
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS status text NOT NULL CHECK (status IN ('pending', 'approved', 'rejected')) DEFAULT 'pending';

-- 2. Update existing accounts to approved
UPDATE public.profiles
SET status = 'approved'
WHERE status = 'pending';
