"use client";

import React, { useState, useMemo } from "react";
import Link from "next/link";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import {
  Search,
  UserPlus,
  UserCheck,
  UserX,
  KeyRound,
  CheckCircle2,
  AlertTriangle,
  History,
  X,
  Copy,
  Check,
  ChevronRight,
  ShieldAlert,
} from "lucide-react";
import { format } from "date-fns";

export interface AdminStudentItem {
  id: string;
  name: string;
  email: string;
  isActive: boolean;
  status: "approved" | "pending" | "rejected";
  todayStatus: "Present" | "Late" | "Checked out" | "Not yet in" | "Off";
  todayCheckIn: string | null;
  todayCheckOut: string | null;
  createdAt: string;
}

interface AdminStudentsDirectoryProps {
  initialStudents: AdminStudentItem[];
}

export function AdminStudentsDirectory({
  initialStudents,
}: AdminStudentsDirectoryProps) {
  const [students, setStudents] = useState<AdminStudentItem[]>(initialStudents);
  const [searchQuery, setSearchQuery] = useState("");
  const [toast, setToast] = useState<{ type: "success" | "error"; message: string } | null>(null);

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

  // Deactivate Modal State
  const [targetStudent, setTargetStudent] = useState<AdminStudentItem | null>(null);
  const [showDeactivateModal, setShowDeactivateModal] = useState(false);
  const [isSubmittingToggle, setIsSubmittingToggle] = useState(false);

  // Reset Password Modal State
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [resetStudent, setResetStudent] = useState<AdminStudentItem | null>(null);
  const [resetNewPass, setResetNewPass] = useState("");
  const [isSubmittingReset, setIsSubmittingReset] = useState(false);

  // Filter students by search
  const filteredStudents = useMemo(() => {
    if (!searchQuery.trim()) return students;
    const q = searchQuery.toLowerCase();
    return students.filter(
      (s) =>
        s.name.toLowerCase().includes(q) || s.email.toLowerCase().includes(q)
    );
  }, [students, searchQuery]);

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

      // Add to local state
      const created: AdminStudentItem = {
        id: data.student.id,
        name: data.student.full_name,
        email: data.student.email,
        isActive: true,
        status: "approved",
        todayStatus: "Not yet in",
        todayCheckIn: null,
        todayCheckOut: null,
        createdAt: new Date().toISOString(),
      };

      setStudents((prev) => [created, ...prev]);
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
    const newActiveState = !student.isActive;

    try {
      const res = await fetch(`/api/admin/students/${student.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isActive: newActiveState }),
      });

      const data = await res.json();
      if (!res.ok || !data.ok) {
        throw new Error(data.error || "Failed to update student status");
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
      setToast({ type: "error", message: err.message || "Action failed" });
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
            Manage enrolled students, review attendance status, and manage access
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

      {/* Search Bar & Total Counter */}
      <div className="flex items-center justify-between gap-3">
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-[#5E6C87]" />
          <input
            type="text"
            placeholder="Search students by name or email..."
            aria-label="Search students by name or email"
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

        <div className="text-xs text-[#5E6C87] hidden sm:block">
          Total: <strong>{filteredStudents.length}</strong> enrolled students
        </div>
      </div>

      {/* STUDENTS LIST (DESKTOP TABLE) */}
      <Card className="bg-white border border-[#DDE3EE] rounded-2xl shadow-sm overflow-hidden hidden md:block">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-[#F8FAFD] text-[#5E6C87] border-b border-[#DDE3EE] uppercase tracking-wider text-[11px] font-semibold">
              <tr>
                <th className="py-3.5 px-5">Student</th>
                <th className="py-3.5 px-4">Account Status</th>
                <th className="py-3.5 px-4">Today&apos;s Status</th>
                <th className="py-3.5 px-4">Enrolled</th>
                <th className="py-3.5 px-5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#DDE3EE]/60">
              {filteredStudents.map((student) => (
                <tr
                  key={student.id}
                  className="hover:bg-[#F9FBFE] transition-colors"
                >
                  {/* Name and Email */}
                  <td className="py-3.5 px-5">
                    <Link
                      href={`/admin/students/${student.id}`}
                      className="group inline-flex flex-col hover:opacity-85"
                    >
                      <span className="font-bold text-sm text-[#0B1B3F] group-hover:text-blue-600 inline-flex items-center gap-1 transition-colors">
                        {student.name}
                        <ChevronRight className="w-3.5 h-3.5 opacity-0 group-hover:opacity-100 text-blue-600 transition-opacity" />
                      </span>
                      <span className="text-[11px] text-[#5E6C87]">{student.email}</span>
                    </Link>
                  </td>

                  {/* Active Status Badge */}
                  <td className="py-3.5 px-4">
                    {student.isActive ? (
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
                    {renderTodayBadge(student.todayStatus, student.todayCheckIn)}
                  </td>

                  {/* Enrolled Date */}
                  <td className="py-3.5 px-4 text-[#5E6C87]">
                    {format(new Date(student.createdAt), "MMM d, yyyy")}
                  </td>

                  {/* Actions */}
                  <td className="py-3.5 px-5 text-right">
                    <div className="flex items-center justify-end gap-1.5">
                      {/* View History Button */}
                      <Button
                        asChild
                        variant="ghost"
                        size="sm"
                        className="h-8 px-2.5 rounded-full text-xs text-[#5E6C87] hover:text-[#0B1B3F]"
                        title="View Attendance History"
                      >
                        <Link href={`/admin/students/${student.id}`}>
                          <History className="w-3.5 h-3.5 mr-1" />
                          History
                        </Link>
                      </Button>

                      {/* Reset Password Button */}
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setResetStudent(student);
                          setResetNewPass("");
                          setShowPasswordModal(true);
                        }}
                        className="h-8 px-2.5 rounded-full text-[11px] border-[#DDE3EE] hover:bg-[#F1F4FB]"
                        title="Reset Student Password"
                      >
                        <KeyRound className="w-3.5 h-3.5 mr-1 text-[#0B1B3F]" />
                        Password
                      </Button>

                      {/* Deactivate / Reactivate Button */}
                      {student.isActive ? (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setTargetStudent(student);
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
                          onClick={() => handleToggleActive(student)}
                          className="h-8 px-2.5 rounded-full text-[11px] border-green-200 text-[#16A34A] hover:bg-green-50"
                        >
                          Reactivate
                        </Button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      {/* MOBILE STACKED CARDS VIEW (md:hidden) with min 44px tap targets */}
      <div className="block md:hidden space-y-3">
        {filteredStudents.map((student) => (
          <Card
            key={student.id}
            className="bg-white border border-[#DDE3EE] p-4 rounded-2xl shadow-xs space-y-3"
          >
            {/* Header: Name, Email & Status */}
            <div className="flex items-start justify-between gap-2">
              <Link href={`/admin/students/${student.id}`} className="flex-1">
                <h4 className="font-bold text-sm text-[#0B1B3F] inline-flex items-center gap-1">
                  {student.name}
                  <ChevronRight className="w-3.5 h-3.5 text-[#5E6C87]" />
                </h4>
                <p className="text-[11px] text-[#5E6C87]">{student.email}</p>
              </Link>

              <div className="flex flex-col items-end gap-1">
                {student.isActive ? (
                  <Badge variant="present" withDot>
                    Active
                  </Badge>
                ) : (
                  <Badge variant="absent" withDot>
                    Deactivated
                  </Badge>
                )}
              </div>
            </div>

            {/* Today Status Row */}
            <div className="flex items-center justify-between text-xs bg-[#F8FAFD] p-2.5 rounded-xl border border-[#DDE3EE]/60">
              <span className="text-[#5E6C87]">Today:</span>
              <div>{renderTodayBadge(student.todayStatus, student.todayCheckIn)}</div>
            </div>

            {/* Row Actions (Large min 44px tap targets) */}
            <div className="grid grid-cols-3 gap-2 pt-1">
              <Button
                asChild
                variant="outline"
                className="min-h-[44px] text-xs font-semibold rounded-full border-[#DDE3EE] hover:bg-[#F1F4FB]"
              >
                <Link href={`/admin/students/${student.id}`}>
                  <History className="w-3.5 h-3.5 mr-1" />
                  History
                </Link>
              </Button>

              <Button
                variant="outline"
                onClick={() => {
                  setResetStudent(student);
                  setResetNewPass("");
                  setShowPasswordModal(true);
                }}
                className="min-h-[44px] text-xs font-semibold rounded-full border-[#DDE3EE] hover:bg-[#F1F4FB]"
              >
                <KeyRound className="w-3.5 h-3.5 mr-1" />
                Password
              </Button>

              {student.isActive ? (
                <Button
                  variant="outline"
                  onClick={() => {
                    setTargetStudent(student);
                    setShowDeactivateModal(true);
                  }}
                  className="min-h-[44px] text-xs font-semibold rounded-full border-red-200 text-red-600 hover:bg-red-50"
                >
                  Deactivate
                </Button>
              ) : (
                <Button
                  variant="outline"
                  onClick={() => handleToggleActive(student)}
                  className="min-h-[44px] text-xs font-semibold rounded-full border-green-200 text-[#16A34A] hover:bg-green-50"
                >
                  Reactivate
                </Button>
              )}
            </div>
          </Card>
        ))}
      </div>

      {/* 1. ADD STUDENT MODAL FORM */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 border border-[#DDE3EE] shadow-xl space-y-4">
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
                    className="text-[#5E6C87] hover:text-[#0B1B3F]"
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
                      className="w-full px-3 py-2 text-xs border border-[#DDE3EE] rounded-xl focus:outline-none focus:border-[#0B1B3F]"
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
                      className="w-full px-3 py-2 text-xs border border-[#DDE3EE] rounded-xl focus:outline-none focus:border-[#0B1B3F]"
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
                      className="w-full px-3 py-2 text-xs border border-[#DDE3EE] rounded-xl focus:outline-none focus:border-[#0B1B3F]"
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

      {/* 2. CONFIRM DEACTIVATE MODAL */}
      {showDeactivateModal && targetStudent && (
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
                  <strong className="text-[#0B1B3F]">{targetStudent.name}</strong>? They will be
                  blocked from signing in and scanning attendance.
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 pt-2">
              <Button
                variant="outline"
                onClick={() => {
                  setShowDeactivateModal(false);
                  setTargetStudent(null);
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

      {/* 3. RESET PASSWORD MODAL */}
      {showPasswordModal && resetStudent && (
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
                className="w-full px-3 py-2 text-xs border border-[#DDE3EE] rounded-xl focus:outline-none focus:border-[#0B1B3F]"
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
