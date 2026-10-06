import React from "react";
import Image from "next/image";
import Link from "next/link";
import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { Badge, LogoutButton } from "@/components";
import { ScanGate } from "@/components/ScanGate";
import { StudentDesktopNav, StudentMobileNav } from "@/components/StudentNav";
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

  const firstName = profile.full_name?.trim().split(" ")[0] || "Student";

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

      {/* Admin Preview Mode Top Bar (Item 21) */}
      {profile.role === "admin" && (
        <div className="bg-[#0B1B3F] text-white px-4 py-2 text-xs flex items-center justify-between border-b border-[#00E6FF]/20 shadow-xs">
          <div className="flex items-center gap-2">
            <Shield className="w-3.5 h-3.5 text-[#00E6FF]" />
            <span>Viewing student portal as Administrator</span>
          </div>
          <Link
            href="/api/view-mode?mode=admin"
            className="font-bold text-[#00E6FF] hover:underline flex items-center gap-1"
          >
            Go to admin console
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>
      )}

      {/* Top Header with Desktop Navigation */}
      <header className="sticky top-0 z-40 bg-white border-b border-[#DDE3EE] shadow-xs">
        <div className="max-w-4xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center space-x-8">
            <Link href="/student" className="flex flex-col">
              <Image
                src="/images/bitnox-logo.png"
                alt="Bitnox Attendance"
                width={120}
                height={30}
                priority
                className="h-7 w-auto object-contain"
              />
              <div className="h-0.5 w-8 bg-[#00E6FF] rounded-full mt-0.5" />
            </Link>

            {/* Desktop Navigation */}
            <StudentDesktopNav />
          </div>

          <div className="flex items-center space-x-3">
            {profile.role === "admin" && (
              <Link
                href="/api/view-mode?mode=admin"
                className="text-xs font-bold text-[#0B1B3F] bg-[#00E6FF]/20 hover:bg-[#00E6FF]/30 px-3 py-1.5 rounded-full border border-[#00E6FF]/30 transition-colors"
              >
                Go to admin console
              </Link>
            )}

            <span className="hidden sm:inline-block text-xs font-semibold text-[#0B1B3F]">
              {firstName}
            </span>
            <Badge variant="neutral" className="hidden sm:inline-flex">
              {profile.role === "admin" ? "Admin" : "Student"}
            </Badge>
            <LogoutButton />
          </div>
        </div>
      </header>

      {/* Main Page Area */}
      <main className="flex-1 max-w-lg w-full mx-auto p-4 sm:p-6">
        {children}
      </main>

      {/* Mobile Bottom Navigation Bar */}
      <StudentMobileNav />

      {/* Desktop Footer */}
      <footer className="hidden md:block border-t border-[#DDE3EE] bg-white py-4 text-center text-xs text-[#5E6C87]">
        Bitnox Attendance • Abeokuta Hub
      </footer>
    </div>
  );
}
