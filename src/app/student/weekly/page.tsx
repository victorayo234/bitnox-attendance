import React from "react";
import { cookies } from "next/headers";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import {
  lagosNow,
  toLagosDateString,
  getWeekRange,
} from "@/lib/attendance-rules";
import { format, parseISO, subDays, addDays } from "date-fns";
import { formatInTimeZone } from "date-fns-tz";
import { TIMEZONE } from "@/lib/config";
import {
  CalendarCheck,
  Clock,
  ChevronLeft,
  ChevronRight,
  ArrowLeft,
  Calendar,
  AlertCircle,
  Inbox,
} from "lucide-react";

export const metadata = {
  title: "Weekly Attendance | Bitnox Attendance",
};

export default async function WeeklyAttendancePage({
  searchParams,
}: {
  searchParams: Promise<{ week?: string }>;
}) {
  // 1. Authenticate student session on server
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return null;
  }

  // 2. Server time determination (supports dev_mock_time in development)
  const cookieStore = await cookies();
  const mockTimeCookie =
    process.env.NODE_ENV !== "production"
      ? cookieStore.get("dev_mock_time")?.value
      : null;
  const now =
    mockTimeCookie && !isNaN(new Date(mockTimeCookie).getTime())
      ? new Date(mockTimeCookie)
      : lagosNow();

  const todayDateStr = toLagosDateString(now);
  const currentWeek = getWeekRange(now);

  // 3. Resolve viewed week from query (safely clamped so user cannot go beyond current week)
  const { week: requestedDateStr } = await searchParams;
  let viewedWeek = currentWeek;

  if (requestedDateStr && /^\d{4}-\d{2}-\d{2}$/.test(requestedDateStr)) {
    // Cannot view weeks in the future beyond current week
    if (requestedDateStr <= currentWeek.startDate) {
      viewedWeek = getWeekRange(new Date(`${requestedDateStr}T12:00:00+01:00`));
      // Re-clamp if the resolved Monday happens to be after current week Monday
      if (viewedWeek.startDate > currentWeek.startDate) {
        viewedWeek = currentWeek;
      }
    }
  }

  // Navigation URLs
  const viewedMondayDate = parseISO(viewedWeek.startDate);
  const prevWeekMonday = format(subDays(viewedMondayDate, 7), "yyyy-MM-dd");
  const nextWeekMonday = format(addDays(viewedMondayDate, 7), "yyyy-MM-dd");

  const isCurrentWeek = viewedWeek.startDate === currentWeek.startDate;
  const canGoNext = !isCurrentWeek;

  // 4. Load attendance data strictly restricted to logged-in student (never accept student id from URL)
  const adminClient = createAdminClient();
  const { data: records } = await adminClient
    .from("attendance")
    .select("*")
    .eq("student_id", user.id) // Strictly enforced
    .gte("attendance_date", viewedWeek.startDate)
    .lte("attendance_date", viewedWeek.endDate)
    .order("attendance_date", { ascending: true });

  const recordsMap = new Map<string, any>();
  records?.forEach((rec) => {
    recordsMap.set(rec.attendance_date, rec);
  });

  // 5. Compute summary metrics for Monday-Friday
  let daysPresent = 0;
  let daysLate = 0;
  let daysAbsent = 0;

  viewedWeek.workdays.forEach((dayStr) => {
    const rec = recordsMap.get(dayStr);
    if (rec) {
      if (rec.status === "present") daysPresent++;
      if (rec.status === "late") daysLate++;
    } else if (dayStr < todayDateStr) {
      // Past workday with no record is Absent
      daysAbsent++;
    }
  });

  const weekHeaderFormatted = `${formatInTimeZone(viewedWeek.startOfWeek, TIMEZONE, "MMM d")} – ${formatInTimeZone(viewedWeek.endOfWeek, TIMEZONE, "MMM d, yyyy")}`;
  const totalRecordedDays = records ? records.length : 0;

  return (
    <div className="space-y-6 pb-24 md:pb-8">
      {/* Top Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-[#0B1B3F]">
            Weekly Attendance
          </h1>
          <p className="text-xs text-[#5E6C87] mt-0.5">
            Your attendance logs for Monday through Friday
          </p>
        </div>
        <Link
          href="/student"
          className="text-xs font-semibold text-[#5E6C87] hover:text-[#0B1B3F] inline-flex items-center py-2 px-3 rounded-full hover:bg-white transition-colors"
        >
          <ArrowLeft className="w-3.5 h-3.5 mr-1.5" />
          Dashboard
        </Link>
      </div>

      {/* Week Navigator (Previous / Next with Large Tap Targets) */}
      <Card className="bg-white border border-[#DDE3EE] p-3 shadow-xs">
        <div className="flex items-center justify-between">
          {/* Previous Week Button (min 44px tap target) */}
          <Button
            asChild
            variant="outline"
            size="sm"
            className="min-h-[44px] px-3.5 rounded-full text-xs font-semibold text-[#0B1B3F] border-[#DDE3EE] hover:bg-[#F1F4FB]"
          >
            <Link href={`/student/weekly?week=${prevWeekMonday}`}>
              <ChevronLeft className="w-4 h-4 mr-1 text-[#0B1B3F]" />
              Previous Week
            </Link>
          </Button>

          {/* Current Viewed Week Label */}
          <div className="text-center px-2">
            <span className="text-xs font-bold text-[#0B1B3F] block">
              {weekHeaderFormatted}
            </span>
            {isCurrentWeek ? (
              <span className="text-[10px] font-semibold text-[#16A34A] uppercase tracking-wider">
                Current Week
              </span>
            ) : (
              <span className="text-[10px] font-medium text-[#5E6C87]">
                Past Week
              </span>
            )}
          </div>

          {/* Next Week Button (disabled when viewed week is current week) */}
          {canGoNext ? (
            <Button
              asChild
              variant="outline"
              size="sm"
              className="min-h-[44px] px-3.5 rounded-full text-xs font-semibold text-[#0B1B3F] border-[#DDE3EE] hover:bg-[#F1F4FB]"
            >
              <Link href={`/student/weekly?week=${nextWeekMonday}`}>
                Next Week
                <ChevronRight className="w-4 h-4 ml-1 text-[#0B1B3F]" />
              </Link>
            </Button>
          ) : (
            <button
              disabled
              className="min-h-[44px] px-3.5 rounded-full text-xs font-medium text-gray-300 border border-gray-200 cursor-not-allowed flex items-center"
              title="Cannot navigate beyond the current week"
            >
              Next Week
              <ChevronRight className="w-4 h-4 ml-1 text-gray-300" />
            </button>
          )}
        </div>
      </Card>

      {/* Summary KPI Cards (Days Present, Days Late, Days Absent) */}
      <div className="grid grid-cols-3 gap-3">
        <Card className="p-3.5 text-center bg-green-50/50 border-green-200 shadow-xs">
          <p className="text-2xl font-bold text-[#16A34A]">{daysPresent}</p>
          <p className="text-xs font-semibold text-[#0B1B3F] mt-0.5">Present</p>
        </Card>
        <Card className="p-3.5 text-center bg-amber-50/50 border-amber-200 shadow-xs">
          <p className="text-2xl font-bold text-[#F59E0B]">{daysLate}</p>
          <p className="text-xs font-semibold text-[#0B1B3F] mt-0.5">Late</p>
        </Card>
        <Card className="p-3.5 text-center bg-red-50/50 border-red-200 shadow-xs">
          <p className="text-2xl font-bold text-[#EF4444]">{daysAbsent}</p>
          <p className="text-xs font-semibold text-[#0B1B3F] mt-0.5">Absent</p>
        </Card>
      </div>

      {/* Daily Schedule Card List */}
      <Card className="bg-white border border-[#DDE3EE] shadow-sm overflow-hidden">
        <CardHeader className="py-3.5 px-4 sm:px-5 border-b border-[#DDE3EE]/60 bg-[#FAFCFF]">
          <CardTitle className="text-sm font-bold text-[#0B1B3F] flex items-center gap-2">
            <CalendarCheck className="w-4 h-4 text-[#0B1B3F]" />
            Monday – Friday Schedule
          </CardTitle>
        </CardHeader>

        <CardContent className="p-0 divide-y divide-[#DDE3EE]/60">
          {viewedWeek.workdays.map((dayStr) => {
            const rec = recordsMap.get(dayStr);
            const dateObj = parseISO(dayStr);
            const dayName = format(dateObj, "EEEE");
            const formattedDate = format(dateObj, "MMM d");
            const isToday = dayStr === todayDateStr;
            const isFuture = dayStr > todayDateStr;

            let badgeVariant: "present" | "late" | "absent" | "neutral" = "neutral";
            let label = "-";

            if (rec) {
              badgeVariant = rec.status === "present" ? "present" : "late";
              label = rec.status === "present" ? "Present" : "Late";
            } else if (isToday) {
              badgeVariant = "neutral";
              label = "Today";
            } else if (!isFuture) {
              // Past workday with no record is Absent
              badgeVariant = "absent";
              label = "Absent";
            } else {
              badgeVariant = "neutral";
              label = "-";
            }

            const checkInFormatted = rec?.check_in_at
              ? formatInTimeZone(new Date(rec.check_in_at), TIMEZONE, "hh:mm a")
              : null;
            const checkOutFormatted = rec?.check_out_at
              ? formatInTimeZone(new Date(rec.check_out_at), TIMEZONE, "hh:mm a")
              : null;

            return (
              <div
                key={dayStr}
                className={`p-4 sm:px-5 flex items-center justify-between transition-colors ${
                  isToday ? "bg-[#F1F4FB]/70 font-medium" : "hover:bg-[#F9FBFE]"
                }`}
              >
                {/* Day Name and Date */}
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-sm text-[#0B1B3F]">
                      {dayName}
                    </span>
                    <span className="text-xs text-[#5E6C87]">
                      {formattedDate}
                    </span>
                    {isToday && (
                      <span className="text-[10px] font-bold uppercase tracking-wider bg-[#0B1B3F] text-white px-2 py-0.5 rounded-full">
                        Today
                      </span>
                    )}
                  </div>

                  {/* Timestamps */}
                  <div className="text-xs text-[#5E6C87] flex items-center gap-3">
                    <span className="inline-flex items-center gap-1">
                      <Clock className="w-3 h-3 text-[#16A34A]" />
                      In: <strong className="font-medium text-[#0B1B3F]">{checkInFormatted || "--"}</strong>
                    </span>

                    <span className="inline-flex items-center gap-1">
                      <Clock className="w-3 h-3 text-[#5E6C87]" />
                      Out: <strong className="font-medium text-[#0B1B3F]">{checkOutFormatted || "--"}</strong>
                    </span>
                  </div>
                </div>

                {/* Status Badge */}
                <div className="shrink-0">
                  <Badge variant={badgeVariant} withDot={rec !== undefined}>
                    {label}
                  </Badge>
                </div>
              </div>
            );
          })}
        </CardContent>

        {/* Empty State Banner (if no attendance has been recorded for the entire week) */}
        {totalRecordedDays === 0 && (
          <div className="p-6 text-center bg-[#F9FBFE] border-t border-[#DDE3EE]/60 space-y-2">
            <div className="w-10 h-10 rounded-full bg-white text-[#5E6C87] flex items-center justify-center mx-auto border border-[#DDE3EE] shadow-xs">
              <Inbox className="w-5 h-5" />
            </div>
            <p className="text-xs font-semibold text-[#0B1B3F]">
              {isCurrentWeek ? "No attendance recorded yet this week" : "No records found for this week"}
            </p>
            <p className="text-[11px] text-[#5E6C87] max-w-xs mx-auto">
              {isCurrentWeek
                ? "Your check-in and check-out logs will automatically appear here as you scan."
                : "No check-in or check-out records exist in the system for this week."}
            </p>
          </div>
        )}
      </Card>
    </div>
  );
}
