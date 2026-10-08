"use client";

import React, { useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { AlertCircle, WifiOff, RefreshCw } from "lucide-react";
import { QrScanner } from "@/components/QrScanner";
import { SuccessPopup } from "@/components/SuccessPopup";
import { LogoutButton } from "@/components/LogoutButton";
import { useScanSubmit } from "@/hooks/useScanSubmit";

export function ScanGate() {
  const router = useRouter();
  const { loading, result, error, submitScan, reset } = useScanSubmit();
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [scannerKey, setScannerKey] = useState(0);

  const handleScan = async (code: string) => {
    const success = await submitScan(code);
    if (success) {
      setShowSuccessModal(true);
    }
  };

  const handleSuccessClose = () => {
    setShowSuccessModal(false);
    // Refresh the route so server layout re-evaluates getGateState and unblocks the gate
    router.refresh();
  };

  const handleRetryScan = () => {
    reset();
    setScannerKey((prev) => prev + 1);
  };

  return (
    <div className="fixed inset-0 z-50 bg-[#F5F8FE] flex flex-col justify-between p-4 sm:p-6 overflow-y-auto">
      {/* Top Header: Logo and Logout Only (No Navigation, No Close) */}
      <header className="w-full max-w-md mx-auto flex items-center justify-between py-2 border-b border-[#DDE3EE]/60">
        <Image
          src="/images/bitnox-logo.png"
          alt="Bitnox Attendance"
          width={130}
          height={32}
          priority
          className="h-7 w-auto object-contain"
        />

        <LogoutButton variant="ghost" />
      </header>

      {/* Main Content: Gate Instructions & Viewfinder */}
      <main className="w-full max-w-md mx-auto my-auto py-6 space-y-6 text-center">
        {/* Gate Heading & Subtext */}
        <div className="space-y-2">
          <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight text-[#0B1B3F]">
            Scan your attendance
          </h1>
          <p className="text-sm text-[#5E6C87] max-w-xs mx-auto leading-relaxed">
            Scan the <strong className="text-[#0B1B3F]">CHECK IN</strong> code at the welcome table to continue.
          </p>
        </div>

        {/* Inline Error Message on Failed Scan */}
        {error && !loading && (
          <div
            role="alert"
            className="rounded-lg border border-[#EF4444]/30 bg-[#EF4444]/10 p-4 text-left text-sm text-[#EF4444] space-y-2 animate-in fade-in duration-150"
          >
            <div className="flex items-start gap-2.5">
              {error.code === "OFFLINE" || error.code === "NETWORK_ERROR" ? (
                <WifiOff className="h-5 w-5 shrink-0 text-[#EF4444] mt-0.5" />
              ) : (
                <AlertCircle className="h-5 w-5 shrink-0 text-[#EF4444] mt-0.5" />
              )}
              <div className="flex-1 space-y-0.5">
                <p className="font-semibold text-xs text-[#EF4444]">
                  {error.code === "OFFLINE"
                    ? "Device Offline"
                    : error.code === "NETWORK_ERROR"
                    ? "Network Interrupted"
                    : "Scan Rejected"}
                </p>
                <p className="text-xs text-[#EF4444]/90 leading-snug">{error.message}</p>
                {(error.code === "OFFLINE" || error.code === "NETWORK_ERROR") && (
                  <p className="text-[11px] text-[#EF4444]/80">
                    Your check-in will not duplicate. Tap retry once your internet connection is restored.
                  </p>
                )}
              </div>
            </div>

            <div className="pt-1">
              <button
                type="button"
                onClick={handleRetryScan}
                className="w-full min-h-[44px] flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-lg bg-[#EF4444] text-white text-xs font-semibold hover:bg-[#EF4444]/90 active:scale-[0.99] transition-all shadow-xs"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                {error.code === "OFFLINE" || error.code === "NETWORK_ERROR"
                  ? "Retry Connection"
                  : "Scan again"}
              </button>
            </div>
          </div>
        )}

        {/* QR Scanner */}
        <div className="w-full">
          <QrScanner
            key={scannerKey}
            onScan={handleScan}
            disabled={loading || showSuccessModal}
            helperText="Point your camera at the CHECK IN code"
          />
        </div>
      </main>

      {/* Bottom Footer */}
      <footer className="w-full max-w-md mx-auto py-3 text-center border-t border-[#DDE3EE]/60 text-xs text-[#5E6C87]">
        Bitnox Attendance • Abeokuta Hub
      </footer>

      {/* Success Popup */}
      {result && (
        <SuccessPopup
          isOpen={showSuccessModal}
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
