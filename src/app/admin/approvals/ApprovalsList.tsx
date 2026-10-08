"use client";

import React, { useState } from "react";
import {
  Check,
  X,
  Clock,
  User,
  Mail,
  AlertCircle,
  CheckCircle2,
  ShieldX,
  History,
  RotateCcw,
  Loader2,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import { Button, Card, Badge } from "@/components";

export interface PendingStudentItem {
  id: string;
  name: string;
  email: string;
  createdAt: string;
  requestedDate: string;
}

export interface DecisionTimelineItem {
  id: string;
  decision: "approved" | "rejected";
  adminName: string;
  note: string | null;
  previousStatus: string | null;
  createdAt: string;
  formattedDateTime: string;
}

export interface RejectedStudentItem {
  id: string;
  name: string;
  email: string;
  requestedDate: string;
  latestDecisionDate: string;
  latestDecisionAdmin: string;
  latestDecisionNote: string | null;
  timeline: DecisionTimelineItem[];
}

export interface DecisionHistoryItem {
  id: string;
  studentId: string;
  studentName: string;
  studentEmail: string;
  adminName: string;
  decision: "approved" | "rejected";
  note: string | null;
  createdAt: string;
  formattedDateTime: string;
}

interface ApprovalsListProps {
  initialPending: PendingStudentItem[];
  initialRejected: RejectedStudentItem[];
  initialHistory: DecisionHistoryItem[];
  currentAdminId: string;
  currentAdminName: string;
}

type TabType = "pending" | "rejected" | "history";
type HistoryFilter = "all" | "approved" | "rejected";

function getInitials(name: string): string {
  if (!name) return "S";
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

export function ApprovalsList({
  initialPending,
  initialRejected,
  initialHistory,
  currentAdminName,
}: ApprovalsListProps) {
  const [activeTab, setActiveTab] = useState<TabType>("pending");
  const [pendingStudents, setPendingStudents] = useState<PendingStudentItem[]>(initialPending);
  const [rejectedStudents, setRejectedStudents] = useState<RejectedStudentItem[]>(initialRejected);
  const [historyList, setHistoryList] = useState<DecisionHistoryItem[]>(initialHistory);

  // History tab sub-filter
  const [historyFilter, setHistoryFilter] = useState<HistoryFilter>("all");

  // Inline expanded history in Rejected tab: studentId -> boolean
  const [expandedTimelines, setExpandedTimelines] = useState<Record<string, boolean>>({});

  // Toast feedback
  const [toast, setToast] = useState<{ type: "success" | "error"; message: string } | null>(null);

  // Loading state for direct actions: studentId -> boolean
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);

  // REJECT MODAL STATE
  const [rejectTarget, setRejectTarget] = useState<PendingStudentItem | null>(null);
  const [rejectNote, setRejectNote] = useState("");
  const [isSubmittingReject, setIsSubmittingReject] = useState(false);
  const [rejectModalError, setRejectModalError] = useState<string | null>(null);

  // APPROVE CONFIRMATION MODAL STATE (for previously rejected student)
  const [approveTarget, setApproveTarget] = useState<RejectedStudentItem | null>(null);
  const [isSubmittingApprove, setIsSubmittingApprove] = useState(false);
  const [approveModalError, setApproveModalError] = useState<string | null>(null);

  const toggleTimeline = (studentId: string) => {
    setExpandedTimelines((prev) => ({
      ...prev,
      [studentId]: !prev[studentId],
    }));
  };

  // Helper to call decision API
  async function submitDecision(
    studentId: string,
    decision: "approved" | "rejected",
    note?: string | null
  ) {
    const res = await fetch("/api/admin/approvals", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        studentId,
        decision,
        ...(note && note.trim() ? { note: note.trim() } : {}),
      }),
    });

    const data = await res.json();
    if (!res.ok || !data.ok) {
      throw new Error(data.error || `Failed to ${decision} student.`);
    }
    return data;
  }

  // Handle direct Approve from Pending tab
  async function handlePendingApprove(student: PendingStudentItem) {
    setActionLoadingId(student.id);
    try {
      await submitDecision(student.id, "approved");

      // Remove from pending
      setPendingStudents((prev) => prev.filter((s) => s.id !== student.id));

      // Prepend to history
      const nowFormatted = new Date().toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
      }) + " at " + new Date().toLocaleTimeString("en-US", {
        hour: "2-digit",
        minute: "2-digit",
      });

      const newHistoryEntry: DecisionHistoryItem = {
        id: "temp-" + Date.now(),
        studentId: student.id,
        studentName: student.name,
        studentEmail: student.email,
        adminName: currentAdminName || "Administrator",
        decision: "approved",
        note: null,
        createdAt: new Date().toISOString(),
        formattedDateTime: nowFormatted,
      };

      setHistoryList((prev) => [newHistoryEntry, ...prev.slice(0, 49)]);

      setToast({
        type: "success",
        message: `${student.name} approved.`,
      });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to approve student.";
      setToast({ type: "error", message: msg });
    } finally {
      setActionLoadingId(null);
    }
  }

  // Handle Reject Submit from Dialog
  async function handleRejectSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!rejectTarget) return;

    setIsSubmittingReject(true);
    setRejectModalError(null);

    try {
      await submitDecision(rejectTarget.id, "rejected", rejectNote);

      const nowFormatted = new Date().toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
      }) + " at " + new Date().toLocaleTimeString("en-US", {
        hour: "2-digit",
        minute: "2-digit",
      });

      const newTimelineItem: DecisionTimelineItem = {
        id: "tl-" + Date.now(),
        decision: "rejected",
        adminName: currentAdminName || "Administrator",
        note: rejectNote.trim() || null,
        previousStatus: "pending",
        createdAt: new Date().toISOString(),
        formattedDateTime: nowFormatted,
      };

      const newRejectedItem: RejectedStudentItem = {
        id: rejectTarget.id,
        name: rejectTarget.name,
        email: rejectTarget.email,
        requestedDate: rejectTarget.requestedDate,
        latestDecisionDate: nowFormatted,
        latestDecisionAdmin: currentAdminName || "Administrator",
        latestDecisionNote: rejectNote.trim() || null,
        timeline: [newTimelineItem],
      };

      // Remove from pending
      setPendingStudents((prev) => prev.filter((s) => s.id !== rejectTarget.id));

      // Add to rejected
      setRejectedStudents((prev) => [newRejectedItem, ...prev]);

      // Add to history
      const newHistoryEntry: DecisionHistoryItem = {
        id: "hist-" + Date.now(),
        studentId: rejectTarget.id,
        studentName: rejectTarget.name,
        studentEmail: rejectTarget.email,
        adminName: currentAdminName || "Administrator",
        decision: "rejected",
        note: rejectNote.trim() || null,
        createdAt: new Date().toISOString(),
        formattedDateTime: nowFormatted,
      };

      setHistoryList((prev) => [newHistoryEntry, ...prev.slice(0, 49)]);

      setToast({
        type: "success",
        message: `${rejectTarget.name} rejected.`,
      });

      setRejectTarget(null);
      setRejectNote("");
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to reject student.";
      setRejectModalError(msg);
    } finally {
      setIsSubmittingReject(false);
    }
  }

  // Handle Approve Submit from Confirmation Dialog (for previously rejected student)
  async function handleApproveRejectedSubmit() {
    if (!approveTarget) return;

    setIsSubmittingApprove(true);
    setApproveModalError(null);

    try {
      await submitDecision(approveTarget.id, "approved");

      // Remove from rejected
      setRejectedStudents((prev) => prev.filter((s) => s.id !== approveTarget.id));

      const nowFormatted = new Date().toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
      }) + " at " + new Date().toLocaleTimeString("en-US", {
        hour: "2-digit",
        minute: "2-digit",
      });

      // Add to history
      const newHistoryEntry: DecisionHistoryItem = {
        id: "hist-" + Date.now(),
        studentId: approveTarget.id,
        studentName: approveTarget.name,
        studentEmail: approveTarget.email,
        adminName: currentAdminName || "Administrator",
        decision: "approved",
        note: null,
        createdAt: new Date().toISOString(),
        formattedDateTime: nowFormatted,
      };

      setHistoryList((prev) => [newHistoryEntry, ...prev.slice(0, 49)]);

      setToast({
        type: "success",
        message: `${approveTarget.name} approved.`,
      });

      setApproveTarget(null);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to approve student.";
      setApproveModalError(msg);
    } finally {
      setIsSubmittingApprove(false);
    }
  }

  // Filter history
  const filteredHistory = historyList.filter((item) => {
    if (historyFilter === "approved") return item.decision === "approved";
    if (historyFilter === "rejected") return item.decision === "rejected";
    return true;
  });

  return (
    <div className="space-y-6">
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
            <AlertCircle className="w-5 h-5 text-[#EF4444] shrink-0 mt-0.5" />
          )}
          <div className="flex-1 text-xs font-medium leading-relaxed">{toast.message}</div>
          <button
            type="button"
            onClick={() => setToast(null)}
            className="text-[#5E6C87] hover:text-[#0B1B3F] cursor-pointer"
            aria-label="Dismiss toast"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Tabs Segmented Control */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="bg-[#F1F4FB] p-1 rounded-lg border border-[#DDE3EE] inline-flex items-center text-xs">
          <button
            type="button"
            onClick={() => setActiveTab("pending")}
            className={`px-3 py-1.5 font-semibold rounded-md transition-all cursor-pointer whitespace-nowrap ${
              activeTab === "pending"
                ? "bg-white text-[#0B1B3F] border border-[#DDE3EE] shadow-[0_1px_2px_rgba(11,27,63,0.04)]"
                : "text-[#5E6C87] hover:text-[#0B1B3F] font-medium"
            }`}
          >
            Pending ({pendingStudents.length})
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("rejected")}
            className={`px-3 py-1.5 font-semibold rounded-md transition-all cursor-pointer whitespace-nowrap ${
              activeTab === "rejected"
                ? "bg-white text-[#0B1B3F] border border-[#DDE3EE] shadow-[0_1px_2px_rgba(11,27,63,0.04)]"
                : "text-[#5E6C87] hover:text-[#0B1B3F] font-medium"
            }`}
          >
            Rejected ({rejectedStudents.length})
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("history")}
            className={`px-3 py-1.5 font-semibold rounded-md transition-all cursor-pointer whitespace-nowrap ${
              activeTab === "history"
                ? "bg-white text-[#0B1B3F] border border-[#DDE3EE] shadow-[0_1px_2px_rgba(11,27,63,0.04)]"
                : "text-[#5E6C87] hover:text-[#0B1B3F] font-medium"
            }`}
          >
            History
          </button>
        </div>

        {/* History sub-filter when history tab is active */}
        {activeTab === "history" && (
          <div className="bg-[#F1F4FB] p-1 rounded-lg border border-[#DDE3EE] inline-flex items-center text-xs">
            <button
              type="button"
              onClick={() => setHistoryFilter("all")}
              className={`px-2.5 py-1 font-medium rounded transition-all cursor-pointer whitespace-nowrap ${
                historyFilter === "all"
                  ? "bg-white text-[#0B1B3F] font-semibold border border-[#DDE3EE] shadow-[0_1px_2px_rgba(11,27,63,0.04)]"
                  : "text-[#5E6C87] hover:text-[#0B1B3F]"
              }`}
            >
              All
            </button>
            <button
              type="button"
              onClick={() => setHistoryFilter("approved")}
              className={`px-2.5 py-1 font-medium rounded transition-all cursor-pointer whitespace-nowrap ${
                historyFilter === "approved"
                  ? "bg-white text-[#0B1B3F] font-semibold border border-[#DDE3EE] shadow-[0_1px_2px_rgba(11,27,63,0.04)]"
                  : "text-[#5E6C87] hover:text-[#0B1B3F]"
              }`}
            >
              Approved
            </button>
            <button
              type="button"
              onClick={() => setHistoryFilter("rejected")}
              className={`px-2.5 py-1 font-medium rounded transition-all cursor-pointer whitespace-nowrap ${
                historyFilter === "rejected"
                  ? "bg-white text-[#0B1B3F] font-semibold border border-[#DDE3EE] shadow-[0_1px_2px_rgba(11,27,63,0.04)]"
                  : "text-[#5E6C87] hover:text-[#0B1B3F]"
              }`}
            >
              Rejected
            </button>
          </div>
        )}
      </div>

      {/* TAB 1: PENDING */}
      {activeTab === "pending" && (
        <div className="space-y-3">
          {pendingStudents.length === 0 ? (
            <Card className="rounded-[12px] bg-white border border-[#DDE3EE] p-12 text-center flex flex-col items-center justify-center space-y-2 shadow-[0_1px_2px_rgba(11,27,63,0.04)]">
              <Clock className="w-6 h-6 text-[#5E6C87]/60" />
              <p className="text-sm text-[#5E6C87]">No pending student approvals.</p>
            </Card>
          ) : (
            pendingStudents.map((student) => {
              const isLoading = actionLoadingId === student.id;
              const initials = getInitials(student.name);

              return (
                <Card
                  key={student.id}
                  className="rounded-[12px] bg-white border border-[#DDE3EE] shadow-[0_1px_2px_rgba(11,27,63,0.04)] p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                >
                  <div className="flex items-start gap-3 min-w-0">
                    <div className="w-9 h-9 rounded-full bg-[#E8ECF6] text-[#0B1B3F] font-semibold text-xs flex items-center justify-center shrink-0 select-none">
                      {initials}
                    </div>
                    <div className="space-y-1 min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-semibold text-sm text-[#0B1B3F] truncate">
                          {student.name}
                        </span>
                        <Badge variant="late" withDot className="text-[11px] whitespace-nowrap">
                          Pending
                        </Badge>
                      </div>

                      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-[#5E6C87]">
                        <span className="flex items-center gap-1 truncate">
                          <Mail className="h-3.5 w-3.5 text-[#5E6C87]/70 shrink-0" />
                          <span className="truncate">{student.email}</span>
                        </span>
                        <span className="flex items-center gap-1 whitespace-nowrap">
                          <Clock className="h-3.5 w-3.5 text-[#5E6C87]/70 shrink-0" />
                          Requested {student.requestedDate}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Actions: on desktop compact inline, on mobile full-width row >= 44px */}
                  <div className="flex items-center gap-2 w-full sm:w-auto pt-2 sm:pt-0 border-t border-[#DDE3EE]/60 sm:border-0">
                    <Button
                      variant="danger-ghost"
                      size="sm"
                      disabled={isLoading}
                      onClick={() => {
                        setRejectTarget(student);
                        setRejectNote("");
                        setRejectModalError(null);
                      }}
                      className="flex-1 sm:flex-initial h-[44px] sm:h-9 text-[13px] px-3 whitespace-nowrap justify-center"
                    >
                      <X className="h-3.5 w-3.5 mr-1" />
                      Reject
                    </Button>
                    <Button
                      variant="primary"
                      size="sm"
                      isLoading={isLoading}
                      disabled={isLoading}
                      onClick={() => handlePendingApprove(student)}
                      className="flex-1 sm:flex-initial h-[44px] sm:h-9 text-[13px] px-3 whitespace-nowrap justify-center"
                    >
                      <Check className="h-3.5 w-3.5 mr-1" />
                      Approve
                    </Button>
                  </div>
                </Card>
              );
            })
          )}
        </div>
      )}

      {/* TAB 2: REJECTED */}
      {activeTab === "rejected" && (
        <div className="space-y-3">
          {rejectedStudents.length === 0 ? (
            <Card className="rounded-[12px] bg-white border border-[#DDE3EE] p-12 text-center flex flex-col items-center justify-center space-y-2 shadow-[0_1px_2px_rgba(11,27,63,0.04)]">
              <ShieldX className="w-6 h-6 text-[#5E6C87]/60" />
              <p className="text-sm text-[#5E6C87]">No rejected sign-ups.</p>
            </Card>
          ) : (
            rejectedStudents.map((student) => {
              const isExpanded = !!expandedTimelines[student.id];
              const initials = getInitials(student.name);

              return (
                <Card
                  key={student.id}
                  className="rounded-[12px] bg-white border border-[#DDE3EE] shadow-[0_1px_2px_rgba(11,27,63,0.04)] overflow-hidden"
                >
                  <div className="p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div className="flex items-start gap-3 min-w-0">
                      <div className="w-9 h-9 rounded-full bg-[#FEF2F2] text-[#EF4444] font-semibold text-xs flex items-center justify-center shrink-0 select-none">
                        {initials}
                      </div>
                      <div className="space-y-1.5 min-w-0 flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-semibold text-sm text-[#0B1B3F] truncate">
                            {student.name}
                          </span>
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-medium bg-[#FEF2F2] text-[#DC2626] border border-[#FECACA] whitespace-nowrap">
                            <span className="w-1.5 h-1.5 rounded-full bg-[#DC2626]" />
                            Rejected
                          </span>
                        </div>

                        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-[#5E6C87]">
                          <span className="flex items-center gap-1 truncate">
                            <Mail className="h-3.5 w-3.5 text-[#5E6C87]/70 shrink-0" />
                            <span className="truncate">{student.email}</span>
                          </span>
                          <span className="whitespace-nowrap">
                            Requested {student.requestedDate}
                          </span>
                        </div>

                        {/* Rejection Details */}
                        <div className="text-xs text-[#5E6C87] pt-0.5 space-y-1">
                          <p>
                            {student.latestDecisionAdmin === "before logging began" ? (
                              <>Rejected {student.latestDecisionDate} (before logging began)</>
                            ) : (
                              <>
                                Rejected {student.latestDecisionDate} by{" "}
                                <span className="font-medium text-[#0B1B3F]">
                                  {student.latestDecisionAdmin}
                                </span>
                              </>
                            )}
                          </p>
                          {student.latestDecisionNote && (
                            <p className="text-xs text-[#5E6C87] bg-[#F1F4FB] px-2.5 py-1.5 rounded border border-[#DDE3EE]/60 inline-block max-w-full break-words">
                              Note: {student.latestDecisionNote}
                            </p>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-2 w-full sm:w-auto pt-2 sm:pt-0 border-t border-[#DDE3EE]/60 sm:border-0">
                      {student.timeline && student.timeline.length > 0 && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => toggleTimeline(student.id)}
                          className="flex-1 sm:flex-initial h-[44px] sm:h-9 text-[13px] px-3 whitespace-nowrap justify-center"
                          title="View Decision History"
                        >
                          <History className="h-3.5 w-3.5 mr-1" />
                          History
                          {isExpanded ? (
                            <ChevronUp className="h-3.5 w-3.5 ml-1" />
                          ) : (
                            <ChevronDown className="h-3.5 w-3.5 ml-1" />
                          )}
                        </Button>
                      )}

                      <Button
                        variant="primary"
                        size="sm"
                        onClick={() => {
                          setApproveTarget(student);
                          setApproveModalError(null);
                        }}
                        className="flex-1 sm:flex-initial h-[44px] sm:h-9 text-[13px] px-3 whitespace-nowrap justify-center"
                      >
                        <Check className="h-3.5 w-3.5 mr-1" />
                        Approve
                      </Button>
                    </div>
                  </div>

                  {/* Inline Timeline Accordion */}
                  {isExpanded && student.timeline && student.timeline.length > 0 && (
                    <div className="border-t border-[#DDE3EE] bg-[#FAFCFF] p-4 sm:px-6">
                      <div className="text-xs font-semibold text-[#0B1B3F] mb-3 flex items-center gap-1.5">
                        <History className="h-3.5 w-3.5 text-[#5E6C87]" />
                        <span>Decision Timeline for {student.name}</span>
                      </div>
                      <div className="relative pl-4 border-l-2 border-[#DDE3EE] space-y-4 text-xs">
                        {student.timeline.map((item, idx) => (
                          <div key={item.id || idx} className="relative">
                            <span
                              className={`absolute -left-[21px] top-1 w-2.5 h-2.5 rounded-full ${
                                item.decision === "approved" ? "bg-[#16A34A]" : "bg-[#EF4444]"
                              }`}
                            />
                              <div className="space-y-0.5">
                              <p className="font-medium text-[#0B1B3F]">
                                {item.decision === "approved" ? "Approved" : "Rejected"}{" "}
                                {item.adminName === "before logging began"
                                  ? "(before logging began)"
                                  : `by ${item.adminName}`}
                              </p>
                              <p className="text-[#5E6C87] text-[11px]">{item.formattedDateTime}</p>
                              {item.note && (
                                <p className="text-[#5E6C87] bg-white px-2.5 py-1 rounded border border-[#DDE3EE] mt-1 inline-block">
                                  {item.note}
                                </p>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </Card>
              );
            })
          )}
        </div>
      )}

      {/* TAB 3: HISTORY */}
      {activeTab === "history" && (
        <div className="space-y-3">
          {filteredHistory.length === 0 ? (
            <Card className="rounded-[12px] bg-white border border-[#DDE3EE] p-12 text-center flex flex-col items-center justify-center space-y-2 shadow-[0_1px_2px_rgba(11,27,63,0.04)]">
              <History className="w-6 h-6 text-[#5E6C87]/60" />
              <p className="text-sm text-[#5E6C87]">No decisions yet.</p>
            </Card>
          ) : (
            <Card className="rounded-[12px] bg-white border border-[#DDE3EE] shadow-[0_1px_2px_rgba(11,27,63,0.04)] overflow-hidden divide-y divide-[#DDE3EE]/60">
              {filteredHistory.map((item) => (
                <div
                  key={item.id}
                  className="p-4 sm:px-5 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 text-xs hover:bg-[#FAFCFF] transition-colors"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-semibold text-[#0B1B3F]">
                        {item.adminName === "before logging began"
                          ? "Decision recorded before logging began:"
                          : item.adminName}
                      </span>
                      <span
                        className={`inline-flex items-center px-2 py-0.5 rounded text-[11px] font-medium whitespace-nowrap ${
                          item.decision === "approved"
                            ? "bg-[#ECFDF5] text-[#16A34A] border border-[#A7F3D0]"
                            : "bg-[#FEF2F2] text-[#DC2626] border border-[#FECACA]"
                        }`}
                      >
                        {item.decision === "approved" ? "Approved" : "Rejected"}
                      </span>
                      <span className="font-semibold text-[#0B1B3F]">
                        {item.studentName}
                      </span>
                      <span className="text-[#5E6C87]">({item.studentEmail})</span>
                    </div>

                    {item.note && (
                      <p className="text-xs text-[#5E6C87] bg-[#F1F4FB] px-2.5 py-1 rounded border border-[#DDE3EE]/60 inline-block">
                        Note: {item.note}
                      </p>
                    )}
                  </div>

                  <span className="text-xs text-[#5E6C87] shrink-0 whitespace-nowrap">
                    {item.formattedDateTime}
                  </span>
                </div>
              ))}
            </Card>
          )}
        </div>
      )}

      {/* REJECT MODAL DIALOG */}
      {rejectTarget && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs"
          onClick={() => {
            if (!isSubmittingReject) {
              setRejectTarget(null);
              setRejectNote("");
              setRejectModalError(null);
            }
          }}
        >
          <div
            className="bg-white rounded-xl max-w-md w-full p-6 border border-[#DDE3EE] shadow-xl space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-full bg-red-50 text-[#DC2626] border border-red-200 flex items-center justify-center shrink-0">
                <ShieldX className="w-5 h-5" />
              </div>
              <div className="space-y-1">
                <h3 className="text-base font-semibold text-[#0B1B3F]">
                  Reject {rejectTarget.name}?
                </h3>
                <p className="text-xs text-[#5E6C87] leading-relaxed">
                  They will see that their sign-up was not approved. You can approve them later from
                  the Rejected tab.
                </p>
              </div>
            </div>

            <form onSubmit={handleRejectSubmit} className="space-y-3 pt-1">
              <div className="space-y-1.5">
                <div className="flex items-center justify-between text-xs">
                  <label htmlFor="reject-note" className="text-[13px] font-medium text-[#0B1B3F]">
                    Reason (optional, only admins can see this)
                  </label>
                  <span className="text-[#5E6C87] text-[11px]">{rejectNote.length}/200</span>
                </div>
                <textarea
                  id="reject-note"
                  rows={3}
                  maxLength={200}
                  value={rejectNote}
                  onChange={(e) => setRejectNote(e.target.value)}
                  placeholder="Add an internal note..."
                  className="w-full p-2.5 text-xs border border-[#DDE3EE] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0B1B3F] focus:border-[#0B1B3F] text-[#0B1B3F] placeholder:text-[#5E6C87]/70 resize-none shadow-[0_1px_2px_rgba(11,27,63,0.04)]"
                />
              </div>

              {rejectModalError && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-xs text-red-700 font-medium flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
                  <span className="flex-1">{rejectModalError}</span>
                </div>
              )}

              <div className="flex items-center gap-2 pt-2">
                <Button
                  type="button"
                  variant="secondary"
                  disabled={isSubmittingReject}
                  onClick={() => {
                    setRejectTarget(null);
                    setRejectNote("");
                    setRejectModalError(null);
                  }}
                  className="flex-1 h-10 text-sm font-medium"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  variant="danger"
                  isLoading={isSubmittingReject}
                  disabled={isSubmittingReject}
                  className="flex-1 h-10 text-sm font-medium"
                >
                  Reject
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* APPROVE REJECTED CONFIRMATION MODAL */}
      {approveTarget && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs"
          onClick={() => {
            if (!isSubmittingApprove) {
              setApproveTarget(null);
              setApproveModalError(null);
            }
          }}
        >
          <div
            className="bg-white rounded-xl max-w-md w-full p-6 border border-[#DDE3EE] shadow-xl space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-full bg-emerald-50 text-[#16A34A] border border-emerald-200 flex items-center justify-center shrink-0">
                <Check className="w-5 h-5" />
              </div>
              <div className="space-y-1">
                <h3 className="text-base font-semibold text-[#0B1B3F]">
                  Approve {approveTarget.name}?
                </h3>
                <p className="text-xs text-[#5E6C87] leading-relaxed">
                  They were rejected on {approveTarget.latestDecisionDate}. Once approved they can log
                  in and use attendance.
                </p>
              </div>
            </div>

            {approveModalError && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-xs text-red-700 font-medium flex items-start gap-2">
                <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
                <span className="flex-1">{approveModalError}</span>
              </div>
            )}

            <div className="flex items-center gap-2 pt-2">
              <Button
                type="button"
                variant="secondary"
                disabled={isSubmittingApprove}
                onClick={() => {
                  setApproveTarget(null);
                  setApproveModalError(null);
                }}
                className="flex-1 h-10 text-sm font-medium"
              >
                Cancel
              </Button>
              <Button
                type="button"
                variant="primary"
                isLoading={isSubmittingApprove}
                disabled={isSubmittingApprove}
                onClick={handleApproveRejectedSubmit}
                className="flex-1 h-10 text-sm font-medium"
              >
                Approve
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
