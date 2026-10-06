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
import {
  StudentHistoryView,
  StudentWeekGroup,
  RoleHistoryItem,
} from "./StudentHistoryView";
import { parseISO, format } from "date-fns";
import { formatInTimeZone } from "date-fns-tz";
import { isValidUuid } from "@/lib/role-guard";

export const metadata = {
  title: "Account Details & History | Bitnox Attendance",
  description: "Detailed account history, attendance records, and administrative role tracking",
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
  if (!studentId || !isValidUuid(studentId)) {
    notFound();
  }

  const adminClient = createAdminClient();

  // 2. Fetch profile (approved student or admin)
  const { data: student, error: studentError } = await adminClient
    .from("profiles")
    .select("*")
    .eq("id", studentId)
    .maybeSingle();

  if (studentError || !student) {
    notFound();
  }

  // 3. Fetch all attendance records for this account
  const { data: records, error: recordsError } = await adminClient
    .from("attendance")
    .select("*")
    .eq("student_id", studentId)
    .order("attendance_date", { ascending: false });

  if (recordsError) {
    throw new Error(`Failed to fetch attendance: ${recordsError.message}`);
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

  // 4. Fetch Role History from role_changes for this user
  const { data: rawRoleChanges } = await adminClient
    .from("role_changes")
    .select("id, changed_by, target_user, old_role, new_role, created_at")
    .eq("target_user", studentId)
    .order("created_at", { ascending: false });

  const changerIds = Array.from(
    new Set((rawRoleChanges || []).map((rc) => rc.changed_by))
  );

  let changerMap = new Map<string, string>();
  if (changerIds.length > 0) {
    const { data: changers } = await adminClient
      .from("profiles")
      .select("id, full_name, email")
      .in("id", changerIds);

    (changers || []).forEach((c) => {
      changerMap.set(c.id, c.full_name || c.email || "Administrator");
    });
  }

  const roleHistory: RoleHistoryItem[] = (rawRoleChanges || []).map((rc) => {
    return {
      id: rc.id,
      adminName: changerMap.get(rc.changed_by) || "Administrator",
      action:
        rc.new_role === "admin"
          ? "Promoted to admin"
          : "Removed as admin",
      timestampLagos: formatInTimeZone(
        new Date(rc.created_at),
        TIMEZONE,
        "MMM d, yyyy 'at' hh:mm a"
      ),
    };
  });

  return (
    <StudentHistoryView
      student={student}
      weeks={weeks}
      totalPresent={grandPresent}
      totalLate={grandLate}
      totalAbsent={grandAbsent}
      attendanceRate={attendanceRate}
      currentAdminId={adminAuth.user.id}
      roleHistory={roleHistory}
    />
  );
}
