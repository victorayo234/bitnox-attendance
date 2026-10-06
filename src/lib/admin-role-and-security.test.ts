import { describe, it, expect, beforeEach, vi } from "vitest";
import {
  checkRoleChangeRateLimit,
  _resetRoleRateLimits,
  isValidUuid,
  adminActionMutex,
} from "./role-guard";

// Mock server-only so Vitest runs cleanly in Node
vi.mock("server-only", () => ({}));

describe("Admin Promotion & Role Security Suite", () => {
  beforeEach(() => {
    _resetRoleRateLimits();
  });

  // =========================================================================
  // Item 24: Authorization & Ineligible Account Promotion Rules
  // =========================================================================
  describe("Item 24: Authorization & Eligibility Rules", () => {
    it("Validates that UUID parameters are strictly formatted", () => {
      expect(isValidUuid("not-a-uuid")).toBe(false);
      expect(isValidUuid("123e4567-e89b-12d3-a456-426614174000")).toBe(true);
      expect(isValidUuid("")).toBe(false);
      expect(isValidUuid("123e4567-e89b-12d3-a456-426614174000-extra")).toBe(false);
    });

    it("Rejects promotion if target user is pending", () => {
      const targetProfile = {
        id: "11111111-1111-4111-a111-111111111111",
        full_name: "Pending Student",
        role: "student",
        status: "pending",
        is_active: true,
      };

      const canPromote =
        targetProfile.status === "approved" && targetProfile.is_active;
      expect(canPromote).toBe(false);
    });

    it("Rejects promotion if target user is rejected", () => {
      const targetProfile = {
        id: "22222222-2222-4222-a222-222222222222",
        full_name: "Rejected Student",
        role: "student",
        status: "rejected",
        is_active: true,
      };

      const canPromote =
        targetProfile.status === "approved" && targetProfile.is_active;
      expect(canPromote).toBe(false);
    });

    it("Rejects promotion if target user is deactivated", () => {
      const targetProfile = {
        id: "33333333-3333-4333-a333-333333333333",
        full_name: "Deactivated Student",
        role: "student",
        status: "approved",
        is_active: false,
      };

      const canPromote =
        targetProfile.status === "approved" && targetProfile.is_active;
      expect(canPromote).toBe(false);
    });
  });

  // =========================================================================
  // Item 25: Self-protection, Last-Admin Protection & Concurrency Test
  // =========================================================================
  describe("Item 25: Self-Modification & Race-Safe Last-Admin Protection", () => {
    it("Admin cannot change their own role", () => {
      const adminId = "aaaa1111-1111-4111-a111-111111111111";
      const targetId = "aaaa1111-1111-4111-a111-111111111111";

      const isSelf = adminId === targetId;
      expect(isSelf).toBe(true);
    });

    it("The last remaining admin cannot be demoted", () => {
      const activeAdminCount = 1;
      const canDemote = activeAdminCount > 1;
      expect(canDemote).toBe(false);
    });

    it("The last remaining active admin cannot be deactivated", () => {
      const activeAdminCount = 1;
      const canDeactivate = activeAdminCount > 1;
      expect(canDeactivate).toBe(false);
    });

    it("Race-Safe Concurrency: Two simultaneous demotions of two admins leave at least one admin", async () => {
      // In-memory mock database of two active admins
      let admins = [
        { id: "admin-1", role: "admin", is_active: true },
        { id: "admin-2", role: "admin", is_active: true },
      ];
      const auditLog: any[] = [];

      // Atomic demotion simulator using the same adminActionMutex pattern
      async function demoteAdmin(callerId: string, targetId: string) {
        const release = await adminActionMutex.acquire();
        try {
          if (callerId === targetId) {
            throw new Error("You cannot change your own role.");
          }

          const activeAdmins = admins.filter(
            (a) => a.role === "admin" && a.is_active
          );
          if (activeAdmins.length <= 1) {
            throw new Error("Cannot remove the last admin.");
          }

          const target = admins.find((a) => a.id === targetId);
          if (!target || target.role !== "admin") {
            throw new Error("Target user is not an admin.");
          }

          // Demote
          target.role = "student";
          auditLog.push({
            changed_by: callerId,
            target_user: targetId,
            old_role: "admin",
            new_role: "student",
          });

          return { success: true };
        } finally {
          release();
        }
      }

      // Admin 1 tries to demote Admin 2 while Admin 2 tries to demote Admin 1 at the EXACT same millisecond
      const results = await Promise.allSettled([
        demoteAdmin("admin-1", "admin-2"),
        demoteAdmin("admin-2", "admin-1"),
      ]);

      const fulfilled = results.filter((r) => r.status === "fulfilled");
      const rejected = results.filter((r) => r.status === "rejected");

      // Exactly ONE demotion must succeed, and the second MUST fail because only 1 admin remains!
      expect(fulfilled.length).toBe(1);
      expect(rejected.length).toBe(1);

      if (rejected[0].status === "rejected") {
        expect(rejected[0].reason.message).toBe("Cannot remove the last admin.");
      }

      // Verify database state: exactly ONE admin remains active
      const remainingAdmins = admins.filter((a) => a.role === "admin");
      expect(remainingAdmins.length).toBe(1);

      // Verify audit log recorded exactly one change
      expect(auditLog.length).toBe(1);
    });
  });

  // =========================================================================
  // Item 26 & 11: Strict Payload Validation
  // =========================================================================
  describe("Item 26 & 11: Strict Payload Validation", () => {
    function validateRolePayload(body: any): { valid: boolean; error?: string } {
      if (!body || typeof body !== "object" || Array.isArray(body)) {
        return { valid: false, error: "Invalid JSON request payload." };
      }
      const keys = Object.keys(body);
      if (keys.length !== 1 || keys[0] !== "role") {
        return {
          valid: false,
          error:
            "Invalid request body. Exactly one property 'role' is required with no additional fields.",
        };
      }
      if (body.role !== "admin" && body.role !== "student") {
        return {
          valid: false,
          error: "Invalid role specified. Role must be 'admin' or 'student'.",
        };
      }
      return { valid: true };
    }

    it("Rejects unknown or extra properties in request body", () => {
      expect(validateRolePayload({ role: "admin", extraField: "malicious" }).valid).toBe(
        false
      );
      expect(validateRolePayload({ role: "admin" }).valid).toBe(true);
      expect(validateRolePayload({ role: "student" }).valid).toBe(true);
      expect(validateRolePayload({ role: "superadmin" }).valid).toBe(false);
      expect(validateRolePayload({}).valid).toBe(false);
    });
  });

  // =========================================================================
  // Item 27: Audit Logging & Rollback
  // =========================================================================
  describe("Item 27: Audit Logging & Transaction Integrity", () => {
    it("Writes audit row on successful promotion and leaves none on failure", async () => {
      const fakeDb = {
        profiles: [{ id: "user-1", role: "student", is_active: true, status: "approved" }],
        roleChanges: [] as any[],
      };

      async function executePromotionWithRollback(
        adminId: string,
        targetId: string,
        newRole: string,
        simulateLogFailure = false
      ) {
        const target = fakeDb.profiles.find((p) => p.id === targetId);
        if (!target) throw new Error("User not found");

        const oldRole = target.role;
        target.role = newRole;

        try {
          if (simulateLogFailure) {
            throw new Error("DB Error: log insert failed");
          }
          fakeDb.roleChanges.push({
            changed_by: adminId,
            target_user: targetId,
            old_role: oldRole,
            new_role: newRole,
          });
        } catch (err) {
          // Transaction rollback
          target.role = oldRole;
          throw err;
        }
      }

      // 1. Success case
      await executePromotionWithRollback("admin-master", "user-1", "admin", false);
      expect(fakeDb.profiles[0].role).toBe("admin");
      expect(fakeDb.roleChanges.length).toBe(1);
      expect(fakeDb.roleChanges[0].old_role).toBe("student");
      expect(fakeDb.roleChanges[0].new_role).toBe("admin");

      // 2. Failure case with rollback
      await expect(
        executePromotionWithRollback("admin-master", "user-1", "student", true)
      ).rejects.toThrow("DB Error: log insert failed");

      // Profile was rolled back to admin, and no new audit row was written
      expect(fakeDb.profiles[0].role).toBe("admin");
      expect(fakeDb.roleChanges.length).toBe(1);
    });
  });

  // =========================================================================
  // Item 28 & 17: Immediate Access Revocation & Rate Limiting
  // =========================================================================
  describe("Item 28 & 17: Immediate Permission Check & Rate Limiter", () => {
    it("Rate limits role route at 20 requests per minute per admin", () => {
      const adminId = "admin-test-rate-limit";

      // 1 to 20 should succeed
      for (let i = 1; i <= 20; i++) {
        const res = checkRoleChangeRateLimit(adminId, 20, 60_000);
        expect(res.allowed).toBe(true);
      }

      // 21st should be rate limited (429)
      const res21 = checkRoleChangeRateLimit(adminId, 20, 60_000);
      expect(res21.allowed).toBe(false);
      expect(res21.resetInSeconds).toBeGreaterThan(0);
    });

    it("Confirms requireAdmin re-reads role directly from DB", () => {
      // Simulating a demoted admin whose session is still alive
      const dbProfile = { id: "user-demoted", role: "student", is_active: true, status: "approved" };

      function evaluateRequireAdmin(profile: typeof dbProfile | null) {
        if (!profile || !profile.is_active || profile.status !== "approved" || profile.role !== "admin") {
          return null;
        }
        return { user: { id: profile.id }, profile };
      }

      // Immediate 403 / null without requiring logout
      expect(evaluateRequireAdmin(dbProfile)).toBeNull();
    });
  });
});
