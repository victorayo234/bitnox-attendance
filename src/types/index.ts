/**
 * Bitnox Attendance Core Types
 * Source of truth: PROJECT_BRIEF.md
 */

export type UserRole = "student" | "admin";

export type AttendanceStatus = "present" | "late" | "absent";

export interface Profile {
  id: string;
  email: string;
  full_name: string;
  role: UserRole;
  avatar_url?: string | null;
  created_at: string;
  updated_at?: string;
}

export interface AttendanceRecord {
  id: string;
  student_id: string;
  attendance_date: string; // YYYY-MM-DD in Africa/Lagos
  check_in_time: string | null; // ISO timestamp
  check_out_time: string | null; // ISO timestamp
  status: AttendanceStatus;
  created_at: string;
  updated_at?: string;
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
