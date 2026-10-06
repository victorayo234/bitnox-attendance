import crypto from "node:crypto";

// In-memory sliding window rate limiter (max 10 attempts per minute per user)
const rateLimitMap = new Map<string, { count: number; resetAt: number }>();

export function checkRateLimit(userId: string, maxAttempts = 10, windowMs = 60_000): boolean {
  const now = Date.now();
  const record = rateLimitMap.get(userId);

  if (!record || now > record.resetAt) {
    rateLimitMap.set(userId, { count: 1, resetAt: now + windowMs });
    return true;
  }

  if (record.count >= maxAttempts) {
    return false;
  }

  record.count++;
  return true;
}

// Reset rate limiter for tests
export function _resetRateLimit() {
  rateLimitMap.clear();
}

/**
 * Extracts secret from raw string or URL containing ?code=SECRET.
 */
export function extractQrSecret(rawInput: string): string {
  if (typeof rawInput !== "string") return "";
  const trimmed = rawInput.trim();

  try {
    if (trimmed.includes("?code=") || trimmed.startsWith("http://") || trimmed.startsWith("https://")) {
      const url = new URL(trimmed, "http://localhost");
      const codeParam = url.searchParams.get("code");
      if (codeParam) {
        return codeParam.trim();
      }
    }
  } catch {
    const match = trimmed.match(/[?&]code=([^&#]+)/);
    if (match && match[1]) {
      return decodeURIComponent(match[1]).trim();
    }
  }

  return trimmed;
}

/**
 * Constant-time comparison between provided secret and expected secret.
 * Hashes both with SHA-256 to ensure equal-length buffers (32 bytes)
 * preventing timing side-channels and RangeErrors.
 */
export function safeCompareSecret(provided: string, expected: string): boolean {
  if (!provided || !expected) return false;

  const hashA = crypto.createHash("sha256").update(provided).digest();
  const hashB = crypto.createHash("sha256").update(expected).digest();

  return crypto.timingSafeEqual(hashA, hashB);
}
