import React from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/Card";
import { QrCode, ArrowRight } from "lucide-react";
import Link from "next/link";

export const metadata = {
  title: "QR Codes | Bitnox Attendance",
  description: "Printable check-in and check-out QR codes for hub attendance",
};

export default function AdminQrCodesPage() {
  return (
    <div className="space-y-6 max-w-4xl">
      <div className="space-y-1">
        <h1 className="text-2xl font-bold tracking-tight text-[#0B1B3F]">
          QR Codes
        </h1>
        <p className="text-xs sm:text-sm text-[#5E6C87]">
          Printable Check-In and Check-Out QR codes for the welcome table
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Card className="bg-white border border-[#DDE3EE] p-6 rounded-2xl shadow-xs space-y-3">
          <div className="w-12 h-12 rounded-2xl bg-green-50 text-[#16A34A] border border-green-200 flex items-center justify-center">
            <QrCode className="w-6 h-6" />
          </div>
          <div className="space-y-1">
            <h3 className="text-base font-bold text-[#0B1B3F]">CHECK IN Code</h3>
            <p className="text-xs text-[#5E6C87]">
              Scanned by students arriving at the hub between 08:00 AM and 12:00 PM.
            </p>
          </div>
          <div className="pt-2 text-[11px] font-semibold text-[#16A34A] bg-green-50/70 border border-green-200 px-3 py-1.5 rounded-full inline-block">
            Printable Poster & Display View (Coming Next Prompt)
          </div>
        </Card>

        <Card className="bg-white border border-[#DDE3EE] p-6 rounded-2xl shadow-xs space-y-3">
          <div className="w-12 h-12 rounded-2xl bg-[#F1F4FB] text-[#0B1B3F] border border-[#DDE3EE] flex items-center justify-center">
            <QrCode className="w-6 h-6 text-[#00E6FF]" />
          </div>
          <div className="space-y-1">
            <h3 className="text-base font-bold text-[#0B1B3F]">CHECK OUT Code</h3>
            <p className="text-xs text-[#5E6C87]">
              Scanned by students departing the hub from 12:00 PM onward.
            </p>
          </div>
          <div className="pt-2 text-[11px] font-semibold text-[#0B1B3F] bg-[#F1F4FB] border border-[#DDE3EE] px-3 py-1.5 rounded-full inline-block">
            Printable Poster & Display View (Coming Next Prompt)
          </div>
        </Card>
      </div>
    </div>
  );
}
