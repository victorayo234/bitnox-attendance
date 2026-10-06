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
          className={`flex items-start gap-2.5 rounded-xl border p-3.5 text-xs animate-in fade-in-50 ${
            feedback.type === "success"
              ? "border-present/30 bg-present/10 text-[#15803D]"
              : "border-absent/30 bg-absent/10 text-absent"
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
        <Card className="bg-white p-8 text-center space-y-3 shadow-xs">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-soft text-muted">
            <Check className="h-6 w-6 text-present" />
          </div>
          <div className="space-y-1">
            <h3 className="text-base font-bold text-primary">All Caught Up!</h3>
            <p className="text-xs text-muted max-w-sm mx-auto">
              There are currently no student enrollments waiting for review. New self-registrations will show up here.
            </p>
          </div>
        </Card>
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
              <Card key={student.id} className="bg-white shadow-xs overflow-hidden">
                <CardContent className="p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="space-y-1.5">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-sm text-primary flex items-center gap-1.5">
                        <User className="h-4 w-4 text-muted" />
                        {student.full_name}
                      </span>
                      <Badge variant="late" withDot className="text-[10px] py-0.2">
                        Pending
                      </Badge>
                    </div>

                    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted">
                      <span className="flex items-center gap-1">
                        <Mail className="h-3.5 w-3.5 text-muted/70" />
                        {student.email}
                      </span>
                      <span className="flex items-center gap-1">
                        <Clock className="h-3.5 w-3.5 text-muted/70" />
                        Registered: {registeredDate}
                      </span>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-2 self-end sm:self-auto pt-2 sm:pt-0">
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={isLoading}
                      onClick={() => handleReject(student.id, student.full_name)}
                      leftIcon={<X className="h-3.5 w-3.5 text-absent" />}
                      className="text-absent hover:bg-absent/10 border-border hover:border-absent/30 text-xs"
                    >
                      Reject
                    </Button>
                    <Button
                      variant="primary"
                      size="sm"
                      isLoading={isLoading}
                      onClick={() => handleApprove(student.id, student.full_name)}
                      leftIcon={<Check className="h-3.5 w-3.5" />}
                      className="bg-present hover:bg-[#15803D] text-white text-xs shadow-xs"
                    >
                      Approve
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
