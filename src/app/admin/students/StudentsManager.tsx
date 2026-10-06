"use client";

import React, { useState, useTransition } from "react";
import { addStudentAction, type AddStudentResult } from "../actions";
import { Button, Card, CardContent, CardHeader, CardTitle, Badge } from "@/components";
import {
  Shield,
  ShieldCheck,
  ShieldAlert,
  UserPlus,
  User,
  Mail,
  AlertCircle,
  CheckCircle2,
  X,
  UserCheck,
} from "lucide-react";
import { Profile } from "@/types";

interface StudentsManagerProps {
  initialProfiles: Profile[];
  currentUserId: string;
}

export function StudentsManager({ initialProfiles, currentUserId }: StudentsManagerProps) {
  const [profiles, setProfiles] = useState<Profile[]>(initialProfiles);
  const [toast, setToast] = useState<{ type: "success" | "error"; message: string } | null>(null);

  // Modal / Dialog States
  const [showAddModal, setShowAddModal] = useState(false);
  const [addState, setAddState] = useState<AddStudentResult>({});
  const [confirmDialog, setConfirmDialog] = useState<{
    target: Profile;
    targetRole: "admin" | "student";
  } | null>(null);

  const [isPending, startTransition] = useTransition();

  // Handle Role Change via POST /api/admin/students/[id]/role
  async function executeRoleChange() {
    if (!confirmDialog) return;
    const { target, targetRole } = confirmDialog;

    setToast(null);
    startTransition(async () => {
      try {
        const response = await fetch(`/api/admin/students/${target.id}/role`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ role: targetRole }),
        });

        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.error || "Failed to update role");
        }

        // Update local state
        setProfiles((prev) =>
          prev.map((p) => (p.id === target.id ? { ...p, role: targetRole } : p))
        );

        setToast({
          type: "success",
          message:
            targetRole === "admin"
              ? `Successfully made ${target.full_name} an administrator.`
              : `Removed admin access from ${target.full_name}.`,
        });
        setConfirmDialog(null);
      } catch (err: unknown) {
        setToast({
          type: "error",
          message: err instanceof Error ? err.message : "Error executing role change",
        });
      }
    });
  }

  // Handle Add Student form submit
  async function handleAddStudent(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setAddState({});
    const formData = new FormData(e.currentTarget);

    startTransition(async () => {
      const result = await addStudentAction({}, formData);
      if (result.error) {
        setAddState({ error: result.error });
      } else {
        setShowAddModal(false);
        setToast({
          type: "success",
          message: "Student account created and pre-approved successfully!",
        });
        // Reload list via window or revalidation
        window.location.reload();
      }
    });
  }

  return (
    <div className="space-y-6">
      {/* Toast Alert */}
      {toast && (
        <div
          className={`flex items-start justify-between gap-2.5 rounded-xl border p-4 text-xs animate-in fade-in-50 ${
            toast.type === "success"
              ? "border-present/30 bg-present/10 text-[#15803D]"
              : "border-absent/30 bg-absent/10 text-absent"
          }`}
          role="status"
        >
          <div className="flex items-start gap-2">
            {toast.type === "success" ? (
              <CheckCircle2 className="h-4 w-4 shrink-0 mt-0.5" />
            ) : (
              <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
            )}
            <p className="font-semibold leading-tight">{toast.message}</p>
          </div>
          <button
            onClick={() => setToast(null)}
            className="text-muted hover:text-primary"
            aria-label="Dismiss alert"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* Action Bar */}
      <div className="flex items-center justify-between gap-4">
        <div>
          <h2 className="text-base font-bold text-primary">All Accounts</h2>
          <p className="text-xs text-muted">
            Manage student enrollments and administrator privileges
          </p>
        </div>

        <Button
          variant="primary"
          size="sm"
          onClick={() => setShowAddModal(true)}
          leftIcon={<UserPlus className="h-4 w-4" />}
          className="text-xs"
        >
          Add Student
        </Button>
      </div>

      {/* Table / List */}
      <Card className="bg-white shadow-xs overflow-hidden">
        <div className="divide-y divide-border">
          {profiles.map((profile) => {
            const isMe = profile.id === currentUserId;
            const isAdmin = profile.role === "admin";
            const isApproved = profile.status === "approved";

            return (
              <div
                key={profile.id}
                className="p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-soft/40 transition-colors"
              >
                {/* Info */}
                <div className="space-y-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-bold text-sm text-primary flex items-center gap-1.5">
                      <User className="h-4 w-4 text-muted" />
                      {profile.full_name}
                      {isMe && (
                        <span className="text-[11px] font-normal text-muted">(You)</span>
                      )}
                    </span>

                    {/* Role Badge */}
                    {isAdmin ? (
                      <Badge variant="primary" className="text-[10px] py-0.2">
                        <Shield className="h-3 w-3 mr-1" />
                        Admin
                      </Badge>
                    ) : (
                      <Badge variant="neutral" className="text-[10px] py-0.2">
                        Student
                      </Badge>
                    )}

                    {/* Status Badge */}
                    {profile.status === "approved" ? (
                      <Badge variant="present" withDot className="text-[10px] py-0.2">
                        Approved
                      </Badge>
                    ) : profile.status === "pending" ? (
                      <Badge variant="late" withDot className="text-[10px] py-0.2">
                        Pending
                      </Badge>
                    ) : (
                      <Badge variant="absent" withDot className="text-[10px] py-0.2">
                        Rejected
                      </Badge>
                    )}
                  </div>

                  <p className="text-xs text-muted flex items-center gap-1.5">
                    <Mail className="h-3 w-3 text-muted/70" />
                    {profile.email}
                  </p>
                </div>

                {/* Role Actions */}
                <div className="flex items-center gap-2 self-end sm:self-auto pt-2 sm:pt-0">
                  {isAdmin ? (
                    isMe ? (
                      <span className="text-xs text-muted italic">Owner</span>
                    ) : (
                      <Button
                        variant="outline"
                        size="sm"
                        disabled={isPending}
                        onClick={() =>
                          setConfirmDialog({
                            target: profile,
                            targetRole: "student",
                          })
                        }
                        className="text-xs text-muted hover:text-absent hover:border-absent/30"
                      >
                        Remove admin
                      </Button>
                    )
                  ) : (
                    <Button
                      variant="secondary"
                      size="sm"
                      disabled={!isApproved || isPending}
                      onClick={() =>
                        setConfirmDialog({
                          target: profile,
                          targetRole: "admin",
                        })
                      }
                      title={
                        !isApproved
                          ? "Student must be approved before being promoted to admin"
                          : "Promote student to admin"
                      }
                      className="text-xs text-primary font-medium"
                    >
                      Make admin
                    </Button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </Card>

      {/* Confirmation Dialog */}
      {confirmDialog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs animate-in fade-in-50">
          <Card className="w-full max-w-md bg-white p-6 space-y-4 shadow-xl border border-border">
            <div className="flex items-start gap-3">
              <div
                className={`p-2.5 rounded-full ${
                  confirmDialog.targetRole === "admin"
                    ? "bg-accent/15 text-primary"
                    : "bg-absent/10 text-absent"
                }`}
              >
                {confirmDialog.targetRole === "admin" ? (
                  <ShieldCheck className="h-6 w-6" />
                ) : (
                  <ShieldAlert className="h-6 w-6" />
                )}
              </div>
              <div className="space-y-1">
                <h3 className="text-base font-bold text-primary">
                  {confirmDialog.targetRole === "admin"
                    ? `Promote ${confirmDialog.target.full_name} to Administrator?`
                    : `Demote ${confirmDialog.target.full_name} to Student?`}
                </h3>
                <p className="text-xs text-muted leading-relaxed">
                  {confirmDialog.targetRole === "admin"
                    ? `Give ${confirmDialog.target.full_name} admin access? They will see all students' attendance and can manage accounts and promote others.`
                    : `Remove admin access from ${confirmDialog.target.full_name}? They will no longer have access to the admin console or attendance records.`}
                </p>
              </div>
            </div>

            <div className="pt-2 flex items-center justify-end gap-2 border-t border-border">
              <Button
                variant="outline"
                size="sm"
                disabled={isPending}
                onClick={() => setConfirmDialog(null)}
              >
                Cancel
              </Button>
              <Button
                variant={confirmDialog.targetRole === "admin" ? "primary" : "danger"}
                size="sm"
                isLoading={isPending}
                onClick={executeRoleChange}
              >
                {confirmDialog.targetRole === "admin"
                  ? "Confirm Make Admin"
                  : "Confirm Remove Admin"}
              </Button>
            </div>
          </Card>
        </div>
      )}

      {/* Add Student Modal (Shortcut that creates already-approved students) */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs animate-in fade-in-50">
          <Card className="w-full max-w-md bg-white p-6 space-y-4 shadow-xl border border-border">
            <div className="flex items-center justify-between border-b border-border pb-3">
              <div className="flex items-center gap-2">
                <UserCheck className="h-5 w-5 text-present" />
                <CardTitle className="text-base">Add New Student</CardTitle>
              </div>
              <button
                onClick={() => setShowAddModal(false)}
                className="text-muted hover:text-primary"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <p className="text-xs text-muted">
              Creates an already-approved student account directly into the system.
            </p>

            {addState.error && (
              <div className="p-3 rounded-xl bg-absent/10 border border-absent/30 text-xs text-absent flex items-center gap-2">
                <AlertCircle className="h-4 w-4 shrink-0" />
                <span>{addState.error}</span>
              </div>
            )}

            <form onSubmit={handleAddStudent} className="space-y-3.5">
              <div className="space-y-1">
                <label className="block text-xs font-semibold text-primary">
                  Full Name
                </label>
                <input
                  name="fullName"
                  type="text"
                  required
                  placeholder="e.g. Tunde Bakare"
                  className="w-full rounded-full border border-border bg-white px-4 py-2 text-xs text-primary focus:border-primary focus:outline-none"
                />
              </div>

              <div className="space-y-1">
                <label className="block text-xs font-semibold text-primary">
                  Email Address
                </label>
                <input
                  name="email"
                  type="email"
                  required
                  placeholder="tunde@bitnox.qc"
                  className="w-full rounded-full border border-border bg-white px-4 py-2 text-xs text-primary focus:border-primary focus:outline-none"
                />
              </div>

              <div className="space-y-1">
                <label className="block text-xs font-semibold text-primary">
                  Password (min. 8 characters)
                </label>
                <input
                  name="password"
                  type="password"
                  required
                  minLength={8}
                  placeholder="••••••••"
                  className="w-full rounded-full border border-border bg-white px-4 py-2 text-xs text-primary focus:border-primary focus:outline-none"
                />
              </div>

              <div className="pt-2 flex items-center justify-end gap-2 border-t border-border">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setShowAddModal(false)}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  variant="primary"
                  size="sm"
                  isLoading={isPending}
                >
                  Create & Approve
                </Button>
              </div>
            </form>
          </Card>
        </div>
      )}
    </div>
  );
}
