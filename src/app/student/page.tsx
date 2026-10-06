import { cookies } from "next/headers";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  lagosNow,
  toLagosDateString,
  getGateState,
} from "@/lib/attendance-rules";
import { formatInTimeZone } from "date-fns-tz";
import { TIMEZONE } from "@/lib/config";
import { StudentTodayCard } from "@/components/StudentTodayCard";
import Link from "next/link";
import { CalendarCheck, ChevronRight } from "lucide-react";
import { Card } from "@/components/ui/Card";

export const metadata = {
  title: "Student Dashboard | Bitnox Attendance",
};

export default async function StudentPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

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

  const adminClient = createAdminClient();

  // Load student profile
  const { data: profile } = await adminClient
    .from("profiles")
    .select("full_name, email")
    .eq("id", user?.id || "")
    .single();

  // Load today's attendance row
  const { data: todayRecord } = await adminClient
    .from("attendance")
    .select("*")
    .eq("student_id", user?.id || "")
    .eq("attendance_date", todayDate)
    .maybeSingle();

  // Compute gate state
  const gateState = getGateState(now, todayRecord);

  // If gate is blocking, layout renders ONLY ScanGate; page returns null
  if (gateState === "GATE_BLOCKING") {
    return null;
  }

  const firstName = profile?.full_name?.trim().split(" ")[0] || "Student";
  const lagosTimeFormatted = formatInTimeZone(now, TIMEZONE, "hh:mm a");
  const lagosDateFormatted = formatInTimeZone(now, TIMEZONE, "EEEE, MMMM d, yyyy");

  return (
    <div className="space-y-6 pb-20 md:pb-6">
      {/* Greeting Header */}
      <div className="space-y-1">
        <h1 className="text-2xl font-bold tracking-tight text-[#0B1B3F]">
          Welcome, {firstName}
        </h1>
        <p className="text-xs text-[#5E6C87]">{lagosDateFormatted}</p>
      </div>

      {/* Today Attendance Card */}
      <StudentTodayCard
        studentName={firstName}
        gateState={gateState}
        lagosTimeFormatted={lagosTimeFormatted}
        lagosDateFormatted={lagosDateFormatted}
        todayRecord={todayRecord}
      />

      {/* Quick Link to Weekly History */}
      <Card className="bg-white hover:bg-[#F8FAFE] transition-colors border border-[#DDE3EE]">
        <Link
          href="/student/weekly"
          className="flex items-center justify-between p-4"
        >
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-full bg-[#F1F4FB] text-[#0B1B3F]">
              <CalendarCheck className="w-5 h-5 text-[#0B1B3F]" />
            </div>
            <div>
              <h4 className="text-sm font-semibold text-[#0B1B3F]">
                View Weekly Attendance
              </h4>
              <p className="text-xs text-[#5E6C87]">
                Check your weekly punctuality and record breakdown
              </p>
            </div>
          </div>
          <ChevronRight className="w-5 h-5 text-[#5E6C87]" />
        </Link>
      </Card>
    </div>
  );
}
