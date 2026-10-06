"use client";

import React, { useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { AlertCircle } from "lucide-react";
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
    <div className="fixed inset-0 z-50 bg-white flex flex-col justify-between p-4 sm:p-6 overflow-y-auto">
      {/* Top Header: Logo and Logout Only (No Navigation, No Close) */}
      <header className="w-full max-w-md mx-auto flex items-center justify-between py-2 border-b border-[#DDE3EE]/60">
        <div className="flex flex-col">
          <Image
            src="/images/bitnox-logo.png"
            alt="Bitnox"
            width={130}
            height={32}
            priority
            className="h-7 w-auto object-contain"
          />
          <div className="h-0.5 w-10 bg-[#00E6FF] rounded-full mt-1" />
        </div>

        <LogoutButton />
      </header>

      {/* Main Content: Gate Instructions & Viewfinder */}
      <main className="w-full max-w-md mx-auto my-auto py-6 space-y-6 text-center">
        {/* Gate Heading & Subtext */}
        <div className="space-y-2">
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-[#0B1B3F]">
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
            className="rounded-xl border border-red-200 bg-red-50 p-3.5 text-left text-sm text-red-700 flex items-start gap-2.5 animate-in fade-in duration-150"
          >
            <AlertCircle className="h-5 w-5 shrink-0 text-red-600 mt-0.5" />
            <div className="flex-1">
              <p className="font-semibold text-xs text-red-800">Scan Rejected</p>
              <p className="text-xs text-red-700 mt-0.5 leading-snug">{error.message}</p>
              <button
                type="button"
                onClick={handleRetryScan}
                className="mt-2 text-xs font-semibold text-red-800 underline hover:text-red-950"
              >
                Scan again
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
