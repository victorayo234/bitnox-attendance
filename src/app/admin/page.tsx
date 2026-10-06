import React from "react";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getAdminAttendanceConsoleData } from "@/lib/admin-attendance";
import { AdminAttendanceConsole } from "@/components/AdminAttendanceConsole";

export const metadata = {
  title: "Admin Attendance Console | Bitnox Attendance",
  description: "Manage hub attendance records in Africa/Lagos",
};

export default async function AdminPage({
  searchParams,
}: {
  searchParams: Promise<{ date?: string }>;
}) {
  // 1. Verify session strictly on server
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login?role=admin");
  }

  // 2. Verify profile role & active status on server
  const adminClient = createAdminClient();
  const { data: profile } = await adminClient
    .from("profiles")
    .select("role, is_active, status")
    .eq("id", user.id)
    .single();

  if (!profile || !profile.is_active || profile.status !== "approved" || profile.role !== "admin") {
    redirect("/student");
  }

  // 3. Fetch initial attendance console data for requested date (or today in Lagos)
  const { date } = await searchParams;
  const initialData = await getAdminAttendanceConsoleData(date);

  return <AdminAttendanceConsole initialData={initialData} />;
}
