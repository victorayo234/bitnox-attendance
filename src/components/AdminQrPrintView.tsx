"use client";

import React from "react";
import { Printer, Smartphone, HelpCircle, ShieldCheck, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";

interface AdminQrPrintViewProps {
  inQrCode: string;
  outQrCode: string;
}

export function AdminQrPrintView({ inQrCode, outQrCode }: AdminQrPrintViewProps) {
  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="space-y-8 pb-20 print:p-0 print:m-0 print:space-y-0">
      {/* 1. SCREEN-ONLY TOP ACTION BAR */}
      <div className="no-print flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-[#0B1B3F]">
            QR Code Posters
          </h1>
          <p className="text-xs sm:text-sm text-[#5E6C87]">
            Printable Check-In and Check-Out attendance codes generated from server secrets
          </p>
        </div>

        <Button
          variant="primary"
          onClick={handlePrint}
          className="min-h-[44px] px-5 rounded-full text-xs font-semibold shadow-sm self-start sm:self-auto"
        >
          <Printer className="w-4 h-4 mr-2" />
          Print Posters (A4)
        </Button>
      </div>

      {/* 2. SCREEN-ONLY "TEST SCAN" CALLOUT */}
      <div className="no-print p-4 rounded-2xl bg-amber-50/80 border border-amber-200/80 flex items-start gap-3 shadow-2xs">
        <Smartphone className="w-5 h-5 text-amber-700 shrink-0 mt-0.5" />
        <div className="space-y-1">
          <h4 className="text-xs font-bold text-amber-900 uppercase tracking-wider">
            Test scan note
          </h4>
          <p className="text-xs text-amber-800 leading-relaxed font-medium">
            Before pasting these up, scan each printed copy with the app to confirm it works.
          </p>
        </div>
      </div>

      {/* 3. POSTER CONTAINER (Screen: 2-column grid; Print: 2 full A4 pages with page break) */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 print:block print:w-full">
        {/* POSTER 1: CHECK IN */}
        <div className="print-poster-page poster-in bg-white border border-[#DDE3EE] rounded-3xl p-8 sm:p-10 shadow-sm flex flex-col items-center justify-between text-center min-h-[560px] print:border-none print:shadow-none print:p-0 print:m-0 print:min-h-screen">
          {/* Top Brand Header */}
          <div className="flex flex-col items-center space-y-2 pt-2">
            <img
              src="/images/bitnox-logo.png"
              alt="Bitnox"
              className="h-10 sm:h-12 w-auto object-contain print:h-14"
            />
            <div className="h-1 w-16 bg-[#00E6FF] rounded-full print:bg-black print:h-1" />
          </div>

          {/* Main Title & QR Code */}
          <div className="my-auto py-6 flex flex-col items-center space-y-6">
            <div className="space-y-1">
              <span className="text-xs font-bold uppercase tracking-widest text-[#16A34A] print:text-black">
                ATTENDANCE
              </span>
              <h2 className="text-4xl sm:text-5xl font-black text-[#0B1B3F] tracking-tight print:text-black">
                CHECK IN
              </h2>
            </div>

            {/* QR Code Graphic (High-res 1024px black on white) */}
            <div className="p-4 bg-white rounded-2xl border-2 border-[#0B1B3F] shadow-sm print:border-4 print:border-black print:p-4">
              {inQrCode ? (
                <img
                  src={inQrCode}
                  alt="Bitnox Check-In QR Code"
                  className="w-56 h-56 sm:w-64 sm:h-64 object-contain print:w-80 print:h-80"
                />
              ) : (
                <div className="w-56 h-56 flex items-center justify-center text-xs text-red-500 font-semibold">
                  QR_IN_SECRET not configured
                </div>
              )}
            </div>

            {/* One-Line Instruction */}
            <div className="space-y-1 max-w-xs">
              <p className="text-base sm:text-lg font-bold text-[#0B1B3F] print:text-black print:text-xl">
                Scan with the Bitnox Attendance app
              </p>
              <p className="text-xs text-[#5E6C87] print:text-black print:text-sm">
                Hub Gate Hours: 08:00 AM – 12:00 PM
              </p>
            </div>
          </div>

          {/* Footer Subtext */}
          <div className="pt-4 border-t border-[#DDE3EE] w-full text-center text-xs text-[#5E6C87] print:text-black print:border-black/30">
            Bitnox Attendance • Abeokuta Hub
          </div>
        </div>

        {/* POSTER 2: CHECK OUT */}
        <div className="print-poster-page poster-out bg-white border border-[#DDE3EE] rounded-3xl p-8 sm:p-10 shadow-sm flex flex-col items-center justify-between text-center min-h-[560px] print:border-none print:shadow-none print:p-0 print:m-0 print:min-h-screen">
          {/* Top Brand Header */}
          <div className="flex flex-col items-center space-y-2 pt-2">
            <img
              src="/images/bitnox-logo.png"
              alt="Bitnox"
              className="h-10 sm:h-12 w-auto object-contain print:h-14"
            />
            <div className="h-1 w-16 bg-[#00E6FF] rounded-full print:bg-black print:h-1" />
          </div>

          {/* Main Title & QR Code */}
          <div className="my-auto py-6 flex flex-col items-center space-y-6">
            <div className="space-y-1">
              <span className="text-xs font-bold uppercase tracking-widest text-[#0B1B3F] print:text-black">
                ATTENDANCE
              </span>
              <h2 className="text-4xl sm:text-5xl font-black text-[#0B1B3F] tracking-tight print:text-black">
                CHECK OUT
              </h2>
            </div>

            {/* QR Code Graphic (High-res 1024px black on white) */}
            <div className="p-4 bg-white rounded-2xl border-2 border-[#0B1B3F] shadow-sm print:border-4 print:border-black print:p-4">
              {outQrCode ? (
                <img
                  src={outQrCode}
                  alt="Bitnox Check-Out QR Code"
                  className="w-56 h-56 sm:w-64 sm:h-64 object-contain print:w-80 print:h-80"
                />
              ) : (
                <div className="w-56 h-56 flex items-center justify-center text-xs text-red-500 font-semibold">
                  QR_OUT_SECRET not configured
                </div>
              )}
            </div>

            {/* One-Line Instruction */}
            <div className="space-y-1 max-w-xs">
              <p className="text-base sm:text-lg font-bold text-[#0B1B3F] print:text-black print:text-xl">
                Scan with the Bitnox Attendance app
              </p>
              <p className="text-xs text-[#5E6C87] print:text-black print:text-sm">
                Departure Window: 12:00 PM onward
              </p>
            </div>
          </div>

          {/* Footer Subtext */}
          <div className="pt-4 border-t border-[#DDE3EE] w-full text-center text-xs text-[#5E6C87] print:text-black print:border-black/30">
            Bitnox Attendance • Abeokuta Hub
          </div>
        </div>
      </div>

      {/* 4. SCREEN-ONLY ADMIN HELP SECTION */}
      <Card className="no-print bg-white border border-[#DDE3EE] p-6 rounded-2xl shadow-xs space-y-3">
        <div className="flex items-center gap-2.5 text-[#0B1B3F]">
          <div className="w-8 h-8 rounded-full bg-[#F1F4FB] flex items-center justify-center">
            <HelpCircle className="w-4 h-4 text-[#0B1B3F]" />
          </div>
          <h3 className="text-sm font-bold">Managing QR Code Secrets</h3>
        </div>

        <div className="text-xs text-[#5E6C87] leading-relaxed space-y-2 pt-1">
          <p>
            This page replaces any external QR generator and guarantees the printed codes match the
            server&apos;s secrets exactly. Both codes are generated on demand directly from the
            environment variables.
          </p>
          <div className="p-3.5 rounded-xl bg-[#F8FAFD] border border-[#DDE3EE] space-y-1.5 text-[#0B1B3F]">
            <div className="font-semibold text-xs flex items-center gap-1.5">
              <ShieldCheck className="w-4 h-4 text-[#16A34A]" />
              Rotating Secrets Procedure:
            </div>
            <ol className="list-decimal list-inside space-y-1 text-[11px] text-[#5E6C87]">
              <li>
                Generate new random secrets and update <code className="font-mono text-[#0B1B3F] bg-white px-1 py-0.5 rounded border border-[#DDE3EE]">QR_IN_SECRET</code> and <code className="font-mono text-[#0B1B3F] bg-white px-1 py-0.5 rounded border border-[#DDE3EE]">QR_OUT_SECRET</code> in Vercel project settings (or <code className="font-mono text-[#0B1B3F] bg-white px-1 py-0.5 rounded border border-[#DDE3EE]">.env.local</code> locally).
              </li>
              <li>Redeploy the application in Vercel.</li>
              <li>Return to this page and reprint both posters immediately.</li>
            </ol>
          </div>
          <p className="text-[11px]">
            * Note: Old printed copies will immediately fail verification as soon as new secrets are deployed.
          </p>
        </div>
      </Card>

      {/* 5. PRINT-SPECIFIC CSS RULES */}
      <style
        dangerouslySetInnerHTML={{
          __html: `
            @media print {
              /* Hide non-poster elements */
              header,
              nav,
              footer,
              button,
              .no-print,
              aside {
                display: none !important;
              }

              /* Reset page background and layout */
              html,
              body {
                background: #ffffff !important;
                color: #000000 !important;
                margin: 0 !important;
                padding: 0 !important;
                width: 100% !important;
              }

              @page {
                size: A4 portrait;
                margin: 15mm;
              }

              /* Force exact A4 page breaks */
              .poster-in {
                page-break-after: always !important;
                break-after: page !important;
                page-break-inside: avoid !important;
                break-inside: avoid !important;
                height: 94vh !important;
                display: flex !important;
                flex-direction: column !important;
                justify-content: space-between !important;
                align-items: center !important;
              }

              .poster-out {
                page-break-before: always !important;
                break-before: page !important;
                page-break-inside: avoid !important;
                break-inside: avoid !important;
                height: 94vh !important;
                display: flex !important;
                flex-direction: column !important;
                justify-content: space-between !important;
                align-items: center !important;
              }
            }
          `,
        }}
      />
    </div>
  );
}
