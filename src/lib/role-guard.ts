/**
 * Role and Admin Protection Utilities
 * Provides:
 * 1. Strict rate limiting for role changes (20 req / min per admin)
 * 2. In-memory async mutex for atomic concurrency safety
 * 3. UUID validation helper
 */

// Rate limit store: adminId -> { count, resetAt }
const roleRateLimitMap = new Map<string, { count: number; resetAt: number }>();

export function checkRoleChangeRateLimit(
  adminId: string,
  maxAttempts = 20,
  windowMs = 60_000
): { allowed: boolean; remaining: number; resetInSeconds: number } {
  const now = Date.now();
  const record = roleRateLimitMap.get(adminId);

  if (!record || now > record.resetAt) {
    roleRateLimitMap.set(adminId, { count: 1, resetAt: now + windowMs });
    return { allowed: true, remaining: maxAttempts - 1, resetInSeconds: Math.ceil(windowMs / 1000) };
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

export function _resetRoleRateLimits(): void {
  roleRateLimitMap.clear();
}

/**
 * Validates whether a string is a standard RFC 4122 UUID
 */
export function isValidUuid(id: string): boolean {
  if (typeof id !== "string") return false;
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    id.trim()
  );
}

/**
 * In-process Mutex to serialize concurrent admin mutations (role change & deactivation)
 */
class AsyncMutex {
  private queue: (() => void)[] = [];
  private locked = false;

  async acquire(): Promise<() => void> {
    if (!this.locked) {
      this.locked = true;
      return () => this.release();
    }

    return new Promise<() => void>((resolve) => {
      this.queue.push(() => {
        this.locked = true;
        resolve(() => this.release());
      });
    });
  }

  private release() {
    const next = this.queue.shift();
    if (next) {
      next();
    } else {
      this.locked = false;
    }
  }
}

export const adminActionMutex = new AsyncMutex();
