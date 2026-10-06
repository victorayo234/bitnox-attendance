"use client";

import React, { useEffect } from "react";
import Link from "next/link";
import { AlertTriangle, RefreshCw, LayoutDashboard } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";

export default function AdminQrError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("Admin QR page error:", error);
  }, [error]);

  return (
    <div className="py-8 space-y-4 max-w-md mx-auto">
      <Card className="bg-white border border-red-200 p-6 sm:p-8 text-center space-y-5 rounded-2xl shadow-sm">
        <div className="w-14 h-14 rounded-full bg-red-50 text-[#EF4444] border border-red-200 flex items-center justify-center mx-auto">
          <AlertTriangle className="w-7 h-7" />
        </div>

        <div className="space-y-1.5">
          <h2 className="text-lg font-bold text-[#0B1B3F]">
            QR Generation Error
          </h2>
          <p className="text-xs text-[#5E6C87] leading-relaxed">
            Failed to generate printable QR codes. Please retry or verify server environment variables.
          </p>
        </div>

        <div className="flex flex-col sm:flex-row items-center gap-3 pt-2">
          <Button
            onClick={() => reset()}
            className="w-full min-h-[44px] rounded-full bg-[#0B1B3F] text-white text-xs font-semibold"
          >
            <RefreshCw className="w-4 h-4 mr-2" />
            Retry
          </Button>

          <Button
            asChild
            variant="outline"
            className="w-full min-h-[44px] rounded-full text-xs font-semibold border-[#DDE3EE]"
          >
            <Link href="/admin">
              <LayoutDashboard className="w-4 h-4 mr-2" />
              Console Home
            </Link>
          </Button>
        </div>
      </Card>
    </div>
  );
}
