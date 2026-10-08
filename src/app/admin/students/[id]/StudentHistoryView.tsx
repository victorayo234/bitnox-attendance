"use client";

import React, { useState, useEffect } from "react";
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
  KeyRound,
  CheckCircle2,
  AlertTriangle,
  CalendarRange,
  X,
  ShieldCheck,
  ShieldX,
  Shield,
  ShieldAlert,
  UserCheck,
  UserX,
  History,
  Clock,
  User,
} from "lucide-react";
import { format, parseISO } from "date-fns";

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
  weekKey: string;
  weekStart: string;
  weekEnd: string;
  weekLabel: string;
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

export interface RoleHistoryItem {
  id: string;
  adminName: string;
  action: "Promoted to admin" | "Removed as admin" | string;
  timestampLagos: string;
}

interface StudentHistoryViewProps {
  student: Profile;
  weeks: StudentWeekGroup[];
  totalPresent: number;
  totalLate: number;
  totalAbsent: number;
  attendanceRate: number;
  currentAdminId: string;
  roleHistory: RoleHistoryItem[];
}

export function StudentHistoryView({
  student: initialStudent,
  weeks,
  totalPresent,
  totalLate,
  totalAbsent,
  attendanceRate,
  currentAdminId,
  roleHistory: initialRoleHistory,
}: StudentHistoryViewProps) {
  const router = useRouter();
  const [student, setStudent] = useState<Profile>(initialStudent);
  const [roleHistory, setRoleHistory] = useState<RoleHistoryItem[]>(initialRoleHistory);
  const [toast, setToast] = useState<{ type: "success" | "error"; message: string } | null>(null);

  // Role Change Dialog State
  const [targetRoleAction, setTargetRoleAction] = useState<"admin" | "student" | null>(null);
  const [roleModalError, setRoleModalError] = useState<string | null>(null);
  const [isSubmittingRole, setIsSubmittingRole] = useState(false);

  // Deactivate Modal State
  const [confirmDeactivate, setConfirmDeactivate] = useState(false);
  const [deactivateError, setDeactivateError] = useState<string | null>(null);
  const [isSubmittingToggle, setIsSubmittingToggle] = useState(false);

  // Reset Password Modal State
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [newPassword, setNewPassword] = useState("");
  const [isSubmittingPassword, setIsSubmittingPassword] = useState(false);

  const isCurrentAdmin = student.id === currentAdminId;
  const canMakeAdmin =
    student.role === "student" &&
    student.status === "approved" &&
    student.is_active;
  const canRemoveAdmin = student.role === "admin" && !isCurrentAdmin;

  // Escape key cancels modals
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        if (!isSubmittingRole && !isSubmittingToggle && !isSubmittingPassword) {
          setTargetRoleAction(null);
          setRoleModalError(null);
          setConfirmDeactivate(false);
          setDeactivateError(null);
          setShowPasswordModal(false);
        }
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isSubmittingRole, isSubmittingToggle, isSubmittingPassword]);

  // Handle Role Change Submission
  const handleRoleChangeSubmit = async () => {
    if (!targetRoleAction) return;

    setIsSubmittingRole(true);
    setRoleModalError(null);

    try {
      const res = await fetch(`/api/admin/students/${student.id}/role`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ role: targetRoleAction }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to update role");
      }

      setStudent((prev) => ({ ...prev, role: targetRoleAction }));
      setToast({
        type: "success",
        message:
          targetRoleAction === "admin"
            ? `${student.full_name} is now an admin.`
            : `${student.full_name} is now a student.`,
      });

      // Update role history list locally
      setRoleHistory((prev) => [
        {
          id: String(Date.now()),
          adminName: "You",
          action:
            targetRoleAction === "admin"
              ? "Promoted to admin"
              : "Removed as admin",
          timestampLagos: format(new Date(), "MMM d, yyyy 'at' hh:mm a"),
        },
        ...prev,
      ]);

      setTargetRoleAction(null);
      setRoleModalError(null);
      router.refresh();
    } catch (err: any) {
      setRoleModalError(err.message || "Failed to update role.");
    } finally {
      setIsSubmittingRole(false);
    }
  };

  // Toggle active status
  const handleToggleActive = async () => {
    setIsSubmittingToggle(true);
    setDeactivateError(null);
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
      if (confirmDeactivate) {
        setDeactivateError(err.message || "Action failed");
      } else {
        setToast({ type: "error", message: err.message || "Action failed" });
      }
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
          className="text-xs font-medium text-[#5E6C87] hover:text-[#0B1B3F] inline-flex items-center py-2 px-3 rounded-lg hover:bg-white transition-colors"
        >
          <ArrowLeft className="w-3.5 h-3.5 mr-1.5" />
          Back to Weekly Matrix
        </Link>

        <Link
          href="/admin/students"
          className="text-xs font-medium text-[#0B1B3F] hover:underline"
        >
          View all accounts
        </Link>
      </div>

      {/* Profile Card & Action Bar */}
      <div className="bg-white border border-[#DDE3EE] p-5 sm:p-6 rounded-[12px] shadow-[0_1px_2px_rgba(11,27,63,0.04)]">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-xl sm:text-2xl font-semibold text-[#0B1B3F]">
                {student.full_name}
              </h1>

              {/* You tag */}
              {isCurrentAdmin && (
                <span className="px-2 py-0.5 rounded text-xs font-medium bg-[#F1F4FB] text-[#0B1B3F] border border-[#DDE3EE]">
                  You
                </span>
              )}

              {/* Role Badge: Navy Admin pill vs Muted Student pill */}
              {student.role === "admin" ? (
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-[#0B1B3F]/10 text-[#0B1B3F] border border-[#0B1B3F]/20">
                  <Shield className="w-3 h-3 mr-1 text-[#0B1B3F]" />
                  Admin
                </span>
              ) : (
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-700 border border-slate-200">
                  Student
                </span>
              )}

              {/* Account Status */}
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

          {/* Account Actions: Make admin / Remove admin, Reset Password, Deactivate */}
          <div className="flex items-center gap-2 flex-wrap">
            {/* Make admin / Remove admin */}
            {canMakeAdmin && (
              <Button
                variant="secondary"
                size="sm"
                onClick={() => {
                  setTargetRoleAction("admin");
                  setRoleModalError(null);
                }}
                className="h-8 text-[13px] px-3 rounded-lg"
              >
                <ShieldCheck className="w-3.5 h-3.5 mr-1 text-[#0B1B3F]" />
                Make admin
              </Button>
            )}

            {canRemoveAdmin && (
              <Button
                variant="secondary"
                size="sm"
                onClick={() => {
                  setTargetRoleAction("student");
                  setRoleModalError(null);
                }}
                className="h-8 text-[13px] px-3 rounded-lg"
              >
                <ShieldX className="w-3.5 h-3.5 mr-1" />
                Remove admin
              </Button>
            )}

            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowPasswordModal(true)}
              className="h-8 text-[13px] px-3 rounded-lg"
            >
              <KeyRound className="w-3.5 h-3.5 mr-1 text-[#0B1B3F]" />
              Reset Password
            </Button>

            {!isCurrentAdmin && (
              student.is_active ? (
                <Button
                  variant="danger-ghost"
                  size="sm"
                  onClick={() => {
                    setConfirmDeactivate(true);
                    setDeactivateError(null);
                  }}
                  className="h-8 text-[13px] px-3 rounded-lg"
                >
                  <UserX className="w-3.5 h-3.5 mr-1" />
                  Deactivate
                </Button>
              ) : (
                <Button
                  variant="primary"
                  size="sm"
                  onClick={handleToggleActive}
                  isLoading={isSubmittingToggle}
                  className="h-8 text-[13px] px-3 rounded-lg"
                >
                  <UserCheck className="w-3.5 h-3.5 mr-1" />
                  Reactivate
                </Button>
              )
            )}
          </div>
        </div>
      </div>

      {/* KPI Stats Row for Student (Neutral numbers, subtle left accent, no restating captions) */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="p-4 bg-white border border-[#DDE3EE] border-l-[3px] border-l-[#0B1B3F] rounded-[12px] shadow-[0_1px_2px_rgba(11,27,63,0.04)]">
          <span className="text-xs font-medium text-[#5E6C87]">
            Attendance rate
          </span>
          <div className="text-2xl font-semibold text-[#0B1B3F] mt-1">{attendanceRate}%</div>
        </div>

        <div className="p-4 bg-white border border-[#DDE3EE] border-l-[3px] border-l-[#16A34A] rounded-[12px] shadow-[0_1px_2px_rgba(11,27,63,0.04)]">
          <span className="text-xs font-medium text-[#5E6C87]">
            Present
          </span>
          <div className="text-2xl font-semibold text-[#0B1B3F] mt-1">{totalPresent}</div>
        </div>

        <div className="p-4 bg-white border border-[#DDE3EE] border-l-[3px] border-l-[#F59E0B] rounded-[12px] shadow-[0_1px_2px_rgba(11,27,63,0.04)]">
          <span className="text-xs font-medium text-[#5E6C87]">
            Late
          </span>
          <div className="text-2xl font-semibold text-[#0B1B3F] mt-1">{totalLate}</div>
        </div>

        <div className="p-4 bg-white border border-[#DDE3EE] border-l-[3px] border-l-[#EF4444] rounded-[12px] shadow-[0_1px_2px_rgba(11,27,63,0.04)]">
          <span className="text-xs font-medium text-[#5E6C87]">
            Absent
          </span>
          <div className="text-2xl font-semibold text-[#0B1B3F] mt-1">{totalAbsent}</div>
        </div>
      </div>

      {/* Full Weekly History Grouped by Week */}
      <div className="space-y-4">
        <h2 className="text-base font-semibold text-[#0B1B3F] flex items-center gap-2">
          <CalendarRange className="w-4 h-4 text-[#0B1B3F]" />
          Attendance history by week
        </h2>

        {weeks.length === 0 ? (
          <div className="rounded-[12px] bg-white border border-[#DDE3EE] p-8 text-center flex flex-col items-center justify-center space-y-2 shadow-[0_1px_2px_rgba(11,27,63,0.04)]">
            <CalendarRange className="w-5 h-5 text-[#5E6C87]" />
            <p className="text-sm text-[#5E6C87]">No attendance history recorded yet for this account.</p>
          </div>
        ) : (
          weeks.map((week) => (
            <div
              key={week.weekKey}
              className="bg-white border border-[#DDE3EE] rounded-[12px] shadow-[0_1px_2px_rgba(11,27,63,0.04)] overflow-hidden"
            >
              {/* Week Header */}
              <div className="py-3 px-4 sm:px-5 border-b border-[#DDE3EE] bg-[#F1F4FB]/50 flex flex-row items-center justify-between">
                <div>
                  <h3 className="text-xs sm:text-sm font-semibold text-[#0B1B3F]">
                    {week.weekLabel}
                  </h3>
                </div>
                <div className="flex items-center gap-2 text-xs text-[#5E6C87]">
                  <span>{week.totals.present} present</span>
                  <span>•</span>
                  <span>{week.totals.late} late</span>
                  <span>•</span>
                  <span>{week.totals.absent} absent</span>
                </div>
              </div>

              {/* Day Rows */}
              <div className="p-0 divide-y divide-[#DDE3EE]/60">
                {week.days.map((day) => {
                  let badgeVariant: "present" | "late" | "absent" | "neutral" = "neutral";
                  if (day.status === "Present") badgeVariant = "present";
                  else if (day.status === "Late") badgeVariant = "late";
                  else if (day.status === "Absent") badgeVariant = "absent";

                  return (
                    <div
                      key={day.date}
                      className="p-3.5 sm:px-5 flex items-center justify-between text-xs hover:bg-[#F1F4FB]/30 transition-colors"
                    >
                      <div className="space-y-0.5">
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-[#0B1B3F]">{day.dayName}</span>
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
                          <span className="text-[10px] font-medium px-1.5 py-0.5 rounded-full bg-slate-100 text-slate-700 border border-slate-200">
                            manual
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))
        )}
      </div>

      {/* ITEM 6: ROLE HISTORY CARD AT THE BOTTOM */}
      <div className="bg-white border border-[#DDE3EE] rounded-[12px] shadow-[0_1px_2px_rgba(11,27,63,0.04)] overflow-hidden">
        <div className="py-3.5 px-5 border-b border-[#DDE3EE] bg-[#F1F4FB]/50 flex flex-row items-center justify-between">
          <h3 className="text-sm font-semibold text-[#0B1B3F] flex items-center gap-2">
            <History className="w-4 h-4 text-[#0B1B3F]" />
            Role history
          </h3>
          <span className="text-xs text-[#5E6C87]">
            {roleHistory.length} {roleHistory.length === 1 ? "change" : "changes"}
          </span>
        </div>
        <div className="p-0 divide-y divide-[#DDE3EE]/60">
          {roleHistory.length === 0 ? (
            <div className="p-8 text-center text-xs text-[#5E6C87]">
              No role changes yet.
            </div>
          ) : (
            roleHistory.map((item) => (
              <div
                key={item.id}
                className="p-4 sm:px-5 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs hover:bg-[#F1F4FB]/30"
              >
                <div className="space-y-1">
                  <div className="font-semibold text-[#0B1B3F] flex items-center gap-2">
                    {item.action === "Promoted to admin" ? (
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium bg-[#0B1B3F]/10 text-[#0B1B3F] border border-[#0B1B3F]/20">
                        <ShieldCheck className="w-3 h-3 mr-1" />
                        Promoted to admin
                      </span>
                    ) : (
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium bg-[#EF4444]/10 text-[#EF4444] border border-[#EF4444]/20">
                        <ShieldX className="w-3 h-3 mr-1" />
                        Removed as admin
                      </span>
                    )}
                  </div>
                  <div className="text-[11px] text-[#5E6C87]">
                    Changed by: <strong className="text-[#0B1B3F]">{item.adminName}</strong>
                  </div>
                </div>

                <div className="text-[11px] text-[#5E6C87] flex items-center gap-1 sm:self-center">
                  <Clock className="w-3.5 h-3.5" />
                  <span>{item.timestampLagos}</span>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* CONFIRMATION DIALOG: MAKE ADMIN */}
      {targetRoleAction === "admin" && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs"
          onClick={() => {
            if (!isSubmittingRole) {
              setTargetRoleAction(null);
              setRoleModalError(null);
            }
          }}
        >
          <div
            className="bg-white rounded-[12px] max-w-md w-full p-6 border border-[#DDE3EE] shadow-xl space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-[10px] bg-[#F1F4FB] text-[#0B1B3F] border border-[#DDE3EE] flex items-center justify-center shrink-0">
                <ShieldCheck className="w-5 h-5 text-[#0B1B3F]" />
              </div>
              <div className="space-y-1">
                <h3 className="text-base font-semibold text-[#0B1B3F]">
                  Give {student.full_name} admin access?
                </h3>
                <p className="text-xs text-[#5E6C87] leading-relaxed">
                  They will see every student&apos;s attendance, manage accounts, and can promote or remove other admins. Only do this for people you fully trust.
                </p>
              </div>
            </div>

            {roleModalError && (
              <div className="p-3 bg-[#EF4444]/10 border border-[#EF4444]/20 rounded-lg text-xs text-[#EF4444] font-medium flex items-start gap-2">
                <AlertTriangle className="w-4 h-4 text-[#EF4444] shrink-0 mt-0.5" />
                <span className="flex-1">{roleModalError}</span>
              </div>
            )}

            <div className="flex items-center gap-2 pt-2">
              <Button
                type="button"
                variant="secondary"
                size="md"
                disabled={isSubmittingRole}
                onClick={() => {
                  setTargetRoleAction(null);
                  setRoleModalError(null);
                }}
                className="flex-1 h-10 text-sm font-medium rounded-lg"
              >
                Cancel
              </Button>
              <Button
                type="button"
                variant="primary"
                size="md"
                isLoading={isSubmittingRole}
                disabled={isSubmittingRole}
                onClick={handleRoleChangeSubmit}
                className="flex-1 h-10 text-sm font-medium rounded-lg"
              >
                Make admin
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* CONFIRMATION DIALOG: REMOVE ADMIN */}
      {targetRoleAction === "student" && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs"
          onClick={() => {
            if (!isSubmittingRole) {
              setTargetRoleAction(null);
              setRoleModalError(null);
            }
          }}
        >
          <div
            className="bg-white rounded-[12px] max-w-md w-full p-6 border border-[#DDE3EE] shadow-xl space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-[10px] bg-[#EF4444]/10 text-[#EF4444] border border-[#EF4444]/20 flex items-center justify-center shrink-0">
                <ShieldX className="w-5 h-5" />
              </div>
              <div className="space-y-1">
                <h3 className="text-base font-semibold text-[#0B1B3F]">
                  Remove admin access from {student.full_name}?
                </h3>
                <p className="text-xs text-[#5E6C87] leading-relaxed">
                  They will become a regular student and lose access to all admin pages immediately.
                </p>
              </div>
            </div>

            {roleModalError && (
              <div className="p-3 bg-[#EF4444]/10 border border-[#EF4444]/20 rounded-lg text-xs text-[#EF4444] font-medium flex items-start gap-2">
                <AlertTriangle className="w-4 h-4 text-[#EF4444] shrink-0 mt-0.5" />
                <span className="flex-1">{roleModalError}</span>
              </div>
            )}

            <div className="flex items-center gap-2 pt-2">
              <Button
                type="button"
                variant="secondary"
                size="md"
                disabled={isSubmittingRole}
                onClick={() => {
                  setTargetRoleAction(null);
                  setRoleModalError(null);
                }}
                className="flex-1 h-10 text-sm font-medium rounded-lg"
              >
                Cancel
              </Button>
              <Button
                type="button"
                variant="danger"
                size="md"
                isLoading={isSubmittingRole}
                disabled={isSubmittingRole}
                onClick={handleRoleChangeSubmit}
                className="flex-1 h-10 text-sm font-medium rounded-lg"
              >
                Remove admin
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* DEACTIVATE CONFIRMATION MODAL */}
      {confirmDeactivate && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs"
          onClick={() => {
            if (!isSubmittingToggle) {
              setConfirmDeactivate(false);
              setDeactivateError(null);
            }
          }}
        >
          <div
            className="bg-white rounded-[12px] max-w-sm w-full p-6 border border-[#DDE3EE] shadow-xl space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-[10px] bg-[#EF4444]/10 text-[#EF4444] border border-[#EF4444]/20 flex items-center justify-center shrink-0">
                <ShieldAlert className="w-5 h-5" />
              </div>
              <div className="space-y-1">
                <h3 className="text-base font-semibold text-[#0B1B3F]">
                  Deactivate {student.role === "admin" ? "Administrator" : "Student"}
                </h3>
                <p className="text-xs text-[#5E6C87] leading-relaxed">
                  Are you sure you want to deactivate{" "}
                  <strong className="text-[#0B1B3F]">{student.full_name}</strong>? They will be
                  immediately blocked from logging in and scanning attendance.
                </p>
              </div>
            </div>

            {deactivateError && (
              <div className="p-3 bg-[#EF4444]/10 border border-[#EF4444]/20 rounded-lg text-xs text-[#EF4444] font-medium">
                {deactivateError}
              </div>
            )}

            <div className="flex items-center gap-2 pt-2">
              <Button
                variant="secondary"
                size="md"
                onClick={() => {
                  setConfirmDeactivate(false);
                  setDeactivateError(null);
                }}
                disabled={isSubmittingToggle}
                className="flex-1 h-10 text-sm font-medium rounded-lg"
              >
                Cancel
              </Button>
              <Button
                variant="danger"
                size="md"
                onClick={handleToggleActive}
                isLoading={isSubmittingToggle}
                className="flex-1 h-10 text-sm font-medium rounded-lg"
              >
                Yes, Deactivate
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* RESET PASSWORD MODAL */}
      {showPasswordModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs"
          onClick={() => {
            if (!isSubmittingPassword) {
              setShowPasswordModal(false);
              setNewPassword("");
            }
          }}
        >
          <form
            onSubmit={handleResetPassword}
            className="bg-white rounded-[12px] max-w-sm w-full p-6 border border-[#DDE3EE] shadow-xl space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-[10px] bg-[#F1F4FB] text-[#0B1B3F] border border-[#DDE3EE] flex items-center justify-center shrink-0">
                <KeyRound className="w-5 h-5 text-[#0B1B3F]" />
              </div>
              <div className="space-y-1">
                <h3 className="text-base font-semibold text-[#0B1B3F]">Reset Password</h3>
                <p className="text-xs text-[#5E6C87] leading-relaxed">
                  Set a new temporary password for{" "}
                  <strong className="text-[#0B1B3F]">{student.full_name}</strong>.
                </p>
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-[13px] font-medium text-[#5E6C87]">
                New temporary password (min 8 characters)
              </label>
              <input
                type="text"
                required
                minLength={8}
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="Enter new password (e.g. TempPass2026!)"
                className="w-full px-3 h-11 text-sm border border-[#DDE3EE] rounded-lg bg-white focus:outline-none focus:border-[#0B1B3F] focus:ring-1 focus:ring-[#0B1B3F]"
              />
            </div>

            <div className="flex items-center gap-2 pt-2">
              <Button
                type="button"
                variant="secondary"
                size="md"
                onClick={() => {
                  setShowPasswordModal(false);
                  setNewPassword("");
                }}
                disabled={isSubmittingPassword}
                className="flex-1 h-10 text-sm font-medium rounded-lg"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                variant="primary"
                size="md"
                isLoading={isSubmittingPassword}
                className="flex-1 h-10 text-sm font-medium rounded-lg"
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
