"use client";

import React, { useState } from "react";
import { QrScanner } from "@/components/QrScanner";
import { useScanSubmit } from "@/hooks/useScanSubmit";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { CheckCircle2, AlertTriangle, ArrowLeft, RefreshCw, Zap } from "lucide-react";
import Link from "next/link";

export default function ScannerTestPage() {
  const { loading, result, error, submitScan, reset } = useScanSubmit();
  const [lastScannedRaw, setLastScannedRaw] = useState<string | null>(null);
  const [scannerKey, setScannerKey] = useState<number>(0);

  const handleScan = async (code: string) => {
    setLastScannedRaw(code);
    await submitScan(code);
  };

  const handleResetAndScanAgain = () => {
    reset();
    setLastScannedRaw(null);
    setScannerKey((prev) => prev + 1);
  };

  return (
    <div className="max-w-md mx-auto space-y-6 pb-12">
      {/* Top Navigation */}
      <div className="flex items-center justify-between">
        <Link
          href="/student"
          className="inline-flex items-center text-xs font-medium text-[#5E6C87] hover:text-[#0B1B3F] transition-colors"
        >
          <ArrowLeft className="w-3.5 h-3.5 mr-1" />
          Back to Dashboard
        </Link>
        <Badge variant="neutral">Test Mode</Badge>
      </div>

      {/* Page Header */}
      <div className="text-center space-y-1">
        <h1 className="text-2xl font-bold text-[#0B1B3F] tracking-tight">
          QR Scanner Live Test
        </h1>
        <p className="text-xs text-[#5E6C87]">
          Point your phone camera at the Bitnox entrance or exit QR code
        </p>
      </div>

      {/* Live Scanner Container */}
      <Card className="p-4 sm:p-5">
        <QrScanner
          key={scannerKey}
          onScan={handleScan}
          disabled={loading || Boolean(result)}
          helperText="Align the Bitnox QR code within the frame"
        />
      </Card>

      {/* Submission Loading Feedback */}
      {loading && (
        <Card className="border-cyan-200 bg-cyan-50/50 p-4 text-center">
          <div className="flex items-center justify-center gap-2 text-sm font-medium text-[#0B1B3F]">
            <RefreshCw className="w-4 h-4 animate-spin text-[#0B1B3F]" />
            Verifying attendance with server...
          </div>
          {lastScannedRaw && (
            <p className="text-[11px] text-[#5E6C87] mt-1 break-all">
              Payload: {lastScannedRaw}
            </p>
          )}
        </Card>
      )}

      {/* Success Result View */}
      {result && (
        <Card className="border-green-200 bg-green-50/40 p-5 space-y-4">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-full bg-green-100 text-green-700 flex items-center justify-center shrink-0">
              <CheckCircle2 className="w-6 h-6" />
            </div>
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <Badge variant={result.status === "present" ? "present" : "late"}>
                  {result.type === "IN" ? "Checked In" : "Checked Out"} ({result.status})
                </Badge>
                <span className="text-xs font-medium text-[#5E6C87]">{result.time}</span>
              </div>
              <h3 className="font-semibold text-sm text-[#0B1B3F]">{result.message}</h3>
            </div>
          </div>

          <Button
            className="w-full"
            onClick={handleResetAndScanAgain}
          >
            <RefreshCw className="w-4 h-4 mr-2" />
            Scan Again
          </Button>
        </Card>
      )}

      {/* Error Result View */}
      {error && !loading && (
        <Card className="border-red-200 bg-red-50/50 p-5 space-y-4">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-full bg-red-100 text-red-700 flex items-center justify-center shrink-0">
              <AlertTriangle className="w-6 h-6" />
            </div>
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <Badge variant="absent">Scan Error</Badge>
                <span className="text-[11px] font-mono text-[#5E6C87]">{error.code}</span>
              </div>
              <p className="text-sm text-[#0B1B3F] font-medium">{error.message}</p>
            </div>
          </div>

          <Button
            variant="outline"
            className="w-full"
            onClick={handleResetAndScanAgain}
          >
            <RefreshCw className="w-4 h-4 mr-2" />
            Try Another Scan
          </Button>
        </Card>
      )}

      {/* Quick Test Payloads (helpful if testing on desktop or without printed QR) */}
      <Card className="p-4 space-y-3 bg-[#F8FAFC]">
        <div className="flex items-center gap-1.5 text-xs font-semibold text-[#0B1B3F]">
          <Zap className="w-3.5 h-3.5 text-amber-500" />
          Simulate Camera Scans (Test Shortcuts)
        </div>
        <p className="text-[11px] text-[#5E6C87]">
          Click below to test server verification without scanning physical codes:
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
          <Button
            size="sm"
            variant="outline"
            className="text-xs"
            onClick={() => handleScan("https://bitnox.com/?code=bitnox-in-w3lc0m3")}
          >
            Simulate Check-In
          </Button>
          <Button
            size="sm"
            variant="outline"
            className="text-xs"
            onClick={() => handleScan("https://bitnox.com/?code=bitnox-out-g00dby3")}
          >
            Simulate Check-Out
          </Button>
          <Button
            size="sm"
            variant="outline"
            className="text-xs"
            onClick={() => handleScan("invalid-fake-qr-code")}
          >
            Simulate Invalid
          </Button>
        </div>
      </Card>
    </div>
  );
}
