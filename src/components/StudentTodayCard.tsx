"use client";

import React, { useState } from "react";
import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { SuccessPopup } from "@/components/SuccessPopup";
import { useScanSubmit } from "@/hooks/useScanSubmit";
import { GateState } from "@/lib/attendance-rules";
import {
  QrCode,
  X,
  CheckCircle2,
  AlertCircle,
  WifiOff,
} from "lucide-react";

// Dynamic import to keep heavy html5-qrcode JS bundle off initial student dashboard load
const QrScanner = dynamic(
  () => import("@/components/QrScanner").then((mod) => mod.QrScanner),
  {
    ssr: false,
    loading: () => (
      <div className="w-full aspect-square rounded-xl bg-soft border border-border flex items-center justify-center text-xs text-muted">
        Loading camera scanner...
      </div>
    ),
  }
);

export interface StudentTodayCardProps {
  studentName: string;
  gateState: GateState;
  lagosTimeFormatted: string;
  lagosDateFormatted: string;
  todayRecord: {
    check_in_at?: string | null;
    check_out_at?: string | null;
    status?: "present" | "late";
  } | null;
  isWorkday?: boolean;
}

export function StudentTodayCard({
  gateState,
  lagosTimeFormatted,
  todayRecord,
  isWorkday = true,
}: StudentTodayCardProps) {
  const router = useRouter();
  const [isScannerOpen, setIsScannerOpen] = useState(false);
  const [scannerType, setScannerType] = useState<"IN" | "OUT">("OUT");
  const [showSuccess, setShowSuccess] = useState(false);
  const [scannerKey, setScannerKey] = useState(0);

  const { loading, result, error, submitScan, reset } = useScanSubmit();

  const handleOpenScanner = (type: "IN" | "OUT") => {
    reset();
    setScannerType(type);
    setScannerKey((prev) => prev + 1);
    setIsScannerOpen(true);
  };

  const handleCloseScanner = () => {
    setIsScannerOpen(false);
    reset();
  };

  const handleScan = async (code: string) => {
    const res = await submitScan(code);
    if (res) {
      setIsScannerOpen(false);
      setShowSuccess(true);
    }
  };

  const handleSuccessClose = () => {
    setShowSuccess(false);
    router.refresh();
  };

  const handleRetryScan = () => {
    reset();
    setScannerKey((prev) => prev + 1);
  };

  // Format check-in / check-out times in Africa/Lagos
  const checkInTimeFormatted = todayRecord?.check_in_at
    ? new Date(todayRecord.check_in_at).toLocaleTimeString("en-US", {
        timeZone: "Africa/Lagos",
        hour: "numeric",
        minute: "2-digit",
        hour12: true,
      })
    : null;

  const checkOutTimeFormatted = todayRecord?.check_out_at
    ? new Date(todayRecord.check_out_at).toLocaleTimeString("en-US", {
        timeZone: "Africa/Lagos",
        hour: "numeric",
        minute: "2-digit",
        hour12: true,
      })
    : null;

  // Determine real plain-word status string and status dot
  let statusText = "Not checked in";
  let statusDotColor = "bg-slate-300";

  if (!isWorkday) {
    statusText = "No attendance today";
    statusDotColor = "bg-slate-300";
  } else if (todayRecord?.check_out_at) {
    statusText = `Checked out at ${checkOutTimeFormatted}`;
    statusDotColor = "bg-primary";
  } else if (todayRecord?.check_in_at) {
    const punctuality = todayRecord.status === "present" ? "On time" : "Late";
    statusText = `Checked in at ${checkInTimeFormatted} · ${punctuality}`;
    statusDotColor = todayRecord.status === "present" ? "bg-[#16A34A]" : "bg-[#F59E0B]";
  } else if (gateState === "CHECKIN_AVAILABLE_LATE") {
    statusText = "Not checked in";
    statusDotColor = "bg-[#F59E0B]";
  }

  return (
    <>
      {/* ONE Main Status Card with 24px consistent padding */}
      <Card className="bg-white border border-border rounded-[12px] p-6 shadow-[0_1px_2px_rgba(11,27,63,0.04)] space-y-5">
        {/* Status Line + Dot + Current Time */}
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5 min-w-0">
            <span
              className={`w-2.5 h-2.5 rounded-full shrink-0 ${statusDotColor}`}
              aria-hidden="true"
            />
            <span className="text-base font-semibold text-primary truncate leading-6">
              {statusText}
            </span>
          </div>
          <span className="text-xs text-muted shrink-0 select-none">
            {lagosTimeFormatted}
          </span>
        </div>

        {/* Inline Notices (short helper text inside card) */}
        {!isWorkday && (
          <div className="text-xs text-muted bg-soft border border-border rounded-lg p-3">
            The hub is closed for the weekend. Workdays are Monday through Friday.
          </div>
        )}

        {isWorkday && gateState === "CHECKIN_AVAILABLE_LATE" && (
          <div className="text-xs text-amber-900 bg-amber-50/80 border border-amber-200/80 rounded-lg p-3 leading-relaxed">
            Check-in is still open. You&apos;ll be marked late.
          </div>
        )}

        {isWorkday && gateState === "CHECKED_IN" && (
          <div className="text-xs text-muted bg-soft border border-border rounded-lg p-3 text-center">
            Check-out opens at 12:00 p.m.
          </div>
        )}

        {isWorkday && gateState === "COMPLETE" && (
          <div className="flex items-center justify-center gap-1.5 text-xs text-[#16A34A] font-medium py-1">
            <CheckCircle2 className="w-4 h-4" />
            <span>Attendance complete for today</span>
          </div>
        )}

        {isWorkday && gateState === "NO_ACTION" && !todayRecord?.check_in_at && (
          <div className="text-xs text-muted bg-soft border border-border rounded-lg p-3 text-center">
            Check-in window opens at 08:00 a.m. on hub workdays.
          </div>
        )}

        {/* ONE Large Primary Scan Button (shown only when action is available) */}
        {isWorkday && gateState === "CHECKIN_AVAILABLE_LATE" && (
          <div>
            <Button
              variant="primary"
              size="lg"
              fullWidth
              onClick={() => handleOpenScanner("IN")}
              leftIcon={<QrCode className="w-5 h-5 text-white/90" />}
            >
              Scan to check in
            </Button>
          </div>
        )}

        {isWorkday && gateState === "CHECKOUT_AVAILABLE" && (
          <div>
            <Button
              variant="primary"
              size="lg"
              fullWidth
              onClick={() => handleOpenScanner("OUT")}
              leftIcon={<QrCode className="w-5 h-5 text-white/90" />}
            >
              Scan to check out
            </Button>
          </div>
        )}
      </Card>

      {/* Modal / Sheet Scanner Dialog */}
      {isScannerOpen && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200"
        >
          <div className="relative w-full max-w-sm rounded-[12px] border border-border bg-white p-5 shadow-2xl space-y-4">
            {/* Header with Close X */}
            <div className="flex items-center justify-between pb-2 border-b border-border">
              <div>
                <h3 className="font-semibold text-base text-primary">
                  {scannerType === "OUT" ? "Scan Check-Out" : "Scan Check-In"}
                </h3>
                <p className="text-xs text-muted">
                  Align the {scannerType === "OUT" ? "CHECK OUT" : "CHECK IN"} code
                </p>
              </div>
              <button
                type="button"
                onClick={handleCloseScanner}
                className="w-8 h-8 rounded-lg text-muted hover:bg-soft hover:text-primary transition-colors flex items-center justify-center"
                aria-label="Close scanner"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Inline Error Alert with Offline / Slow-Network Handling */}
            {error && !loading && (
              <div className="rounded-lg border border-red-200 bg-red-50 p-3.5 text-xs text-red-700 space-y-2">
                <div className="flex items-start gap-2">
                  {error.code === "OFFLINE" || error.code === "NETWORK_ERROR" ? (
                    <WifiOff className="w-4 h-4 shrink-0 text-red-600 mt-0.5" />
                  ) : (
                    <AlertCircle className="w-4 h-4 shrink-0 text-red-600 mt-0.5" />
                  )}
                  <div className="space-y-0.5">
                    <p className="font-semibold text-red-900">{error.message}</p>
                    {(error.code === "OFFLINE" || error.code === "NETWORK_ERROR") && (
                      <p className="text-[11px] text-red-700">
                        Slow or interrupted network connection. Tap retry when signal returns.
                      </p>
                    )}
                  </div>
                </div>

                <Button
                  type="button"
                  size="sm"
                  variant="secondary"
                  onClick={handleRetryScan}
                  className="w-full text-xs font-semibold text-red-900 hover:bg-red-100"
                >
                  Retry Scan
                </Button>
              </div>
            )}

            {/* Scanner Viewfinder */}
            <div className="w-full">
              <QrScanner
                key={scannerKey}
                onScan={handleScan}
                disabled={loading}
                helperText={`Point camera at ${scannerType === "OUT" ? "CHECK OUT" : "CHECK IN"} code`}
              />
            </div>
          </div>
        </div>
      )}

      {/* Success Popup */}
      {result && (
        <SuccessPopup
          isOpen={showSuccess}
          message={result.message}
          time={result.time}
          type={result.type}
          status={result.status}
          onClose={handleSuccessClose}
        />
      )}
    </>
  );
}
