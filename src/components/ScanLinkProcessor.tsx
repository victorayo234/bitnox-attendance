"use client";

import React, { useEffect, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useScanSubmit } from "@/hooks/useScanSubmit";
import { SuccessPopup } from "@/components/SuccessPopup";
import { Button } from "@/components/ui/Button";
import { Card, CardContent } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { CheckCircle2, AlertTriangle, RefreshCw, ArrowRight, Home, WifiOff } from "lucide-react";

export interface ScanLinkProcessorProps {
  code: string;
  studentName?: string;
}

export function ScanLinkProcessor({ code, studentName }: ScanLinkProcessorProps) {
  const router = useRouter();
  const { loading, result, error, submitScan } = useScanSubmit();
  const [showPopup, setShowPopup] = useState(false);
  const hasTriggeredRef = useRef(false);

  useEffect(() => {
    if (hasTriggeredRef.current || !code) return;
    hasTriggeredRef.current = true;

    submitScan(code).then((success) => {
      if (success) {
        setShowPopup(true);
      }
    });
  }, [code, submitScan]);

  const handlePopupClose = () => {
    setShowPopup(false);
    router.push("/student");
  };

  const handleRetry = () => {
    if (!code) return;
    submitScan(code).then((success) => {
      if (success) {
        setShowPopup(true);
      }
    });
  };

  return (
    <div className="min-h-screen bg-[#F5F8FE] flex flex-col justify-between p-4 sm:p-6">
      {/* Brand Header */}
      <header className="max-w-md mx-auto w-full py-4 flex items-center justify-center">
        <Image
          src="/images/bitnox-logo.png"
          alt="Bitnox Attendance"
          width={130}
          height={32}
          priority
          className="h-8 w-auto object-contain"
        />
      </header>

      {/* Main Content Area */}
      <main className="max-w-md mx-auto w-full my-auto py-6">
        {/* Case 1: No code provided */}
        {!code && (
          <div className="rounded-[12px] bg-white border border-[#DDE3EE] p-6 text-center space-y-4 shadow-[0_1px_2px_rgba(11,27,63,0.04)]">
            <div className="w-12 h-12 rounded-[10px] bg-[#EF4444]/10 text-[#EF4444] border border-[#EF4444]/20 flex items-center justify-center mx-auto">
              <AlertTriangle className="w-6 h-6" />
            </div>
            <div className="space-y-1">
              <h2 className="text-lg font-semibold text-[#0B1B3F]">Missing QR Code</h2>
              <p className="text-xs text-[#5E6C87] leading-relaxed">
                No code was detected in the scan link. Please use your phone camera or the in-app scanner to scan a valid Bitnox QR code.
              </p>
            </div>
            <Button asChild variant="primary" size="md" fullWidth className="h-10 text-sm font-medium">
              <Link href="/student">
                <Home className="w-4 h-4 mr-2" />
                Go to Dashboard
              </Link>
            </Button>
          </div>
        )}

        {/* Case 2: Submitting / Loading */}
        {code && loading && (
          <div className="rounded-[12px] bg-white border border-[#DDE3EE] p-8 text-center space-y-4 shadow-[0_1px_2px_rgba(11,27,63,0.04)]">
            <div className="w-14 h-14 rounded-[10px] bg-[#F1F4FB] text-[#0B1B3F] flex items-center justify-center mx-auto">
              <RefreshCw className="w-7 h-7 text-[#0B1B3F] animate-spin motion-reduce:animate-none" />
            </div>
            <div className="space-y-1">
              <h2 className="text-lg font-semibold text-[#0B1B3F]">Verifying Attendance</h2>
              <p className="text-xs text-[#5E6C87]">
                Logging your attendance with the Bitnox server...
              </p>
            </div>
          </div>
        )}

        {/* Case 3: Success */}
        {result && (
          <div className="rounded-[12px] bg-white border border-[#16A34A]/30 p-6 text-center space-y-5 shadow-[0_1px_2px_rgba(11,27,63,0.04)] animate-in fade-in zoom-in-95 duration-200">
            <div className="w-14 h-14 rounded-[10px] bg-[#16A34A]/10 text-[#16A34A] border border-[#16A34A]/20 flex items-center justify-center mx-auto">
              <CheckCircle2 className="w-8 h-8" />
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-center gap-2">
                <Badge variant={result.status === "present" ? "present" : "late"}>
                  {result.type === "IN" ? "Checked In" : "Checked Out"} ({result.status})
                </Badge>
                <span className="text-xs font-semibold text-[#5E6C87]">{result.time}</span>
              </div>
              <h2 className="text-base font-semibold text-[#0B1B3F] leading-snug">
                {result.message}
              </h2>
            </div>

            <Button asChild variant="primary" size="md" fullWidth className="h-10 text-sm font-medium">
              <Link href="/student">
                Go to Dashboard
                <ArrowRight className="w-4 h-4 ml-2" />
              </Link>
            </Button>
          </div>
        )}

        {/* Case 4: Error */}
        {error && !loading && (
          <div className="rounded-[12px] bg-white border border-[#EF4444]/30 p-6 text-center space-y-5 shadow-[0_1px_2px_rgba(11,27,63,0.04)] animate-in fade-in duration-200">
            <div className="w-14 h-14 rounded-[10px] bg-[#EF4444]/10 text-[#EF4444] border border-[#EF4444]/20 flex items-center justify-center mx-auto">
              {error.code === "OFFLINE" || error.code === "NETWORK_ERROR" ? (
                <WifiOff className="w-7 h-7" />
              ) : (
                <AlertTriangle className="w-7 h-7" />
              )}
            </div>

            <div className="space-y-2">
              <Badge variant="absent" className="mx-auto font-mono text-[11px]">
                {error.code}
              </Badge>
              <h2 className="text-base font-semibold text-[#0B1B3F] leading-snug">
                {error.message}
              </h2>
              <p className="text-xs text-[#5E6C87]">
                {error.code === "OFFLINE" || error.code === "NETWORK_ERROR"
                  ? "Your network request timed out. You can retry safely without creating a duplicate attendance record."
                  : "Your attendance could not be saved with this code."}
              </p>
            </div>

            <div className="space-y-2 pt-2">
              <Button
                variant="primary"
                size="md"
                fullWidth
                onClick={handleRetry}
                className="h-10 text-sm font-medium"
              >
                <RefreshCw className="w-4 h-4 mr-2" />
                Retry Verification
              </Button>
              <Button
                asChild
                variant="secondary"
                size="md"
                fullWidth
                className="h-10 text-sm font-medium"
              >
                <Link href="/student">
                  <Home className="w-4 h-4 mr-2" />
                  Go to Dashboard
                </Link>
              </Button>
            </div>
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="max-w-md mx-auto w-full py-4 text-center text-xs text-[#5E6C87]">
        Bitnox Attendance • Abeokuta Hub
      </footer>

      {/* Success Popup Modal */}
      {result && (
        <SuccessPopup
          isOpen={showPopup}
          message={result.message}
          time={result.time}
          type={result.type}
          status={result.status}
          onClose={handlePopupClose}
        />
      )}
    </div>
  );
}
