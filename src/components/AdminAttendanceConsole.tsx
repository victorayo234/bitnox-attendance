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
  UserX,
  Search,
  RefreshCw,
  Calendar,
  CheckCircle2,
  AlertTriangle,
  Clock,
  Trash2,
  Check,
  ChevronRight,
  X,
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

export function AdminAttendanceConsole({ initialData }: AdminAttendanceConsoleProps) {
  const [data, setData] = useState<AttendanceConsoleData>(initialData);
  const [selectedDate, setSelectedDate] = useState<string>(initialData.selectedDate);
  const [searchQuery, setSearchQuery] = useState("");
  const [activeFilter, setActiveFilter] = useState<FilterChip>("all");
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<string>(() => {
    return new Date().toLocaleTimeString("en-US", {
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
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
              hour: "2-digit",
              minute: "2-digit",
              second: "2-digit",
              hour12: true,
            })
          );
        }
      } catch (err: any) {
        if (isManual) {
          showToast("error", err.message || "Failed to refresh data");
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

      // Close modal and refresh current data
      setModalState({ isOpen: false, type: "check_in", student: null, isSubmitting: false });
      await fetchData(selectedDate, false);
    } catch (err: any) {
      showToast("error", err.message || "Action failed");
      setModalState((prev) => ({ ...prev, isSubmitting: false }));
    }
  };

  // Filtered Students
  const filteredStudents = useMemo(() => {
    return data.students.filter((student) => {
      // 1. Search filter
      const matchesSearch =
        searchQuery === "" ||
        student.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        student.email.toLowerCase().includes(searchQuery.toLowerCase());

      if (!matchesSearch) return false;

      // 2. Chip filter
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

      {/* 1. TOP STAT CARDS (Rounded, Bordered, Computed from today's Lagos date) */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {/* Total Active Students */}
        <Card className="bg-white border border-[#DDE3EE] p-4 sm:p-5 rounded-2xl shadow-xs">
          <div className="flex items-center justify-between text-[#5E6C87] mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">Active Students</span>
            <div className="w-8 h-8 rounded-full bg-[#F1F4FB] text-[#0B1B3F] flex items-center justify-center">
              <Users className="w-4 h-4 text-[#0B1B3F]" />
            </div>
          </div>
          <div className="text-3xl font-extrabold text-[#0B1B3F]">
            {data.stats.totalActiveStudents}
          </div>
          <p className="text-[11px] text-[#5E6C87] mt-1">Total approved enrolled</p>
        </Card>

        {/* Currently In */}
        <Card className="bg-white border border-[#DDE3EE] p-4 sm:p-5 rounded-2xl shadow-xs">
          <div className="flex items-center justify-between text-[#5E6C87] mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider text-[#16A34A]">
              Currently In
            </span>
            <div className="w-8 h-8 rounded-full bg-green-50 text-[#16A34A] flex items-center justify-center border border-green-200">
              <UserCheck className="w-4 h-4" />
            </div>
          </div>
          <div className="text-3xl font-extrabold text-[#16A34A]">{data.stats.currentlyIn}</div>
          <p className="text-[11px] text-[#5E6C87] mt-1">Checked in, not out</p>
        </Card>

        {/* Checked Out */}
        <Card className="bg-white border border-[#DDE3EE] p-4 sm:p-5 rounded-2xl shadow-xs">
          <div className="flex items-center justify-between text-[#5E6C87] mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider text-[#0B1B3F]">
              Checked Out
            </span>
            <div className="w-8 h-8 rounded-full bg-[#F1F4FB] text-[#0B1B3F] flex items-center justify-center border border-[#DDE3EE]">
              <LogOut className="w-4 h-4" />
            </div>
          </div>
          <div className="text-3xl font-extrabold text-[#0B1B3F]">{data.stats.checkedOut}</div>
          <p className="text-[11px] text-[#5E6C87] mt-1">Completed day session</p>
        </Card>

        {/* Not Yet In */}
        <Card className="bg-white border border-[#DDE3EE] p-4 sm:p-5 rounded-2xl shadow-xs">
          <div className="flex items-center justify-between text-[#5E6C87] mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider text-[#F59E0B]">
              Not Yet In
            </span>
            <div className="w-8 h-8 rounded-full bg-amber-50 text-[#F59E0B] flex items-center justify-center border border-amber-200">
              <UserX className="w-4 h-4" />
            </div>
          </div>
          <div className="text-3xl font-extrabold text-[#F59E0B]">{data.stats.notYetIn}</div>
          <p className="text-[11px] text-[#5E6C87] mt-1">
            {data.isTodayWorkday ? "No check-in record today" : "Non-workday today"}
          </p>
        </Card>
      </div>

      {/* 2. DATE PICKER & AUTO-REFRESH HEADER */}
      <Card className="bg-white border border-[#DDE3EE] p-4 sm:p-5 rounded-2xl shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          {/* Date Picker Section */}
          <div className="flex items-center gap-2 flex-wrap">
            <div className="flex items-center gap-2 bg-[#F1F4FB] border border-[#DDE3EE] px-4 min-h-[44px] rounded-full">
              <Calendar className="w-4 h-4 text-[#0B1B3F]" />
              <input
                type="date"
                aria-label="Attendance date"
                value={selectedDate}
                onChange={(e) => handleDateChange(e.target.value)}
                className="bg-transparent text-xs font-semibold text-[#0B1B3F] focus:outline-none cursor-pointer"
              />
            </div>

            {!isToday && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleDateChange(data.todayDate)}
                className="rounded-full text-xs font-semibold min-h-[44px] px-3.5"
              >
                Jump to Today
              </Button>
            )}

            {isToday ? (
              <span className="text-[11px] font-bold uppercase tracking-wider text-[#16A34A] bg-green-50 border border-green-200 px-3 py-1.5 rounded-full inline-flex items-center min-h-[32px]">
                Today (Live)
              </span>
            ) : isFuture ? (
              <span className="text-[11px] font-bold uppercase tracking-wider text-amber-700 bg-amber-50 border border-amber-200 px-3 py-1.5 rounded-full inline-flex items-center min-h-[32px]">
                Future Date
              </span>
            ) : (
              <span className="text-[11px] font-medium text-[#5E6C87] bg-slate-50 border border-slate-200 px-3 py-1.5 rounded-full inline-flex items-center min-h-[32px]">
                Historical View
              </span>
            )}
          </div>

          {/* Refresh Controls & Last Updated */}
          <div className="flex items-center gap-3 self-end sm:self-auto">
            <span className="text-[11px] text-[#5E6C87]">
              Updated: <strong className="text-[#0B1B3F]">{lastUpdated}</strong>
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => fetchData(selectedDate, true)}
              disabled={isRefreshing}
              className="rounded-full min-h-[44px] px-4 text-xs font-medium border-[#DDE3EE] hover:bg-[#F1F4FB]"
            >
              <RefreshCw
                className={`w-3.5 h-3.5 mr-1.5 text-[#0B1B3F] ${
                  isRefreshing ? "animate-spin" : ""
                }`}
              />
              Refresh
            </Button>
          </div>
        </div>
      </Card>

      {/* 3. SEARCH & FILTER CHIPS */}
      <div className="space-y-3">
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
          {/* Search Box */}
          <div className="relative flex-1 max-w-md">
            <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-[#5E6C87]" />
            <input
              type="text"
              placeholder="Search student by name or email..."
              aria-label="Search student by name or email"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 min-h-[44px] bg-white border border-[#DDE3EE] rounded-full text-xs font-medium text-[#0B1B3F] placeholder-[#5E6C87] focus:outline-none focus:border-[#0B1B3F] focus:ring-1 focus:ring-[#0B1B3F] transition-all shadow-2xs"
            />
            {searchQuery && (
              <button
                type="button"
                aria-label="Clear search"
                onClick={() => setSearchQuery("")}
                className="absolute right-3 top-1/2 -translate-y-1/2 w-8 h-8 flex items-center justify-center text-[#5E6C87] hover:text-[#0B1B3F]"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          {/* Filter Chips */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
            <button
              onClick={() => setActiveFilter("all")}
              className={`px-3.5 py-2 rounded-full text-xs font-semibold whitespace-nowrap transition-colors min-h-[44px] ${
                activeFilter === "all"
                  ? "bg-[#0B1B3F] text-white"
                  : "bg-white text-[#5E6C87] border border-[#DDE3EE] hover:bg-[#F1F4FB]"
              }`}
            >
              All ({filterCounts.all})
            </button>

            <button
              onClick={() => setActiveFilter("in")}
              className={`px-3.5 py-2 rounded-full text-xs font-semibold whitespace-nowrap transition-colors min-h-[44px] ${
                activeFilter === "in"
                  ? "bg-[#16A34A] text-white"
                  : "bg-white text-[#5E6C87] border border-[#DDE3EE] hover:bg-[#F1F4FB]"
              }`}
            >
              In ({filterCounts.in})
            </button>

            <button
              onClick={() => setActiveFilter("out")}
              className={`px-3.5 py-2 rounded-full text-xs font-semibold whitespace-nowrap transition-colors min-h-[44px] ${
                activeFilter === "out"
                  ? "bg-[#0B1B3F] text-white"
                  : "bg-white text-[#5E6C87] border border-[#DDE3EE] hover:bg-[#F1F4FB]"
              }`}
            >
              Out ({filterCounts.out})
            </button>

            <button
              onClick={() => setActiveFilter("not_in")}
              className={`px-3.5 py-2 rounded-full text-xs font-semibold whitespace-nowrap transition-colors min-h-[44px] ${
                activeFilter === "not_in"
                  ? "bg-[#F59E0B] text-white"
                  : "bg-white text-[#5E6C87] border border-[#DDE3EE] hover:bg-[#F1F4FB]"
              }`}
            >
              Not yet in ({filterCounts.not_in})
            </button>

            <button
              onClick={() => setActiveFilter("late")}
              className={`px-3.5 py-2 rounded-full text-xs font-semibold whitespace-nowrap transition-colors min-h-[44px] ${
                activeFilter === "late"
                  ? "bg-amber-600 text-white"
                  : "bg-white text-[#5E6C87] border border-[#DDE3EE] hover:bg-[#F1F4FB]"
              }`}
            >
              Late ({filterCounts.late})
            </button>
          </div>
        </div>
      </div>

      {/* 4. TODAY'S ATTENDANCE TABLE (DESKTOP) & STACKED CARDS (MOBILE) */}
      <Card className="bg-white border border-[#DDE3EE] rounded-2xl shadow-sm overflow-hidden">
        {/* Table Header Banner */}
        <CardHeader className="py-4 px-5 border-b border-[#DDE3EE]/70 bg-[#FAFCFF] flex flex-row items-center justify-between">
          <div className="flex items-center gap-2">
            <CardTitle className="text-sm font-bold text-[#0B1B3F]">
              {isToday ? "Today's Attendance" : `Attendance Records (${selectedDate})`}
            </CardTitle>
            <span className="text-xs text-[#5E6C87]">
              ({filteredStudents.length} of {data.students.length} students)
            </span>
          </div>

          <span className="text-[11px] text-[#5E6C87] hidden sm:inline-block">
            Sorted: In first, then Not Yet In
          </span>
        </CardHeader>

        {/* Empty Search Results */}
        {filteredStudents.length === 0 && (
          <div className="p-8 text-center space-y-2">
            <div className="w-12 h-12 rounded-full bg-[#F1F4FB] text-[#5E6C87] flex items-center justify-center mx-auto">
              <Search className="w-6 h-6" />
            </div>
            <h3 className="text-sm font-bold text-[#0B1B3F]">No students match your filter</h3>
            <p className="text-xs text-[#5E6C87]">
              Try adjusting your search query or selecting a different filter chip.
            </p>
          </div>
        )}

        {/* DESKTOP TABLE VIEW */}
        {filteredStudents.length > 0 && (
          <div className="hidden md:block overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-[#F8FAFD] text-[#5E6C87] border-b border-[#DDE3EE] uppercase tracking-wider text-[11px] font-semibold">
                <tr>
                  <th className="py-3.5 px-5">Student</th>
                  <th className="py-3.5 px-4">Check-In</th>
                  <th className="py-3.5 px-4">Check-Out</th>
                  <th className="py-3.5 px-4">Status</th>
                  {!isFuture && <th className="py-3.5 px-5 text-right">Actions</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-[#DDE3EE]/60">
                {filteredStudents.map((student) => (
                  <tr
                    key={student.studentId}
                    className="hover:bg-[#F9FBFE] transition-colors"
                  >
                    {/* Student Info */}
                    <td className="py-3.5 px-5">
                      <div className="font-bold text-[#0B1B3F] text-sm">{student.name}</div>
                      <div className="text-[11px] text-[#5E6C87]">{student.email}</div>
                    </td>

                    {/* Check-In Time */}
                    <td className="py-3.5 px-4">
                      {student.checkInFormatted ? (
                        <span className="font-semibold text-[#0B1B3F] inline-flex items-center gap-1.5">
                          <Clock className="w-3.5 h-3.5 text-[#16A34A]" />
                          {student.checkInFormatted}
                        </span>
                      ) : (
                        <span className="text-[#5E6C87]">--</span>
                      )}
                    </td>

                    {/* Check-Out Time */}
                    <td className="py-3.5 px-4">
                      {student.checkOutFormatted ? (
                        <span className="font-semibold text-[#0B1B3F] inline-flex items-center gap-1.5">
                          <Clock className="w-3.5 h-3.5 text-[#5E6C87]" />
                          {student.checkOutFormatted}
                        </span>
                      ) : (
                        <span className="text-[#5E6C87]">--</span>
                      )}
                    </td>

                    {/* Status Badge & Manual Tag */}
                    <td className="py-3.5 px-4">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        {renderStatusBadge(student.status)}
                        {student.markedByAdmin && (
                          <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 border border-slate-200">
                            manual
                          </span>
                        )}
                      </div>
                    </td>

                    {/* Row Actions (Hidden for future dates) */}
                    {!isFuture && (
                      <td className="py-3.5 px-5 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {/* Mark Present / Check In */}
                          {!student.isCheckedIn && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() =>
                                setModalState({
                                  isOpen: true,
                                  type: "check_in",
                                  student,
                                  isSubmitting: false,
                                })
                              }
                              className="h-8 px-2.5 text-[11px] rounded-full border-green-200 text-[#16A34A] hover:bg-green-50"
                            >
                              <Check className="w-3 h-3 mr-1" />
                              Mark Present
                            </Button>
                          )}

                          {/* Mark Checked Out */}
                          {student.isCheckedIn && !student.isCheckedOut && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() =>
                                setModalState({
                                  isOpen: true,
                                  type: "check_out",
                                  student,
                                  isSubmitting: false,
                                })
                              }
                              className="h-8 px-2.5 text-[11px] rounded-full border-[#0B1B3F]/30 text-[#0B1B3F] hover:bg-[#F1F4FB]"
                            >
                              <LogOut className="w-3 h-3 mr-1" />
                              Mark Out
                            </Button>
                          )}

                          {/* Clear Record */}
                          {student.isCheckedIn && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() =>
                                setModalState({
                                  isOpen: true,
                                  type: "clear",
                                  student,
                                  isSubmitting: false,
                                })
                              }
                              className="h-8 px-2 text-[11px] rounded-full text-red-600 hover:bg-red-50 hover:text-red-700"
                              title="Clear student attendance"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </Button>
                          )}
                        </div>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* MOBILE STACKED CARDS VIEW (md:hidden) with min 44px tap targets */}
        {filteredStudents.length > 0 && (
          <div className="block md:hidden divide-y divide-[#DDE3EE]/60">
            {filteredStudents.map((student) => (
              <div key={student.studentId} className="p-4 space-y-3">
                {/* Header: Name, Email & Status */}
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <h4 className="font-bold text-sm text-[#0B1B3F]">{student.name}</h4>
                    <p className="text-[11px] text-[#5E6C87]">{student.email}</p>
                  </div>
                  <div className="flex flex-col items-end gap-1">
                    {renderStatusBadge(student.status)}
                    {student.markedByAdmin && (
                      <span className="text-[9px] font-semibold px-1.5 py-0.2 rounded-full bg-slate-100 text-slate-700 border border-slate-200">
                        manual
                      </span>
                    )}
                  </div>
                </div>

                {/* Timestamps Row */}
                <div className="flex items-center justify-between text-xs bg-[#F8FAFD] p-2.5 rounded-xl border border-[#DDE3EE]/60">
                  <div className="flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5 text-[#16A34A]" />
                    <span className="text-[#5E6C87]">In:</span>
                    <strong className="text-[#0B1B3F]">
                      {student.checkInFormatted || "--"}
                    </strong>
                  </div>

                  <div className="flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5 text-[#5E6C87]" />
                    <span className="text-[#5E6C87]">Out:</span>
                    <strong className="text-[#0B1B3F]">
                      {student.checkOutFormatted || "--"}
                    </strong>
                  </div>
                </div>

                {/* Actions Row (Hidden for future dates, min 44px tap targets) */}
                {!isFuture && (
                  <div className="flex items-center gap-2 pt-1">
                    {!student.isCheckedIn && (
                      <Button
                        variant="outline"
                        onClick={() =>
                          setModalState({
                            isOpen: true,
                            type: "check_in",
                            student,
                            isSubmitting: false,
                          })
                        }
                        className="flex-1 min-h-[44px] text-xs font-semibold rounded-full border-green-200 text-[#16A34A] hover:bg-green-50"
                      >
                        <Check className="w-4 h-4 mr-1.5" />
                        Mark Present
                      </Button>
                    )}

                    {student.isCheckedIn && !student.isCheckedOut && (
                      <Button
                        variant="outline"
                        onClick={() =>
                          setModalState({
                            isOpen: true,
                            type: "check_out",
                            student,
                            isSubmitting: false,
                          })
                        }
                        className="flex-1 min-h-[44px] text-xs font-semibold rounded-full border-[#0B1B3F]/30 text-[#0B1B3F] hover:bg-[#F1F4FB]"
                      >
                        <LogOut className="w-4 h-4 mr-1.5" />
                        Mark Out
                      </Button>
                    )}

                    {student.isCheckedIn && (
                      <Button
                        variant="outline"
                        onClick={() =>
                          setModalState({
                            isOpen: true,
                            type: "clear",
                            student,
                            isSubmitting: false,
                          })
                        }
                        className="min-h-[44px] px-3.5 text-xs font-semibold rounded-full border-red-200 text-red-600 hover:bg-red-50"
                        title="Clear record"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </Card>

      {/* 5. CONFIRMATION DIALOG MODAL */}
      {modalState.isOpen && modalState.student && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl max-w-sm w-full p-6 border border-[#DDE3EE] shadow-xl space-y-4 animate-in zoom-in-95 duration-150">
            {/* Modal Icon & Header */}
            <div className="flex items-start gap-3">
              {modalState.type === "clear" ? (
                <div className="w-10 h-10 rounded-full bg-red-50 text-[#EF4444] border border-red-200 flex items-center justify-center shrink-0">
                  <ShieldAlert className="w-5 h-5" />
                </div>
              ) : (
                <div className="w-10 h-10 rounded-full bg-[#F1F4FB] text-[#0B1B3F] border border-[#DDE3EE] flex items-center justify-center shrink-0">
                  <Clock className="w-5 h-5 text-[#00E6FF]" />
                </div>
              )}
              <div className="space-y-1">
                <h3 className="text-base font-bold text-[#0B1B3F]">
                  {modalState.type === "clear"
                    ? "Clear Attendance Record"
                    : modalState.type === "check_in"
                    ? "Mark Student Check-In"
                    : "Mark Student Check-Out"}
                </h3>
                <p className="text-xs text-[#5E6C87] leading-relaxed">
                  {modalState.type === "clear" ? (
                    <>
                      Are you sure you want to permanently delete the attendance record for{" "}
                      <strong className="text-[#0B1B3F]">{modalState.student.name}</strong> on{" "}
                      <strong>{selectedDate}</strong>? This action cannot be undone.
                    </>
                  ) : (
                    <>
                      Record {modalState.type === "check_in" ? "check-in" : "check-out"} for{" "}
                      <strong className="text-[#0B1B3F]">{modalState.student.name}</strong> on{" "}
                      <strong>{selectedDate}</strong>?
                    </>
                  )}
                </p>
              </div>
            </div>

            {/* Optional Custom Time Input for Check-in / Check-out */}
            {modalState.type !== "clear" && (
              <div className="space-y-1.5 pt-1">
                <label className="text-[11px] font-semibold text-[#5E6C87]">
                  Time in Africa/Lagos (Optional, 24h format HH:mm)
                </label>
                <input
                  type="time"
                  placeholder="Leave empty for current time"
                  value={modalState.timeInput || ""}
                  onChange={(e) =>
                    setModalState((prev) => ({ ...prev, timeInput: e.target.value }))
                  }
                  className="w-full px-3 py-2 text-xs border border-[#DDE3EE] rounded-xl focus:outline-none focus:border-[#0B1B3F]"
                />
              </div>
            )}

            {/* Actions Buttons (min 44px tap targets) */}
            <div className="flex items-center gap-2 pt-2">
              <Button
                variant="outline"
                onClick={() =>
                  setModalState({ isOpen: false, type: "check_in", student: null, isSubmitting: false })
                }
                disabled={modalState.isSubmitting}
                className="flex-1 min-h-[44px] rounded-full text-xs font-semibold"
              >
                Cancel
              </Button>

              <Button
                variant={modalState.type === "clear" ? "danger" : "primary"}
                onClick={handleConfirmAction}
                isLoading={modalState.isSubmitting}
                className="flex-1 min-h-[44px] rounded-full text-xs font-semibold"
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

/**
 * Helper to render clean status badges matching Bitnox theme tokens
 */
function renderStatusBadge(status: AdminStudentStatus) {
  switch (status) {
    case "Present":
      return (
        <Badge variant="present" withDot>
          Present
        </Badge>
      );
    case "Late":
      return (
        <Badge variant="late" withDot>
          Late
        </Badge>
      );
    case "Checked out":
      return (
        <Badge variant="primary" withDot>
          Checked out
        </Badge>
      );
    case "Absent":
      return (
        <Badge variant="absent" withDot>
          Absent
        </Badge>
      );
    case "Not yet in":
      return (
        <Badge variant="neutral">
          Not yet in
        </Badge>
      );
    default:
      return (
        <Badge variant="neutral">
          -
        </Badge>
      );
  }
}
