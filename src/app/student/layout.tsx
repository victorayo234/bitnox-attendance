import React from "react";
import Image from "next/image";
import Link from "next/link";
import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { Badge, LogoutButton } from "@/components";
import { ScanGate } from "@/components/ScanGate";
import { StudentHeader, StudentMobileNav } from "@/components/StudentNav";
import { StudentBoundaryWatcher } from "@/components/StudentBoundaryWatcher";
import {
  lagosNow,
  toLagosDateString,
  getGateState,
} from "@/lib/attendance-rules";
import { Shield, ArrowRight } from "lucide-react";

export default async function StudentLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();

  // 1. Verify session on the server
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login?role=student");
  }

  // 2. Verify profile and role on the server
  const adminClient = createAdminClient();
  const { data: profile } = await adminClient
    .from("profiles")
    .select("full_name, role, status, is_active")
    .eq("id", user.id)
    .single();

  if (!profile || !profile.is_active) {
    await supabase.auth.signOut();
    redirect("/login?role=student");
  }

  // Check if an admin is explicitly using student preview mode
  const cookieStore = await cookies();
  const isStudentViewForAdmin =
    cookieStore.get("admin_student_view")?.value === "1";

  // Item 21: A student promoted while logged in lands on the admin console upon refreshing
  if (profile.role !== "student" && !isStudentViewForAdmin) {
    redirect("/admin");
  }

  // 3. Pending and rejected students are redirected to /pending
  if (profile.status === "pending" || profile.status === "rejected") {
    redirect("/pending");
  }

  // 4. Compute Gate State for Approved Students
  const mockTimeCookie =
    process.env.NODE_ENV !== "production"
      ? cookieStore.get("dev_mock_time")?.value
      : null;
  const now =
    mockTimeCookie && !isNaN(new Date(mockTimeCookie).getTime())
      ? new Date(mockTimeCookie)
      : lagosNow();

  const todayDate = toLagosDateString(now);

  const { data: todayRecord } = await adminClient
    .from("attendance")
    .select("*")
    .eq("student_id", user.id)
    .eq("attendance_date", todayDate)
    .maybeSingle();

  const gateState = getGateState(now, todayRecord);

  // 5. IF GATE_BLOCKING: render ONLY the full-screen <ScanGate />
  // Children are NOT rendered at all so it cannot be bypassed in dev tools
  // (Admins in preview bypass gate blocking so they can inspect student pages)
  if (gateState === "GATE_BLOCKING" && profile.role === "student") {
    return <ScanGate />;
  }

  // 6. Otherwise: render the normal layout with children and navigation
  return (
    <div className="min-h-screen bg-[#F5F8FE] flex flex-col justify-between">
      {/* Background Boundary Watcher: re-evaluates at 08:00, 12:00, and every 60s */}
      <StudentBoundaryWatcher />

      {/* Admin Preview Mode Top Bar (Item 21: slim navy strip 36-40px tall, 13px text) */}
      {profile.role === "admin" && (
        <div className="bg-primary text-white px-4 h-9 sm:h-10 text-[13px] flex items-center justify-between border-b border-white/10 shadow-xs">
          <div className="flex items-center gap-2">
            <Shield className="w-4 h-4 text-white/80" />
            <span>Viewing the student portal as an administrator</span>
          </div>
          <Link
            href="/api/view-mode?mode=admin"
            className="text-white hover:text-accent hover:underline flex items-center gap-1.5 transition-colors font-medium text-xs sm:text-[13px]"
          >
            <span>Back to admin console</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>
      )}

      {/* Top Header with Desktop Navigation & Mobile User Popover */}
      <StudentHeader
        userName={profile.full_name || "Student"}
        userEmail={user.email || ""}
        userRole={profile.role}
        isAdminPreview={isStudentViewForAdmin}
      />

      {/* Main Page Area */}
      <main className="flex-1 max-w-lg w-full mx-auto p-4 sm:p-6 pb-20 md:pb-8">
        {children}
      </main>

      {/* Mobile Bottom Navigation Bar */}
      <StudentMobileNav />

      {/* Desktop Footer */}
      <footer className="hidden md:block border-t border-border bg-footer py-4 text-center text-xs text-muted">
        Bitnox Attendance • Abeokuta Hub
      </footer>
    </div>
  );
}
