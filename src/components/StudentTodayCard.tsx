"use client";

import React, { useState } from "react";
import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { SuccessPopup } from "@/components/SuccessPopup";
import { useScanSubmit } from "@/hooks/useScanSubmit";
import { GateState } from "@/lib/attendance-rules";
import {
  Clock,
  QrCode,
  LogOut,
  AlertTriangle,
  X,
  CheckCircle2,
  Calendar,
  AlertCircle,
  WifiOff,
} from "lucide-react";

// Dynamic import to keep heavy html5-qrcode JS bundle off initial student dashboard load
const QrScanner = dynamic(
  () => import("@/components/QrScanner").then((mod) => mod.QrScanner),
  {
    ssr: false,
    loading: () => (
      <div className="w-full aspect-square rounded-2xl bg-[#F8FAFD] border border-[#DDE3EE] flex items-center justify-center text-xs text-[#5E6C87]">
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
  studentName,
  gateState,
  lagosTimeFormatted,
  lagosDateFormatted,
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

  // Format check-in / check-out times
  const checkInTimeFormatted = todayRecord?.check_in_at
    ? new Date(todayRecord.check_in_at).toLocaleTimeString("en-US", {
        timeZone: "Africa/Lagos",
        hour: "2-digit",
        minute: "2-digit",
        hour12: true,
      })
    : null;

  const checkOutTimeFormatted = todayRecord?.check_out_at
    ? new Date(todayRecord.check_out_at).toLocaleTimeString("en-US", {
        timeZone: "Africa/Lagos",
        hour: "2-digit",
        minute: "2-digit",
        hour12: true,
      })
    : null;

  return (
    <div className="space-y-4">
      {/* Late Check-in Notice Banner (When 12:00 or later with no check-in on a workday) */}
      {isWorkday && gateState === "CHECKIN_AVAILABLE_LATE" && (
        <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 shadow-xs">
          <div className="flex items-start gap-3">
            <div className="p-2 rounded-xl bg-amber-100 text-amber-700 shrink-0">
              <AlertTriangle className="w-5 h-5" />
            </div>
            <div className="flex-1 space-y-1">
              <h4 className="text-sm font-semibold text-amber-900">
                You haven&apos;t checked in today
              </h4>
              <p className="text-xs text-amber-800 leading-relaxed">
                Normal check-in closed at 08:30 a.m., but attendance is still open and will be marked <strong>Late</strong>.
              </p>
              <div className="pt-2">
                <Button
                  size="sm"
                  className="min-h-[44px] rounded-full bg-[#0B1B3F] text-white hover:bg-[#0B1B3F]/90 text-xs px-5"
                  onClick={() => handleOpenScanner("IN")}
                >
                  <QrCode className="w-4 h-4 mr-2" />
                  Scan check-in
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Main "Today" Card */}
      <Card className="bg-white overflow-hidden shadow-sm border border-[#DDE3EE] rounded-2xl">
        <CardHeader className="flex flex-row items-center justify-between pb-3 border-b border-[#DDE3EE]/60">
          <div className="flex items-center gap-2">
            <Calendar className="w-4 h-4 text-[#0B1B3F]" />
            <CardTitle className="text-base font-bold text-[#0B1B3F]">
              Today&apos;s Attendance
            </CardTitle>
          </div>
          <div className="flex items-center gap-1.5 text-xs font-semibold text-[#5E6C87] bg-[#F1F4FB] px-2.5 py-1 rounded-full border border-[#DDE3EE]">
            <Clock className="w-3.5 h-3.5 text-[#0B1B3F]" />
            <span>{lagosTimeFormatted}</span>
          </div>
        </CardHeader>

        <CardContent className="pt-4 space-y-5">
          {/* Status Display Area */}
          <div className="rounded-xl bg-[#F8FAFE] border border-[#DDE3EE] p-4 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-[#5E6C87]">Status</span>

              {/* Status Badge */}
              {!isWorkday ? (
                <Badge variant="neutral">Weekend</Badge>
              ) : !todayRecord?.check_in_at ? (
                <Badge variant="neutral">Not checked in</Badge>
              ) : todayRecord.check_out_at ? (
                <Badge variant={todayRecord.status === "present" ? "present" : "late"} withDot>
                  {todayRecord.status === "present" ? "Present" : "Late"}
                </Badge>
              ) : (
                <Badge variant={todayRecord.status === "present" ? "present" : "late"} withDot>
                  {todayRecord.status === "present" ? "Checked In (Present)" : "Checked In (Late)"}
                </Badge>
              )}
            </div>

            {/* Attendance Status Summary Text */}
            <div className="pt-1">
              {!isWorkday ? (
                <div className="space-y-1">
                  <p className="text-base font-semibold text-[#0B1B3F]">
                    No attendance today
                  </p>
                  <p className="text-xs text-[#5E6C87]">
                    The hub is closed for the weekend. Workdays are Monday through Friday.
                  </p>
                </div>
              ) : !todayRecord?.check_in_at ? (
                <p className="text-base font-semibold text-[#0B1B3F]">
                  Not checked in
                </p>
              ) : todayRecord.check_out_at ? (
                <div className="space-y-1">
                  <p className="text-base font-semibold text-[#0B1B3F]">
                    Checked out at {checkOutTimeFormatted}
                  </p>
                  <p className="text-xs text-[#5E6C87]">
                    Check-in was recorded at {checkInTimeFormatted} ({todayRecord.status})
                  </p>
                </div>
              ) : (
                <div className="space-y-1">
                  <p className="text-base font-semibold text-[#0B1B3F]">
                    Checked in at {checkInTimeFormatted} -{" "}
                    <span className={todayRecord.status === "present" ? "text-[#16A34A]" : "text-[#F59E0B]"}>
                      {todayRecord.status === "present" ? "Present" : "Late"}
                    </span>
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Action Area & Notes */}
          <div className="space-y-2">
            {/* Weekend: Explicit No Attendance Notice */}
            {!isWorkday && (
              <div className="text-center py-2.5 bg-[#F8FAFE] rounded-xl border border-[#DDE3EE]/70">
                <p className="text-xs font-semibold text-[#0B1B3F]">
                  No attendance today
                </p>
                <p className="text-[11px] text-[#5E6C87] mt-0.5">
                  Hub attendance resumes Monday at 08:00 AM.
                </p>
              </div>
            )}

            {/* 1. CHECKOUT_AVAILABLE: Large Navy Check out button */}
            {isWorkday && gateState === "CHECKOUT_AVAILABLE" && (
              <Button
                className="w-full min-h-[44px] rounded-full bg-[#0B1B3F] hover:bg-[#0B1B3F]/90 text-white font-medium py-3 text-sm shadow-sm"
                onClick={() => handleOpenScanner("OUT")}
              >
                <LogOut className="w-4 h-4 mr-2" />
                Check out
              </Button>
            )}

            {/* 2. CHECKED_IN before noon: Muted note */}
            {isWorkday && gateState === "CHECKED_IN" && (
              <div className="text-center py-2">
                <p className="text-xs text-[#5E6C87] font-medium">
                  Check-out opens at 12:00 p.m.
                </p>
              </div>
            )}

            {/* 3. COMPLETE */}
            {isWorkday && gateState === "COMPLETE" && (
              <div className="text-center py-2 flex items-center justify-center gap-1.5 text-xs text-[#16A34A] font-semibold">
                <CheckCircle2 className="w-4 h-4" />
                <span>Attendance complete for today</span>
              </div>
            )}

            {/* 4. NO_ACTION on workday (e.g. before 08:00 AM) */}
            {isWorkday && gateState === "NO_ACTION" && !todayRecord?.check_in_at && (
              <div className="text-center py-2">
                <p className="text-xs text-[#5E6C87]">
                  Check-in window opens at 08:00 a.m. on hub workdays.
                </p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Modal / Sheet Scanner Dialog */}
      {isScannerOpen && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200"
        >
          <div className="relative w-full max-w-sm rounded-[16px] border border-[#DDE3EE] bg-white p-5 shadow-2xl space-y-4">
            {/* Header with Close X */}
            <div className="flex items-center justify-between pb-2 border-b border-[#DDE3EE]/60">
              <div>
                <h3 className="font-bold text-base text-[#0B1B3F]">
                  {scannerType === "OUT" ? "Scan Check-Out" : "Scan Check-In"}
                </h3>
                <p className="text-xs text-[#5E6C87]">
                  Align the {scannerType === "OUT" ? "CHECK OUT" : "CHECK IN"} code
                </p>
              </div>
              <button
                type="button"
                onClick={handleCloseScanner}
                className="p-2 rounded-full text-[#5E6C87] hover:bg-[#F1F4FB] hover:text-[#0B1B3F] transition-colors min-h-[44px] min-w-[44px] flex items-center justify-center"
                aria-label="Close scanner"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Inline Error Alert with Offline / Slow-Network Handling */}
            {error && !loading && (
              <div className="rounded-xl border border-red-200 bg-red-50 p-3.5 text-xs text-red-700 space-y-2">
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
                  variant="outline"
                  onClick={handleRetryScan}
                  className="min-h-[44px] w-full text-xs font-semibold rounded-full border-red-300 text-red-900 hover:bg-red-100"
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
    </div>
  );
}
