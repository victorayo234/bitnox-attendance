import { cookies } from "next/headers";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  lagosNow,
  toLagosDateString,
  getGateState,
  isWorkday,
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

      const isWorkdayToday = isWorkday(now);

      return (
        <div className="space-y-6 pb-20 md:pb-6">
          {/* Greeting Header */}
          <div className="space-y-1">
            <h1 className="text-2xl font-semibold text-primary leading-8">
              Welcome, {firstName}
            </h1>
            <p className="text-sm text-muted leading-5">{lagosDateFormatted}</p>
          </div>

          {/* Today Attendance Card */}
          <StudentTodayCard
            studentName={firstName}
            gateState={gateState}
            lagosTimeFormatted={lagosTimeFormatted}
            lagosDateFormatted={lagosDateFormatted}
            todayRecord={todayRecord}
            isWorkday={isWorkdayToday}
          />

          {/* Small text link under status card */}
          <div className="text-center pt-1">
            <Link
              href="/student/weekly"
              className="text-sm font-medium text-muted hover:text-primary transition-colors inline-flex items-center gap-1.5"
            >
              <span>See this week</span>
              <ChevronRight className="w-4 h-4 text-muted" />
            </Link>
          </div>
        </div>
      );
}
