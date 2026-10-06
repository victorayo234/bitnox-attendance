import React from "react";
import { notFound, redirect } from "next/navigation";
import { requireAdmin } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  lagosNow,
  toLagosDateString,
  getWeekRange,
  TIMEZONE,
} from "@/lib/attendance-rules";
import { StudentHistoryView, StudentWeekGroup } from "./StudentHistoryView";
import { parseISO, format } from "date-fns";
import { formatInTimeZone } from "date-fns-tz";

export const metadata = {
  title: "Student History | Bitnox Attendance",
  description: "Detailed weekly attendance history for student",
};

export default async function StudentDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  // 1. Guard server-side with requireAdmin()
  const adminAuth = await requireAdmin();
  if (!adminAuth) {
    redirect("/login?role=admin");
  }

  const { id: studentId } = await params;
  if (!studentId || !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(studentId)) {
    notFound();
  }

  const adminClient = createAdminClient();

  // 2. Fetch student profile
  const { data: student, error: studentError } = await adminClient
    .from("profiles")
    .select("*")
    .eq("id", studentId)
    .maybeSingle();

  if (studentError || !student || student.role !== "student") {
    notFound();
  }

  // 3. Fetch all attendance records for this student
  const { data: records, error: recordsError } = await adminClient
    .from("attendance")
    .select("*")
    .eq("student_id", studentId)
    .order("attendance_date", { ascending: false });

  if (recordsError) {
    throw new Error(`Failed to fetch student attendance: ${recordsError.message}`);
  }

  const now = lagosNow();
  const todayDate = toLagosDateString(now);
  const currentWeek = getWeekRange(now);

  const recordsMap = new Map<string, any>();
  records?.forEach((rec) => {
    recordsMap.set(rec.attendance_date, rec);
  });

  // Collect unique weeks to present (current week + all weeks with records)
  const weekStartDatesSet = new Set<string>();
  weekStartDatesSet.add(currentWeek.startDate);

  records?.forEach((rec) => {
    const recWeek = getWeekRange(new Date(`${rec.attendance_date}T12:00:00+01:00`));
    weekStartDatesSet.add(recWeek.startDate);
  });

  const sortedWeekStarts = Array.from(weekStartDatesSet).sort().reverse();

  let grandPresent = 0;
  let grandLate = 0;
  let grandAbsent = 0;

  const weeks: StudentWeekGroup[] = sortedWeekStarts.map((weekStart) => {
    const weekRange = getWeekRange(new Date(`${weekStart}T12:00:00+01:00`));
    const weekLabel = `${formatInTimeZone(
      weekRange.startOfWeek,
      TIMEZONE,
      "MMM d"
    )} – ${formatInTimeZone(weekRange.endOfWeek, TIMEZONE, "MMM d, yyyy")}`;

    let weekPresent = 0;
    let weekLate = 0;
    let weekAbsent = 0;

    const days = weekRange.workdays.map((dayDate) => {
      const rec = recordsMap.get(dayDate) || null;
      const isPast = dayDate < todayDate;
      const isToday = dayDate === todayDate;
      const dayObj = parseISO(dayDate);
      const dayName = format(dayObj, "EEEE");

      let status: "Present" | "Late" | "Absent" | "Today" | "-" = "-";
      if (rec) {
        if (rec.status === "present") {
          status = "Present";
          weekPresent++;
        } else {
          status = "Late";
          weekLate++;
        }
      } else if (isPast) {
        status = "Absent";
        weekAbsent++;
      } else if (isToday) {
        status = "Today";
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
        date: dayDate,
        dayName,
        rec,
        status,
        checkInFormatted,
        checkOutFormatted,
      };
    });

    grandPresent += weekPresent;
    grandLate += weekLate;
    grandAbsent += weekAbsent;

    return {
      weekKey: weekStart,
      weekStart: weekRange.startDate,
      weekEnd: weekRange.endDate,
      weekLabel,
      days,
      totals: {
        present: weekPresent,
        late: weekLate,
        absent: weekAbsent,
      },
    };
  });

  const totalEvaluatedDays = grandPresent + grandLate + grandAbsent;
  const attendanceRate =
    totalEvaluatedDays > 0
      ? Math.round(((grandPresent + grandLate) / totalEvaluatedDays) * 100)
      : 100;

  return (
    <StudentHistoryView
      student={student}
      weeks={weeks}
      totalPresent={grandPresent}
      totalLate={grandLate}
      totalAbsent={grandAbsent}
      attendanceRate={attendanceRate}
    />
  );
}
