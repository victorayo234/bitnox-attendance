"use client";

import React, { useState, useMemo, useEffect } from "react";
import Link from "next/link";
import { Card, CardContent } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import {
  Search,
  UserPlus,
  KeyRound,
  CheckCircle2,
  AlertTriangle,
  History,
  X,
  Copy,
  Check,
  ShieldAlert,
  ShieldX,
  Shield,
  ShieldOff,
  UserX,
  UserCheck,
  Loader2,
  ChevronDown,
  ChevronUp,
  Activity,
} from "lucide-react";

export interface AdminStudentItem {
  id: string;
  name: string;
  email: string;
  role: "admin" | "student";
  isActive: boolean;
  status: "approved" | "pending" | "rejected";
  todayStatus: "Present" | "Late" | "Checked out" | "Not yet in" | "Off";
  todayCheckIn: string | null;
  todayCheckOut: string | null;
  createdAt: string;
}

export interface RoleActivityItem {
  id: string;
  actorName: string;
  targetName: string;
  oldRole: string;
  newRole: string;
  createdAt: string;
}

interface AdminStudentsDirectoryProps {
  initialStudents: AdminStudentItem[];
  currentAdminId: string;
  roleActivity?: RoleActivityItem[];
}

type FilterChip = "all" | "students" | "admins" | "deactivated";

function getInitials(name: string): string {
  if (!name) return "S";
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

function formatJoinedDate(dateStr: string): string {
  try {
    const d = new Date(dateStr);
    return `Joined ${d.toLocaleDateString("en-US", { month: "short", day: "numeric" })}`;
  } catch {
    return "";
  }
}

export function AdminStudentsDirectory({
  initialStudents,
  currentAdminId,
  roleActivity = [],
}: AdminStudentsDirectoryProps) {
  const [students, setStudents] = useState<AdminStudentItem[]>(initialStudents);
  const [searchQuery, setSearchQuery] = useState("");
  const [activeChip, setActiveChip] = useState<FilterChip>("all");
  const [toast, setToast] = useState<{ type: "success" | "error"; message: string } | null>(null);

  // Activity Accordion State (collapsed by default)
  const [showActivity, setShowActivity] = useState(false);

  // Add Student Modal State
  const [showAddModal, setShowAddModal] = useState(false);
  const [newName, setNewName] = useState("");
  const [newEmail, setNewEmail] = useState("");
  const [newPassword, setNewPassword] = useState("Bitnox2026!");
  const [isSubmittingAdd, setIsSubmittingAdd] = useState(false);
  const [createdCredentials, setCreatedCredentials] = useState<{
    email: string;
    tempPass: string;
    name: string;
  } | null>(null);
  const [copied, setCopied] = useState(false);

  // Role Change Modal State
  const [roleModalTarget, setRoleModalTarget] = useState<AdminStudentItem | null>(null);
  const [targetRoleAction, setTargetRoleAction] = useState<"admin" | "student" | null>(null);
  const [roleModalError, setRoleModalError] = useState<string | null>(null);
  const [isSubmittingRole, setIsSubmittingRole] = useState(false);

  // Deactivate Modal State
  const [targetStudent, setTargetStudent] = useState<AdminStudentItem | null>(null);
  const [showDeactivateModal, setShowDeactivateModal] = useState(false);
  const [deactivateError, setDeactivateError] = useState<string | null>(null);
  const [isSubmittingToggle, setIsSubmittingToggle] = useState(false);

  // Reset Password Modal State
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [resetStudent, setResetStudent] = useState<AdminStudentItem | null>(null);
  const [resetNewPass, setResetNewPass] = useState("");
  const [isSubmittingReset, setIsSubmittingReset] = useState(false);

  // Close modals on Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        if (!isSubmittingRole && !isSubmittingToggle && !isSubmittingReset && !isSubmittingAdd) {
          setRoleModalTarget(null);
          setTargetRoleAction(null);
          setRoleModalError(null);
          setShowDeactivateModal(false);
          setTargetStudent(null);
          setDeactivateError(null);
          setShowPasswordModal(false);
          setResetStudent(null);
          setShowAddModal(false);
        }
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isSubmittingRole, isSubmittingToggle, isSubmittingReset, isSubmittingAdd]);

  // Helper to re-sort students: admins first, then alphabetically
  const sortAccounts = (list: AdminStudentItem[]) => {
    return [...list].sort((a, b) => {
      if (a.role === "admin" && b.role !== "admin") return -1;
      if (a.role !== "admin" && b.role === "admin") return 1;
      return a.name.localeCompare(b.name);
    });
  };

  // Filter students by search and filter chips
  const filteredStudents = useMemo(() => {
    let result = students;

    if (activeChip === "students") {
      result = result.filter((s) => s.role === "student");
    } else if (activeChip === "admins") {
      result = result.filter((s) => s.role === "admin");
    } else if (activeChip === "deactivated") {
      result = result.filter((s) => !s.isActive);
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter(
        (s) =>
          s.name.toLowerCase().includes(q) || s.email.toLowerCase().includes(q)
      );
    }

    return result;
  }, [students, searchQuery, activeChip]);

  const totalAccounts = filteredStudents.length;
  const adminCount = filteredStudents.filter((s) => s.role === "admin").length;

  // Handle Role Change Submission
  const handleRoleChangeSubmit = async () => {
    if (!roleModalTarget || !targetRoleAction) return;

    setIsSubmittingRole(true);
    setRoleModalError(null);

    try {
      const res = await fetch(`/api/admin/students/${roleModalTarget.id}/role`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ role: targetRoleAction }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to update role");
      }

      const updatedList = students.map((s) =>
        s.id === roleModalTarget.id ? { ...s, role: targetRoleAction } : s
      );
      setStudents(sortAccounts(updatedList));

      const targetName = roleModalTarget.name;
      const targetRole = targetRoleAction;
      setRoleModalTarget(null);
      setTargetRoleAction(null);
      setRoleModalError(null);

      setToast({
        type: "success",
        message:
          targetRole === "admin"
            ? `${targetName} is now an admin.`
            : `${targetName} is now a student.`,
      });
    } catch (err: unknown) {
      const errorMsg = err instanceof Error ? err.message : "An unexpected error occurred.";
      setRoleModalError(errorMsg);
    } finally {
      setIsSubmittingRole(false);
    }
  };

  // Handle Add Student Submit
  const handleAddStudent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim() || !newEmail.trim() || newPassword.length < 8) {
      setToast({
        type: "error",
        message: "Please fill in all fields (password minimum 8 characters).",
      });
      return;
    }

    setIsSubmittingAdd(true);
    try {
      const res = await fetch("/api/admin/students", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fullName: newName.trim(),
          email: newEmail.trim(),
          tempPassword: newPassword,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.ok) {
        throw new Error(data.error || "Failed to create student");
      }

      const created: AdminStudentItem = {
        id: data.student.id,
        name: data.student.full_name,
        email: data.student.email,
        role: "student",
        isActive: true,
        status: "approved",
        todayStatus: "Not yet in",
        todayCheckIn: null,
        todayCheckOut: null,
        createdAt: new Date().toISOString(),
      };

      setStudents((prev) => sortAccounts([created, ...prev]));
      setCreatedCredentials({
        name: newName.trim(),
        email: newEmail.trim(),
        tempPass: newPassword,
      });

      setNewName("");
      setNewEmail("");
      setNewPassword("Bitnox2026!");
      setToast({
        type: "success",
        message: "Student account created and approved successfully!",
      });
    } catch (err: unknown) {
      const errorMsg = err instanceof Error ? err.message : "Failed to create student";
      setToast({ type: "error", message: errorMsg });
    } finally {
      setIsSubmittingAdd(false);
    }
  };

  // Handle Toggle Active Status
  const handleToggleActive = async (student: AdminStudentItem) => {
    setIsSubmittingToggle(true);
    setDeactivateError(null);
    const newActiveState = !student.isActive;

    try {
      const res = await fetch(`/api/admin/students/${student.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isActive: newActiveState }),
      });

      const data = await res.json();
      if (!res.ok || !data.ok) {
        throw new Error(data.error || "Failed to update account status");
      }

      setStudents((prev) =>
        prev.map((s) => (s.id === student.id ? { ...s, isActive: newActiveState } : s))
      );

      setShowDeactivateModal(false);
      setTargetStudent(null);
      setToast({
        type: "success",
        message: newActiveState
          ? `${student.name} has been reactivated.`
          : `${student.name} has been deactivated.`,
      });
    } catch (err: unknown) {
      const errorMsg = err instanceof Error ? err.message : "Action failed";
      if (showDeactivateModal) {
        setDeactivateError(errorMsg);
      } else {
        setToast({ type: "error", message: errorMsg });
      }
    } finally {
      setIsSubmittingToggle(false);
    }
  };

  // Handle Reset Password Submit
  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!resetStudent || resetNewPass.length < 8) {
      setToast({
        type: "error",
        message: "Password must be at least 8 characters long.",
      });
      return;
    }

    setIsSubmittingReset(true);
    try {
      const res = await fetch(`/api/admin/students/${resetStudent.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password: resetNewPass }),
      });

      const data = await res.json();
      if (!resetStudent || !data.ok) {
        throw new Error(data.error || "Failed to reset password");
      }

      setShowPasswordModal(false);
      setToast({
        type: "success",
        message: `Password reset successfully for ${resetStudent.name}. Temporary password: ${resetNewPass}`,
      });
      setResetNewPass("");
      setResetStudent(null);
    } catch (err: unknown) {
      const errorMsg = err instanceof Error ? err.message : "Failed to reset password";
      setToast({ type: "error", message: errorMsg });
    } finally {
      setIsSubmittingReset(false);
    }
  };

  const copyCredentials = () => {
    if (!createdCredentials) return;
    const text = `Bitnox Attendance Login:\nEmail: ${createdCredentials.email}\nTemporary Password: ${createdCredentials.tempPass}\nPortal: ${window.location.origin}/login`;
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 3000);
  };

  return (
    <div className="w-full">
      {/* Container breakout style for 1200px and above: max-w-7xl with 24px side padding, perfectly centered */}
      <style>{`
        @media (min-width: 1200px) {
          .students-page-container {
            width: min(calc(100vw - 48px), 80rem) !important;
            max-width: 80rem !important;
            margin-left: calc((100% - min(calc(100vw - 48px), 80rem)) / 2) !important;
            margin-right: calc((100% - min(calc(100vw - 48px), 80rem)) / 2) !important;
          }
        }
      `}</style>

      {/* Toast Alert */}
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
          <div className="flex-1 text-xs font-medium leading-relaxed">{toast.message}</div>
          <button onClick={() => setToast(null)} className="text-[#5E6C87] hover:text-[#0B1B3F] cursor-pointer">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Responsive Page Container */}
      <div className="students-page-container w-full space-y-6 pb-20">
        {/* Page Header: Title and Add Student Primary Button */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-semibold text-[#0B1B3F] leading-8">
              Students
            </h1>
            <p className="text-sm text-[#5E6C87] mt-0.5 leading-5">
              Manage accounts, admin access, and attendance.
            </p>
          </div>

          <Button
            variant="primary"
            onClick={() => {
              setCreatedCredentials(null);
              setShowAddModal(true);
            }}
            leftIcon={<UserPlus className="w-4 h-4" />}
            className="self-start sm:self-auto"
          >
            Add student
          </Button>
        </div>

        {/* Filter Segmented Control & Search Row */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          {/* Left: Segmented Filter with Muted Count */}
          <div className="flex items-center gap-3 flex-wrap">
            <div className="bg-[#F1F4FB] p-1 rounded-lg border border-[#DDE3EE] inline-flex items-center text-xs">
              <button
                type="button"
                onClick={() => setActiveChip("all")}
                className={`px-3 py-1.5 font-semibold rounded-md transition-all cursor-pointer ${
                  activeChip === "all"
                    ? "bg-white text-[#0B1B3F] border border-[#DDE3EE] shadow-[0_1px_2px_rgba(11,27,63,0.04)]"
                    : "text-[#5E6C87] hover:text-[#0B1B3F] font-medium"
                }`}
              >
                All
              </button>
              <button
                type="button"
                onClick={() => setActiveChip("students")}
                className={`px-3 py-1.5 font-semibold rounded-md transition-all cursor-pointer ${
                  activeChip === "students"
                    ? "bg-white text-[#0B1B3F] border border-[#DDE3EE] shadow-[0_1px_2px_rgba(11,27,63,0.04)]"
                    : "text-[#5E6C87] hover:text-[#0B1B3F] font-medium"
                }`}
              >
                Students
              </button>
              <button
                type="button"
                onClick={() => setActiveChip("admins")}
                className={`px-3 py-1.5 font-semibold rounded-md transition-all cursor-pointer ${
                  activeChip === "admins"
                    ? "bg-white text-[#0B1B3F] border border-[#DDE3EE] shadow-[0_1px_2px_rgba(11,27,63,0.04)]"
                    : "text-[#5E6C87] hover:text-[#0B1B3F] font-medium"
                }`}
              >
                Admins
              </button>
              <button
                type="button"
                onClick={() => setActiveChip("deactivated")}
                className={`px-3 py-1.5 font-semibold rounded-md transition-all cursor-pointer ${
                  activeChip === "deactivated"
                    ? "bg-white text-[#0B1B3F] border border-[#DDE3EE] shadow-[0_1px_2px_rgba(11,27,63,0.04)]"
                    : "text-[#5E6C87] hover:text-[#0B1B3F] font-medium"
                }`}
              >
                Deactivated
              </button>
            </div>

            <span className="text-xs text-[#5E6C87] whitespace-nowrap">
              {totalAccounts} {totalAccounts === 1 ? "account" : "accounts"} · {adminCount} {adminCount === 1 ? "admin" : "admins"}
            </span>
          </div>

          {/* Right: Search Box (320px width on desktop, full width on mobile) */}
          <div className="relative w-full sm:w-[320px]">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-[#5E6C87] pointer-events-none" />
            <input
              type="text"
              placeholder="Search by name or email..."
              aria-label="Search by name or email"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full h-10 pl-9 pr-8 bg-white border border-[#DDE3EE] rounded-lg text-sm text-[#0B1B3F] placeholder:text-[#5E6C87]/70 focus:outline-none focus:ring-2 focus:ring-[#0B1B3F] focus:border-[#0B1B3F] transition-all shadow-[0_1px_2px_rgba(11,27,63,0.04)]"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery("")}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[#5E6C87] hover:text-[#0B1B3F] p-0.5 cursor-pointer"
                aria-label="Clear search"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>

        {/* Desktop Table: 1200px and above (NO horizontal scrollbar) */}
        <Card className="bg-white border border-[#DDE3EE] rounded-[12px] shadow-[0_1px_2px_rgba(11,27,63,0.04)] overflow-hidden hidden min-[1200px]:block">
          <table className="w-full table-fixed text-left text-sm border-collapse">
            <colgroup>
              <col style={{ width: "26%" }} />
              <col style={{ width: "9%" }} />
              <col style={{ width: "9%" }} />
              <col style={{ width: "13%" }} />
              <col style={{ width: "43%", minWidth: "460px" }} />
            </colgroup>
            <thead className="bg-[#FAFCFF] border-b border-[#DDE3EE] text-xs uppercase tracking-wider text-[#5E6C87] font-semibold sticky top-0 z-10">
              <tr className="h-[48px]">
                <th className="py-3 px-5 align-middle">Account</th>
                <th className="py-3 px-2.5 align-middle">Role</th>
                <th className="py-3 px-2.5 align-middle">Status</th>
                <th className="py-3 px-2.5 align-middle">Today</th>
                <th className="py-3 pr-5 pl-2 align-middle text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#DDE3EE]/60">
              {filteredStudents.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-16 text-center text-sm text-[#5E6C87]">
                    <div className="flex flex-col items-center justify-center gap-2">
                      <Search className="w-6 h-6 text-[#5E6C87]/60" />
                      <span>No accounts match your filters.</span>
                    </div>
                  </td>
                </tr>
              ) : (
                filteredStudents.map((account) => {
                  const isCurrentAdmin = account.id === currentAdminId;
                  const canMakeAdmin = account.role === "student" && account.status === "approved" && account.isActive;
                  const canRemoveAdmin = account.role === "admin" && !isCurrentAdmin;
                  const initials = getInitials(account.name);
                  const joinedText = formatJoinedDate(account.createdAt);

                  return (
                    <tr
                      key={account.id}
                      className="h-[76px] hover:bg-[#F9FBFE] transition-colors"
                    >
                      {/* Account Column: 36px circle avatar, name, You tag, email, joined date */}
                      <td className="py-4 px-5 align-middle">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-full bg-[#E8ECF6] text-[#0B1B3F] font-semibold text-xs flex items-center justify-center shrink-0 select-none">
                            {initials}
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-1.5 min-w-0">
                              <Link
                                href={`/admin/students/${account.id}`}
                                className="font-medium text-[15px] text-[#0B1B3F] hover:underline truncate whitespace-nowrap block"
                                title={account.name}
                              >
                                {account.name}
                              </Link>
                              {isCurrentAdmin && (
                                <span className="px-1.5 py-0.5 rounded text-[11px] font-medium bg-[#F1F4FB] text-[#5E6C87] border border-[#DDE3EE] shrink-0 select-none">
                                  You
                                </span>
                              )}
                            </div>
                            <div className="text-[13px] text-[#5E6C87] truncate leading-tight mt-0.5">
                              {account.email}
                            </div>
                            {joinedText && (
                              <div className="text-[12px] text-[#5E6C87]/70 leading-tight mt-0.5 truncate">
                                {joinedText}
                              </div>
                            )}
                          </div>
                        </div>
                      </td>

                      {/* Role Column: rounded-full badge, nowrap */}
                      <td className="py-4 px-2.5 align-middle whitespace-nowrap">
                        {account.role === "admin" ? (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-[#E8ECF6] text-[#0B1B3F] whitespace-nowrap">
                            <Shield className="w-3.5 h-3.5 text-[#0B1B3F]" />
                            Admin
                          </span>
                        ) : (
                          <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-[#F1F4FB] text-[#5E6C87] border border-[#DDE3EE] whitespace-nowrap">
                            Student
                          </span>
                        )}
                      </td>

                      {/* Status Column: 8px dot + text */}
                      <td className="py-4 px-2.5 align-middle whitespace-nowrap">
                        {account.isActive ? (
                          <span className="inline-flex items-center gap-2 text-xs font-medium text-[#0B1B3F] whitespace-nowrap">
                            <span className="w-2 h-2 rounded-full bg-[#16A34A] shrink-0" />
                            Active
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-2 text-xs font-medium text-[#5E6C87] whitespace-nowrap">
                            <span className="w-2 h-2 rounded-full bg-[#94A3B8] shrink-0" />
                            Deactivated
                          </span>
                        )}
                      </td>

                      {/* Today Column: small badge with dot + Late tag */}
                      <td className="py-4 px-2.5 align-middle whitespace-nowrap">
                        {renderTodayBadge(account.todayStatus)}
                      </td>

                      {/* Actions Column: 4-slot CSS grid */}
                      <td className="py-4 pr-5 pl-2 align-middle text-right whitespace-nowrap">
                        <div
                          className="grid items-center justify-end"
                          style={{
                            gridTemplateColumns: "88px 128px 108px 112px",
                            columnGap: "8px",
                            justifyContent: "end",
                            whiteSpace: "nowrap",
                          }}
                        >
                          {/* Slot 1: History (88px) */}
                          <div className="w-[88px]">
                            <Link
                              href={`/admin/students/${account.id}`}
                              className="h-[36px] px-3 rounded-lg text-[13px] font-medium whitespace-nowrap inline-flex items-center justify-center gap-1.5 w-full bg-white border border-[#DDE3EE] text-[#0B1B3F] hover:bg-[#F1F4FB] transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0B1B3F] focus-visible:ring-offset-2"
                              title="View Attendance History"
                            >
                              <History className="w-4 h-4 shrink-0 text-[#0B1B3F]" />
                              <span>History</span>
                            </Link>
                          </div>

                          {/* Slot 2: Make admin / Remove admin (128px) */}
                          <div className="w-[128px]">
                            {canMakeAdmin ? (
                              <button
                                type="button"
                                disabled={isSubmittingRole}
                                onClick={() => {
                                  setRoleModalTarget(account);
                                  setTargetRoleAction("admin");
                                  setRoleModalError(null);
                                }}
                                className="h-[36px] px-3 rounded-lg text-[13px] font-medium whitespace-nowrap inline-flex items-center justify-center gap-1.5 w-full bg-white border border-[#DDE3EE] text-[#0B1B3F] hover:bg-[#E8ECF6] transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0B1B3F] focus-visible:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                                title="Promote to Administrator"
                              >
                                {isSubmittingRole && roleModalTarget?.id === account.id ? (
                                  <Loader2 className="w-4 h-4 shrink-0 animate-spin text-[#0B1B3F]" />
                                ) : (
                                  <Shield className="w-4 h-4 shrink-0 text-[#0B1B3F]" />
                                )}
                                <span>Make admin</span>
                              </button>
                            ) : canRemoveAdmin ? (
                              <button
                                type="button"
                                disabled={isSubmittingRole}
                                onClick={() => {
                                  setRoleModalTarget(account);
                                  setTargetRoleAction("student");
                                  setRoleModalError(null);
                                }}
                                className="h-[36px] px-3 rounded-lg text-[13px] font-medium whitespace-nowrap inline-flex items-center justify-center gap-1.5 w-full bg-white border border-[#DDE3EE] text-[#0B1B3F] hover:bg-[#E8ECF6] transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0B1B3F] focus-visible:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                                title="Remove Administrator Access"
                              >
                                {isSubmittingRole && roleModalTarget?.id === account.id ? (
                                  <Loader2 className="w-4 h-4 shrink-0 animate-spin text-[#0B1B3F]" />
                                ) : (
                                  <ShieldOff className="w-4 h-4 shrink-0 text-[#0B1B3F]" />
                                )}
                                <span>Remove admin</span>
                              </button>
                            ) : null}
                          </div>

                          {/* Slot 3: Password (108px) */}
                          <div className="w-[108px]">
                            <button
                              type="button"
                              disabled={isSubmittingReset}
                              onClick={() => {
                                setResetStudent(account);
                                setResetNewPass("");
                                setShowPasswordModal(true);
                              }}
                              className="h-[36px] px-3 rounded-lg text-[13px] font-medium whitespace-nowrap inline-flex items-center justify-center gap-1.5 w-full bg-white border border-[#DDE3EE] text-[#0B1B3F] hover:bg-[#F1F4FB] transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0B1B3F] focus-visible:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                              title="Reset Password"
                            >
                              {isSubmittingReset && resetStudent?.id === account.id ? (
                                <Loader2 className="w-4 h-4 shrink-0 animate-spin text-[#0B1B3F]" />
                              ) : (
                                <KeyRound className="w-4 h-4 shrink-0 text-[#0B1B3F]" />
                              )}
                              <span>Password</span>
                            </button>
                          </div>

                          {/* Slot 4: Deactivate / Reactivate (112px) */}
                          <div className="w-[112px]">
                            {!isCurrentAdmin ? (
                              account.isActive ? (
                                <button
                                  type="button"
                                  disabled={isSubmittingToggle}
                                  onClick={() => {
                                    setTargetStudent(account);
                                    setDeactivateError(null);
                                    setShowDeactivateModal(true);
                                  }}
                                  className="h-[36px] px-3 rounded-lg text-[13px] font-medium whitespace-nowrap inline-flex items-center justify-center gap-1.5 w-full bg-white border border-[#F3C5C5] text-[#DC2626] hover:bg-[#FEF2F2] transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0B1B3F] focus-visible:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                                  title="Deactivate Account"
                                >
                                  {isSubmittingToggle && targetStudent?.id === account.id ? (
                                    <Loader2 className="w-4 h-4 shrink-0 animate-spin text-[#DC2626]" />
                                  ) : (
                                    <UserX className="w-4 h-4 shrink-0 text-[#DC2626]" />
                                  )}
                                  <span>Deactivate</span>
                                </button>
                              ) : (
                                <button
                                  type="button"
                                  disabled={isSubmittingToggle}
                                  onClick={() => handleToggleActive(account)}
                                  className="h-[36px] px-3 rounded-lg text-[13px] font-medium whitespace-nowrap inline-flex items-center justify-center gap-1.5 w-full bg-white border border-[#BFE6CC] text-[#15803D] hover:bg-[#F0FDF4] transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0B1B3F] focus-visible:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                                  title="Reactivate Account"
                                >
                                  {isSubmittingToggle && targetStudent?.id === account.id ? (
                                    <Loader2 className="w-4 h-4 shrink-0 animate-spin text-[#15803D]" />
                                  ) : (
                                    <UserCheck className="w-4 h-4 shrink-0 text-[#15803D]" />
                                  )}
                                  <span>Reactivate</span>
                                </button>
                              )
                            ) : null}
                          </div>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </Card>

        {/* Stacked Cards View: Below 1200px (NO horizontal table scrolling) */}
        <div className="min-[1200px]:hidden space-y-3">
          {filteredStudents.length === 0 ? (
            <Card className="bg-white border border-[#DDE3EE] p-12 text-center text-sm text-[#5E6C87] rounded-[12px] shadow-[0_1px_2px_rgba(11,27,63,0.04)]">
              <div className="flex flex-col items-center justify-center gap-2">
                <Search className="w-6 h-6 text-[#5E6C87]/60" />
                <span>No accounts match your filters.</span>
              </div>
            </Card>
          ) : (
            filteredStudents.map((account) => {
              const isCurrentAdmin = account.id === currentAdminId;
              const canMakeAdmin = account.role === "student" && account.status === "approved" && account.isActive;
              const canRemoveAdmin = account.role === "admin" && !isCurrentAdmin;
              const initials = getInitials(account.name);
              const joinedText = formatJoinedDate(account.createdAt);

              return (
                <Card
                  key={account.id}
                  className="bg-white border border-[#DDE3EE] p-4 sm:p-5 rounded-[12px] shadow-[0_1px_2px_rgba(11,27,63,0.04)] space-y-3"
                >
                  {/* Card Top: Avatar, Name with "You" tag, Email, Joined Date */}
                  <div className="flex items-start gap-3">
                    <div className="w-9 h-9 rounded-full bg-[#E8ECF6] text-[#0B1B3F] font-semibold text-xs flex items-center justify-center shrink-0 select-none">
                      {initials}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <Link
                          href={`/admin/students/${account.id}`}
                          className="font-medium text-[15px] text-[#0B1B3F] hover:underline truncate"
                          title={account.name}
                        >
                          {account.name}
                        </Link>
                        {isCurrentAdmin && (
                          <span className="px-1.5 py-0.5 rounded text-[11px] font-medium bg-[#F1F4FB] text-[#5E6C87] border border-[#DDE3EE] shrink-0 select-none">
                            You
                          </span>
                        )}
                      </div>
                      <div className="text-[13px] text-[#5E6C87] truncate leading-tight mt-0.5">
                        {account.email}
                      </div>
                      {joinedText && (
                        <div className="text-[12px] text-[#5E6C87]/70 leading-tight mt-0.5 truncate">
                          {joinedText}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Badges in a wrapping row: Role badge, status, and today badge */}
                  <div className="flex items-center gap-2 flex-wrap pt-0.5">
                    {account.role === "admin" ? (
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-[#E8ECF6] text-[#0B1B3F] whitespace-nowrap">
                        <Shield className="w-3.5 h-3.5 text-[#0B1B3F]" />
                        Admin
                      </span>
                    ) : (
                      <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-[#F1F4FB] text-[#5E6C87] border border-[#DDE3EE] whitespace-nowrap">
                        Student
                      </span>
                    )}

                    {account.isActive ? (
                      <span className="inline-flex items-center gap-2 text-xs font-medium text-[#0B1B3F] whitespace-nowrap bg-white px-2.5 py-1 rounded-full border border-[#DDE3EE]">
                        <span className="w-2 h-2 rounded-full bg-[#16A34A] shrink-0" />
                        Active
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-2 text-xs font-medium text-[#5E6C87] whitespace-nowrap bg-white px-2.5 py-1 rounded-full border border-[#DDE3EE]">
                        <span className="w-2 h-2 rounded-full bg-[#94A3B8] shrink-0" />
                        Deactivated
                      </span>
                    )}

                    <div>{renderTodayBadge(account.todayStatus)}</div>
                  </div>

                  {/* Thin divider above buttons */}
                  <div className="border-t border-[#DDE3EE] pt-3">
                    {/* 2x2 grid, each at least 44px tall, full width of its half */}
                    <div className="grid grid-cols-2 gap-2">
                      {/* Button 1: History */}
                      <Link
                        href={`/admin/students/${account.id}`}
                        className="min-h-[44px] h-[44px] px-3 rounded-lg text-[13px] font-medium whitespace-nowrap inline-flex items-center justify-center gap-1.5 w-full bg-white border border-[#DDE3EE] text-[#0B1B3F] hover:bg-[#F1F4FB] transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0B1B3F] focus-visible:ring-offset-2"
                        title="View Attendance History"
                      >
                        <History className="w-4 h-4 shrink-0 text-[#0B1B3F]" />
                        <span>History</span>
                      </Link>

                      {/* Button 2: Password */}
                      <button
                        type="button"
                        disabled={isSubmittingReset}
                        onClick={() => {
                          setResetStudent(account);
                          setResetNewPass("");
                          setShowPasswordModal(true);
                        }}
                        className="min-h-[44px] h-[44px] px-3 rounded-lg text-[13px] font-medium whitespace-nowrap inline-flex items-center justify-center gap-1.5 w-full bg-white border border-[#DDE3EE] text-[#0B1B3F] hover:bg-[#F1F4FB] transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0B1B3F] focus-visible:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                        title="Reset Password"
                      >
                        {isSubmittingReset && resetStudent?.id === account.id ? (
                          <Loader2 className="w-4 h-4 shrink-0 animate-spin text-[#0B1B3F]" />
                        ) : (
                          <KeyRound className="w-4 h-4 shrink-0 text-[#0B1B3F]" />
                        )}
                        <span>Password</span>
                      </button>

                      {/* Button 3: Make admin / Remove admin (omitted if hidden) */}
                      {canMakeAdmin && (
                        <button
                          type="button"
                          disabled={isSubmittingRole}
                          onClick={() => {
                            setRoleModalTarget(account);
                            setTargetRoleAction("admin");
                            setRoleModalError(null);
                          }}
                          className="min-h-[44px] h-[44px] px-3 rounded-lg text-[13px] font-medium whitespace-nowrap inline-flex items-center justify-center gap-1.5 w-full bg-white border border-[#DDE3EE] text-[#0B1B3F] hover:bg-[#E8ECF6] transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0B1B3F] focus-visible:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                          title="Promote to Administrator"
                        >
                          {isSubmittingRole && roleModalTarget?.id === account.id ? (
                            <Loader2 className="w-4 h-4 shrink-0 animate-spin text-[#0B1B3F]" />
                          ) : (
                            <Shield className="w-4 h-4 shrink-0 text-[#0B1B3F]" />
                          )}
                          <span>Make admin</span>
                        </button>
                      )}

                      {canRemoveAdmin && (
                        <button
                          type="button"
                          disabled={isSubmittingRole}
                          onClick={() => {
                            setRoleModalTarget(account);
                            setTargetRoleAction("student");
                            setRoleModalError(null);
                          }}
                          className="min-h-[44px] h-[44px] px-3 rounded-lg text-[13px] font-medium whitespace-nowrap inline-flex items-center justify-center gap-1.5 w-full bg-white border border-[#DDE3EE] text-[#0B1B3F] hover:bg-[#E8ECF6] transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0B1B3F] focus-visible:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                          title="Remove Administrator Access"
                        >
                          {isSubmittingRole && roleModalTarget?.id === account.id ? (
                            <Loader2 className="w-4 h-4 shrink-0 animate-spin text-[#0B1B3F]" />
                          ) : (
                            <ShieldOff className="w-4 h-4 shrink-0 text-[#0B1B3F]" />
                          )}
                          <span>Remove admin</span>
                        </button>
                      )}

                      {/* Button 4: Deactivate / Reactivate (omitted if hidden) */}
                      {!isCurrentAdmin && (
                        account.isActive ? (
                          <button
                            type="button"
                            disabled={isSubmittingToggle}
                            onClick={() => {
                              setTargetStudent(account);
                              setDeactivateError(null);
                              setShowDeactivateModal(true);
                            }}
                            className="min-h-[44px] h-[44px] px-3 rounded-lg text-[13px] font-medium whitespace-nowrap inline-flex items-center justify-center gap-1.5 w-full bg-white border border-[#F3C5C5] text-[#DC2626] hover:bg-[#FEF2F2] transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0B1B3F] focus-visible:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                            title="Deactivate Account"
                          >
                            {isSubmittingToggle && targetStudent?.id === account.id ? (
                              <Loader2 className="w-4 h-4 shrink-0 animate-spin text-[#DC2626]" />
                            ) : (
                              <UserX className="w-4 h-4 shrink-0 text-[#DC2626]" />
                            )}
                            <span>Deactivate</span>
                          </button>
                        ) : (
                          <button
                            type="button"
                            disabled={isSubmittingToggle}
                            onClick={() => handleToggleActive(account)}
                            className="min-h-[44px] h-[44px] px-3 rounded-lg text-[13px] font-medium whitespace-nowrap inline-flex items-center justify-center gap-1.5 w-full bg-white border border-[#BFE6CC] text-[#15803D] hover:bg-[#F0FDF4] transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0B1B3F] focus-visible:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                            title="Reactivate Account"
                          >
                            {isSubmittingToggle && targetStudent?.id === account.id ? (
                              <Loader2 className="w-4 h-4 shrink-0 animate-spin text-[#15803D]" />
                            ) : (
                              <UserCheck className="w-4 h-4 shrink-0 text-[#15803D]" />
                            )}
                            <span>Reactivate</span>
                          </button>
                        )
                      )}
                    </div>
                  </div>
                </Card>
              );
            })
          )}
        </div>

        {/* Admin activity audit section: Collapsed card with chevron */}
        <Card className="bg-white border border-[#DDE3EE] rounded-[12px] shadow-[0_1px_2px_rgba(11,27,63,0.04)] overflow-hidden">
          <button
            type="button"
            onClick={() => setShowActivity(!showActivity)}
            className="w-full min-h-[48px] px-5 py-3.5 flex items-center justify-between text-left hover:bg-[#F1F4FB] transition-colors cursor-pointer"
          >
            <div className="flex items-center gap-2.5">
              <Activity className="w-4 h-4 text-[#0B1B3F]" />
              <span className="text-sm font-semibold text-[#0B1B3F]">Admin activity</span>
              <span className="text-xs text-[#5E6C87]">
                {roleActivity.length} {roleActivity.length === 1 ? "entry" : "entries"}
              </span>
            </div>
            {showActivity ? (
              <ChevronUp className="w-4 h-4 text-[#5E6C87]" />
            ) : (
              <ChevronDown className="w-4 h-4 text-[#5E6C87]" />
            )}
          </button>

          {showActivity && (
            <CardContent className="p-0 border-t border-[#DDE3EE]">
              {roleActivity.length === 0 ? (
                <div className="p-6 text-center text-xs text-[#5E6C87]">
                  No role changes recorded yet.
                </div>
              ) : (
                <div className="divide-y divide-[#DDE3EE]/60 max-h-96 overflow-y-auto">
                  {roleActivity.map((act) => (
                    <div
                      key={act.id}
                      className="p-3.5 sm:px-5 flex flex-col sm:flex-row sm:items-center justify-between gap-1.5 text-xs hover:bg-[#FAFCFF]"
                    >
                      <div className="space-y-0.5">
                        <div className="font-medium text-[#0B1B3F] flex items-center gap-1.5 flex-wrap">
                          <span>{act.actorName}</span>
                          <span className="text-[#5E6C87] font-normal">
                            {act.newRole === "admin" ? "made" : "removed"}
                          </span>
                          <span className="font-semibold">{act.targetName}</span>
                          <span className="text-[#5E6C87] font-normal">
                            {act.newRole === "admin" ? "an admin" : "as admin"}
                          </span>
                        </div>
                      </div>
                      <span className="text-xs text-[#5E6C87] shrink-0">
                        {act.createdAt}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          )}
        </Card>
      </div>

      {/* MAKE ADMIN CONFIRMATION DIALOG */}
      {roleModalTarget && targetRoleAction === "admin" && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs"
          onClick={() => {
            if (!isSubmittingRole) {
              setRoleModalTarget(null);
              setTargetRoleAction(null);
              setRoleModalError(null);
            }
          }}
        >
          <div
            className="bg-white rounded-xl max-w-md w-full p-6 border border-border shadow-xl space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-full bg-soft text-primary border border-border flex items-center justify-center shrink-0">
                <Shield className="w-5 h-5 text-primary" />
              </div>
              <div className="space-y-1">
                <h3 className="text-base font-semibold text-primary">
                  Give {roleModalTarget.name} admin access?
                </h3>
                <p className="text-xs text-muted leading-relaxed">
                  They will see every student&apos;s attendance, manage accounts, and can promote or remove other admins. Only do this for people you fully trust.
                </p>
              </div>
            </div>

            {roleModalError && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-xs text-red-700 font-medium flex items-start gap-2">
                <AlertTriangle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
                <span className="flex-1">{roleModalError}</span>
              </div>
            )}

            <div className="flex items-center gap-2 pt-2">
              <Button
                type="button"
                variant="secondary"
                disabled={isSubmittingRole}
                onClick={() => {
                  setRoleModalTarget(null);
                  setTargetRoleAction(null);
                  setRoleModalError(null);
                }}
                className="flex-1"
              >
                Cancel
              </Button>
              <Button
                type="button"
                variant="primary"
                isLoading={isSubmittingRole}
                disabled={isSubmittingRole}
                onClick={handleRoleChangeSubmit}
                className="flex-1"
              >
                Make admin
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* REMOVE ADMIN CONFIRMATION DIALOG */}
      {roleModalTarget && targetRoleAction === "student" && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs"
          onClick={() => {
            if (!isSubmittingRole) {
              setRoleModalTarget(null);
              setTargetRoleAction(null);
              setRoleModalError(null);
            }
          }}
        >
          <div
            className="bg-white rounded-xl max-w-md w-full p-6 border border-border shadow-xl space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-full bg-red-50 text-red-600 border border-red-200 flex items-center justify-center shrink-0">
                <ShieldX className="w-5 h-5" />
              </div>
              <div className="space-y-1">
                <h3 className="text-base font-semibold text-primary">
                  Remove admin access from {roleModalTarget.name}?
                </h3>
                <p className="text-xs text-muted leading-relaxed">
                  They will become a regular student and lose access to all admin pages immediately.
                </p>
              </div>
            </div>

            {roleModalError && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-xs text-red-700 font-medium flex items-start gap-2">
                <AlertTriangle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
                <span className="flex-1">{roleModalError}</span>
              </div>
            )}

            <div className="flex items-center gap-2 pt-2">
              <Button
                type="button"
                variant="secondary"
                disabled={isSubmittingRole}
                onClick={() => {
                  setRoleModalTarget(null);
                  setTargetRoleAction(null);
                  setRoleModalError(null);
                }}
                className="flex-1"
              >
                Cancel
              </Button>
              <Button
                type="button"
                variant="danger"
                isLoading={isSubmittingRole}
                disabled={isSubmittingRole}
                onClick={handleRoleChangeSubmit}
                className="flex-1"
              >
                Remove admin
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* ADD STUDENT MODAL */}
      {showAddModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs"
          onClick={() => {
            if (!isSubmittingAdd) {
              setShowAddModal(false);
            }
          }}
        >
          <div
            className="bg-white rounded-xl max-w-md w-full p-6 border border-border shadow-xl space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            {!createdCredentials ? (
              <form onSubmit={handleAddStudent} className="space-y-4">
                <div className="flex items-start justify-between">
                  <div className="space-y-0.5">
                    <h3 className="text-base font-semibold text-primary">
                      Add New Student
                    </h3>
                    <p className="text-xs text-muted">
                      Create a pre-approved student account with instant access
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setShowAddModal(false)}
                    className="w-8 h-8 rounded-lg flex items-center justify-center text-muted hover:text-primary hover:bg-soft"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                <div className="space-y-3">
                  <div className="space-y-1">
                    <label className="text-[13px] font-medium text-primary block">
                      Full Name *
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Samuel Adeleke"
                      value={newName}
                      onChange={(e) => setNewName(e.target.value)}
                      className="w-full h-11 px-3 text-sm border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[13px] font-medium text-primary block">
                      Email Address *
                    </label>
                    <input
                      type="email"
                      required
                      placeholder="you@example.com"
                      value={newEmail}
                      onChange={(e) => setNewEmail(e.target.value)}
                      className="w-full h-11 px-3 text-sm border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[13px] font-medium text-primary block">
                      Temporary Password * (min 8 chars)
                    </label>
                    <input
                      type="text"
                      required
                      minLength={8}
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      className="w-full h-11 px-3 text-sm border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary font-mono text-xs"
                    />
                  </div>
                </div>

                <div className="flex items-center gap-2 pt-2">
                  <Button
                    type="button"
                    variant="secondary"
                    onClick={() => setShowAddModal(false)}
                    disabled={isSubmittingAdd}
                    className="flex-1"
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    variant="primary"
                    isLoading={isSubmittingAdd}
                    className="flex-1"
                  >
                    Create Student
                  </Button>
                </div>
              </form>
            ) : (
              <div className="space-y-4 text-center">
                <div className="w-12 h-12 rounded-full bg-emerald-50 text-[#16A34A] border border-emerald-200 flex items-center justify-center mx-auto">
                  <CheckCircle2 className="w-6 h-6" />
                </div>

                <div className="space-y-1">
                  <h3 className="text-base font-semibold text-primary">
                    Student Created Successfully!
                  </h3>
                  <p className="text-xs text-muted">
                    The student can log in immediately with these details:
                  </p>
                </div>

                <div className="p-4 rounded-lg bg-soft border border-border text-left text-xs space-y-2">
                  <div>
                    <span className="text-muted block text-[11px] font-medium">
                      Student Name
                    </span>
                    <strong className="text-primary font-semibold">{createdCredentials.name}</strong>
                  </div>
                  <div>
                    <span className="text-muted block text-[11px] font-medium">
                      Email Address
                    </span>
                    <strong className="text-primary font-semibold">{createdCredentials.email}</strong>
                  </div>
                  <div>
                    <span className="text-muted block text-[11px] font-medium">
                      Temporary Password
                    </span>
                    <strong className="font-mono text-xs text-primary">
                      {createdCredentials.tempPass}
                    </strong>
                  </div>
                </div>

                <div className="flex items-center gap-2 pt-2">
                  <Button
                    variant="secondary"
                    onClick={copyCredentials}
                    className="flex-1"
                  >
                    {copied ? (
                      <>
                        <Check className="w-4 h-4 mr-1 text-[#16A34A]" />
                        Copied!
                      </>
                    ) : (
                      <>
                        <Copy className="w-4 h-4 mr-1" />
                        Copy Credentials
                      </>
                    )}
                  </Button>

                  <Button
                    variant="primary"
                    onClick={() => {
                      setShowAddModal(false);
                      setCreatedCredentials(null);
                    }}
                    className="flex-1"
                  >
                    Done
                  </Button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* CONFIRM DEACTIVATE MODAL */}
      {showDeactivateModal && targetStudent && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs"
          onClick={() => {
            if (!isSubmittingToggle) {
              setShowDeactivateModal(false);
              setTargetStudent(null);
              setDeactivateError(null);
            }
          }}
        >
          <div
            className="bg-white rounded-xl max-w-sm w-full p-6 border border-border shadow-xl space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-full bg-red-50 text-[#EF4444] border border-red-200 flex items-center justify-center shrink-0">
                <ShieldAlert className="w-5 h-5" />
              </div>
              <div className="space-y-1">
                <h3 className="text-base font-semibold text-primary">
                  Deactivate {targetStudent.role === "admin" ? "Administrator" : "Student"}
                </h3>
                <p className="text-xs text-muted leading-relaxed">
                  Are you sure you want to deactivate{" "}
                  <strong className="text-primary">{targetStudent.name}</strong>? They will be
                  blocked from signing in and scanning attendance.
                </p>
              </div>
            </div>

            {deactivateError && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-xs text-red-700 font-medium">
                {deactivateError}
              </div>
            )}

            <div className="flex items-center gap-2 pt-2">
              <Button
                variant="secondary"
                onClick={() => {
                  setShowDeactivateModal(false);
                  setTargetStudent(null);
                  setDeactivateError(null);
                }}
                disabled={isSubmittingToggle}
                className="flex-1"
              >
                Cancel
              </Button>
              <Button
                variant="danger"
                onClick={() => handleToggleActive(targetStudent)}
                isLoading={isSubmittingToggle}
                className="flex-1"
              >
                Yes, Deactivate
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* RESET PASSWORD MODAL */}
      {showPasswordModal && resetStudent && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs"
          onClick={() => {
            if (!isSubmittingReset) {
              setShowPasswordModal(false);
              setResetStudent(null);
              setResetNewPass("");
            }
          }}
        >
          <form
            onSubmit={handleResetPassword}
            className="bg-white rounded-xl max-w-sm w-full p-6 border border-border shadow-xl space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-full bg-soft text-primary border border-border flex items-center justify-center shrink-0">
                <KeyRound className="w-5 h-5" />
              </div>
              <div className="space-y-1">
                <h3 className="text-base font-semibold text-primary">Reset Password</h3>
                <p className="text-xs text-muted leading-relaxed">
                  Type a new temporary password for{" "}
                  <strong className="text-primary">{resetStudent.name}</strong>.
                </p>
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-[13px] text-muted block">
                New Temporary Password (min 8 characters)
              </label>
              <input
                type="text"
                required
                minLength={8}
                value={resetNewPass}
                onChange={(e) => setResetNewPass(e.target.value)}
                placeholder="Enter temporary password"
                className="w-full h-11 px-3 text-sm border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary font-mono text-xs"
              />
            </div>

            <div className="flex items-center gap-2 pt-2">
              <Button
                type="button"
                variant="secondary"
                onClick={() => {
                  setShowPasswordModal(false);
                  setResetStudent(null);
                  setResetNewPass("");
                }}
                disabled={isSubmittingReset}
                className="flex-1"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                variant="primary"
                isLoading={isSubmittingReset}
                className="flex-1"
              >
                Update Password
              </Button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}

function renderTodayBadge(status: string) {
  switch (status) {
    case "Present":
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-[#ECFDF5] text-[#16A34A] border border-[#A7F3D0] whitespace-nowrap select-none">
          <span className="w-2 h-2 rounded-full bg-[#16A34A] shrink-0" />
          <span>Checked in</span>
        </span>
      );
    case "Late":
      return (
        <span className="inline-flex items-center gap-1.5 whitespace-nowrap select-none">
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-[#ECFDF5] text-[#16A34A] border border-[#A7F3D0]">
            <span className="w-2 h-2 rounded-full bg-[#16A34A] shrink-0" />
            <span>Checked in</span>
          </span>
          <span className="px-1.5 py-0.5 rounded text-[10px] font-semibold bg-[#FEF3C7] text-[#D97706] border border-[#FDE68A]">
            Late
          </span>
        </span>
      );
    case "Checked out":
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-[#E8ECF6] text-[#0B1B3F] border border-[#CBD5E1] whitespace-nowrap select-none">
          <span className="w-2 h-2 rounded-full bg-[#0B1B3F] shrink-0" />
          <span>Checked out</span>
        </span>
      );
    case "Absent":
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-[#FEF2F2] text-[#DC2626] border border-[#FECACA] whitespace-nowrap select-none">
          <span className="w-2 h-2 rounded-full bg-[#DC2626] shrink-0" />
          <span>Absent</span>
        </span>
      );
    case "Off":
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-[#F1F4FB] text-[#5E6C87] border border-[#DDE3EE] whitespace-nowrap select-none">
          <span className="w-2 h-2 rounded-full bg-[#94A3B8] shrink-0" />
          <span>Off</span>
        </span>
      );
    case "Not yet in":
    default:
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-[#F1F4FB] text-[#5E6C87] border border-[#DDE3EE] whitespace-nowrap select-none">
          <span className="w-2 h-2 rounded-full bg-[#94A3B8] shrink-0" />
          <span>Not yet in</span>
        </span>
      );
  }
}
