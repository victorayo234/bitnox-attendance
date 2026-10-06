import React from "react";
import Image from "next/image";
import Link from "next/link";
import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { Badge, Card, CardContent, LogoutButton } from "@/components";
import { ScanGate } from "@/components/ScanGate";
import { StudentDesktopNav, StudentMobileNav } from "@/components/StudentNav";
import { StudentBoundaryWatcher } from "@/components/StudentBoundaryWatcher";
import {
  lagosNow,
  toLagosDateString,
  getGateState,
} from "@/lib/attendance-rules";
import { Clock, AlertOctagon } from "lucide-react";

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

  // If user is an admin, redirect them to admin area
  if (profile.role !== "student") {
    redirect("/admin");
  }

  const firstName = profile.full_name?.trim().split(" ")[0] || "Student";

  // 3. Pending and rejected students see ONLY a status screen (with logout)
  if (profile.status === "pending" || profile.status === "rejected") {
    const isPending = profile.status === "pending";

    return (
      <div className="min-h-screen bg-[#F8FAFC] flex flex-col justify-between">
        <header className="sticky top-0 z-40 bg-white border-b border-[#DDE3EE] shadow-xs">
          <div className="max-w-md mx-auto px-4 h-16 flex items-center justify-between">
            <Image
              src="/images/bitnox-logo.png"
              alt="Bitnox Attendance"
              width={120}
              height={30}
              priority
              className="h-7 w-auto object-contain"
            />
            <LogoutButton />
          </div>
        </header>

        <main className="flex-1 max-w-md w-full mx-auto p-4 flex flex-col justify-center">
          <Card className="bg-white text-center shadow-xs border border-[#DDE3EE]">
            <CardContent className="p-6 space-y-4">
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-[#F1F4FB] text-[#0B1B3F]">
                {isPending ? (
                  <Clock className="h-7 w-7 text-[#F59E0B] animate-pulse" />
                ) : (
                  <AlertOctagon className="h-7 w-7 text-[#EF4444]" />
                )}
              </div>

              <div className="space-y-1.5">
                <h2 className="text-xl font-bold text-[#0B1B3F]">
                  {isPending ? "Enrollment Pending Approval" : "Enrollment Not Approved"}
                </h2>
                <p className="text-xs text-[#5E6C87] leading-relaxed px-1">
                  {isPending
                    ? `Hello ${firstName}, your account is waiting for administrator approval. Once approved, your attendance dashboard and QR scanner will activate.`
                    : `Hello ${firstName}, your student enrollment request was not approved. Please speak with the Bitnox administration at the hub.`}
                </p>
              </div>

              <div className="pt-2">
                <Badge variant={isPending ? "late" : "absent"} withDot>
                  {isPending ? "Status: Pending Review" : "Status: Rejected"}
                </Badge>
              </div>

              <div className="pt-4 border-t border-[#DDE3EE] flex justify-center">
                <LogoutButton />
              </div>
            </CardContent>
          </Card>
        </main>

        <footer className="border-t border-[#DDE3EE] bg-[#F5F8FE] py-4 text-center text-xs text-[#5E6C87]">
          Bitnox Attendance • Abeokuta Hub
        </footer>
      </div>
    );
  }

  // 4. Compute Gate State for Approved Students
  const cookieStore = await cookies();
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
  if (gateState === "GATE_BLOCKING") {
    return <ScanGate />;
  }

  // 6. Otherwise: render the normal layout with children and navigation
  return (
    <div className="min-h-screen bg-[#F5F8FE] flex flex-col justify-between">
      {/* Background Boundary Watcher: re-evaluates at 08:00, 12:00, and every 60s */}
      <StudentBoundaryWatcher />

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
            <span className="hidden sm:inline-block text-xs font-semibold text-[#0B1B3F]">
              {firstName}
            </span>
            <Badge variant="neutral" className="hidden sm:inline-flex">
              Student
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
