"use client";

import React, { useState, useMemo } from "react";
import Link from "next/link";
import { WeeklyMatrixData } from "@/lib/admin-weekly";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import {
  ChevronLeft,
  ChevronRight,
  Search,
  Users,
  CalendarCheck,
  TrendingUp,
  Clock,
  ArrowRight,
  User,
  X,
} from "lucide-react";

interface AdminWeeklyMatrixProps {
  data: WeeklyMatrixData;
}

export function AdminWeeklyMatrix({ data }: AdminWeeklyMatrixProps) {
  const [searchQuery, setSearchQuery] = useState("");

  const filteredStudents = useMemo(() => {
    if (!searchQuery.trim()) return data.students;
    const q = searchQuery.toLowerCase();
    return data.students.filter(
      (s) =>
        s.name.toLowerCase().includes(q) || s.email.toLowerCase().includes(q)
    );
  }, [data.students, searchQuery]);

  return (
    <div className="space-y-6 pb-20">
      {/* Header & Week Selector */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-[#0B1B3F]">
            Weekly Attendance Matrix
          </h1>
          <p className="text-xs sm:text-sm text-[#5E6C87]">
            Overview of student attendance from Monday to Friday
          </p>
        </div>

        {/* Week Navigator */}
        <div className="flex items-center gap-2 self-start sm:self-auto">
          <Button
            asChild
            variant="outline"
            size="sm"
            className="min-h-[44px] px-3.5 rounded-full text-xs font-semibold text-[#0B1B3F] border-[#DDE3EE] hover:bg-[#F1F4FB]"
          >
            <Link href={`/admin/weekly?week=${data.prevWeekMonday}`}>
              <ChevronLeft className="w-4 h-4 mr-1 text-[#0B1B3F]" />
              Previous Week
            </Link>
          </Button>

          <div className="text-center px-3 py-1 bg-white border border-[#DDE3EE] rounded-2xl shadow-2xs">
            <span className="text-xs font-bold text-[#0B1B3F] block">
              {data.weekHeaderFormatted}
            </span>
            {data.isCurrentWeek ? (
              <span className="text-[10px] font-bold text-[#16A34A] uppercase tracking-wider">
                Current Week
              </span>
            ) : (
              <span className="text-[10px] font-medium text-[#5E6C87]">
                Past Week
              </span>
            )}
          </div>

          {data.canGoNext ? (
            <Button
              asChild
              variant="outline"
              size="sm"
              className="min-h-[44px] px-3.5 rounded-full text-xs font-semibold text-[#0B1B3F] border-[#DDE3EE] hover:bg-[#F1F4FB]"
            >
              <Link href={`/admin/weekly?week=${data.nextWeekMonday}`}>
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
      </div>

      {/* Overview Stat Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <Card className="bg-white border border-[#DDE3EE] p-4 rounded-2xl shadow-xs">
          <span className="text-xs font-semibold text-[#5E6C87] uppercase tracking-wider">
            Active Students
          </span>
          <div className="text-2xl font-extrabold text-[#0B1B3F] mt-1">
            {data.overallStats.totalStudents}
          </div>
          <p className="text-[11px] text-[#5E6C87] mt-0.5">Enrolled in matrix</p>
        </Card>

        <Card className="bg-white border border-[#DDE3EE] p-4 rounded-2xl shadow-xs">
          <span className="text-xs font-semibold text-[#16A34A] uppercase tracking-wider">
            Total Present (P)
          </span>
          <div className="text-2xl font-extrabold text-[#16A34A] mt-1">
            {data.overallStats.totalPresent}
          </div>
          <p className="text-[11px] text-[#5E6C87] mt-0.5">On-time attendances</p>
        </Card>

        <Card className="bg-white border border-[#DDE3EE] p-4 rounded-2xl shadow-xs">
          <span className="text-xs font-semibold text-[#F59E0B] uppercase tracking-wider">
            Total Late (L)
          </span>
          <div className="text-2xl font-extrabold text-[#F59E0B] mt-1">
            {data.overallStats.totalLate}
          </div>
          <p className="text-[11px] text-[#5E6C87] mt-0.5">After 08:30 AM</p>
        </Card>

        <Card className="bg-white border border-[#DDE3EE] p-4 rounded-2xl shadow-xs">
          <span className="text-xs font-semibold text-[#EF4444] uppercase tracking-wider">
            Total Absent (A)
          </span>
          <div className="text-2xl font-extrabold text-[#EF4444] mt-1">
            {data.overallStats.totalAbsent}
          </div>
          <p className="text-[11px] text-[#5E6C87] mt-0.5">Missed workdays</p>
        </Card>
      </div>

      {/* Search Bar */}
      <div className="flex items-center justify-between gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-[#5E6C87]" />
          <input
            type="text"
            placeholder="Search students in matrix..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-white border border-[#DDE3EE] rounded-full text-xs font-medium text-[#0B1B3F] placeholder-[#5E6C87] focus:outline-none focus:border-[#0B1B3F] transition-all shadow-2xs"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery("")}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-[#5E6C87] hover:text-[#0B1B3F]"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        <div className="text-xs text-[#5E6C87] hidden sm:block">
          Showing <strong>{filteredStudents.length}</strong> of{" "}
          <strong>{data.students.length}</strong> students
        </div>
      </div>

      {/* ATTENDANCE MATRIX (DESKTOP TABLE) */}
      <Card className="bg-white border border-[#DDE3EE] rounded-2xl shadow-sm overflow-hidden hidden md:block">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-[#F8FAFD] text-[#5E6C87] border-b border-[#DDE3EE] uppercase tracking-wider text-[11px] font-semibold">
              <tr>
                <th className="py-3.5 px-5 min-w-[200px]">Student Name</th>
                {data.workdays.map((w) => (
                  <th key={w.date} className="py-3.5 px-3 text-center min-w-[80px]">
                    <span className="block text-xs font-bold text-[#0B1B3F]">
                      {w.dayName}
                    </span>
                    <span className="text-[10px] text-[#5E6C87] font-normal">
                      {w.formattedDate}
                    </span>
                  </th>
                ))}
                <th className="py-3.5 px-3 text-center text-[#16A34A] font-bold">P</th>
                <th className="py-3.5 px-3 text-center text-[#F59E0B] font-bold">L</th>
                <th className="py-3.5 px-3 text-center text-[#EF4444] font-bold">A</th>
                <th className="py-3.5 px-4 text-center font-bold text-[#0B1B3F]">Rate</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#DDE3EE]/60">
              {filteredStudents.map((student) => (
                <tr
                  key={student.studentId}
                  className="hover:bg-[#F9FBFE] transition-colors"
                >
                  {/* Student Name with clickable link to /admin/students/[id] */}
                  <td className="py-3 px-5">
                    <Link
                      href={`/admin/students/${student.studentId}`}
                      className="group inline-flex flex-col hover:opacity-85"
                    >
                      <span className="font-bold text-sm text-[#0B1B3F] group-hover:text-blue-600 transition-colors inline-flex items-center gap-1">
                        {student.name}
                        <ChevronRight className="w-3.5 h-3.5 opacity-0 group-hover:opacity-100 transition-opacity text-blue-600" />
                      </span>
                      <span className="text-[11px] text-[#5E6C87]">{student.email}</span>
                    </Link>
                  </td>

                  {/* 5 Day Cells (Mon-Fri) */}
                  {student.days.map((day) => (
                    <td key={day.date} className="py-3 px-3 text-center">
                      {renderMatrixCell(day.status, day.checkInFormatted)}
                    </td>
                  ))}

                  {/* Totals */}
                  <td className="py-3 px-3 text-center font-bold text-[#16A34A]">
                    {student.totals.present}
                  </td>
                  <td className="py-3 px-3 text-center font-bold text-[#F59E0B]">
                    {student.totals.late}
                  </td>
                  <td className="py-3 px-3 text-center font-bold text-[#EF4444]">
                    {student.totals.absent}
                  </td>
                  <td className="py-3 px-4 text-center">
                    <span
                      className={`inline-block font-extrabold px-2.5 py-0.5 rounded-full text-[11px] ${
                        student.totals.percentage >= 80
                          ? "bg-green-50 text-[#16A34A] border border-green-200"
                          : student.totals.percentage >= 50
                          ? "bg-amber-50 text-[#F59E0B] border border-amber-200"
                          : "bg-red-50 text-[#EF4444] border border-red-200"
                      }`}
                    >
                      {student.totals.percentage}%
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>

            {/* Matrix Summary Row */}
            <tfoot className="bg-[#F8FAFD] border-t-2 border-[#DDE3EE] font-bold text-xs text-[#0B1B3F]">
              <tr>
                <td className="py-3.5 px-5">Daily Hub Attendance</td>
                {data.dayTotals.map((d) => (
                  <td key={d.date} className="py-3.5 px-3 text-center">
                    <div className="flex items-center justify-center gap-1 text-[11px]">
                      <span className="text-[#16A34A]" title="Present">
                        {d.present}
                      </span>
                      <span className="text-gray-300">/</span>
                      <span className="text-[#F59E0B]" title="Late">
                        {d.late}
                      </span>
                      <span className="text-gray-300">/</span>
                      <span className="text-[#EF4444]" title="Absent">
                        {d.absent}
                      </span>
                    </div>
                  </td>
                ))}
                <td className="py-3.5 px-3 text-center text-[#16A34A]">
                  {data.overallStats.totalPresent}
                </td>
                <td className="py-3.5 px-3 text-center text-[#F59E0B]">
                  {data.overallStats.totalLate}
                </td>
                <td className="py-3.5 px-3 text-center text-[#EF4444]">
                  {data.overallStats.totalAbsent}
                </td>
                <td className="py-3.5 px-4 text-center text-[#0B1B3F]">
                  {data.overallStats.averageAttendanceRate}%
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      </Card>

      {/* MOBILE STACKED CARDS VIEW (md:hidden) */}
      <div className="block md:hidden space-y-3">
        {filteredStudents.map((student) => (
          <Card
            key={student.studentId}
            className="bg-white border border-[#DDE3EE] p-4 rounded-2xl shadow-xs space-y-3"
          >
            {/* Student Header */}
            <div className="flex items-start justify-between gap-2">
              <Link
                href={`/admin/students/${student.studentId}`}
                className="group flex-1"
              >
                <h4 className="font-bold text-sm text-[#0B1B3F] group-hover:text-blue-600 inline-flex items-center gap-1">
                  {student.name}
                  <ChevronRight className="w-3.5 h-3.5 text-[#5E6C87]" />
                </h4>
                <p className="text-[11px] text-[#5E6C87]">{student.email}</p>
              </Link>

              <span
                className={`font-extrabold px-2.5 py-0.5 rounded-full text-xs ${
                  student.totals.percentage >= 80
                    ? "bg-green-50 text-[#16A34A] border border-green-200"
                    : student.totals.percentage >= 50
                    ? "bg-amber-50 text-[#F59E0B] border border-amber-200"
                    : "bg-red-50 text-[#EF4444] border border-red-200"
                }`}
              >
                {student.totals.percentage}%
              </span>
            </div>

            {/* 5 Day Indicators */}
            <div className="grid grid-cols-5 gap-1.5 pt-1 text-center">
              {student.days.map((day) => (
                <div key={day.date} className="space-y-1">
                  <span className="text-[10px] font-semibold text-[#5E6C87] uppercase block">
                    {day.dayName}
                  </span>
                  <div>{renderMatrixCell(day.status, day.checkInFormatted)}</div>
                </div>
              ))}
            </div>

            {/* Totals Summary Row */}
            <div className="flex items-center justify-between text-xs pt-2 border-t border-[#DDE3EE]/60 text-[#5E6C87]">
              <span>
                Present: <strong className="text-[#16A34A]">{student.totals.present}</strong>
              </span>
              <span>
                Late: <strong className="text-[#F59E0B]">{student.totals.late}</strong>
              </span>
              <span>
                Absent: <strong className="text-[#EF4444]">{student.totals.absent}</strong>
              </span>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}

/**
 * Render matrix cell with P (green), L (amber), A (red), or blank
 */
function renderMatrixCell(
  status: "P" | "L" | "A" | "" | "-",
  checkInTime?: string | null
) {
  switch (status) {
    case "P":
      return (
        <span
          title={checkInTime ? `Present at ${checkInTime}` : "Present"}
          className="inline-flex items-center justify-center w-7 h-7 rounded-lg bg-green-50 text-[#16A34A] border border-green-200 font-extrabold text-xs shadow-2xs"
        >
          P
        </span>
      );
    case "L":
      return (
        <span
          title={checkInTime ? `Late at ${checkInTime}` : "Late"}
          className="inline-flex items-center justify-center w-7 h-7 rounded-lg bg-amber-50 text-[#F59E0B] border border-amber-200 font-extrabold text-xs shadow-2xs"
        >
          L
        </span>
      );
    case "A":
      return (
        <span
          title="Absent"
          className="inline-flex items-center justify-center w-7 h-7 rounded-lg bg-red-50 text-[#EF4444] border border-red-200 font-extrabold text-xs shadow-2xs"
        >
          A
        </span>
      );
    case "-":
      return (
        <span
          title="Not yet recorded"
          className="inline-flex items-center justify-center w-7 h-7 rounded-lg bg-slate-50 text-slate-400 font-semibold text-xs"
        >
          -
        </span>
      );
    case "":
    default:
      return (
        <span className="inline-flex items-center justify-center w-7 h-7 text-gray-300">
          •
        </span>
      );
  }
}
