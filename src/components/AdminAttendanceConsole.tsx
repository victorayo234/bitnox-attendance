"use client";

import React, { useState, useEffect, useMemo, useRef, useCallback } from "react";
import {
  AttendanceConsoleData,
  AttendanceConsoleStudent,
  AdminStudentStatus,
} from "@/lib/admin-attendance";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import {
  Users,
  UserCheck,
  LogOut,
  Clock,
  Search,
  RefreshCw,
  Calendar,
  CheckCircle2,
  AlertTriangle,
  Trash2,
  Check,
  X,
  ChevronLeft,
  ChevronRight,
  ShieldAlert,
} from "lucide-react";

interface AdminAttendanceConsoleProps {
  initialData: AttendanceConsoleData;
}

type FilterChip = "all" | "in" | "out" | "not_in" | "late";

interface ActionModalState {
  isOpen: boolean;
  type: "check_in" | "check_out" | "clear";
  student: AttendanceConsoleStudent | null;
  timeInput?: string;
  isSubmitting: boolean;
}

interface ToastState {
  id: number;
  type: "success" | "error";
  message: string;
}

function getInitials(name: string): string {
  if (!name) return "S";
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

function formatTimeWithoutSeconds(timeStr: string) {
  return timeStr.replace(/:\d{2}(\s*[AP]M)/i, "$1");
}

export function AdminAttendanceConsole({ initialData }: AdminAttendanceConsoleProps) {
  const [data, setData] = useState<AttendanceConsoleData>(initialData);
  const [selectedDate, setSelectedDate] = useState<string>(initialData.selectedDate);
  const [searchQuery, setSearchQuery] = useState("");
  const [activeFilter, setActiveFilter] = useState<FilterChip>("all");
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<string>(() => {
    return new Date().toLocaleTimeString("en-US", {
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    });
  });

  // Modal State
  const [modalState, setModalState] = useState<ActionModalState>({
    isOpen: false,
    type: "check_in",
    student: null,
    isSubmitting: false,
  });

  // Toast State
  const [toasts, setToasts] = useState<ToastState[]>([]);
  const toastIdRef = useRef(1);

  const showToast = useCallback((type: "success" | "error", message: string) => {
    const id = toastIdRef.current++;
    setToasts((prev) => [...prev, { id, type, message }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 4500);
  }, []);

  const removeToast = (id: number) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  // Fetch / Refresh data from API
  const fetchData = useCallback(
    async (targetDate: string, isManual = false) => {
      if (isManual) setIsRefreshing(true);
      try {
        const res = await fetch(`/api/admin/attendance?date=${encodeURIComponent(targetDate)}`);
        if (!res.ok) {
          const errData = await res.json().catch(() => ({}));
          throw new Error(errData.error || "Failed to update attendance data");
        }
        const json = await res.json();
        if (json.ok && json.data) {
          setData(json.data);
          setLastUpdated(
            new Date().toLocaleTimeString("en-US", {
              hour: "numeric",
              minute: "2-digit",
              hour12: true,
            })
          );
        }
      } catch (err: unknown) {
        if (isManual) {
          const errorMsg = err instanceof Error ? err.message : "Failed to refresh data";
          showToast("error", errorMsg);
        }
      } finally {
        if (isManual) setIsRefreshing(false);
      }
    },
    [showToast]
  );

  // Auto-refresh every 30 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      fetchData(selectedDate, false);
    }, 30000);

    return () => clearInterval(interval);
  }, [fetchData, selectedDate]);

  // Date change handler
  const handleDateChange = (newDate: string) => {
    setSelectedDate(newDate);
    fetchData(newDate, true);
  };

  const getPrevDateStr = (dateStr: string) => {
    const d = new Date(`${dateStr}T12:00:00+01:00`);
    d.setDate(d.getDate() - 1);
    return d.toISOString().split("T")[0];
  };

  const getNextDateStr = (dateStr: string) => {
    const d = new Date(`${dateStr}T12:00:00+01:00`);
    d.setDate(d.getDate() + 1);
    return d.toISOString().split("T")[0];
  };

  const formattedViewedDate = useMemo(() => {
    try {
      const d = new Date(`${selectedDate}T12:00:00+01:00`);
      return d.toLocaleDateString("en-GB", {
        weekday: "short",
        day: "numeric",
        month: "short",
        year: "numeric",
      });
    } catch {
      return selectedDate;
    }
  }, [selectedDate]);

  // Execute Admin Action
  const handleConfirmAction = async () => {
    if (!modalState.student) return;

    setModalState((prev) => ({ ...prev, isSubmitting: true }));
    const { student, type } = modalState;

    try {
      if (type === "clear") {
        const res = await fetch("/api/admin/attendance/clear", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            studentId: student.studentId,
            date: selectedDate,
          }),
        });

        const json = await res.json();
        if (!res.ok || !json.ok) {
          throw new Error(json.error || "Failed to clear attendance record");
        }

        showToast("success", `Attendance cleared for ${student.name}`);
      } else {
        const res = await fetch("/api/admin/attendance/mark", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            studentId: student.studentId,
            date: selectedDate,
            action: type,
            time: modalState.timeInput || undefined,
          }),
        });

        const json = await res.json();
        if (!res.ok || !json.ok) {
          throw new Error(json.error || `Failed to record ${type.replace("_", " ")}`);
        }

        const actionLabel = type === "check_in" ? "Check-in" : "Check-out";
        showToast("success", `${actionLabel} marked for ${student.name}`);
      }

      setModalState({ isOpen: false, type: "check_in", student: null, isSubmitting: false });
      await fetchData(selectedDate, false);
    } catch (err: unknown) {
      const errorMsg = err instanceof Error ? err.message : "Action failed";
      showToast("error", errorMsg);
      setModalState((prev) => ({ ...prev, isSubmitting: false }));
    }
  };

  // Filtered Students
  const filteredStudents = useMemo(() => {
    return data.students.filter((student) => {
      const matchesSearch =
        searchQuery === "" ||
        student.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        student.email.toLowerCase().includes(searchQuery.toLowerCase());

      if (!matchesSearch) return false;

      if (activeFilter === "all") return true;
      if (activeFilter === "in") return student.isCurrentlyIn;
      if (activeFilter === "out") return student.isCheckedOut;
      if (activeFilter === "not_in") return student.isNotYetIn;
      if (activeFilter === "late") return student.rawStatus === "late";

      return true;
    });
  }, [data.students, searchQuery, activeFilter]);

  // Counts for Filter Chips
  const filterCounts = useMemo(() => {
    let inCount = 0;
    let outCount = 0;
    let notInCount = 0;
    let lateCount = 0;

    data.students.forEach((s) => {
      if (s.isCurrentlyIn) inCount++;
      if (s.isCheckedOut) outCount++;
      if (s.isNotYetIn) notInCount++;
      if (s.rawStatus === "late") lateCount++;
    });

    return {
      all: data.students.length,
      in: inCount,
      out: outCount,
      not_in: notInCount,
      late: lateCount,
    };
  }, [data.students]);

  const isToday = selectedDate === data.todayDate;
  const isFuture = data.isFutureDate;

  // Proportions for progress bar
  const totalStudents = data.stats.totalActiveStudents;
  const arrivedCount = data.stats.currentlyIn + data.stats.checkedOut;
  const arrivedPercentage =
    totalStudents > 0 ? Math.round((arrivedCount / totalStudents) * 100) : 0;
  const checkedOutPct =
    totalStudents > 0 ? (data.stats.checkedOut / totalStudents) * 100 : 0;
  const currentlyInPct =
    totalStudents > 0 ? (data.stats.currentlyIn / totalStudents) * 100 : 0;

  return (
    <div className="space-y-6 pb-20">
      {/* Toast Notification Container */}
      <div className="fixed top-4 right-4 z-50 flex flex-col gap-2 max-w-sm w-full pointer-events-none">
        {toasts.map((toast) => (
          <div
            key={toast.id}
            className={`pointer-events-auto flex items-start gap-3 p-4 rounded-xl border shadow-lg transition-all transform animate-in slide-in-from-top duration-200 ${
              toast.type === "success"
                ? "bg-white border-green-200 text-green-950"
                : "bg-white border-red-200 text-red-950"
            }`}
          >
            {toast.type === "success" ? (
              <CheckCircle2 className="w-5 h-5 text-[#16A34A] shrink-0 mt-0.5" />
            ) : (
              <AlertTriangle className="w-5 h-5 text-[#EF4444] shrink-0 mt-0.5" />
            )}
            <div className="flex-1 text-xs font-medium leading-relaxed">{toast.message}</div>
            <button
              onClick={() => removeToast(toast.id)}
              className="text-[#5E6C87] hover:text-[#0B1B3F] p-0.5 rounded transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        ))}
      </div>

      {/* Page Title & Subtitle */}
      <div>
        <h1 className="text-2xl font-semibold text-primary leading-8">Dashboard</h1>
        <p className="text-sm text-muted mt-0.5 leading-5">{formattedViewedDate}</p>
      </div>

      {/* Summary Strip (ONE card containing four equal segments separated by 1px hairlines) */}
      <Card className="bg-white border border-border rounded-[12px] shadow-[0_1px_2px_rgba(11,27,63,0.04)] overflow-hidden">
        <div className="grid grid-cols-2 lg:grid-cols-4 divide-y lg:divide-y-0 lg:divide-x divide-border">
          {/* Segment 1: Students */}
          <div className="p-4 sm:p-5 flex items-start gap-3.5">
            <div className="w-9 h-9 rounded-[10px] bg-primary/10 text-primary flex items-center justify-center shrink-0">
              <Users className="w-4 h-4" />
            </div>
            <div className="space-y-0.5 min-w-0">
              <span className="text-[13px] text-muted block leading-[18px]">Students</span>
              <div className="text-[28px] font-semibold text-primary leading-none">
                {data.stats.totalActiveStudents}
              </div>
              <span className="text-xs text-muted block pt-1">enrolled</span>
            </div>
          </div>

          {/* Segment 2: In now */}
          <div className="p-4 sm:p-5 flex items-start gap-3.5">
            <div className="w-9 h-9 rounded-[10px] bg-emerald-50 text-[#16A34A] flex items-center justify-center shrink-0">
              <UserCheck className="w-4 h-4" />
            </div>
            <div className="space-y-0.5 min-w-0">
              <span className="text-[13px] text-muted block leading-[18px]">In now</span>
              <div className="text-[28px] font-semibold text-primary leading-none">
                {data.stats.currentlyIn}
              </div>
              <span className="text-xs text-muted block pt-1">
                of {data.stats.totalActiveStudents} arrived
              </span>
            </div>
          </div>

          {/* Segment 3: Checked out */}
          <div className="p-4 sm:p-5 flex items-start gap-3.5">
            <div className="w-9 h-9 rounded-[10px] bg-slate-100 text-slate-700 flex items-center justify-center shrink-0">
              <LogOut className="w-4 h-4" />
            </div>
            <div className="space-y-0.5 min-w-0">
              <span className="text-[13px] text-muted block leading-[18px]">Checked out</span>
              <div className="text-[28px] font-semibold text-primary leading-none">
                {data.stats.checkedOut}
              </div>
              <span className="text-xs text-muted block pt-1">left for the day</span>
            </div>
          </div>

          {/* Segment 4: Not yet in */}
          <div className="p-4 sm:p-5 flex items-start gap-3.5">
            <div className="w-9 h-9 rounded-[10px] bg-amber-50 text-[#F59E0B] flex items-center justify-center shrink-0">
              <Clock className="w-4 h-4" />
            </div>
            <div className="space-y-0.5 min-w-0">
              <span className="text-[13px] text-muted block leading-[18px]">Not yet in</span>
              <div className="text-[28px] font-semibold text-primary leading-none">
                {data.stats.notYetIn}
              </div>
              <span className="text-xs text-muted block pt-1">still to arrive</span>
            </div>
          </div>
        </div>

        {/* Full width 6px progress bar below segments */}
        {totalStudents > 0 && (
          <div className="px-5 pb-4 pt-2 border-t border-border/40 space-y-1.5">
            <div
              className="h-1.5 w-full bg-soft rounded-full overflow-hidden flex"
              role="progressbar"
              aria-label={`${arrivedPercentage}% arrived: ${data.stats.checkedOut} checked out, ${data.stats.currentlyIn} in now, ${data.stats.notYetIn} not yet in`}
              aria-valuenow={arrivedPercentage}
              aria-valuemin={0}
              aria-valuemax={100}
            >
              <div
                style={{ width: `${checkedOutPct}%` }}
                className="bg-primary h-full transition-all duration-300"
                title={`Checked out: ${data.stats.checkedOut}`}
              />
              <div
                style={{ width: `${currentlyInPct}%` }}
                className="bg-[#16A34A] h-full transition-all duration-300"
                title={`In now: ${data.stats.currentlyIn}`}
              />
            </div>
            <div className="flex justify-end">
              <span className="text-xs text-muted">{arrivedPercentage}% arrived</span>
            </div>
          </div>
        )}
      </Card>

      {/* Toolbar row: Left = Grouped Date Control; Right = Grouped Status Control */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        {/* Left: Date Control */}
        <div className="flex items-center gap-2 flex-wrap">
          <div className="inline-flex items-center bg-white border border-border rounded-lg p-0.5 shadow-[0_1px_2px_rgba(11,27,63,0.04)]">
            <button
              type="button"
              onClick={() => handleDateChange(getPrevDateStr(selectedDate))}
              className="w-8 h-8 flex items-center justify-center text-muted hover:text-primary hover:bg-soft rounded-md transition-colors"
              title="Previous day"
              aria-label="Previous day"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>

            <label className="relative inline-flex items-center gap-2 px-2.5 h-8 text-xs font-medium text-primary hover:bg-soft rounded-md cursor-pointer transition-colors">
              <Calendar className="w-3.5 h-3.5 text-muted" />
              <span>{formattedViewedDate}</span>
              <input
                type="date"
                aria-label="Select attendance date"
                value={selectedDate}
                onChange={(e) => {
                  if (e.target.value) handleDateChange(e.target.value);
                }}
                className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
              />
            </label>

            <button
              type="button"
              onClick={() => handleDateChange(getNextDateStr(selectedDate))}
              disabled={selectedDate >= data.todayDate}
              className="w-8 h-8 flex items-center justify-center text-muted hover:text-primary hover:bg-soft rounded-md transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
              title="Next day"
              aria-label="Next day"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          {!isToday && (
            <button
              type="button"
              onClick={() => handleDateChange(data.todayDate)}
              className="h-8 px-2.5 text-xs font-medium text-primary hover:bg-soft rounded-lg transition-colors border border-border bg-white"
            >
              Today
            </button>
          )}
        </div>

        {/* Right: Grouped Status Control */}
        <div className="inline-flex items-center bg-white border border-border rounded-lg shadow-[0_1px_2px_rgba(11,27,63,0.04)] text-xs overflow-hidden self-start sm:self-auto">
          {/* Segment 1: Live or Past indicator */}
          <div className="flex items-center gap-1.5 px-3 py-1.5">
            {isToday ? (
              <>
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-[#16A34A]" />
                </span>
                <span className="font-medium text-primary">Live</span>
              </>
            ) : (
              <>
                <span className="inline-block h-2 w-2 rounded-full bg-slate-400" />
                <span className="font-medium text-muted">Viewing past date</span>
              </>
            )}
          </div>

          <span className="h-4 w-[1px] bg-border" aria-hidden="true" />

          {/* Segment 2: Updated time without seconds */}
          <div className="px-3 py-1.5 text-muted">
            Updated {formatTimeWithoutSeconds(lastUpdated)}
          </div>

          <span className="h-4 w-[1px] bg-border" aria-hidden="true" />

          {/* Segment 3: Refresh icon button */}
          <button
            type="button"
            onClick={() => fetchData(selectedDate, true)}
            disabled={isRefreshing}
            className="p-2 text-muted hover:text-primary hover:bg-soft transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary disabled:opacity-50"
            title="Refresh attendance data"
            aria-label="Refresh attendance data"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? "animate-spin" : ""}`} />
          </button>
        </div>
      </div>

      {/* Filters & Search Row */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        {/* Segmented Filter Control */}
        <div className="bg-soft p-1 rounded-lg border border-border inline-flex items-center overflow-x-auto max-w-full scrollbar-none">
          <button
            type="button"
            onClick={() => setActiveFilter("all")}
            className={`px-3 py-1.5 text-xs font-semibold whitespace-nowrap rounded-md transition-all ${
              activeFilter === "all"
                ? "bg-white text-primary border border-border shadow-[0_1px_2px_rgba(11,27,63,0.04)]"
                : "text-muted hover:text-primary"
            }`}
          >
            All <span className="font-normal text-muted ml-0.5">({filterCounts.all})</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveFilter("in")}
            className={`px-3 py-1.5 text-xs font-semibold whitespace-nowrap rounded-md transition-all ${
              activeFilter === "in"
                ? "bg-white text-primary border border-border shadow-[0_1px_2px_rgba(11,27,63,0.04)]"
                : "text-muted hover:text-primary"
            }`}
          >
            In <span className="font-normal text-muted ml-0.5">({filterCounts.in})</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveFilter("out")}
            className={`px-3 py-1.5 text-xs font-semibold whitespace-nowrap rounded-md transition-all ${
              activeFilter === "out"
                ? "bg-white text-primary border border-border shadow-[0_1px_2px_rgba(11,27,63,0.04)]"
                : "text-muted hover:text-primary"
            }`}
          >
            Out <span className="font-normal text-muted ml-0.5">({filterCounts.out})</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveFilter("not_in")}
            className={`px-3 py-1.5 text-xs font-semibold whitespace-nowrap rounded-md transition-all ${
              activeFilter === "not_in"
                ? "bg-white text-primary border border-border shadow-[0_1px_2px_rgba(11,27,63,0.04)]"
                : "text-muted hover:text-primary"
            }`}
          >
            Not yet in <span className="font-normal text-muted ml-0.5">({filterCounts.not_in})</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveFilter("late")}
            className={`px-3 py-1.5 text-xs font-semibold whitespace-nowrap rounded-md transition-all ${
              activeFilter === "late"
                ? "bg-white text-primary border border-border shadow-[0_1px_2px_rgba(11,27,63,0.04)]"
                : "text-muted hover:text-primary"
            }`}
          >
            Late <span className="font-normal text-muted ml-0.5">({filterCounts.late})</span>
          </button>
        </div>

        {/* Search Input: 40px high, 8px radius */}
        <div className="relative flex-1 max-w-xs">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted pointer-events-none" />
          <input
            type="text"
            placeholder="Search student..."
            aria-label="Search student by name or email"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full h-10 pl-9 pr-8 bg-white border border-border rounded-lg text-sm text-primary placeholder:text-muted/70 focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary transition-all shadow-[0_1px_2px_rgba(11,27,63,0.04)]"
          />
          {searchQuery && (
            <button
              type="button"
              aria-label="Clear search"
              onClick={() => setSearchQuery("")}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted hover:text-primary p-0.5"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* Desktop Table View & Mobile Cards */}
      <Card className="bg-white border border-border rounded-[12px] shadow-[0_1px_2px_rgba(11,27,63,0.04)] overflow-hidden">
        {filteredStudents.length === 0 ? (
          <div className="py-12 px-4 text-center space-y-2">
            <Search className="w-6 h-6 text-muted mx-auto" />
            <p className="text-sm text-muted">No attendance records found for this filter</p>
          </div>
        ) : (
          <>
            {/* Desktop Table */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-[#FAFCFF] border-b border-border text-xs uppercase tracking-wider text-muted font-semibold sticky top-0 z-10">
                  <tr>
                    <th className="py-3 px-5">Student</th>
                    <th className="py-3 px-4">Check-in</th>
                    <th className="py-3 px-4">Check-out</th>
                    <th className="py-3 px-4">Status</th>
                    {!isFuture && <th className="py-3 px-5 text-right">Actions</th>}
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/60">
                  {filteredStudents.map((student) => {
                    const initials = getInitials(student.name);
                    const isLate = student.rawStatus === "late";

                    return (
                      <tr
                        key={student.studentId}
                        className="hover:bg-[#F9FBFE] transition-colors"
                      >
                        {/* Student Column with Avatar */}
                        <td className="py-3 px-5">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full bg-primary/10 text-primary font-semibold text-xs flex items-center justify-center shrink-0 select-none">
                              {initials}
                            </div>
                            <div className="min-w-0">
                              <div className="font-medium text-primary text-sm truncate">
                                {student.name}
                              </div>
                              <div className="text-xs text-muted truncate">
                                {student.email}
                              </div>
                            </div>
                          </div>
                        </td>

                        {/* Check-In Column with optional Late tag */}
                        <td className="py-3 px-4 text-sm font-medium text-primary">
                          {student.checkInFormatted ? (
                            <span className="inline-flex items-center gap-1.5">
                              {student.checkInFormatted}
                              {isLate && (
                                <span className="px-1.5 py-0.5 rounded text-[10px] font-semibold bg-amber-50 text-late border border-amber-200">
                                  Late
                                </span>
                              )}
                            </span>
                          ) : (
                            <span className="text-muted font-normal">--</span>
                          )}
                        </td>

                        {/* Check-Out Column */}
                        <td className="py-3 px-4 text-sm font-medium text-primary">
                          {student.checkOutFormatted ? (
                            <span>{student.checkOutFormatted}</span>
                          ) : (
                            <span className="text-muted font-normal">--</span>
                          )}
                        </td>

                        {/* Status Column */}
                        <td className="py-3 px-4">
                          {renderStatusBadge(student)}
                        </td>

                        {/* Actions Column (compact buttons, visible, no menu) */}
                        {!isFuture && (
                          <td className="py-3 px-5 text-right">
                            <div className="inline-flex items-center justify-end gap-1.5">
                              {/* When no check-in record */}
                              {!student.isCheckedIn && (
                                <Button
                                  variant="secondary"
                                  size="sm"
                                  onClick={() =>
                                    setModalState({
                                      isOpen: true,
                                      type: "check_in",
                                      student,
                                      isSubmitting: false,
                                    })
                                  }
                                  leftIcon={<Check className="w-3.5 h-3.5" />}
                                >
                                  Mark in
                                </Button>
                              )}

                              {/* When checked in but not out */}
                              {student.isCheckedIn && !student.isCheckedOut && (
                                <Button
                                  variant="secondary"
                                  size="sm"
                                  onClick={() =>
                                    setModalState({
                                      isOpen: true,
                                      type: "check_out",
                                      student,
                                      isSubmitting: false,
                                    })
                                  }
                                  leftIcon={<LogOut className="w-3.5 h-3.5" />}
                                >
                                  Mark out
                                </Button>
                              )}

                              {/* When a record exists */}
                              {student.isCheckedIn && (
                                <Button
                                  variant="danger-ghost"
                                  size="sm"
                                  onClick={() =>
                                    setModalState({
                                      isOpen: true,
                                      type: "clear",
                                      student,
                                      isSubmitting: false,
                                    })
                                  }
                                  leftIcon={<Trash2 className="w-3.5 h-3.5" />}
                                  title="Clear record"
                                >
                                  Clear
                                </Button>
                              )}
                            </div>
                          </td>
                        )}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Mobile View: Stacked Cards */}
            <div className="md:hidden divide-y divide-border/60">
              {filteredStudents.map((student) => {
                const initials = getInitials(student.name);
                const isLate = student.rawStatus === "late";

                return (
                  <div key={student.studentId} className="p-4 space-y-3">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-full bg-primary/10 text-primary font-semibold text-xs flex items-center justify-center shrink-0">
                          {initials}
                        </div>
                        <div>
                          <div className="font-medium text-sm text-primary leading-tight">
                            {student.name}
                          </div>
                          <div className="text-xs text-muted mt-0.5 leading-tight">
                            {student.email}
                          </div>
                        </div>
                      </div>
                      <div>{renderStatusBadge(student)}</div>
                    </div>

                    {/* Times row */}
                    <div className="text-xs text-muted flex items-center gap-2 bg-soft px-3 py-2 rounded-lg">
                      <span>
                        In {student.checkInFormatted || "--"}
                        {isLate && (
                          <span className="ml-1 px-1 py-0.2 rounded text-[10px] font-semibold bg-amber-50 text-late border border-amber-200">
                            Late
                          </span>
                        )}
                      </span>
                      <span>·</span>
                      <span>Out {student.checkOutFormatted || "--"}</span>
                    </div>

                    {/* Mobile visible action buttons row (min 44px tap targets) */}
                    {!isFuture && (
                      <div className="flex items-center gap-2 pt-1">
                        {!student.isCheckedIn && (
                          <button
                            type="button"
                            onClick={() =>
                              setModalState({
                                isOpen: true,
                                type: "check_in",
                                student,
                                isSubmitting: false,
                              })
                            }
                            className="flex-1 min-h-[44px] inline-flex items-center justify-center gap-1.5 px-3 rounded-lg border border-border bg-white text-xs font-medium text-primary hover:bg-soft"
                          >
                            <Check className="w-4 h-4" />
                            Mark in
                          </button>
                        )}

                        {student.isCheckedIn && !student.isCheckedOut && (
                          <button
                            type="button"
                            onClick={() =>
                              setModalState({
                                isOpen: true,
                                type: "check_out",
                                student,
                                isSubmitting: false,
                              })
                            }
                            className="flex-1 min-h-[44px] inline-flex items-center justify-center gap-1.5 px-3 rounded-lg border border-border bg-white text-xs font-medium text-primary hover:bg-soft"
                          >
                            <LogOut className="w-4 h-4" />
                            Mark out
                          </button>
                        )}

                        {student.isCheckedIn && (
                          <button
                            type="button"
                            onClick={() =>
                              setModalState({
                                isOpen: true,
                                type: "clear",
                                student,
                                isSubmitting: false,
                              })
                            }
                            className="min-h-[44px] inline-flex items-center justify-center gap-1.5 px-3 rounded-lg border border-transparent text-xs font-medium text-absent hover:bg-red-50"
                            title="Clear record"
                          >
                            <Trash2 className="w-4 h-4" />
                            Clear
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </>
        )}
      </Card>

      {/* Confirmation Dialog Modal */}
      {modalState.isOpen && modalState.student && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-white rounded-xl max-w-sm w-full p-6 border border-border shadow-xl space-y-4 animate-in zoom-in-95 duration-150">
            {/* Modal Header */}
            <div className="flex items-start gap-3">
              {modalState.type === "clear" ? (
                <div className="w-10 h-10 rounded-full bg-red-50 text-[#EF4444] border border-red-200 flex items-center justify-center shrink-0">
                  <ShieldAlert className="w-5 h-5" />
                </div>
              ) : (
                <div className="w-10 h-10 rounded-full bg-soft text-primary border border-border flex items-center justify-center shrink-0">
                  <Clock className="w-5 h-5" />
                </div>
              )}
              <div className="space-y-1">
                <h3 className="text-base font-semibold text-primary">
                  {modalState.type === "clear"
                    ? "Clear Attendance Record"
                    : modalState.type === "check_in"
                    ? "Mark Student Check-In"
                    : "Mark Student Check-Out"}
                </h3>
                <p className="text-xs text-muted leading-relaxed">
                  {modalState.type === "clear" ? (
                    <>
                      Are you sure you want to permanently delete the attendance record for{" "}
                      <strong className="text-primary">{modalState.student.name}</strong> on{" "}
                      <strong>{selectedDate}</strong>? This action cannot be undone.
                    </>
                  ) : (
                    <>
                      Record {modalState.type === "check_in" ? "check-in" : "check-out"} for{" "}
                      <strong className="text-primary">{modalState.student.name}</strong> on{" "}
                      <strong>{selectedDate}</strong>?
                    </>
                  )}
                </p>
              </div>
            </div>

            {/* Optional Custom Time Input */}
            {modalState.type !== "clear" && (
              <div className="space-y-1.5 pt-1">
                <label className="text-[13px] text-muted block">
                  Time in Africa/Lagos (Optional, 24h format HH:mm)
                </label>
                <input
                  type="time"
                  value={modalState.timeInput || ""}
                  onChange={(e) =>
                    setModalState((prev) => ({ ...prev, timeInput: e.target.value }))
                  }
                  className="w-full px-3 py-2 text-xs border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>
            )}

            {/* Actions Buttons */}
            <div className="flex items-center gap-2 pt-2">
              <Button
                variant="secondary"
                onClick={() =>
                  setModalState({ isOpen: false, type: "check_in", student: null, isSubmitting: false })
                }
                disabled={modalState.isSubmitting}
                className="flex-1"
              >
                Cancel
              </Button>

              <Button
                variant={modalState.type === "clear" ? "danger" : "primary"}
                onClick={handleConfirmAction}
                isLoading={modalState.isSubmitting}
                className="flex-1"
              >
                {modalState.type === "clear"
                  ? "Yes, Clear"
                  : modalState.type === "check_in"
                  ? "Confirm In"
                  : "Confirm Out"}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function renderStatusBadge(student: AttendanceConsoleStudent) {
  if (student.isCurrentlyIn) {
    return (
      <Badge variant="present" withDot>
        In
      </Badge>
    );
  }
  if (student.isCheckedOut) {
    return (
      <Badge variant="primary" withDot>
        Out
      </Badge>
    );
  }
  if (student.isNotYetIn) {
    return (
      <Badge variant="neutral" withDot>
        Not yet in
      </Badge>
    );
  }
  if (student.status === "Absent") {
    return (
      <Badge variant="absent" withDot>
        Absent
      </Badge>
    );
  }
  return <Badge variant="neutral">-</Badge>;
}
