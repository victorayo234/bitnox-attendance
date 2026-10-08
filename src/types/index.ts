/**
 * Bitnox Attendance Core Types
 * Source of truth: PROJECT_BRIEF.md
 */

export type UserRole = "student" | "admin";

export type EnrollmentStatus = "pending" | "approved" | "rejected";

export type AttendanceStatus = "present" | "late" | "absent";

export interface Profile {
  id: string;
  email: string;
  full_name: string;
  role: UserRole;
  status: EnrollmentStatus;
  is_active: boolean;
  avatar_url?: string | null;
  created_at: string;
  updated_at?: string;
}

export interface AttendanceRecord {
  id: string;
  student_id: string;
  attendance_date: string; // YYYY-MM-DD in Africa/Lagos
  check_in_at: string | null; // ISO timestamp
  check_out_at: string | null; // ISO timestamp
  status: AttendanceStatus;
  marked_by_admin: boolean;
  created_at: string;
  profile?: Profile;
}

export type ScanAction = "check-in" | "check-out";

export interface ScanResult {
  success: boolean;
  message: string;
  action?: ScanAction;
  status?: AttendanceStatus;
  timestamp?: string;
}

export interface ApprovalDecision {
  id: string;
  student_id: string;
  decided_by: string | null;
  decision: "approved" | "rejected";
  note: string | null;
  previous_status: string | null;
  created_at: string;
}

