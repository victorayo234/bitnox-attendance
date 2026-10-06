import { describe, it, expect, beforeEach } from "vitest";
import {
  extractQrSecret,
  safeCompareSecret,
  checkRateLimit,
  _resetRateLimit,
} from "./qr-utils";

describe("Attendance Scan Helpers", () => {
  describe("extractQrSecret", () => {
    it("extracts raw secret string as-is", () => {
      expect(extractQrSecret("bitnox-in-w3lc0m3")).toBe("bitnox-in-w3lc0m3");
      expect(extractQrSecret("  bitnox-out-g00dby3  ")).toBe("bitnox-out-g00dby3");
    });

    it("extracts secret from full URL with ?code=", () => {
      const url = "https://attendance.bitnox.com/scan?code=bitnox-in-w3lc0m3";
      expect(extractQrSecret(url)).toBe("bitnox-in-w3lc0m3");
    });

    it("extracts secret when URL has multiple query parameters", () => {
      const url = "http://localhost:3000/?hub=abeokuta&code=bitnox-out-g00dby3&version=1";
      expect(extractQrSecret(url)).toBe("bitnox-out-g00dby3");
    });

    it("extracts secret from encoded URL", () => {
      const url = "https://qr.bitnox.com/?code=bitnox-in-w3lc0m3#section";
      expect(extractQrSecret(url)).toBe("bitnox-in-w3lc0m3");
    });

    it("returns empty string for non-string input", () => {
      // @ts-expect-error test invalid input
      expect(extractQrSecret(null)).toBe("");
    });
  });

  describe("safeCompareSecret", () => {
    const expectedSecret = "bitnox-in-w3lc0m3";

    it("returns true for matching secret", () => {
      expect(safeCompareSecret("bitnox-in-w3lc0m3", expectedSecret)).toBe(true);
    });

    it("returns false for incorrect secret of different length", () => {
      expect(safeCompareSecret("wrong", expectedSecret)).toBe(false);
      expect(safeCompareSecret("very-long-wrong-secret-token", expectedSecret)).toBe(false);
    });

    it("returns false for incorrect secret of same length", () => {
      expect(safeCompareSecret("bitnox-in-w3lc0m4", expectedSecret)).toBe(false);
    });

    it("returns false for empty inputs", () => {
      expect(safeCompareSecret("", expectedSecret)).toBe(false);
      expect(safeCompareSecret(expectedSecret, "")).toBe(false);
    });
  });

  describe("checkRateLimit", () => {
    beforeEach(() => {
      _resetRateLimit();
    });

    it("allows up to 10 attempts per minute per user", () => {
      const userId = "test-user-rate-limit";
      for (let i = 0; i < 10; i++) {
        expect(checkRateLimit(userId)).toBe(true);
      }
      // 11th attempt is rate-limited
      expect(checkRateLimit(userId)).toBe(false);
    });

    it("tracks rate limits independently per user", () => {
      const userA = "user-a";
      const userB = "user-b";
      for (let i = 0; i < 10; i++) {
        checkRateLimit(userA);
      }
      expect(checkRateLimit(userA)).toBe(false);
      expect(checkRateLimit(userB)).toBe(true);
    });
  });
});
