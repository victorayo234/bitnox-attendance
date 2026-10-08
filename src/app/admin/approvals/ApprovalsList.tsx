"use client";

import React, { useState, useTransition } from "react";
import { approveStudent, rejectStudent } from "../actions";
import { Button, Card, CardContent, Badge } from "@/components";
import { Check, X, Clock, User, Mail, AlertCircle, CheckCircle2 } from "lucide-react";
import { Profile } from "@/types";

export function ApprovalsList({ initialPending }: { initialPending: Profile[] }) {
  const [students, setStudents] = useState<Profile[]>(initialPending);
  const [feedback, setFeedback] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [loadingId, setLoadingId] = useState<string | null>(null);
  const [, startTransition] = useTransition();

  async function handleApprove(id: string, name: string) {
    setLoadingId(id);
    setFeedback(null);
    startTransition(async () => {
      try {
        await approveStudent(id);
        setStudents((prev) => prev.filter((s) => s.id !== id));
        setFeedback({
          type: "success",
          text: `Approved enrollment for ${name}. They can now sign in and record attendance.`,
        });
      } catch (err: unknown) {
        setFeedback({
          type: "error",
          text: err instanceof Error ? err.message : "Failed to approve student.",
        });
      } finally {
        setLoadingId(null);
      }
    });
  }

  async function handleReject(id: string, name: string) {
    setLoadingId(id);
    setFeedback(null);
    startTransition(async () => {
      try {
        await rejectStudent(id);
        setStudents((prev) => prev.filter((s) => s.id !== id));
        setFeedback({
          type: "success",
          text: `Enrollment for ${name} has been rejected.`,
        });
      } catch (err: unknown) {
        setFeedback({
          type: "error",
          text: err instanceof Error ? err.message : "Failed to reject student.",
        });
      } finally {
        setLoadingId(null);
      }
    });
  }

  return (
    <div className="space-y-4">
      {feedback && (
        <div
          className={`flex items-start gap-2.5 rounded-lg border p-3.5 text-xs animate-in fade-in-50 ${
            feedback.type === "success"
              ? "border-[#16A34A]/30 bg-[#16A34A]/10 text-[#16A34A]"
              : "border-[#EF4444]/30 bg-[#EF4444]/10 text-[#EF4444]"
          }`}
        >
          {feedback.type === "success" ? (
            <CheckCircle2 className="h-4 w-4 shrink-0 mt-0.5" />
          ) : (
            <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
          )}
          <p className="font-medium leading-tight">{feedback.text}</p>
        </div>
      )}

      {students.length === 0 ? (
        <div className="rounded-[12px] bg-white border border-[#DDE3EE] p-8 text-center flex flex-col items-center justify-center space-y-2 shadow-[0_1px_2px_rgba(11,27,63,0.04)]">
          <Clock className="w-5 h-5 text-[#5E6C87]" />
          <p className="text-sm text-[#5E6C87]">No pending student approvals.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {students.map((student) => {
            const isLoading = loadingId === student.id;
            const registeredDate = student.created_at
              ? new Date(student.created_at).toLocaleDateString("en-GB", {
                  day: "numeric",
                  month: "short",
                  year: "numeric",
                })
              : "Recent";

            return (
              <div
                key={student.id}
                className="rounded-[12px] bg-white border border-[#DDE3EE] shadow-[0_1px_2px_rgba(11,27,63,0.04)] p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4"
              >
                <div className="space-y-1.5">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-sm text-[#0B1B3F] flex items-center gap-1.5">
                      <User className="h-4 w-4 text-[#5E6C87]" />
                      {student.full_name}
                    </span>
                    <Badge variant="late" withDot className="text-[11px]">
                      Pending
                    </Badge>
                  </div>

                  <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-[#5E6C87]">
                    <span className="flex items-center gap-1">
                      <Mail className="h-3.5 w-3.5 text-[#5E6C87]/70" />
                      {student.email}
                    </span>
                    <span className="flex items-center gap-1">
                      <Clock className="h-3.5 w-3.5 text-[#5E6C87]/70" />
                      Registered: {registeredDate}
                    </span>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-2 self-end sm:self-auto pt-2 sm:pt-0">
                  <Button
                    variant="danger-ghost"
                    size="sm"
                    disabled={isLoading}
                    onClick={() => handleReject(student.id, student.full_name)}
                    className="h-8 text-[13px] px-3"
                  >
                    <X className="h-3.5 w-3.5 mr-1" />
                    Reject
                  </Button>
                  <Button
                    variant="primary"
                    size="sm"
                    isLoading={isLoading}
                    onClick={() => handleApprove(student.id, student.full_name)}
                    className="h-8 text-[13px] px-3"
                  >
                    <Check className="h-3.5 w-3.5 mr-1" />
                    Approve
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
