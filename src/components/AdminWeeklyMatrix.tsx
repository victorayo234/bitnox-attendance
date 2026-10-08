"use client";

import React, { useState, useMemo } from "react";
import Link from "next/link";
import { WeeklyMatrixData } from "@/lib/admin-weekly";
import { Card } from "@/components/ui/Card";
import {
  ChevronLeft,
  ChevronRight,
  Search,
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

  // Max value for mini bar chart scaling
  const maxDayTotal = useMemo(() => {
    let max = 1;
    data.dayTotals.forEach((d) => {
      if (d.present > max) max = d.present;
      if (d.late > max) max = d.late;
      if (d.absent > max) max = d.absent;
    });
    return Math.max(max, data.students.length || 1);
  }, [data.dayTotals, data.students.length]);

  // SVG Progress Ring calculations
  const rate = data.overallStats.averageAttendanceRate || 0;
  const radius = 22;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (rate / 100) * circumference;

  return (
    <div className="space-y-6 pb-20">
      {/* Title, Subtitle, and Week Navigation */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-primary leading-8">
            Weekly attendance
          </h1>
          <p className="text-sm text-muted mt-0.5 leading-5">
            {data.students.length} students · {data.weekHeaderFormatted}
          </p>
        </div>

        {/* Week Navigator */}
        <div className="inline-flex items-center bg-white border border-border rounded-lg p-0.5 shadow-[0_1px_2px_rgba(11,27,63,0.04)] self-start sm:self-auto">
          <Link
            href={`/admin/weekly?week=${data.prevWeekMonday}`}
            className="w-8 h-8 flex items-center justify-center text-muted hover:text-primary hover:bg-soft rounded-md transition-colors"
            title="Previous week"
            aria-label="Previous week"
          >
            <ChevronLeft className="w-4 h-4" />
          </Link>

          <div className="flex items-center px-3 h-8 text-xs font-medium text-primary select-none">
            <span>{data.weekHeaderFormatted}</span>
            {data.isCurrentWeek && (
              <span className="ml-2 px-1.5 py-0.5 rounded text-[10px] font-semibold bg-primary/10 text-primary">
                This week
              </span>
            )}
          </div>

          {data.canGoNext ? (
            <Link
              href={`/admin/weekly?week=${data.nextWeekMonday}`}
              className="w-8 h-8 flex items-center justify-center text-muted hover:text-primary hover:bg-soft rounded-md transition-colors"
              title="Next week"
              aria-label="Next week"
            >
              <ChevronRight className="w-4 h-4" />
            </Link>
          ) : (
            <button
              disabled
              className="w-8 h-8 flex items-center justify-center text-muted/30 rounded-md cursor-not-allowed"
              title="Cannot navigate beyond the current week"
              aria-label="Next week (disabled)"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* Summary: Four Horizontal Cards with 3px colored left accent bar */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {/* Card 1: Attendance rate (SVG progress ring) */}
        <Card className="bg-white border border-border border-l-[3px] border-l-primary rounded-[12px] p-4 shadow-[0_1px_2px_rgba(11,27,63,0.04)] flex items-center gap-3">
          <div className="relative w-14 h-14 flex items-center justify-center shrink-0">
            <svg className="w-14 h-14 -rotate-90" viewBox="0 0 56 56" aria-hidden="true">
              <circle
                cx="28"
                cy="28"
                r={radius}
                stroke="#F1F4FB"
                strokeWidth="4"
                fill="transparent"
              />
              <circle
                cx="28"
                cy="28"
                r={radius}
                stroke="#0B1B3F"
                strokeWidth="4"
                fill="transparent"
                strokeDasharray={circumference}
                strokeDashoffset={strokeDashoffset}
                strokeLinecap="round"
                className="transition-all duration-500"
              />
            </svg>
            <span className="absolute text-xs font-semibold text-primary">
              {rate}%
            </span>
          </div>
          <div className="space-y-0.5 min-w-0">
            <span className="text-[13px] text-muted block leading-tight">Rate</span>
            <div className="text-base font-semibold text-primary truncate leading-tight">
              Attendance rate
            </div>
          </div>
        </Card>

        {/* Card 2: Present (Neutral number + 5-bar green mini chart) */}
        <Card className="bg-white border border-border border-l-[3px] border-l-[#16A34A] rounded-[12px] p-4 shadow-[0_1px_2px_rgba(11,27,63,0.04)] flex items-center justify-between gap-2">
          <div className="space-y-0.5">
            <span className="text-[13px] text-muted block leading-tight">Present</span>
            <div className="text-2xl font-semibold text-primary leading-tight">
              {data.overallStats.totalPresent}
            </div>
          </div>
          {/* Mini 5-bar chart */}
          <div className="flex items-end gap-1.5 h-10 pt-2 shrink-0">
            {data.dayTotals.map((d, idx) => {
              const heightPct = Math.max(12, Math.round((d.present / maxDayTotal) * 100));
              const dayLetter = ["M", "T", "W", "T", "F"][idx] || "·";
              return (
                <div key={d.date} className="flex flex-col items-center gap-1">
                  <div
                    className="w-2 rounded-t-sm bg-[#16A34A] transition-all"
                    style={{ height: `${heightPct}%`, maxHeight: "28px" }}
                    title={`Present: ${d.present}`}
                  />
                  <span className="text-[9px] text-muted font-medium">{dayLetter}</span>
                </div>
              );
            })}
          </div>
        </Card>

        {/* Card 3: Late (Neutral number + 5-bar amber mini chart) */}
        <Card className="bg-white border border-border border-l-[3px] border-l-[#F59E0B] rounded-[12px] p-4 shadow-[0_1px_2px_rgba(11,27,63,0.04)] flex items-center justify-between gap-2">
          <div className="space-y-0.5">
            <span className="text-[13px] text-muted block leading-tight">Late</span>
            <div className="text-2xl font-semibold text-primary leading-tight">
              {data.overallStats.totalLate}
            </div>
          </div>
          {/* Mini 5-bar chart */}
          <div className="flex items-end gap-1.5 h-10 pt-2 shrink-0">
            {data.dayTotals.map((d, idx) => {
              const heightPct = Math.max(12, Math.round((d.late / maxDayTotal) * 100));
              const dayLetter = ["M", "T", "W", "T", "F"][idx] || "·";
              return (
                <div key={d.date} className="flex flex-col items-center gap-1">
                  <div
                    className="w-2 rounded-t-sm bg-[#F59E0B] transition-all"
                    style={{ height: `${heightPct}%`, maxHeight: "28px" }}
                    title={`Late: ${d.late}`}
                  />
                  <span className="text-[9px] text-muted font-medium">{dayLetter}</span>
                </div>
              );
            })}
          </div>
        </Card>

        {/* Card 4: Absent (Neutral number + 5-bar red mini chart) */}
        <Card className="bg-white border border-border border-l-[3px] border-l-[#EF4444] rounded-[12px] p-4 shadow-[0_1px_2px_rgba(11,27,63,0.04)] flex items-center justify-between gap-2">
          <div className="space-y-0.5">
            <span className="text-[13px] text-muted block leading-tight">Absent</span>
            <div className="text-2xl font-semibold text-primary leading-tight">
              {data.overallStats.totalAbsent}
            </div>
          </div>
          {/* Mini 5-bar chart */}
          <div className="flex items-end gap-1.5 h-10 pt-2 shrink-0">
            {data.dayTotals.map((d, idx) => {
              const heightPct = Math.max(12, Math.round((d.absent / maxDayTotal) * 100));
              const dayLetter = ["M", "T", "W", "T", "F"][idx] || "·";
              return (
                <div key={d.date} className="flex flex-col items-center gap-1">
                  <div
                    className="w-2 rounded-t-sm bg-[#EF4444] transition-all"
                    style={{ height: `${heightPct}%`, maxHeight: "28px" }}
                    title={`Absent: ${d.absent}`}
                  />
                  <span className="text-[9px] text-muted font-medium">{dayLetter}</span>
                </div>
              );
            })}
          </div>
        </Card>
      </div>

      {/* Search Input */}
      <div className="relative max-w-xs">
        <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted pointer-events-none" />
        <input
          type="text"
          placeholder="Search students in matrix..."
          aria-label="Search students in matrix"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full h-10 pl-9 pr-8 bg-white border border-border rounded-lg text-sm text-primary placeholder:text-muted/70 focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary transition-all shadow-[0_1px_2px_rgba(11,27,63,0.04)]"
        />
        {searchQuery && (
          <button
            type="button"
            onClick={() => setSearchQuery("")}
            className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted hover:text-primary p-0.5"
            aria-label="Clear search"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

      {/* Matrix Table (Desktop & Mobile with sticky first column) */}
      <Card className="bg-white border border-border rounded-[12px] shadow-[0_1px_2px_rgba(11,27,63,0.04)] overflow-hidden">
        {filteredStudents.length === 0 ? (
          <div className="py-12 px-4 text-center space-y-2">
            <Search className="w-6 h-6 text-muted mx-auto" />
            <p className="text-sm text-muted">No students match your search</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm border-collapse">
              <thead className="bg-[#FAFCFF] border-b border-border text-xs uppercase tracking-wider text-muted font-semibold">
                <tr>
                  <th className="py-3 px-5 min-w-[200px] sticky left-0 bg-[#FAFCFF] z-20 shadow-[2px_0_4px_rgba(11,27,63,0.02)]">
                    Student
                  </th>
                  {data.workdays.map((w) => {
                    const dayNum = new Date(`${w.date}T12:00:00+01:00`).getDate();
                    const dayShort = w.dayName.slice(0, 3);
                    return (
                      <th
                        key={w.date}
                        className="py-3 px-3 text-center min-w-[76px] whitespace-nowrap"
                      >
                        <span className="font-semibold text-primary block">{`${dayShort} ${dayNum}`}</span>
                      </th>
                    );
                  })}
                  <th className="py-3 px-3 text-center min-w-[48px] font-semibold text-primary">P</th>
                  <th className="py-3 px-3 text-center min-w-[48px] font-semibold text-primary">L</th>
                  <th className="py-3 px-3 text-center min-w-[48px] font-semibold text-primary">A</th>
                  <th className="py-3 px-4 text-center min-w-[72px] font-semibold text-primary">Rate</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/60">
                {filteredStudents.map((student) => (
                  <tr key={student.studentId} className="hover:bg-[#F9FBFE] transition-colors">
                    {/* Sticky Student Name & Email column */}
                    <td className="py-3 px-5 sticky left-0 bg-white hover:bg-[#F9FBFE] z-10 shadow-[2px_0_4px_rgba(11,27,63,0.02)]">
                      <Link
                        href={`/admin/students/${student.studentId}`}
                        className="inline-block hover:opacity-85"
                      >
                        <span className="font-medium text-sm text-primary hover:underline block leading-tight">
                          {student.name}
                        </span>
                        <span className="text-xs text-muted block leading-tight mt-0.5">
                          {student.email}
                        </span>
                      </Link>
                    </td>

                    {/* 5 Day Cells (Mon-Fri) - 32px rounded square with P, L, A */}
                    {student.days.map((day) => (
                      <td key={day.date} className="py-3 px-3 text-center">
                        <div className="flex items-center justify-center">
                          {renderMatrixCell(day.status, day.checkInFormatted)}
                        </div>
                      </td>
                    ))}

                    {/* Totals: neutral navy numbers */}
                    <td className="py-3 px-3 text-center font-medium text-primary">
                      {student.totals.present}
                    </td>
                    <td className="py-3 px-3 text-center font-medium text-primary">
                      {student.totals.late}
                    </td>
                    <td className="py-3 px-3 text-center font-medium text-primary">
                      {student.totals.absent}
                    </td>

                    {/* Rate: plain text with a small thin progress bar under it (no red pill) */}
                    <td className="py-3 px-4 text-center">
                      <div className="inline-flex flex-col items-center">
                        <span className="text-xs font-semibold text-primary">
                          {student.totals.percentage}%
                        </span>
                        <div className="w-10 h-1 bg-soft rounded-full overflow-hidden mt-1">
                          <div
                            className="h-full bg-primary rounded-full transition-all"
                            style={{ width: `${student.totals.percentage}%` }}
                          />
                        </div>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>

              {/* Single muted footer row labeled "Attended" showing one plain number per day */}
              <tfoot className="bg-[#FAFCFF] border-t-2 border-border font-medium text-xs text-muted">
                <tr>
                  <td className="py-3 px-5 sticky left-0 bg-[#FAFCFF] z-20 shadow-[2px_0_4px_rgba(11,27,63,0.02)] font-semibold text-primary">
                    Attended
                  </td>
                  {data.dayTotals.map((d) => (
                    <td key={d.date} className="py-3 px-3 text-center font-semibold text-primary">
                      {d.present + d.late}
                    </td>
                  ))}
                  <td className="py-3 px-3 text-center font-semibold text-primary">
                    {data.overallStats.totalPresent}
                  </td>
                  <td className="py-3 px-3 text-center font-semibold text-primary">
                    {data.overallStats.totalLate}
                  </td>
                  <td className="py-3 px-3 text-center font-semibold text-primary">
                    {data.overallStats.totalAbsent}
                  </td>
                  <td className="py-3 px-4 text-center font-semibold text-primary">
                    {data.overallStats.averageAttendanceRate}%
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        )}
      </Card>

      {/* Legend below the table: small swatches */}
      <div className="flex items-center gap-6 text-xs text-muted flex-wrap px-1">
        <div className="flex items-center gap-2">
          <span className="w-6 h-6 rounded-md bg-emerald-50 text-[#16A34A] border border-emerald-200/60 font-semibold text-xs flex items-center justify-center">
            P
          </span>
          <span>Present</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="w-6 h-6 rounded-md bg-amber-50 text-[#D97706] border border-amber-200/60 font-semibold text-xs flex items-center justify-center">
            L
          </span>
          <span>Late</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="w-6 h-6 rounded-md bg-red-50 text-[#DC2626] border border-red-200/60 font-semibold text-xs flex items-center justify-center">
            A
          </span>
          <span>Absent</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="w-6 h-6 rounded-md bg-soft text-muted flex items-center justify-center text-xs">
            •
          </span>
          <span>No record yet</span>
        </div>
      </div>
    </div>
  );
}

/**
 * Render 32px rounded-square matrix cell
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
          className="w-8 h-8 rounded-lg bg-emerald-50 text-[#16A34A] border border-emerald-200/60 font-semibold text-xs flex items-center justify-center select-none"
        >
          P
        </span>
      );
    case "L":
      return (
        <span
          title={checkInTime ? `Late at ${checkInTime}` : "Late"}
          className="w-8 h-8 rounded-lg bg-amber-50 text-[#D97706] border border-amber-200/60 font-semibold text-xs flex items-center justify-center select-none"
        >
          L
        </span>
      );
    case "A":
      return (
        <span
          title="Absent"
          className="w-8 h-8 rounded-lg bg-red-50 text-[#DC2626] border border-red-200/60 font-semibold text-xs flex items-center justify-center select-none"
        >
          A
        </span>
      );
    case "-":
    case "":
    default:
      return (
        <span
          title="No record"
          className="w-8 h-8 rounded-lg flex items-center justify-center text-muted/40 select-none text-base"
        >
          •
        </span>
      );
  }
}
