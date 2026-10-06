import React from "react";
import { redirect } from "next/navigation";
import { requireAdmin } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  lagosNow,
  toLagosDateString,
  isWorkday,
  TIMEZONE,
} from "@/lib/attendance-rules";
import { formatInTimeZone } from "date-fns-tz";
import {
  AdminStudentsDirectory,
  AdminStudentItem,
} from "@/components/AdminStudentsDirectory";

export const metadata = {
  title: "Students Directory | Bitnox Attendance",
  description: "Manage students, enrollments, credentials, and attendance status",
};

export default async function AdminStudentsPage() {
  // 1. Guard server-side with requireAdmin()
  const adminAuth = await requireAdmin();
  if (!adminAuth) {
    redirect("/login?role=admin");
  }

  const adminClient = createAdminClient();
  const now = lagosNow();
  const todayDate = toLagosDateString(now);
  const isTodayWorkday = isWorkday(now);

  // 2. Fetch all students (role = 'student')
  const { data: rawStudents, error: studentsError } = await adminClient
    .from("profiles")
    .select("id, full_name, email, is_active, status, created_at")
    .eq("role", "student")
    .order("full_name", { ascending: true });

  if (studentsError) {
    throw new Error(`Failed to fetch students: ${studentsError.message}`);
  }

  const studentsList = rawStudents || [];
  const studentIds = studentsList.map((s) => s.id);

  // 3. Batch fetch today's attendance records
  const { data: rawTodayRecords, error: todayError } = await adminClient
    .from("attendance")
    .select("student_id, check_in_at, check_out_at, status")
    .in("student_id", studentIds.length > 0 ? studentIds : ["00000000-0000-0000-0000-000000000000"])
    .eq("attendance_date", todayDate);

  if (todayError) {
    throw new Error(`Failed to fetch today's attendance records: ${todayError.message}`);
  }

  const todayMap = new Map<string, any>();
  (rawTodayRecords || []).forEach((r) => {
    todayMap.set(r.student_id, r);
  });

  // 4. Map into AdminStudentItem
  const initialStudents: AdminStudentItem[] = studentsList.map((student) => {
    const rec = todayMap.get(student.id);

    let todayStatus: "Present" | "Late" | "Checked out" | "Not yet in" | "Off" =
      isTodayWorkday ? "Not yet in" : "Off";

    if (rec?.check_out_at) {
      todayStatus = "Checked out";
    } else if (rec?.check_in_at) {
      todayStatus = rec.status === "late" ? "Late" : "Present";
    }

    const todayCheckIn = rec?.check_in_at
      ? formatInTimeZone(new Date(rec.check_in_at), TIMEZONE, "hh:mm a")
      : null;

    const todayCheckOut = rec?.check_out_at
      ? formatInTimeZone(new Date(rec.check_out_at), TIMEZONE, "hh:mm a")
      : null;

    return {
      id: student.id,
      name: student.full_name || student.email || "Unknown Student",
      email: student.email,
      isActive: student.is_active,
      status: student.status,
      todayStatus,
      todayCheckIn,
      todayCheckOut,
      createdAt: student.created_at,
    };
  });

  return <AdminStudentsDirectory initialStudents={initialStudents} />;
}
