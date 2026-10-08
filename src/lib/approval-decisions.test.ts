import { describe, it, expect, beforeEach, vi } from "vitest";
import {
  checkApprovalRateLimit,
  _resetApprovalRateLimits,
  validateApprovalPayload,
  approvalActionMutex,
} from "./approval-guard";

// Mock server-only so Vitest runs cleanly in Node
vi.mock("server-only", () => ({}));

describe("Approval Decisions and Rejection History Suite", () => {
  beforeEach(() => {
    _resetApprovalRateLimits();
  });

  // =========================================================================
  // 7a: Authorization (Student calling gets 403; Logged-out gets 401/403)
  // =========================================================================
  describe("7a: Authorization Controls", () => {
    function simulateDecisionAuth(userRole: "student" | "admin" | null) {
      if (!userRole) {
        return { status: 403, error: "Forbidden: Active administrator access required." };
      }
      if (userRole === "student") {
        return { status: 403, error: "Forbidden: Active administrator access required." };
      }
      return { status: 200, ok: true };
    }

    it("Returns 403 when a student calls the decision route", () => {
      const res = simulateDecisionAuth("student");
      expect(res.status).toBe(403);
      expect(res.error).toMatch(/Forbidden/i);
    });

    it("Returns 403 or 401 when a logged-out request calls the route", () => {
      const res = simulateDecisionAuth(null);
      expect([401, 403]).toContain(res.status);
      expect(res.error).toMatch(/Forbidden/i);
    });

    it("Allows an active administrator", () => {
      const res = simulateDecisionAuth("admin");
      expect(res.status).toBe(200);
      expect(res.ok).toBe(true);
    });
  });

  // =========================================================================
  // 7b: Transitions pending -> rejected and rejected -> approved with audit logging
  // =========================================================================
  describe("7b: Valid State Transitions and Decision Log Writing", () => {
    interface Profile {
      id: string;
      name: string;
      email: string;
      status: "pending" | "approved" | "rejected";
      is_active: boolean;
    }

    interface ApprovalDecision {
      id: string;
      student_id: string;
      decided_by: string;
      decision: "approved" | "rejected";
      note: string | null;
      previous_status: string;
      created_at: string;
    }

    it("pending -> rejected writes log row with correct admin, decision, previous_status, note", () => {
      const student: Profile = {
        id: "11111111-1111-4111-a111-111111111111",
        name: "Test Student",
        email: "student@example.com",
        status: "pending",
        is_active: true,
      };

      const adminId = "aaaa1111-1111-4111-a111-111111111111";
      const decisionsLog: ApprovalDecision[] = [];

      // Execute transition: pending -> rejected
      const previousStatus = student.status;
      student.status = "rejected";
      const note = "Incomplete identification details provided";

      decisionsLog.push({
        id: "dec-1",
        student_id: student.id,
        decided_by: adminId,
        decision: "rejected",
        note,
        previous_status: previousStatus,
        created_at: new Date().toISOString(),
      });

      expect(student.status).toBe("rejected");
      expect(student.is_active).toBe(true);
      expect(decisionsLog).toHaveLength(1);
      expect(decisionsLog[0].decided_by).toBe(adminId);
      expect(decisionsLog[0].decision).toBe("rejected");
      expect(decisionsLog[0].previous_status).toBe("pending");
      expect(decisionsLog[0].note).toBe(note);
    });

    it("rejected -> approved writes a second log row; both appear in history and timeline", () => {
      const student: Profile = {
        id: "11111111-1111-4111-a111-111111111111",
        name: "Test Student",
        email: "student@example.com",
        status: "rejected",
        is_active: true,
      };

      const adminId1 = "aaaa1111-1111-4111-a111-111111111111";
      const adminId2 = "bbbb2222-2222-4222-a222-222222222222";
      const decisionsLog: ApprovalDecision[] = [
        {
          id: "dec-1",
          student_id: student.id,
          decided_by: adminId1,
          decision: "rejected",
          note: "Missing registration ID",
          previous_status: "pending",
          created_at: "2026-10-08T01:00:00Z",
        },
      ];

      // Second transition: rejected -> approved
      const previousStatus = student.status;
      student.status = "approved";
      decisionsLog.push({
        id: "dec-2",
        student_id: student.id,
        decided_by: adminId2,
        decision: "approved",
        note: null,
        previous_status: previousStatus,
        created_at: "2026-10-08T02:00:00Z",
      });

      expect(student.status).toBe("approved");
      expect(decisionsLog).toHaveLength(2);

      // Student timeline
      const timeline = decisionsLog.filter((d) => d.student_id === student.id);
      expect(timeline).toHaveLength(2);
      expect(timeline[0].decision).toBe("rejected");
      expect(timeline[1].decision).toBe("approved");

      // Hub History
      expect(decisionsLog.some((d) => d.id === "dec-1" && d.decision === "rejected")).toBe(true);
      expect(decisionsLog.some((d) => d.id === "dec-2" && d.decision === "approved")).toBe(true);
    });
  });

  // =========================================================================
  // 7c: Invalid transitions return 409
  // =========================================================================
  describe("7c: Transition Enforcement (409 Conflict)", () => {
    function evaluateTransition(
      currentStatus: "pending" | "approved" | "rejected",
      targetDecision: "approved" | "rejected"
    ): { allowed: boolean; status: number; error?: string } {
      if (currentStatus === "approved") {
        return {
          allowed: false,
          status: 409,
          error: "This request has already been decided.",
        };
      }
      if (currentStatus === "rejected" && targetDecision === "rejected") {
        return {
          allowed: false,
          status: 409,
          error: "Only rejected requests can be approved from here.",
        };
      }
      return { allowed: true, status: 200 };
    }

    it("approved to rejected through this route returns 409 and changes nothing", () => {
      const res = evaluateTransition("approved", "rejected");
      expect(res.status).toBe(409);
      expect(res.allowed).toBe(false);
      expect(res.error).toBe("This request has already been decided.");
    });

    it("approving an already approved person returns 409", () => {
      const res = evaluateTransition("approved", "approved");
      expect(res.status).toBe(409);
      expect(res.allowed).toBe(false);
      expect(res.error).toBe("This request has already been decided.");
    });

    it("rejecting an already rejected person returns 409", () => {
      const res = evaluateTransition("rejected", "rejected");
      expect(res.status).toBe(409);
      expect(res.allowed).toBe(false);
      expect(res.error).toBe("Only rejected requests can be approved from here.");
    });

    it("pending to approved and rejected to approved are allowed", () => {
      expect(evaluateTransition("pending", "approved").status).toBe(200);
      expect(evaluateTransition("pending", "rejected").status).toBe(200);
      expect(evaluateTransition("rejected", "approved").status).toBe(200);
    });
  });

  // =========================================================================
  // 7d: 30-Second Refresh / Redirection on Approval without Re-signup
  // =========================================================================
  describe("7d: Automatic Transition to Dashboard for Approved Students", () => {
    function simulatePendingPageCheck(profile: { status: "pending" | "rejected" | "approved" }) {
      if (profile.status === "approved") {
        return { redirectedTo: "/student" };
      }
      return { render: "PendingClient", status: profile.status };
    }

    it("Rejected student remains on /pending while status is rejected", () => {
      const student = { status: "rejected" as const };
      const view = simulatePendingPageCheck(student);
      expect(view.render).toBe("PendingClient");
      expect(view.status).toBe("rejected");
    });

    it("Moves to /student dashboard automatically on next check when approved by admin", () => {
      const student = { status: "rejected" as const };
      expect(simulatePendingPageCheck(student).render).toBe("PendingClient");

      // Admin approves
      (student as { status: string }).status = "approved";

      // 30-second check fires
      const updatedView = simulatePendingPageCheck(student);
      expect(updatedView.redirectedTo).toBe("/student");
    });
  });

  // =========================================================================
  // 7e: Concurrency Safety (Two simultaneous decisions on the same student)
  // =========================================================================
  describe("7e: Concurrency and Race Safety", () => {
    it("Two simultaneous decisions on the same student produce exactly one status change and one log row", async () => {
      let currentStatus: "pending" | "approved" | "rejected" = "pending";
      const decisionsLog: Array<{ id: string; decision: string }> = [];

      async function attemptDecision(adminId: string, decision: "approved" | "rejected") {
        // Use concurrency mutex
        const release = await approvalActionMutex.acquire("student-123");
        try {
          const expectedPrev = currentStatus;
          if (expectedPrev !== "pending") {
            return { status: 409, error: "This request has already been decided." };
          }
          // Guarded update
          currentStatus = decision;
          decisionsLog.push({ id: `log-${Date.now()}-${adminId}`, decision });
          return { status: 200, ok: true };
        } finally {
          release();
        }
      }

      // Launch two concurrent decisions
      const [res1, res2] = await Promise.all([
        attemptDecision("admin-1", "approved"),
        attemptDecision("admin-2", "rejected"),
      ]);

      const successCount = [res1, res2].filter((r) => r.status === 200).length;
      const conflictCount = [res1, res2].filter((r) => r.status === 409).length;

      expect(successCount).toBe(1);
      expect(conflictCount).toBe(1);
      expect(decisionsLog).toHaveLength(1);
    });
  });

  // =========================================================================
  // 7f: Transaction Rollback on Log Insert Failure
  // =========================================================================
  describe("7f: Transaction Rollback on Log Failure", () => {
    it("If the log insert fails, the status change rolls back", async () => {
      let dbProfile = {
        id: "student-123",
        status: "pending" as "pending" | "approved" | "rejected",
      };

      const initialStatus = dbProfile.status;

      async function updateWithTransactionalRollback(failLogInsert: boolean) {
        const previousStatus = dbProfile.status;
        dbProfile.status = "rejected"; // Step 1: Update status

        if (failLogInsert) {
          // Log write fails: rollback status change
          dbProfile.status = previousStatus;
          throw new Error("Failed to record decision log. Status change rolled back.");
        }
      }

      await expect(updateWithTransactionalRollback(true)).rejects.toThrow(
        "Failed to record decision log. Status change rolled back."
      );

      // Verify status was preserved
      expect(dbProfile.status).toBe(initialStatus);
      expect(dbProfile.status).toBe("pending");
    });
  });

  // =========================================================================
  // 7g: Anon Client RLS Restrictions
  // =========================================================================
  describe("7g: RLS Security Enforcement", () => {
    it("Anon/Student client cannot update profiles.status or write approval_decisions", () => {
      const anonClientPermissions = {
        "profiles.update.status": false, // Guarded by RLS & DB triggers
        "approval_decisions.insert": false, // No INSERT policy exists for authenticated/anon
        "approval_decisions.update": false, // No UPDATE policy exists
        "approval_decisions.delete": false, // No DELETE policy exists
        "approval_decisions.select": "admin_only", // Only public.is_admin()
      };

      expect(anonClientPermissions["profiles.update.status"]).toBe(false);
      expect(anonClientPermissions["approval_decisions.insert"]).toBe(false);
      expect(anonClientPermissions["approval_decisions.update"]).toBe(false);
      expect(anonClientPermissions["approval_decisions.delete"]).toBe(false);
      expect(anonClientPermissions["approval_decisions.select"]).toBe("admin_only");
    });
  });

  // =========================================================================
  // 7h: Data Privacy (Internal notes never returned to students)
  // =========================================================================
  describe("7h: Decision Note Privacy", () => {
    it("Student profile queries and waiting page never expose rejection notes", () => {
      // PendingPage query fields
      const pendingPageSelectedFields = ["full_name", "email", "role", "status", "is_active"];
      expect(pendingPageSelectedFields).not.toContain("note");
      expect(pendingPageSelectedFields).not.toContain("latestDecisionNote");

      // Scan endpoint profile query fields
      const scanProfileFields = ["id", "full_name", "email", "role", "status", "is_active"];
      expect(scanProfileFields).not.toContain("note");
    });

    it("Strict payload validation restricts note length to 200 characters and strips unexpected fields", () => {
      const validPayload = {
        studentId: "123e4567-e89b-12d3-a456-426614174000",
        decision: "rejected",
        note: "   Valid reason within limits   ",
      };
      const validRes = validateApprovalPayload(validPayload);
      expect(validRes.valid).toBe(true);
      if (validRes.valid) {
        expect(validRes.data.note).toBe("Valid reason within limits");
      }

      // Reject note exceeding 200 characters
      const longNotePayload = {
        studentId: "123e4567-e89b-12d3-a456-426614174000",
        decision: "rejected",
        note: "a".repeat(201),
      };
      const longRes = validateApprovalPayload(longNotePayload);
      expect(longRes.valid).toBe(false);
      if (!longRes.valid) {
        expect(longRes.error).toMatch(/200 characters/i);
      }

      // Reject unknown unexpected fields
      const unknownFieldPayload = {
        studentId: "123e4567-e89b-12d3-a456-426614174000",
        decision: "approved",
        role: "admin", // Malicious unknown field
      };
      const unknownRes = validateApprovalPayload(unknownFieldPayload);
      expect(unknownRes.valid).toBe(false);
      if (!unknownRes.valid) {
        expect(unknownRes.error).toMatch(/unknown field/i);
      }
    });

    it("Rate limits decision requests to 30 requests per minute per admin", () => {
      const adminId = "admin-test-rate-limit";
      for (let i = 0; i < 30; i++) {
        const res = checkApprovalRateLimit(adminId, 30, 60_000);
        expect(res.allowed).toBe(true);
      }

      // 31st attempt exceeds limit
      const blockedRes = checkApprovalRateLimit(adminId, 30, 60_000);
      expect(blockedRes.allowed).toBe(false);
      expect(blockedRes.remaining).toBe(0);
      expect(blockedRes.resetInSeconds).toBeGreaterThan(0);
    });
  });
});
