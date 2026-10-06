import React from "react";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { Card, CardHeader, CardTitle, CardContent, Badge } from "@/components";
import {
  lagosNow,
  toLagosDateString,
  getWeekRange,
} from "@/lib/attendance-rules";
import { format, parseISO } from "date-fns";
import { formatInTimeZone } from "date-fns-tz";
import { TIMEZONE } from "@/lib/config";
import { CalendarCheck, Clock, CheckCircle2, AlertCircle, ArrowLeft } from "lucide-react";
import Link from "next/link";

export const metadata = {
  title: "Weekly Attendance | Bitnox Attendance",
};

export default async function WeeklyAttendancePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const now = lagosNow();
  const week = getWeekRange(now);
  const todayDateStr = toLagosDateString(now);

  const adminClient = createAdminClient();
  const { data: records } = await adminClient
    .from("attendance")
    .select("*")
    .eq("student_id", user?.id || "")
    .gte("attendance_date", week.startDate)
    .lte("attendance_date", week.endDate)
    .order("attendance_date", { ascending: true });

  const recordsMap = new Map<string, any>();
  records?.forEach((rec) => {
    recordsMap.set(rec.attendance_date, rec);
  });

  // Calculate stats
  let presentCount = 0;
  let lateCount = 0;
  let missedCount = 0;

  week.workdays.forEach((dayStr) => {
    const rec = recordsMap.get(dayStr);
    if (rec) {
      if (rec.status === "present") presentCount++;
      if (rec.status === "late") lateCount++;
    } else if (dayStr < todayDateStr) {
      missedCount++;
    }
  });

  return (
    <div className="space-y-6 pb-20 md:pb-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-[#0B1B3F]">
            Weekly Attendance
          </h1>
          <p className="text-xs text-[#5E6C87] mt-0.5">
            Week of {formatInTimeZone(week.startOfWeek, TIMEZONE, "MMM d")} – {formatInTimeZone(week.endOfWeek, TIMEZONE, "MMM d, yyyy")}
          </p>
        </div>
        <Link
          href="/student"
          className="text-xs font-medium text-[#5E6C87] hover:text-[#0B1B3F] inline-flex items-center"
        >
          <ArrowLeft className="w-3.5 h-3.5 mr-1" />
          Dashboard
        </Link>
      </div>

      {/* Summary KPI Cards */}
      <div className="grid grid-cols-3 gap-3">
        <Card className="p-3 text-center bg-green-50/40 border-green-200">
          <p className="text-2xl font-bold text-[#16A34A]">{presentCount}</p>
          <p className="text-[11px] font-medium text-[#5E6C87] mt-0.5">Present</p>
        </Card>
        <Card className="p-3 text-center bg-amber-50/40 border-amber-200">
          <p className="text-2xl font-bold text-[#F59E0B]">{lateCount}</p>
          <p className="text-[11px] font-medium text-[#5E6C87] mt-0.5">Late</p>
        </Card>
        <Card className="p-3 text-center bg-red-50/40 border-red-200">
          <p className="text-2xl font-bold text-[#EF4444]">{missedCount}</p>
          <p className="text-[11px] font-medium text-[#5E6C87] mt-0.5">Absent</p>
        </Card>
      </div>

      {/* Day by Day Breakdown */}
      <Card className="bg-white">
        <CardHeader className="pb-2 border-b border-[#DDE3EE]/60">
          <CardTitle className="text-sm font-semibold flex items-center gap-2">
            <CalendarCheck className="w-4 h-4 text-[#0B1B3F]" />
            Monday to Friday Schedule
          </CardTitle>
        </CardHeader>
        <CardContent className="divide-y divide-[#DDE3EE]/60 pt-1">
          {week.workdays.map((dayStr) => {
            const rec = recordsMap.get(dayStr);
            const dateObj = parseISO(dayStr);
            const dayName = format(dateObj, "EEEE");
            const formattedDate = format(dateObj, "MMM d");
            const isToday = dayStr === todayDateStr;
            const isFuture = dayStr > todayDateStr;

            let badgeVariant: "present" | "late" | "absent" | "neutral" = "neutral";
            let label = "Upcoming";

            if (rec) {
              badgeVariant = rec.status === "present" ? "present" : "late";
              label = rec.status === "present" ? "Present" : "Late";
            } else if (isToday) {
              badgeVariant = "neutral";
              label = "Today";
            } else if (!isFuture) {
              badgeVariant = "absent";
              label = "Absent";
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
                className={`py-3.5 flex items-center justify-between ${
                  isToday ? "bg-[#F1F4FB]/50 -mx-4 px-4 rounded-xl" : ""
                }`}
              >
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-sm text-[#0B1B3F]">
                      {dayName}
                    </span>
                    <span className="text-xs text-[#5E6C87]">
                      {formattedDate}
                    </span>
                    {isToday && (
                      <span className="text-[10px] font-bold uppercase tracking-wider bg-[#0B1B3F] text-white px-1.5 py-0.5 rounded-full">
                        Today
                      </span>
                    )}
                  </div>

                  <div className="text-xs text-[#5E6C87] mt-1 flex items-center gap-3">
                    {checkInFormatted ? (
                      <span className="flex items-center gap-1">
                        <Clock className="w-3 h-3 text-[#16A34A]" />
                        In: {checkInFormatted}
                      </span>
                    ) : (
                      <span>In: --</span>
                    )}

                    {checkOutFormatted ? (
                      <span className="flex items-center gap-1">
                        <Clock className="w-3 h-3 text-[#5E6C87]" />
                        Out: {checkOutFormatted}
                      </span>
                    ) : (
                      <span>Out: --</span>
                    )}
                  </div>
                </div>

                <Badge variant={badgeVariant} withDot={rec !== undefined}>
                  {label}
                </Badge>
              </div>
            );
          })}
        </CardContent>
      </Card>
    </div>
  );
}
