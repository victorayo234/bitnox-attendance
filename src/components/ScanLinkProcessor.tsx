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
        <div className="flex flex-col items-center">
          <Image
            src="/images/bitnox-logo.png"
            alt="Bitnox Attendance"
            width={130}
            height={32}
            priority
            className="h-8 w-auto object-contain"
          />
          <div className="h-0.5 w-10 bg-[#00E6FF] rounded-full mt-1" />
        </div>
      </header>

      {/* Main Content Area */}
      <main className="max-w-md mx-auto w-full my-auto py-6">
        {/* Case 1: No code provided */}
        {!code && (
          <Card className="bg-white border border-[#DDE3EE] p-6 text-center space-y-4 shadow-sm">
            <div className="w-12 h-12 rounded-full bg-red-50 text-red-600 flex items-center justify-center mx-auto">
              <AlertTriangle className="w-6 h-6" />
            </div>
            <div className="space-y-1">
              <h2 className="text-lg font-bold text-[#0B1B3F]">Missing QR Code</h2>
              <p className="text-xs text-[#5E6C87] leading-relaxed">
                No code was detected in the scan link. Please use your phone camera or the in-app scanner to scan a valid Bitnox QR code.
              </p>
            </div>
            <Button asChild className="w-full min-h-[44px] rounded-full bg-[#0B1B3F] text-white py-3">
              <Link href="/student">
                <Home className="w-4 h-4 mr-2" />
                Go to Dashboard
              </Link>
            </Button>
          </Card>
        )}

        {/* Case 2: Submitting / Loading */}
        {code && loading && (
          <Card className="bg-white border border-[#DDE3EE] p-8 text-center space-y-4 shadow-sm">
            <div className="w-14 h-14 rounded-full bg-[#F1F4FB] text-[#0B1B3F] flex items-center justify-center mx-auto">
              <RefreshCw className="w-7 h-7 text-[#00E6FF] animate-spin" />
            </div>
            <div className="space-y-1">
              <h2 className="text-lg font-bold text-[#0B1B3F]">Verifying Attendance</h2>
              <p className="text-xs text-[#5E6C87]">
                Logging your attendance with the Bitnox server...
              </p>
            </div>
          </Card>
        )}

        {/* Case 3: Success */}
        {result && (
          <Card className="bg-white border border-green-200 p-6 text-center space-y-5 shadow-md animate-in fade-in zoom-in-95 duration-200">
            <div className="w-14 h-14 rounded-full bg-green-50 text-[#16A34A] border border-green-200 flex items-center justify-center mx-auto shadow-xs">
              <CheckCircle2 className="w-8 h-8" />
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-center gap-2">
                <Badge variant={result.status === "present" ? "present" : "late"}>
                  {result.type === "IN" ? "Checked In" : "Checked Out"} ({result.status})
                </Badge>
                <span className="text-xs font-semibold text-[#5E6C87]">{result.time}</span>
              </div>
              <h2 className="text-base font-bold text-[#0B1B3F] leading-snug">
                {result.message}
              </h2>
            </div>

            <Button asChild className="w-full min-h-[44px] rounded-full bg-[#0B1B3F] hover:bg-[#0B1B3F]/90 text-white py-3 text-sm font-medium">
              <Link href="/student">
                Go to Dashboard
                <ArrowRight className="w-4 h-4 ml-2" />
              </Link>
            </Button>
          </Card>
        )}

        {/* Case 4: Error */}
        {error && !loading && (
          <Card className="bg-white border border-red-200 p-6 text-center space-y-5 shadow-sm animate-in fade-in duration-200">
            <div className="w-14 h-14 rounded-full bg-red-50 text-[#EF4444] border border-red-200 flex items-center justify-center mx-auto shadow-xs">
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
              <h2 className="text-base font-bold text-[#0B1B3F] leading-snug">
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
                onClick={handleRetry}
                className="w-full min-h-[44px] rounded-full bg-[#0B1B3F] hover:bg-[#0B1B3F]/90 text-white py-3 text-sm font-medium"
              >
                <RefreshCw className="w-4 h-4 mr-2" />
                Retry Verification
              </Button>
              <Button
                asChild
                variant="outline"
                className="w-full min-h-[44px] rounded-full border-[#DDE3EE] py-3 text-sm font-medium"
              >
                <Link href="/student">
                  <Home className="w-4 h-4 mr-2" />
                  Go to Dashboard
                </Link>
              </Button>
            </div>
          </Card>
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
