import { createAdminClient } from "@/lib/supabase/admin";
import {
  lagosNow,
  toLagosDateString,
  isWorkday,
  TIMEZONE,
} from "@/lib/attendance-rules";
import { formatInTimeZone } from "date-fns-tz";

export type AdminStudentStatus =
  | "Present"
  | "Late"
  | "Checked out"
  | "Absent"
  | "Not yet in"
  | "-";

export interface AttendanceConsoleStudent {
  studentId: string;
  name: string;
  email: string;
  attendanceId: string | null;
  checkInAt: string | null;
  checkOutAt: string | null;
  checkInFormatted: string | null;
  checkOutFormatted: string | null;
  status: AdminStudentStatus;
  rawStatus: "present" | "late" | null;
  markedByAdmin: boolean;
  isCheckedIn: boolean;
  isCheckedOut: boolean;
  isCurrentlyIn: boolean;
  isNotYetIn: boolean;
}

export interface AttendanceConsoleStats {
  totalActiveStudents: number;
  currentlyIn: number;
  checkedOut: number;
  notYetIn: number;
}

export interface AttendanceConsoleData {
  todayDate: string;
  selectedDate: string;
  isToday: boolean;
  isTodayWorkday: boolean;
  isPastDate: boolean;
  isFutureDate: boolean;
  stats: AttendanceConsoleStats;
  students: AttendanceConsoleStudent[];
}

/**
 * Retrieves full admin attendance console data for a given date.
 * Strictly verified server-side.
 */
export async function getAdminAttendanceConsoleData(
  targetDate?: string
): Promise<AttendanceConsoleData> {
  const adminClient = createAdminClient();
  const now = lagosNow();
  const todayDate = toLagosDateString(now);

  const selectedDate =
    targetDate && /^\d{4}-\d{2}-\d{2}$/.test(targetDate)
      ? targetDate
      : todayDate;

  const isToday = selectedDate === todayDate;
  const isPastDate = selectedDate < todayDate;
  const isFutureDate = selectedDate > todayDate;
  const isTodayWorkday = isWorkday(now);

  // 1. Fetch all active approved students
  const { data: rawStudents, error: studentsError } = await adminClient
    .from("profiles")
    .select("id, full_name, email")
    .eq("role", "student")
    .eq("status", "approved")
    .eq("is_active", true)
    .order("full_name", { ascending: true });

  if (studentsError) {
    throw new Error(`Failed to fetch students: ${studentsError.message}`);
  }

  const activeStudents = rawStudents || [];
  const activeStudentIds = new Set(activeStudents.map((s) => s.id));
  const totalActiveStudents = activeStudents.length;

  // 2. Fetch today's records for top stat cards (must be computed from today's Lagos date)
  const { data: rawTodayRecords, error: todayError } = await adminClient
    .from("attendance")
    .select("student_id, check_in_at, check_out_at, status, marked_by_admin")
    .eq("attendance_date", todayDate);

  if (todayError) {
    throw new Error(`Failed to fetch today's attendance records: ${todayError.message}`);
  }

  const todayRecords = (rawTodayRecords || []).filter((r) =>
    activeStudentIds.has(r.student_id)
  );

  let todayCurrentlyIn = 0;
  let todayCheckedOut = 0;
  let todayCheckedInCount = 0;

  todayRecords.forEach((rec) => {
    if (rec.check_in_at) {
      todayCheckedInCount++;
      if (rec.check_out_at) {
        todayCheckedOut++;
      } else {
        todayCurrentlyIn++;
      }
    }
  });

  // Not yet in = active students with no check-in today on a workday
  const todayNotYetIn = isTodayWorkday
    ? Math.max(0, totalActiveStudents - todayCheckedInCount)
    : 0;

  const stats: AttendanceConsoleStats = {
    totalActiveStudents,
    currentlyIn: todayCurrentlyIn,
    checkedOut: todayCheckedOut,
    notYetIn: todayNotYetIn,
  };

  // 3. Fetch records for selectedDate
  let selectedRecords = todayRecords;
  if (!isToday) {
    const { data: rawSelectedRecords, error: selectedError } = await adminClient
      .from("attendance")
      .select("id, student_id, attendance_date, check_in_at, check_out_at, status, marked_by_admin")
      .eq("attendance_date", selectedDate);

    if (selectedError) {
      throw new Error(`Failed to fetch attendance for ${selectedDate}: ${selectedError.message}`);
    }

    selectedRecords = (rawSelectedRecords || []).filter((r) =>
      activeStudentIds.has(r.student_id)
    );
  }

  const recordsMap = new Map<string, any>();
  selectedRecords.forEach((rec) => {
    recordsMap.set(rec.student_id, rec);
  });

  // 4. Build student items for the table
  const studentsList: AttendanceConsoleStudent[] = activeStudents.map((student) => {
    const rec = recordsMap.get(student.id);
    const isCheckedIn = Boolean(rec?.check_in_at);
    const isCheckedOut = Boolean(rec?.check_out_at);
    const isCurrentlyIn = isCheckedIn && !isCheckedOut;
    const isNotYetIn = !isCheckedIn;

    let status: AdminStudentStatus = "-";
    if (isCheckedOut) {
      status = "Checked out";
    } else if (isCheckedIn) {
      status = rec.status === "late" ? "Late" : "Present";
    } else if (isPastDate) {
      status = "Absent";
    } else if (isToday) {
      status = "Not yet in";
    } else {
      status = "-";
    }

    const checkInFormatted = rec?.check_in_at
      ? formatInTimeZone(new Date(rec.check_in_at), TIMEZONE, "hh:mm a")
      : null;

    const checkOutFormatted = rec?.check_out_at
      ? formatInTimeZone(new Date(rec.check_out_at), TIMEZONE, "hh:mm a")
      : null;

    return {
      studentId: student.id,
      name: student.full_name || student.email || "Unknown Student",
      email: student.email,
      attendanceId: rec?.id || null,
      checkInAt: rec?.check_in_at || null,
      checkOutAt: rec?.check_out_at || null,
      checkInFormatted,
      checkOutFormatted,
      status,
      rawStatus: (rec?.status as "present" | "late") || null,
      markedByAdmin: Boolean(rec?.marked_by_admin),
      isCheckedIn,
      isCheckedOut,
      isCurrentlyIn,
      isNotYetIn,
    };
  });

  // 5. Sort: currently-in first, then not-yet-in, then checked-out, alphabetical
  studentsList.sort((a, b) => {
    if (a.isCurrentlyIn && !b.isCurrentlyIn) return -1;
    if (!a.isCurrentlyIn && b.isCurrentlyIn) return 1;

    if (a.isNotYetIn && !b.isNotYetIn) return -1;
    if (!a.isNotYetIn && b.isNotYetIn) return 1;

    if (a.isCheckedOut && !b.isCheckedOut) return -1;
    if (!a.isCheckedOut && b.isCheckedOut) return 1;

    return a.name.localeCompare(b.name);
  });

  return {
    todayDate,
    selectedDate,
    isToday,
    isTodayWorkday,
    isPastDate,
    isFutureDate,
    stats,
    students: studentsList,
  };
}
