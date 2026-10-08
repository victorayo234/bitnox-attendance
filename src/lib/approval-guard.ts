import { isValidUuid } from "./role-guard";

/**
 * In-memory rate limiting store for admin approval/rejection actions:
 * adminId -> { count, resetAt }
 * Rate limit: 30 requests per minute per admin.
 */
const approvalRateLimitMap = new Map<string, { count: number; resetAt: number }>();

export function checkApprovalRateLimit(
  adminId: string,
  maxAttempts = 30,
  windowMs = 60_000
): { allowed: boolean; remaining: number; resetInSeconds: number } {
  const now = Date.now();
  const record = approvalRateLimitMap.get(adminId);

  if (!record || now > record.resetAt) {
    approvalRateLimitMap.set(adminId, { count: 1, resetAt: now + windowMs });
    return {
      allowed: true,
      remaining: maxAttempts - 1,
      resetInSeconds: Math.ceil(windowMs / 1000),
    };
  }

  if (record.count >= maxAttempts) {
    const resetInSeconds = Math.max(1, Math.ceil((record.resetAt - now) / 1000));
    return { allowed: false, remaining: 0, resetInSeconds };
  }

  record.count += 1;
  return {
    allowed: true,
    remaining: maxAttempts - record.count,
    resetInSeconds: Math.ceil((record.resetAt - now) / 1000),
  };
}

export function _resetApprovalRateLimits(): void {
  approvalRateLimitMap.clear();
}

export interface ValidatedApprovalInput {
  studentId: string;
  decision: "approved" | "rejected";
  note?: string | null;
}

/**
 * Validates request payload strictly:
 * Must contain only:
 * - studentId: valid UUID
 * - decision: "approved" | "rejected"
 * - note?: optional trimmed string, max 200 characters
 * Unknown fields cause immediate validation failure.
 */
export function validateApprovalPayload(
  body: unknown
): { valid: true; data: ValidatedApprovalInput } | { valid: false; error: string; status: number } {
  if (!body || typeof body !== "object" || Array.isArray(body)) {
    return { valid: false, error: "Invalid JSON request payload. Expected an object.", status: 400 };
  }

  const keys = Object.keys(body as Record<string, unknown>);
  const allowedKeys = new Set(["studentId", "decision", "note"]);
  for (const k of keys) {
    if (!allowedKeys.has(k)) {
      return { valid: false, error: `Invalid request payload: unknown field '${k}'.`, status: 400 };
    }
  }

  const record = body as Record<string, unknown>;

  // studentId
  if (!record.studentId || typeof record.studentId !== "string" || !isValidUuid(record.studentId)) {
    return { valid: false, error: "Invalid studentId. Must be a valid UUID.", status: 400 };
  }

  // decision
  if (record.decision !== "approved" && record.decision !== "rejected") {
    return { valid: false, error: "Invalid decision. Must be 'approved' or 'rejected'.", status: 400 };
  }

  // note (optional)
  let cleanNote: string | null = null;
  if (record.note !== undefined && record.note !== null) {
    if (typeof record.note !== "string") {
      return { valid: false, error: "Note must be a text string.", status: 400 };
    }
    const trimmed = record.note.trim();
    if (trimmed.length > 200) {
      return { valid: false, error: "Note exceeds maximum length of 200 characters.", status: 400 };
    }
    cleanNote = trimmed.length > 0 ? trimmed : null;
  }

  return {
    valid: true,
    data: {
      studentId: record.studentId.trim(),
      decision: record.decision,
      note: cleanNote,
    },
  };
}

/**
 * Async Mutex to serialize concurrent decisions per student ID
 */
class KeyedMutex {
  private locks = new Map<string, Promise<void>>();

  async acquire(key: string): Promise<() => void> {
    while (this.locks.has(key)) {
      await this.locks.get(key);
    }
    let releaseFn: () => void = () => {};
    const promise = new Promise<void>((resolve) => {
      releaseFn = resolve;
    });
    this.locks.set(key, promise);

    return () => {
      this.locks.delete(key);
      releaseFn();
    };
  }
}

export const approvalActionMutex = new KeyedMutex();
