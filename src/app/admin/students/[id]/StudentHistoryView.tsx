"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Profile } from "@/types";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import {
  ArrowLeft,
  Mail,
  Calendar,
  Clock,
  ShieldCheck,
  ShieldAlert,
  UserCheck,
  UserX,
  KeyRound,
  CheckCircle2,
  AlertTriangle,
  CalendarRange,
  X,
} from "lucide-react";
import { format, parseISO } from "date-fns";
import { formatInTimeZone } from "date-fns-tz";
import { TIMEZONE } from "@/lib/attendance-rules";

export interface AttendanceRecord {
  id: string;
  student_id: string;
  attendance_date: string;
  check_in_at: string | null;
  check_out_at: string | null;
  status: "present" | "late";
  marked_by_admin: boolean;
}

export interface StudentWeekGroup {
  weekKey: string; // e.g. "2026-W41"
  weekStart: string; // Monday
  weekEnd: string;   // Sunday
  weekLabel: string; // "Oct 5 – Oct 11, 2026"
  days: {
    date: string;
    dayName: string;
    rec: AttendanceRecord | null;
    status: "Present" | "Late" | "Absent" | "Today" | "-";
    checkInFormatted: string | null;
    checkOutFormatted: string | null;
  }[];
  totals: {
    present: number;
    late: number;
    absent: number;
  };
}

interface StudentHistoryViewProps {
  student: Profile;
  weeks: StudentWeekGroup[];
  totalPresent: number;
  totalLate: number;
  totalAbsent: number;
  attendanceRate: number;
}

export function StudentHistoryView({
  student: initialStudent,
  weeks,
  totalPresent,
  totalLate,
  totalAbsent,
  attendanceRate,
}: StudentHistoryViewProps) {
  const router = useRouter();
  const [student, setStudent] = useState<Profile>(initialStudent);
  const [toast, setToast] = useState<{ type: "success" | "error"; message: string } | null>(null);

  // Modal Dialogs
  const [confirmDeactivate, setConfirmDeactivate] = useState(false);
  const [isSubmittingToggle, setIsSubmittingToggle] = useState(false);

  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [newPassword, setNewPassword] = useState("");
  const [isSubmittingPassword, setIsSubmittingPassword] = useState(false);

  // Toggle active status
  const handleToggleActive = async () => {
    setIsSubmittingToggle(true);
    const newActive = !student.is_active;

    try {
      const res = await fetch(`/api/admin/students/${student.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isActive: newActive }),
      });

      const data = await res.json();
      if (!res.ok || !data.ok) {
        throw new Error(data.error || "Failed to update account status");
      }

      setStudent((prev) => ({ ...prev, is_active: newActive }));
      setConfirmDeactivate(false);
      setToast({
        type: "success",
        message: newActive
          ? `${student.full_name} has been reactivated.`
          : `${student.full_name} has been deactivated.`,
      });
      router.refresh();
    } catch (err: any) {
      setToast({ type: "error", message: err.message || "Action failed" });
    } finally {
      setIsSubmittingToggle(false);
    }
  };

  // Reset password
  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword.length < 8) {
      setToast({ type: "error", message: "Password must be at least 8 characters long." });
      return;
    }

    setIsSubmittingPassword(true);
    try {
      const res = await fetch(`/api/admin/students/${student.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password: newPassword }),
      });

      const data = await res.json();
      if (!res.ok || !data.ok) {
        throw new Error(data.error || "Failed to reset password");
      }

      setShowPasswordModal(false);
      setNewPassword("");
      setToast({
        type: "success",
        message: `Password reset successfully for ${student.full_name}. Temporary password: ${newPassword}`,
      });
    } catch (err: any) {
      setToast({ type: "error", message: err.message || "Failed to reset password" });
    } finally {
      setIsSubmittingPassword(false);
    }
  };

  return (
    <div className="space-y-6 pb-20">
      {/* Toast Notification */}
      {toast && (
        <div
          className={`fixed top-4 right-4 z-50 flex items-start gap-3 p-4 rounded-xl border shadow-lg max-w-sm w-full animate-in slide-in-from-top ${
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
          <div className="flex-1 text-xs font-medium">{toast.message}</div>
          <button onClick={() => setToast(null)} className="text-[#5E6C87] hover:text-[#0B1B3F]">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Top Navigation Breadcrumb */}
      <div className="flex items-center justify-between">
        <Link
          href="/admin/weekly"
          className="text-xs font-semibold text-[#5E6C87] hover:text-[#0B1B3F] inline-flex items-center py-2 px-3 rounded-full hover:bg-white transition-colors"
        >
          <ArrowLeft className="w-3.5 h-3.5 mr-1.5" />
          Back to Weekly Matrix
        </Link>

        <Link
          href="/admin/students"
          className="text-xs font-semibold text-[#0B1B3F] hover:underline"
        >
          View all students
        </Link>
      </div>

      {/* Student Profile Card & Action Bar */}
      <Card className="bg-white border border-[#DDE3EE] p-5 sm:p-6 rounded-2xl shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-xl sm:text-2xl font-bold text-[#0B1B3F]">
                {student.full_name}
              </h1>
              {student.is_active ? (
                <Badge variant="present" withDot>
                  Active
                </Badge>
              ) : (
                <Badge variant="absent" withDot>
                  Deactivated
                </Badge>
              )}
            </div>
            <div className="flex items-center gap-4 text-xs text-[#5E6C87]">
              <span className="inline-flex items-center gap-1.5">
                <Mail className="w-3.5 h-3.5" />
                {student.email}
              </span>
              <span>•</span>
              <span className="inline-flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5" />
                Enrolled {format(new Date(student.created_at), "MMM yyyy")}
              </span>
            </div>
          </div>

          {/* Account Actions */}
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowPasswordModal(true)}
              className="rounded-full text-xs font-semibold h-9 px-3.5 border-[#DDE3EE] hover:bg-[#F1F4FB]"
            >
              <KeyRound className="w-3.5 h-3.5 mr-1.5 text-[#0B1B3F]" />
              Reset Password
            </Button>

            {student.is_active ? (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setConfirmDeactivate(true)}
                className="rounded-full text-xs font-semibold h-9 px-3.5 border-red-200 text-red-600 hover:bg-red-50"
              >
                <UserX className="w-3.5 h-3.5 mr-1.5" />
                Deactivate
              </Button>
            ) : (
              <Button
                variant="primary"
                size="sm"
                onClick={handleToggleActive}
                isLoading={isSubmittingToggle}
                className="rounded-full text-xs font-semibold h-9 px-3.5"
              >
                <UserCheck className="w-3.5 h-3.5 mr-1.5" />
                Reactivate
              </Button>
            )}
          </div>
        </div>
      </Card>

      {/* KPI Stats Row for Student */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <Card className="p-4 bg-white border border-[#DDE3EE] rounded-2xl shadow-xs">
          <span className="text-[11px] font-semibold text-[#5E6C87] uppercase tracking-wider">
            Attendance Rate
          </span>
          <div className="text-2xl font-extrabold text-[#0B1B3F] mt-1">{attendanceRate}%</div>
          <p className="text-[10px] text-[#5E6C87] mt-0.5">Overall workday average</p>
        </Card>

        <Card className="p-4 bg-green-50/50 border border-green-200 rounded-2xl shadow-xs">
          <span className="text-[11px] font-semibold text-[#16A34A] uppercase tracking-wider">
            Present Days
          </span>
          <div className="text-2xl font-extrabold text-[#16A34A] mt-1">{totalPresent}</div>
          <p className="text-[10px] text-[#5E6C87] mt-0.5">On-time arrivals</p>
        </Card>

        <Card className="p-4 bg-amber-50/50 border border-amber-200 rounded-2xl shadow-xs">
          <span className="text-[11px] font-semibold text-[#F59E0B] uppercase tracking-wider">
            Late Days
          </span>
          <div className="text-2xl font-extrabold text-[#F59E0B] mt-1">{totalLate}</div>
          <p className="text-[10px] text-[#5E6C87] mt-0.5">12:00 PM or later</p>
        </Card>

        <Card className="p-4 bg-red-50/50 border border-red-200 rounded-2xl shadow-xs">
          <span className="text-[11px] font-semibold text-[#EF4444] uppercase tracking-wider">
            Absent Days
          </span>
          <div className="text-2xl font-extrabold text-[#EF4444] mt-1">{totalAbsent}</div>
          <p className="text-[10px] text-[#5E6C87] mt-0.5">Unexcused missed workdays</p>
        </Card>
      </div>

      {/* Full Weekly History Grouped by Week */}
      <div className="space-y-4">
        <h2 className="text-base font-bold text-[#0B1B3F] flex items-center gap-2">
          <CalendarRange className="w-4 h-4 text-[#0B1B3F]" />
          Attendance History by Week
        </h2>

        {weeks.length === 0 ? (
          <Card className="p-8 text-center text-xs text-[#5E6C87] bg-white border border-[#DDE3EE]">
            No attendance history recorded yet for this student.
          </Card>
        ) : (
          weeks.map((week) => (
            <Card
              key={week.weekKey}
              className="bg-white border border-[#DDE3EE] rounded-2xl shadow-xs overflow-hidden"
            >
              {/* Week Header */}
              <CardHeader className="py-3 px-4 sm:px-5 border-b border-[#DDE3EE]/70 bg-[#FAFCFF] flex flex-row items-center justify-between">
                <div>
                  <CardTitle className="text-xs sm:text-sm font-bold text-[#0B1B3F]">
                    {week.weekLabel}
                  </CardTitle>
                </div>
                <div className="flex items-center gap-2 text-xs font-semibold">
                  <span className="text-[#16A34A]">{week.totals.present} Present</span>
                  <span className="text-gray-300">•</span>
                  <span className="text-[#F59E0B]">{week.totals.late} Late</span>
                  <span className="text-gray-300">•</span>
                  <span className="text-[#EF4444]">{week.totals.absent} Absent</span>
                </div>
              </CardHeader>

              {/* Day Rows */}
              <CardContent className="p-0 divide-y divide-[#DDE3EE]/60">
                {week.days.map((day) => {
                  let badgeVariant: "present" | "late" | "absent" | "neutral" = "neutral";
                  if (day.status === "Present") badgeVariant = "present";
                  else if (day.status === "Late") badgeVariant = "late";
                  else if (day.status === "Absent") badgeVariant = "absent";

                  return (
                    <div
                      key={day.date}
                      className="p-3.5 sm:px-5 flex items-center justify-between text-xs hover:bg-[#F9FBFE] transition-colors"
                    >
                      <div className="space-y-0.5">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-[#0B1B3F]">{day.dayName}</span>
                          <span className="text-[#5E6C87]">
                            {format(parseISO(day.date), "MMM d, yyyy")}
                          </span>
                        </div>
                        <div className="text-[11px] text-[#5E6C87] flex items-center gap-3">
                          <span>
                            In: <strong className="text-[#0B1B3F]">{day.checkInFormatted || "--"}</strong>
                          </span>
                          <span>
                            Out: <strong className="text-[#0B1B3F]">{day.checkOutFormatted || "--"}</strong>
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center gap-1.5">
                        <Badge variant={badgeVariant} withDot={day.rec !== null}>
                          {day.status}
                        </Badge>
                        {day.rec?.marked_by_admin && (
                          <span className="text-[9px] font-semibold px-1.5 py-0.5 rounded-full bg-slate-100 text-slate-700 border border-slate-200">
                            manual
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </CardContent>
            </Card>
          ))
        )}
      </div>

      {/* DEACTIVATE CONFIRMATION MODAL */}
      {confirmDeactivate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-sm w-full p-6 border border-[#DDE3EE] shadow-xl space-y-4">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-full bg-red-50 text-[#EF4444] border border-red-200 flex items-center justify-center shrink-0">
                <ShieldAlert className="w-5 h-5" />
              </div>
              <div className="space-y-1">
                <h3 className="text-base font-bold text-[#0B1B3F]">Deactivate Student</h3>
                <p className="text-xs text-[#5E6C87] leading-relaxed">
                  Are you sure you want to deactivate{" "}
                  <strong className="text-[#0B1B3F]">{student.full_name}</strong>? They will be
                  immediately blocked from logging in and scanning attendance.
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 pt-2">
              <Button
                variant="outline"
                onClick={() => setConfirmDeactivate(false)}
                disabled={isSubmittingToggle}
                className="flex-1 min-h-[44px] rounded-full text-xs font-semibold"
              >
                Cancel
              </Button>
              <Button
                variant="danger"
                onClick={handleToggleActive}
                isLoading={isSubmittingToggle}
                className="flex-1 min-h-[44px] rounded-full text-xs font-semibold"
              >
                Yes, Deactivate
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* RESET PASSWORD MODAL */}
      {showPasswordModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs">
          <form
            onSubmit={handleResetPassword}
            className="bg-white rounded-2xl max-w-sm w-full p-6 border border-[#DDE3EE] shadow-xl space-y-4"
          >
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-full bg-[#F1F4FB] text-[#0B1B3F] border border-[#DDE3EE] flex items-center justify-center shrink-0">
                <KeyRound className="w-5 h-5 text-[#00E6FF]" />
              </div>
              <div className="space-y-1">
                <h3 className="text-base font-bold text-[#0B1B3F]">Reset Student Password</h3>
                <p className="text-xs text-[#5E6C87] leading-relaxed">
                  Set a new temporary password for{" "}
                  <strong className="text-[#0B1B3F]">{student.full_name}</strong>.
                </p>
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-[11px] font-semibold text-[#5E6C87]">
                New Temporary Password (min 8 characters)
              </label>
              <input
                type="text"
                required
                minLength={8}
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="Enter new password (e.g. TempPass2026!)"
                className="w-full px-3 py-2 text-xs border border-[#DDE3EE] rounded-xl focus:outline-none focus:border-[#0B1B3F]"
              />
            </div>

            <div className="flex items-center gap-2 pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setShowPasswordModal(false);
                  setNewPassword("");
                }}
                disabled={isSubmittingPassword}
                className="flex-1 min-h-[44px] rounded-full text-xs font-semibold"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                variant="primary"
                isLoading={isSubmittingPassword}
                className="flex-1 min-h-[44px] rounded-full text-xs font-semibold"
              >
                Set Password
              </Button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
