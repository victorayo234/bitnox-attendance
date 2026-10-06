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
  RoleActivityItem,
} from "@/components/AdminStudentsDirectory";

export const metadata = {
  title: "Students Directory | Bitnox Attendance",
  description: "Manage accounts, administrative roles, and attendance status",
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

  // 2. Fetch ALL approved accounts (both students and admins)
  // Pending and rejected accounts stay strictly in /admin/approvals
  const { data: rawProfiles, error: profilesError } = await adminClient
    .from("profiles")
    .select("id, full_name, email, role, is_active, status, created_at")
    .eq("status", "approved");

  if (profilesError) {
    throw new Error(`Failed to fetch accounts: ${profilesError.message}`);
  }

  const profilesList = rawProfiles || [];

  // Sort admins first, then students alphabetically by name
  profilesList.sort((a, b) => {
    if (a.role === "admin" && b.role !== "admin") return -1;
    if (a.role !== "admin" && b.role === "admin") return 1;
    const nameA = (a.full_name || a.email || "").toLowerCase();
    const nameB = (b.full_name || b.email || "").toLowerCase();
    return nameA.localeCompare(nameB);
  });

  const accountIds = profilesList.map((p) => p.id);

  // 3. Batch fetch today's attendance records
  const { data: rawTodayRecords, error: todayError } = await adminClient
    .from("attendance")
    .select("student_id, check_in_at, check_out_at, status")
    .in(
      "student_id",
      accountIds.length > 0 ? accountIds : ["00000000-0000-0000-0000-000000000000"]
    )
    .eq("attendance_date", todayDate);

  if (todayError) {
    throw new Error(`Failed to fetch today's attendance records: ${todayError.message}`);
  }

  const todayMap = new Map<string, any>();
  (rawTodayRecords || []).forEach((r) => {
    todayMap.set(r.student_id, r);
  });

  // 4. Map into AdminStudentItem
  const initialStudents: AdminStudentItem[] = profilesList.map((profile) => {
    const rec = todayMap.get(profile.id);

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
      id: profile.id,
      name: profile.full_name || profile.email || "Unknown Account",
      email: profile.email,
      role: (profile.role === "admin" ? "admin" : "student") as "admin" | "student",
      isActive: profile.is_active,
      status: profile.status,
      todayStatus,
      todayCheckIn,
      todayCheckOut,
      createdAt: profile.created_at,
    };
  });

  // 5. Fetch last 20 role changes for the "Admin activity" audit section
  const { data: rawRoleChanges } = await adminClient
    .from("role_changes")
    .select("id, changed_by, target_user, old_role, new_role, created_at")
    .order("created_at", { ascending: false })
    .limit(20);

  const actorAndTargetIds = Array.from(
    new Set([
      ...(rawRoleChanges || []).map((r) => r.changed_by),
      ...(rawRoleChanges || []).map((r) => r.target_user),
    ])
  );

  let userMap = new Map<string, string>();
  if (actorAndTargetIds.length > 0) {
    const { data: userProfiles } = await adminClient
      .from("profiles")
      .select("id, full_name, email")
      .in("id", actorAndTargetIds);

    (userProfiles || []).forEach((u) => {
      userMap.set(u.id, u.full_name || u.email || "Unknown");
    });
  }

  const roleActivity: RoleActivityItem[] = (rawRoleChanges || []).map((rc) => ({
    id: rc.id,
    actorName: userMap.get(rc.changed_by) || "Administrator",
    targetName: userMap.get(rc.target_user) || "Account",
    oldRole: rc.old_role,
    newRole: rc.new_role,
    createdAt: formatInTimeZone(
      new Date(rc.created_at),
      TIMEZONE,
      "MMM d, yyyy 'at' hh:mm a"
    ),
  }));

  return (
    <AdminStudentsDirectory
      initialStudents={initialStudents}
      currentAdminId={adminAuth.user.id}
      roleActivity={roleActivity}
    />
  );
}
