"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { QrScanner } from "@/components/QrScanner";
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
} from "lucide-react";

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
}

export function StudentTodayCard({
  studentName,
  gateState,
  lagosTimeFormatted,
  lagosDateFormatted,
  todayRecord,
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
      {/* Late Check-in Notice Banner (When 12:00 or later with no check-in) */}
      {gateState === "CHECKIN_AVAILABLE_LATE" && (
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
                  className="rounded-full bg-[#0B1B3F] text-white hover:bg-[#0B1B3F]/90 text-xs px-4"
                  onClick={() => handleOpenScanner("IN")}
                >
                  <QrCode className="w-3.5 h-3.5 mr-1.5" />
                  Scan check-in
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Main "Today" Card */}
      <Card className="bg-white overflow-hidden shadow-sm border border-[#DDE3EE]">
        <CardHeader className="flex flex-row items-center justify-between pb-3 border-b border-[#DDE3EE]/60">
          <div className="flex items-center gap-2">
            <Calendar className="w-4 h-4 text-[#0B1B3F]" />
            <CardTitle className="text-base font-bold text-[#0B1B3F]">
              Today&apos;s Attendance
            </CardTitle>
          </div>
          <div className="flex items-center gap-1.5 text-xs font-semibold text-[#5E6C87] bg-[#F1F4FB] px-2.5 py-1 rounded-full border border-[#DDE3EE]">
            <Clock className="w-3.5 h-3.5 text-[#00E6FF]" />
            <span>{lagosTimeFormatted}</span>
          </div>
        </CardHeader>

        <CardContent className="pt-4 space-y-5">
          {/* Status Display Area */}
          <div className="rounded-xl bg-[#F8FAFE] border border-[#DDE3EE] p-4 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-[#5E6C87]">Status</span>
              {/* Status Badge */}
              {!todayRecord?.check_in_at ? (
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
              {!todayRecord?.check_in_at ? (
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
            {/* 1. CHECKOUT_AVAILABLE: Large Navy Check out button */}
            {gateState === "CHECKOUT_AVAILABLE" && (
              <Button
                className="w-full rounded-full bg-[#0B1B3F] hover:bg-[#0B1B3F]/90 text-white font-medium py-3 text-sm shadow-sm"
                onClick={() => handleOpenScanner("OUT")}
              >
                <LogOut className="w-4 h-4 mr-2" />
                Check out
              </Button>
            )}

            {/* 2. CHECKED_IN before noon: Muted note */}
            {gateState === "CHECKED_IN" && (
              <div className="text-center py-2">
                <p className="text-xs text-[#5E6C87] font-medium">
                  Check-out opens at 12:00 p.m.
                </p>
              </div>
            )}

            {/* 3. COMPLETE */}
            {gateState === "COMPLETE" && (
              <div className="text-center py-2 flex items-center justify-center gap-1.5 text-xs text-[#16A34A] font-semibold">
                <CheckCircle2 className="w-4 h-4" />
                <span>Attendance complete for today</span>
              </div>
            )}

            {/* 4. NO_ACTION */}
            {gateState === "NO_ACTION" && !todayRecord?.check_in_at && (
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
                className="p-1 rounded-full text-[#5E6C87] hover:bg-[#F1F4FB] hover:text-[#0B1B3F] transition-colors"
                aria-label="Close scanner"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Inline Error Alert */}
            {error && !loading && (
              <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-xs text-red-700 flex items-start gap-2">
                <AlertCircle className="w-4 h-4 shrink-0 text-red-600 mt-0.5" />
                <div>
                  <p className="font-semibold text-red-800">{error.message}</p>
                  <button
                    type="button"
                    onClick={handleRetryScan}
                    className="mt-1 font-semibold underline text-red-900"
                  >
                    Scan again
                  </button>
                </div>
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
