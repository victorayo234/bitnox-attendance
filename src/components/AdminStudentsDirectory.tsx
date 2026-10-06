"use client";

import React, { useState, useMemo, useEffect } from "react";
import Link from "next/link";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
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
  ChevronRight,
  ShieldAlert,
  ShieldCheck,
  ShieldX,
  Shield,
  MoreVertical,
  ChevronDown,
  ChevronUp,
  Activity,
  Info,
} from "lucide-react";
import { format } from "date-fns";

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

  // Mobile Action Menu State
  const [mobileMenuStudent, setMobileMenuStudent] = useState<AdminStudentItem | null>(null);

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
          setMobileMenuStudent(null);
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

    // Apply Filter Chips
    if (activeChip === "students") {
      result = result.filter((s) => s.role === "student");
    } else if (activeChip === "admins") {
      result = result.filter((s) => s.role === "admin");
    } else if (activeChip === "deactivated") {
      result = result.filter((s) => !s.isActive);
    }

    // Apply Search
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter(
        (s) =>
          s.name.toLowerCase().includes(q) || s.email.toLowerCase().includes(q)
      );
    }

    return result;
  }, [students, searchQuery, activeChip]);

  // Count metrics for display
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

      // Update state without full page reload
      const updatedList = students.map((s) =>
        s.id === roleModalTarget.id ? { ...s, role: targetRoleAction } : s
      );
      setStudents(sortAccounts(updatedList));

      // Close dialog & show green toast
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
    } catch (err: any) {
      // Keep dialog open and show server's message in a red inline alert
      setRoleModalError(err.message || "An unexpected error occurred.");
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

      // Add to local state and re-sort
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

      // Clear input fields
      setNewName("");
      setNewEmail("");
      setNewPassword("Bitnox2026!");
      setToast({
        type: "success",
        message: "Student account created and approved successfully!",
      });
    } catch (err: any) {
      setToast({ type: "error", message: err.message || "Failed to create student" });
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
    } catch (err: any) {
      if (showDeactivateModal) {
        setDeactivateError(err.message || "Action failed");
      } else {
        setToast({ type: "error", message: err.message || "Action failed" });
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
      if (!res.ok || !data.ok) {
        throw new Error(data.error || "Failed to reset password");
      }

      setShowPasswordModal(false);
      setToast({
        type: "success",
        message: `Password reset successfully for ${resetStudent.name}. Temporary password: ${resetNewPass}`,
      });
      setResetNewPass("");
      setResetStudent(null);
    } catch (err: any) {
      setToast({ type: "error", message: err.message || "Failed to reset password" });
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
    <div className="space-y-6 pb-20">
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
          <button onClick={() => setToast(null)} className="text-[#5E6C87] hover:text-[#0B1B3F]">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-[#0B1B3F]">
            Students Directory
          </h1>
          <p className="text-xs sm:text-sm text-[#5E6C87]">
            Manage approved accounts, administrative privileges, and attendance status
          </p>
        </div>

        {/* Add Student Button (min 44px tap target) */}
        <Button
          variant="primary"
          onClick={() => {
            setCreatedCredentials(null);
            setShowAddModal(true);
          }}
          className="min-h-[44px] px-4 rounded-full text-xs font-semibold self-start sm:self-auto shadow-sm"
        >
          <UserPlus className="w-4 h-4 mr-2" />
          Add Student
        </Button>
      </div>

      {/* Filter Chips & Search Bar */}
      <div className="space-y-3">
        {/* Filter Chips */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
          <button
            type="button"
            onClick={() => setActiveChip("all")}
            className={`min-h-[38px] px-4 rounded-full text-xs font-semibold transition-all cursor-pointer ${
              activeChip === "all"
                ? "bg-[#0B1B3F] text-white shadow-xs"
                : "bg-white text-[#5E6C87] border border-[#DDE3EE] hover:bg-[#F8FAFD]"
            }`}
          >
            All
          </button>
          <button
            type="button"
            onClick={() => setActiveChip("students")}
            className={`min-h-[38px] px-4 rounded-full text-xs font-semibold transition-all cursor-pointer ${
              activeChip === "students"
                ? "bg-[#0B1B3F] text-white shadow-xs"
                : "bg-white text-[#5E6C87] border border-[#DDE3EE] hover:bg-[#F8FAFD]"
            }`}
          >
            Students
          </button>
          <button
            type="button"
            onClick={() => setActiveChip("admins")}
            className={`min-h-[38px] px-4 rounded-full text-xs font-semibold transition-all cursor-pointer ${
              activeChip === "admins"
                ? "bg-[#0B1B3F] text-white shadow-xs"
                : "bg-white text-[#5E6C87] border border-[#DDE3EE] hover:bg-[#F8FAFD]"
            }`}
          >
            Admins
          </button>
          <button
            type="button"
            onClick={() => setActiveChip("deactivated")}
            className={`min-h-[38px] px-4 rounded-full text-xs font-semibold transition-all cursor-pointer ${
              activeChip === "deactivated"
                ? "bg-[#0B1B3F] text-white shadow-xs"
                : "bg-white text-[#5E6C87] border border-[#DDE3EE] hover:bg-[#F8FAFD]"
            }`}
          >
            Deactivated
          </button>
        </div>

        {/* Search Bar & Total Counter */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="relative flex-1 max-w-md">
            <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-[#5E6C87]" />
            <input
              type="text"
              placeholder="Search by name or email..."
              aria-label="Search by name or email"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 min-h-[44px] bg-white border border-[#DDE3EE] rounded-full text-xs font-medium text-[#0B1B3F] placeholder-[#5E6C87] focus:outline-none focus:border-[#0B1B3F] transition-all shadow-2xs"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery("")}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-[#5E6C87] hover:text-[#0B1B3F]"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          <div className="text-xs text-[#5E6C87] font-medium">
            Total: <strong>{totalAccounts}</strong> accounts, <strong>{adminCount}</strong> {adminCount === 1 ? "admin" : "admins"}
          </div>
        </div>
      </div>

      {/* STUDENTS LIST (DESKTOP TABLE) */}
      <Card className="bg-white border border-[#DDE3EE] rounded-2xl shadow-sm overflow-hidden hidden md:block">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-[#F8FAFD] text-[#5E6C87] border-b border-[#DDE3EE] uppercase tracking-wider text-[11px] font-semibold">
              <tr>
                <th className="py-3.5 px-5">Account</th>
                <th className="py-3.5 px-4">Role</th>
                <th className="py-3.5 px-4">Account Status</th>
                <th className="py-3.5 px-4">Today&apos;s Status</th>
                <th className="py-3.5 px-4">Enrolled</th>
                <th className="py-3.5 px-5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#DDE3EE]/60">
              {filteredStudents.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-[#5E6C87]">
                    No accounts matching current filter or search.
                  </td>
                </tr>
              ) : (
                filteredStudents.map((account) => {
                  const isCurrentAdmin = account.id === currentAdminId;
                  const canMakeAdmin = account.role === "student" && account.status === "approved" && account.isActive;
                  const canRemoveAdmin = account.role === "admin" && !isCurrentAdmin;
                  const cannotPromoteReason = !account.isActive || account.status !== "approved";

                  return (
                    <tr
                      key={account.id}
                      className={`hover:bg-[#F9FBFE] transition-colors ${
                        account.role === "admin" ? "bg-slate-50/40" : ""
                      }`}
                    >
                      {/* Name and Email */}
                      <td className="py-3.5 px-5">
                        <Link
                          href={`/admin/students/${account.id}`}
                          className="group inline-flex flex-col hover:opacity-85"
                        >
                          <span className="font-bold text-sm text-[#0B1B3F] group-hover:text-blue-600 inline-flex items-center gap-1.5 transition-colors">
                            {account.name}
                            {isCurrentAdmin && (
                              <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-[#00E6FF]/20 text-[#0B1B3F] border border-[#00E6FF]/30">
                                You
                              </span>
                            )}
                            <ChevronRight className="w-3.5 h-3.5 opacity-0 group-hover:opacity-100 text-blue-600 transition-opacity" />
                          </span>
                          <span className="text-[11px] text-[#5E6C87]">{account.email}</span>
                        </Link>
                      </td>

                      {/* Role Badge: Navy Admin pill vs Muted Student pill */}
                      <td className="py-3.5 px-4">
                        {account.role === "admin" ? (
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-[#0B1B3F] text-white shadow-2xs">
                            <Shield className="w-3 h-3 mr-1 text-[#00E6FF]" />
                            Admin
                          </span>
                        ) : (
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-slate-100 text-slate-700 border border-slate-200">
                            Student
                          </span>
                        )}
                      </td>

                      {/* Active Status Badge */}
                      <td className="py-3.5 px-4">
                        {account.isActive ? (
                          <Badge variant="present" withDot>
                            Active
                          </Badge>
                        ) : (
                          <Badge variant="absent" withDot>
                            Deactivated
                          </Badge>
                        )}
                      </td>

                      {/* Today's Status Badge */}
                      <td className="py-3.5 px-4">
                        {renderTodayBadge(account.todayStatus, account.todayCheckIn)}
                      </td>

                      {/* Enrolled Date */}
                      <td className="py-3.5 px-4 text-[#5E6C87]">
                        {format(new Date(account.createdAt), "MMM d, yyyy")}
                      </td>

                      {/* Actions: History, Make admin / Remove admin, Password, Deactivate / Reactivate */}
                      <td className="py-3.5 px-5 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {/* 1. History */}
                          <Button
                            asChild
                            variant="ghost"
                            size="sm"
                            className="h-8 px-2.5 rounded-full text-xs text-[#5E6C87] hover:text-[#0B1B3F]"
                            title="View Attendance History"
                          >
                            <Link href={`/admin/students/${account.id}`}>
                              <History className="w-3.5 h-3.5 mr-1" />
                              History
                            </Link>
                          </Button>

                          {/* 2. Make admin / Remove admin */}
                          {canMakeAdmin && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => {
                                setRoleModalTarget(account);
                                setTargetRoleAction("admin");
                                setRoleModalError(null);
                              }}
                              className="h-8 px-2.5 rounded-full text-[11px] border-[#0B1B3F]/30 text-[#0B1B3F] hover:bg-[#0B1B3F] hover:text-white transition-colors"
                              title="Promote to Administrator"
                            >
                              <ShieldCheck className="w-3.5 h-3.5 mr-1 text-blue-600" />
                              Make admin
                            </Button>
                          )}

                          {canRemoveAdmin && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => {
                                setRoleModalTarget(account);
                                setTargetRoleAction("student");
                                setRoleModalError(null);
                              }}
                              className="h-8 px-2.5 rounded-full text-[11px] border-red-200 text-red-600 hover:bg-red-50"
                              title="Remove Administrator Access"
                            >
                              <ShieldX className="w-3.5 h-3.5 mr-1" />
                              Remove admin
                            </Button>
                          )}

                          {!isCurrentAdmin && cannotPromoteReason && account.role === "student" && (
                            <span
                              className="inline-flex items-center text-[11px] text-gray-400 cursor-not-allowed px-1.5 py-0.5 rounded"
                              title="Only approved, active students can be promoted."
                            >
                              <Info className="w-3 h-3 mr-1 text-gray-400" />
                              <span className="hidden xl:inline">Only approved, active students can be promoted.</span>
                            </span>
                          )}

                          {/* 3. Password */}
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              setResetStudent(account);
                              setResetNewPass("");
                              setShowPasswordModal(true);
                            }}
                            className="h-8 px-2.5 rounded-full text-[11px] border-[#DDE3EE] hover:bg-[#F1F4FB]"
                            title="Reset Password"
                          >
                            <KeyRound className="w-3.5 h-3.5 mr-1 text-[#0B1B3F]" />
                            Password
                          </Button>

                          {/* 4. Deactivate / Reactivate (hidden on logged-in admin's own row) */}
                          {!isCurrentAdmin && (
                            account.isActive ? (
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => {
                                  setTargetStudent(account);
                                  setDeactivateError(null);
                                  setShowDeactivateModal(true);
                                }}
                                className="h-8 px-2.5 rounded-full text-[11px] border-red-200 text-red-600 hover:bg-red-50"
                              >
                                Deactivate
                              </Button>
                            ) : (
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleToggleActive(account)}
                                className="h-8 px-2.5 rounded-full text-[11px] border-green-200 text-[#16A34A] hover:bg-green-50"
                              >
                                Reactivate
                              </Button>
                            )
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {/* MOBILE STACKED CARDS VIEW (md:hidden) with "..." Menu & >=44px tap targets */}
      <div className="block md:hidden space-y-3">
        {filteredStudents.length === 0 ? (
          <Card className="p-6 text-center text-xs text-[#5E6C87] bg-white border border-[#DDE3EE]">
            No accounts matching current filter or search.
          </Card>
        ) : (
          filteredStudents.map((account) => {
            const isCurrentAdmin = account.id === currentAdminId;
            const isAdmin = account.role === "admin";

            return (
              <Card
                key={account.id}
                className={`bg-white border border-[#DDE3EE] p-4 rounded-2xl shadow-xs space-y-3 ${
                  isAdmin ? "border-l-4 border-l-[#0B1B3F] bg-slate-50/30" : ""
                }`}
              >
                {/* Header: Name, Email & Role / You */}
                <div className="flex items-start justify-between gap-2">
                  <Link href={`/admin/students/${account.id}`} className="flex-1">
                    <h4 className="font-bold text-sm text-[#0B1B3F] inline-flex items-center gap-1.5 flex-wrap">
                      {account.name}
                      {isCurrentAdmin && (
                        <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-[#00E6FF]/20 text-[#0B1B3F] border border-[#00E6FF]/30">
                          You
                        </span>
                      )}
                      <ChevronRight className="w-3.5 h-3.5 text-[#5E6C87]" />
                    </h4>
                    <p className="text-[11px] text-[#5E6C87]">{account.email}</p>
                  </Link>

                  <div className="flex items-center gap-2 shrink-0">
                    {/* Role Pill */}
                    {isAdmin ? (
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-[#0B1B3F] text-white">
                        Admin
                      </span>
                    ) : (
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold bg-slate-100 text-slate-700 border border-slate-200">
                        Student
                      </span>
                    )}

                    {/* Mobile "..." action button (min 44px tap target) */}
                    <button
                      type="button"
                      aria-label="Open actions menu"
                      onClick={() => setMobileMenuStudent(account)}
                      className="min-h-[44px] min-w-[44px] flex items-center justify-center rounded-xl bg-gray-50 border border-[#DDE3EE] text-[#0B1B3F] hover:bg-gray-100 transition-colors"
                    >
                      <MoreVertical className="w-5 h-5 text-[#0B1B3F]" />
                    </button>
                  </div>
                </div>

                {/* Account and Today Status Row */}
                <div className="grid grid-cols-2 gap-2 text-xs bg-[#F8FAFD] p-2.5 rounded-xl border border-[#DDE3EE]/60">
                  <div className="flex items-center justify-between pr-2 border-r border-[#DDE3EE]">
                    <span className="text-[#5E6C87] text-[11px]">Account:</span>
                    {account.isActive ? (
                      <Badge variant="present" withDot>Active</Badge>
                    ) : (
                      <Badge variant="absent" withDot>Deactivated</Badge>
                    )}
                  </div>
                  <div className="flex items-center justify-between pl-2">
                    <span className="text-[#5E6C87] text-[11px]">Today:</span>
                    <div>{renderTodayBadge(account.todayStatus, account.todayCheckIn)}</div>
                  </div>
                </div>
              </Card>
            );
          })
        )}
      </div>

      {/* MOBILE ACTION MENU SHEET (min 44px tap targets) */}
      {mobileMenuStudent && (
        <div
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/40 backdrop-blur-xs"
          onClick={() => setMobileMenuStudent(null)}
        >
          <div
            className="bg-white rounded-t-3xl sm:rounded-2xl max-w-sm w-full p-5 border border-[#DDE3EE] shadow-2xl space-y-4 animate-in slide-in-from-bottom"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between pb-2 border-b border-[#DDE3EE]">
              <div>
                <h3 className="text-base font-bold text-[#0B1B3F]">
                  {mobileMenuStudent.name}
                </h3>
                <p className="text-xs text-[#5E6C87]">{mobileMenuStudent.email}</p>
              </div>
              <button
                onClick={() => setMobileMenuStudent(null)}
                className="min-h-[44px] min-w-[44px] flex items-center justify-center text-[#5E6C87] hover:text-[#0B1B3F]"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex flex-col gap-2">
              {/* 1. History */}
              <Button
                asChild
                variant="outline"
                className="w-full min-h-[44px] justify-start text-xs font-semibold rounded-xl border-[#DDE3EE]"
              >
                <Link
                  href={`/admin/students/${mobileMenuStudent.id}`}
                  onClick={() => setMobileMenuStudent(null)}
                >
                  <History className="w-4 h-4 mr-2.5 text-[#5E6C87]" />
                  View Attendance History
                </Link>
              </Button>

              {/* 2. Make admin / Remove admin */}
              {mobileMenuStudent.role === "student" &&
                mobileMenuStudent.status === "approved" &&
                mobileMenuStudent.isActive && (
                  <Button
                    variant="outline"
                    onClick={() => {
                      setRoleModalTarget(mobileMenuStudent);
                      setTargetRoleAction("admin");
                      setRoleModalError(null);
                      setMobileMenuStudent(null);
                    }}
                    className="w-full min-h-[44px] justify-start text-xs font-semibold rounded-xl border-[#0B1B3F]/30 text-[#0B1B3F] hover:bg-[#0B1B3F] hover:text-white"
                  >
                    <ShieldCheck className="w-4 h-4 mr-2.5 text-blue-600" />
                    Make admin
                  </Button>
                )}

              {mobileMenuStudent.role === "admin" &&
                mobileMenuStudent.id !== currentAdminId && (
                  <Button
                    variant="outline"
                    onClick={() => {
                      setRoleModalTarget(mobileMenuStudent);
                      setTargetRoleAction("student");
                      setRoleModalError(null);
                      setMobileMenuStudent(null);
                    }}
                    className="w-full min-h-[44px] justify-start text-xs font-semibold rounded-xl border-red-200 text-red-600 hover:bg-red-50"
                  >
                    <ShieldX className="w-4 h-4 mr-2.5" />
                    Remove admin
                  </Button>
                )}

              {mobileMenuStudent.id !== currentAdminId &&
                (!mobileMenuStudent.isActive || mobileMenuStudent.status !== "approved") &&
                mobileMenuStudent.role === "student" && (
                  <div className="p-2.5 bg-gray-50 border border-gray-200 rounded-xl text-[11px] text-gray-500">
                    Only approved, active students can be promoted.
                  </div>
                )}

              {/* 3. Password */}
              <Button
                variant="outline"
                onClick={() => {
                  setResetStudent(mobileMenuStudent);
                  setResetNewPass("");
                  setShowPasswordModal(true);
                  setMobileMenuStudent(null);
                }}
                className="w-full min-h-[44px] justify-start text-xs font-semibold rounded-xl border-[#DDE3EE]"
              >
                <KeyRound className="w-4 h-4 mr-2.5 text-[#0B1B3F]" />
                Reset Password
              </Button>

              {/* 4. Deactivate / Reactivate */}
              {mobileMenuStudent.id !== currentAdminId && (
                mobileMenuStudent.isActive ? (
                  <Button
                    variant="outline"
                    onClick={() => {
                      setTargetStudent(mobileMenuStudent);
                      setDeactivateError(null);
                      setShowDeactivateModal(true);
                      setMobileMenuStudent(null);
                    }}
                    className="w-full min-h-[44px] justify-start text-xs font-semibold rounded-xl border-red-200 text-red-600 hover:bg-red-50"
                  >
                    <ShieldAlert className="w-4 h-4 mr-2.5" />
                    Deactivate Account
                  </Button>
                ) : (
                  <Button
                    variant="outline"
                    onClick={() => {
                      handleToggleActive(mobileMenuStudent);
                      setMobileMenuStudent(null);
                    }}
                    className="w-full min-h-[44px] justify-start text-xs font-semibold rounded-xl border-green-200 text-[#16A34A] hover:bg-green-50"
                  >
                    <CheckCircle2 className="w-4 h-4 mr-2.5" />
                    Reactivate Account
                  </Button>
                )
              )}
            </div>
          </div>
        </div>
      )}

      {/* SECTION E: ADMIN ACTIVITY AUDIT SECTION (COLLAPSED BY DEFAULT) */}
      <Card className="bg-white border border-[#DDE3EE] rounded-2xl shadow-xs overflow-hidden">
        <button
          type="button"
          onClick={() => setShowActivity(!showActivity)}
          className="w-full min-h-[48px] p-4 flex items-center justify-between text-left hover:bg-[#F9FBFE] transition-colors cursor-pointer"
        >
          <div className="flex items-center gap-2.5">
            <Activity className="w-4 h-4 text-[#0B1B3F]" />
            <h3 className="text-sm font-bold text-[#0B1B3F]">Admin activity</h3>
            <span className="text-[11px] px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 font-semibold border border-slate-200">
              {roleActivity.length} recent {roleActivity.length === 1 ? "entry" : "entries"}
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
                    className="p-3.5 sm:px-5 flex flex-col sm:flex-row sm:items-center justify-between gap-1.5 text-xs hover:bg-[#F8FAFD]"
                  >
                    <div className="space-y-0.5">
                      <div className="font-semibold text-[#0B1B3F] flex items-center gap-1.5 flex-wrap">
                        <span>{act.actorName}</span>
                        <span className="text-[#5E6C87] font-normal">changed</span>
                        <strong>{act.targetName}</strong>
                      </div>
                      <div className="text-[11px] text-[#5E6C87]">
                        {act.newRole === "admin" ? (
                          <span className="text-blue-700 font-medium">
                            Promoted from student to admin
                          </span>
                        ) : (
                          <span className="text-red-700 font-medium">
                            Removed as admin (demoted to student)
                          </span>
                        )}
                      </div>
                    </div>
                    <span className="text-[11px] text-[#5E6C87] shrink-0">
                      {act.createdAt}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        )}
      </Card>

      {/* SECTION C: MAKE ADMIN CONFIRMATION DIALOG (ITEM 7) */}
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
            className="bg-white rounded-2xl max-w-md w-full p-6 border border-[#DDE3EE] shadow-2xl space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-full bg-blue-50 text-[#0B1B3F] border border-blue-200 flex items-center justify-center shrink-0">
                <ShieldCheck className="w-5 h-5 text-blue-600" />
              </div>
              <div className="space-y-1">
                <h3 className="text-base font-bold text-[#0B1B3F]">
                  Give {roleModalTarget.name} admin access?
                </h3>
                <p className="text-xs text-[#5E6C87] leading-relaxed">
                  They will see every student&apos;s attendance, manage accounts, and can promote or remove other admins. Only do this for people you fully trust.
                </p>
              </div>
            </div>

            {/* Red inline alert on server failure (Item 9) */}
            {roleModalError && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-700 font-medium flex items-start gap-2">
                <AlertTriangle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
                <span className="flex-1">{roleModalError}</span>
              </div>
            )}

            <div className="flex items-center gap-2 pt-2">
              <Button
                type="button"
                variant="outline"
                disabled={isSubmittingRole}
                onClick={() => {
                  setRoleModalTarget(null);
                  setTargetRoleAction(null);
                  setRoleModalError(null);
                }}
                className="flex-1 min-h-[44px] rounded-full text-xs font-semibold"
              >
                Cancel
              </Button>
              <Button
                type="button"
                variant="primary"
                isLoading={isSubmittingRole}
                disabled={isSubmittingRole}
                onClick={handleRoleChangeSubmit}
                className="flex-1 min-h-[44px] rounded-full text-xs font-semibold bg-[#0B1B3F] hover:bg-[#0B1B3F]/90 text-white"
              >
                Make admin
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* SECTION C: REMOVE ADMIN CONFIRMATION DIALOG (ITEM 8) */}
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
            className="bg-white rounded-2xl max-w-md w-full p-6 border border-[#DDE3EE] shadow-2xl space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-full bg-red-50 text-red-600 border border-red-200 flex items-center justify-center shrink-0">
                <ShieldX className="w-5 h-5" />
              </div>
              <div className="space-y-1">
                <h3 className="text-base font-bold text-[#0B1B3F]">
                  Remove admin access from {roleModalTarget.name}?
                </h3>
                <p className="text-xs text-[#5E6C87] leading-relaxed">
                  They will become a regular student and lose access to all admin pages immediately.
                </p>
              </div>
            </div>

            {/* Red inline alert on server failure (Item 9) */}
            {roleModalError && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-700 font-medium flex items-start gap-2">
                <AlertTriangle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
                <span className="flex-1">{roleModalError}</span>
              </div>
            )}

            <div className="flex items-center gap-2 pt-2">
              <Button
                type="button"
                variant="outline"
                disabled={isSubmittingRole}
                onClick={() => {
                  setRoleModalTarget(null);
                  setTargetRoleAction(null);
                  setRoleModalError(null);
                }}
                className="flex-1 min-h-[44px] rounded-full text-xs font-semibold"
              >
                Cancel
              </Button>
              <Button
                type="button"
                variant="danger"
                isLoading={isSubmittingRole}
                disabled={isSubmittingRole}
                onClick={handleRoleChangeSubmit}
                className="flex-1 min-h-[44px] rounded-full text-xs font-semibold bg-red-600 hover:bg-red-700 text-white"
              >
                Remove admin
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* ADD STUDENT MODAL FORM */}
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
            className="bg-white rounded-2xl max-w-md w-full p-6 border border-[#DDE3EE] shadow-xl space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            {!createdCredentials ? (
              <form onSubmit={handleAddStudent} className="space-y-4">
                <div className="flex items-start justify-between">
                  <div className="space-y-0.5">
                    <h3 className="text-base font-bold text-[#0B1B3F]">
                      Add New Student
                    </h3>
                    <p className="text-xs text-[#5E6C87]">
                      Create a pre-approved student account with instant access
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setShowAddModal(false)}
                    className="min-h-[44px] min-w-[44px] flex items-center justify-center text-[#5E6C87] hover:text-[#0B1B3F]"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                <div className="space-y-3">
                  <div className="space-y-1">
                    <label className="text-[11px] font-semibold text-[#0B1B3F]">
                      Full Name *
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Victor Ayomide"
                      value={newName}
                      onChange={(e) => setNewName(e.target.value)}
                      className="w-full px-3 py-2 min-h-[44px] text-xs border border-[#DDE3EE] rounded-xl focus:outline-none focus:border-[#0B1B3F]"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[11px] font-semibold text-[#0B1B3F]">
                      Email Address *
                    </label>
                    <input
                      type="email"
                      required
                      placeholder="e.g. victor@student.bitnox.qc"
                      value={newEmail}
                      onChange={(e) => setNewEmail(e.target.value)}
                      className="w-full px-3 py-2 min-h-[44px] text-xs border border-[#DDE3EE] rounded-xl focus:outline-none focus:border-[#0B1B3F]"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[11px] font-semibold text-[#0B1B3F]">
                      Temporary Password * (min 8 chars)
                    </label>
                    <input
                      type="text"
                      required
                      minLength={8}
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      className="w-full px-3 py-2 min-h-[44px] text-xs border border-[#DDE3EE] rounded-xl focus:outline-none focus:border-[#0B1B3F]"
                    />
                  </div>
                </div>

                <div className="flex items-center gap-2 pt-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setShowAddModal(false)}
                    disabled={isSubmittingAdd}
                    className="flex-1 min-h-[44px] rounded-full text-xs font-semibold"
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    variant="primary"
                    isLoading={isSubmittingAdd}
                    className="flex-1 min-h-[44px] rounded-full text-xs font-semibold"
                  >
                    Create Student
                  </Button>
                </div>
              </form>
            ) : (
              /* Success Card with Credentials */
              <div className="space-y-4 text-center">
                <div className="w-12 h-12 rounded-full bg-green-50 text-[#16A34A] border border-green-200 flex items-center justify-center mx-auto">
                  <CheckCircle2 className="w-6 h-6" />
                </div>

                <div className="space-y-1">
                  <h3 className="text-base font-bold text-[#0B1B3F]">
                    Student Created Successfully!
                  </h3>
                  <p className="text-xs text-[#5E6C87]">
                    The student can log in immediately with these details:
                  </p>
                </div>

                <div className="p-4 rounded-xl bg-[#F8FAFD] border border-[#DDE3EE] text-left text-xs space-y-2">
                  <div>
                    <span className="text-[#5E6C87] block text-[10px] uppercase font-semibold">
                      Student Name
                    </span>
                    <strong className="text-[#0B1B3F]">{createdCredentials.name}</strong>
                  </div>
                  <div>
                    <span className="text-[#5E6C87] block text-[10px] uppercase font-semibold">
                      Email Address
                    </span>
                    <strong className="text-[#0B1B3F]">{createdCredentials.email}</strong>
                  </div>
                  <div>
                    <span className="text-[#5E6C87] block text-[10px] uppercase font-semibold">
                      Temporary Password
                    </span>
                    <strong className="font-mono text-xs text-[#0B1B3F]">
                      {createdCredentials.tempPass}
                    </strong>
                  </div>
                </div>

                <div className="flex items-center gap-2 pt-2">
                  <Button
                    variant="outline"
                    onClick={copyCredentials}
                    className="flex-1 min-h-[44px] rounded-full text-xs font-semibold"
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
                    className="flex-1 min-h-[44px] rounded-full text-xs font-semibold"
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
            className="bg-white rounded-2xl max-w-sm w-full p-6 border border-[#DDE3EE] shadow-xl space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-full bg-red-50 text-[#EF4444] border border-red-200 flex items-center justify-center shrink-0">
                <ShieldAlert className="w-5 h-5" />
              </div>
              <div className="space-y-1">
                <h3 className="text-base font-bold text-[#0B1B3F]">
                  Deactivate {targetStudent.role === "admin" ? "Administrator" : "Student"}
                </h3>
                <p className="text-xs text-[#5E6C87] leading-relaxed">
                  Are you sure you want to deactivate{" "}
                  <strong className="text-[#0B1B3F]">{targetStudent.name}</strong>? They will be
                  blocked from signing in and scanning attendance.
                </p>
              </div>
            </div>

            {deactivateError && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-700 font-medium">
                {deactivateError}
              </div>
            )}

            <div className="flex items-center gap-2 pt-2">
              <Button
                variant="outline"
                onClick={() => {
                  setShowDeactivateModal(false);
                  setTargetStudent(null);
                  setDeactivateError(null);
                }}
                disabled={isSubmittingToggle}
                className="flex-1 min-h-[44px] rounded-full text-xs font-semibold"
              >
                Cancel
              </Button>
              <Button
                variant="danger"
                onClick={() => handleToggleActive(targetStudent)}
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
            className="bg-white rounded-2xl max-w-sm w-full p-6 border border-[#DDE3EE] shadow-xl space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-full bg-[#F1F4FB] text-[#0B1B3F] border border-[#DDE3EE] flex items-center justify-center shrink-0">
                <KeyRound className="w-5 h-5 text-[#00E6FF]" />
              </div>
              <div className="space-y-1">
                <h3 className="text-base font-bold text-[#0B1B3F]">Reset Password</h3>
                <p className="text-xs text-[#5E6C87] leading-relaxed">
                  Type a new temporary password for{" "}
                  <strong className="text-[#0B1B3F]">{resetStudent.name}</strong>.
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
                value={resetNewPass}
                onChange={(e) => setResetNewPass(e.target.value)}
                placeholder="Enter temporary password"
                className="w-full px-3 py-2 min-h-[44px] text-xs border border-[#DDE3EE] rounded-xl focus:outline-none focus:border-[#0B1B3F]"
              />
            </div>

            <div className="flex items-center gap-2 pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setShowPasswordModal(false);
                  setResetStudent(null);
                  setResetNewPass("");
                }}
                disabled={isSubmittingReset}
                className="flex-1 min-h-[44px] rounded-full text-xs font-semibold"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                variant="primary"
                isLoading={isSubmittingReset}
                className="flex-1 min-h-[44px] rounded-full text-xs font-semibold"
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

function renderTodayBadge(status: string, time?: string | null) {
  switch (status) {
    case "Present":
      return (
        <Badge variant="present" withDot>
          Present {time ? `(${time})` : ""}
        </Badge>
      );
    case "Late":
      return (
        <Badge variant="late" withDot>
          Late {time ? `(${time})` : ""}
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
    default:
      return (
        <Badge variant="neutral">
          Not yet in
        </Badge>
      );
  }
}
