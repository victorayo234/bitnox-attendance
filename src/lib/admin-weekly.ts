import { createAdminClient } from "@/lib/supabase/admin";
import {
  lagosNow,
  toLagosDateString,
  getWeekRange,
  TIMEZONE,
} from "@/lib/attendance-rules";
import { parseISO, subDays, addDays, format } from "date-fns";
import { formatInTimeZone } from "date-fns-tz";

export interface WeeklyDayCell {
  date: string;
  dayName: string;
  status: "P" | "L" | "A" | "" | "-";
  rawStatus: "present" | "late" | "absent" | "future" | "today_unrecorded";
  checkInFormatted: string | null;
  checkOutFormatted: string | null;
}

export interface WeeklyStudentRow {
  studentId: string;
  name: string;
  email: string;
  days: WeeklyDayCell[];
  totals: {
    present: number;
    late: number;
    absent: number;
    percentage: number;
  };
}

export interface WeeklyMatrixData {
  currentWeekStart: string;
  viewedWeekStart: string;
  viewedWeekEnd: string;
  workdays: { date: string; dayName: string; formattedDate: string }[];
  isCurrentWeek: boolean;
  canGoNext: boolean;
  prevWeekMonday: string;
  nextWeekMonday: string;
  weekHeaderFormatted: string;
  students: WeeklyStudentRow[];
  dayTotals: {
    date: string;
    present: number;
    late: number;
    absent: number;
  }[];
  overallStats: {
    totalStudents: number;
    totalPresent: number;
    totalLate: number;
    totalAbsent: number;
    averageAttendanceRate: number;
  };
}

/**
 * Loads all student attendance records for a specified week.
 * Guarded server-side with requireAdmin().
 * Optimized single batch query for 15-50 students.
 */
export async function getAdminWeeklyMatrixData(
  targetDateStr?: string
): Promise<WeeklyMatrixData> {
  const adminClient = createAdminClient();
  const now = lagosNow();
  const todayDate = toLagosDateString(now);
  const currentWeek = getWeekRange(now);

  let viewedWeek = currentWeek;
  if (targetDateStr && /^\d{4}-\d{2}-\d{2}$/.test(targetDateStr)) {
    if (targetDateStr <= currentWeek.startDate) {
      viewedWeek = getWeekRange(new Date(`${targetDateStr}T12:00:00+01:00`));
      if (viewedWeek.startDate > currentWeek.startDate) {
        viewedWeek = currentWeek;
      }
    }
  }

  const isCurrentWeek = viewedWeek.startDate === currentWeek.startDate;
  const canGoNext = !isCurrentWeek;

  const viewedMondayDate = parseISO(viewedWeek.startDate);
  const prevWeekMonday = format(subDays(viewedMondayDate, 7), "yyyy-MM-dd");
  const nextWeekMonday = format(addDays(viewedMondayDate, 7), "yyyy-MM-dd");

  const weekHeaderFormatted = `${formatInTimeZone(
    viewedWeek.startOfWeek,
    TIMEZONE,
    "MMM d"
  )} – ${formatInTimeZone(viewedWeek.endOfWeek, TIMEZONE, "MMM d, yyyy")}`;

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

  const students = rawStudents || [];
  const studentIds = students.map((s) => s.id);

  // 2. Batch fetch all attendance rows for Monday-Friday of the viewed week
  const fridayDate = viewedWeek.workdays[4];
  const { data: rawRecords, error: recordsError } = await adminClient
    .from("attendance")
    .select("student_id, attendance_date, check_in_at, check_out_at, status")
    .in("student_id", studentIds.length > 0 ? studentIds : ["00000000-0000-0000-0000-000000000000"])
    .gte("attendance_date", viewedWeek.startDate)
    .lte("attendance_date", fridayDate);

  if (recordsError) {
    throw new Error(`Failed to fetch attendance records: ${recordsError.message}`);
  }

  const recordsMap = new Map<string, any>();
  (rawRecords || []).forEach((r) => {
    recordsMap.set(`${r.student_id}:${r.attendance_date}`, r);
  });

  const formattedWorkdays = viewedWeek.workdays.map((dateStr) => {
    const d = parseISO(dateStr);
    return {
      date: dateStr,
      dayName: format(d, "EEE"), // Mon, Tue, Wed, Thu, Fri
      formattedDate: format(d, "MMM d"),
    };
  });

  // Track per-day totals across hub
  const dayStatsMap = new Map<string, { present: number; late: number; absent: number }>();
  viewedWeek.workdays.forEach((dayStr) => {
    dayStatsMap.set(dayStr, { present: 0, late: 0, absent: 0 });
  });

  let grandPresent = 0;
  let grandLate = 0;
  let grandAbsent = 0;

  // Elapsed workdays in viewed week up to today
  const elapsedWorkdaysCount = viewedWeek.workdays.filter((d) => d <= todayDate).length;
  const eligibleDays = isCurrentWeek ? Math.max(1, elapsedWorkdaysCount) : 5;

  // 3. Build student matrix rows
  const matrixStudents: WeeklyStudentRow[] = students.map((student) => {
    let studentPresent = 0;
    let studentLate = 0;
    let studentAbsent = 0;

    const days: WeeklyDayCell[] = viewedWeek.workdays.map((dayDate) => {
      const rec = recordsMap.get(`${student.id}:${dayDate}`);
      const isPast = dayDate < todayDate;
      const isToday = dayDate === todayDate;
      const isFuture = dayDate > todayDate;

      const checkInFormatted = rec?.check_in_at
        ? formatInTimeZone(new Date(rec.check_in_at), TIMEZONE, "hh:mm a")
        : null;
      const checkOutFormatted = rec?.check_out_at
        ? formatInTimeZone(new Date(rec.check_out_at), TIMEZONE, "hh:mm a")
        : null;

      const dayObj = parseISO(dayDate);
      const dayName = format(dayObj, "EEE");

      let cellStatus: "P" | "L" | "A" | "" | "-" = "";
      let rawStatus: "present" | "late" | "absent" | "future" | "today_unrecorded" = "future";

      if (rec) {
        if (rec.status === "present") {
          cellStatus = "P";
          rawStatus = "present";
          studentPresent++;
          const dStat = dayStatsMap.get(dayDate)!;
          dStat.present++;
        } else {
          cellStatus = "L";
          rawStatus = "late";
          studentLate++;
          const dStat = dayStatsMap.get(dayDate)!;
          dStat.late++;
        }
      } else if (isPast) {
        cellStatus = "A";
        rawStatus = "absent";
        studentAbsent++;
        const dStat = dayStatsMap.get(dayDate)!;
        dStat.absent++;
      } else if (isToday) {
        cellStatus = "-";
        rawStatus = "today_unrecorded";
      } else {
        cellStatus = "";
        rawStatus = "future";
      }

      return {
        date: dayDate,
        dayName,
        status: cellStatus,
        rawStatus,
        checkInFormatted,
        checkOutFormatted,
      };
    });

    grandPresent += studentPresent;
    grandLate += studentLate;
    grandAbsent += studentAbsent;

    const percentage = Math.round(
      ((studentPresent + studentLate) / Math.max(1, eligibleDays)) * 100
    );

    return {
      studentId: student.id,
      name: student.full_name || student.email || "Unknown Student",
      email: student.email,
      days,
      totals: {
        present: studentPresent,
        late: studentLate,
        absent: studentAbsent,
        percentage: Math.min(100, percentage),
      },
    };
  });

  const dayTotals = viewedWeek.workdays.map((dateStr) => {
    const s = dayStatsMap.get(dateStr)!;
    return {
      date: dateStr,
      present: s.present,
      late: s.late,
      absent: s.absent,
    };
  });

  const totalPossibleAttendances = Math.max(1, matrixStudents.length * eligibleDays);
  const averageAttendanceRate = Math.min(
    100,
    Math.round(((grandPresent + grandLate) / totalPossibleAttendances) * 100)
  );

  return {
    currentWeekStart: currentWeek.startDate,
    viewedWeekStart: viewedWeek.startDate,
    viewedWeekEnd: viewedWeek.endDate,
    workdays: formattedWorkdays,
    isCurrentWeek,
    canGoNext,
    prevWeekMonday,
    nextWeekMonday,
    weekHeaderFormatted,
    students: matrixStudents,
    dayTotals,
    overallStats: {
      totalStudents: matrixStudents.length,
      totalPresent: grandPresent,
      totalLate: grandLate,
      totalAbsent: grandAbsent,
      averageAttendanceRate,
    },
  };
}
