"use client";

import { useState, useCallback } from "react";

export interface ScanResultData {
  ok: true;
  type: "IN" | "OUT";
  message: string;
  time: string;
  status: "present" | "late";
}

export interface ScanErrorData {
  code: string;
  message: string;
}

export interface UseScanSubmitReturn {
  loading: boolean;
  result: ScanResultData | null;
  error: ScanErrorData | null;
  submitScan: (code: string) => Promise<ScanResultData | null>;
  reset: () => void;
}

/**
 * Custom hook to submit scanned QR codes to POST /api/attendance/scan
 */
export function useScanSubmit(): UseScanSubmitReturn {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<ScanResultData | null>(null);
  const [error, setError] = useState<ScanErrorData | null>(null);

  const reset = useCallback(() => {
    setLoading(false);
    setResult(null);
    setError(null);
  }, []);

  const submitScan = useCallback(async (code: string): Promise<ScanResultData | null> => {
    if (!code || !code.trim()) {
      setError({
        code: "EMPTY_CODE",
        message: "No QR code was detected. Please try again.",
      });
      return null;
    }

    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const response = await fetch("/api/attendance/scan", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ code: code.trim() }),
      });

      const data = await response.json().catch(() => null);

      if (response.ok && data?.ok) {
        const successData: ScanResultData = {
          ok: true,
          type: data.type,
          message: data.message,
          time: data.time,
          status: data.status,
        };
        setResult(successData);
        return successData;
      } else {
        const isInactive = data?.code === "ACCOUNT_INACTIVE";
        const errorData: ScanErrorData = {
          code: data?.code || "SCAN_ERROR",
          message:
            data?.message ||
            (response.status === 401
              ? "Session expired. Please log in again."
              : isInactive
              ? "Your account has been deactivated. You have been signed out."
              : response.status === 403
              ? "Account access restricted or outside valid attendance hours."
              : "Attendance scan could not be processed."),
        };
        setError(errorData);

        // Edge case: deactivated student still logged in is signed out immediately
        if (isInactive || response.status === 401) {
          if (typeof window !== "undefined") {
            setTimeout(() => {
              window.location.href = "/login?role=student";
            }, 1200);
          }
        }

        return null;
      }
    } catch (err: unknown) {
      const isOffline = typeof navigator !== "undefined" && !navigator.onLine;
      const errorMessage = isOffline
        ? "You appear to be offline. Please check your connection and tap retry."
        : "Network connection was interrupted or slow. Tap retry to submit again.";
      const networkError: ScanErrorData = {
        code: isOffline ? "OFFLINE" : "NETWORK_ERROR",
        message: errorMessage,
      };
      setError(networkError);
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  return {
    loading,
    result,
    error,
    submitScan,
    reset,
  };
}
