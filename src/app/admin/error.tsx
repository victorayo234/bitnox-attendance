"use client";

import React, { useEffect } from "react";
import Link from "next/link";
import { AlertTriangle, RefreshCw, LayoutDashboard } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";

export default function AdminError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("Admin dashboard error:", error);
  }, [error]);

  return (
    <div className="py-8 space-y-4 max-w-md mx-auto">
      <div className="bg-white border border-[#EF4444]/30 p-6 sm:p-8 text-center space-y-5 rounded-[12px] shadow-[0_1px_2px_rgba(11,27,63,0.04)]">
        <div className="w-14 h-14 rounded-[10px] bg-[#EF4444]/10 text-[#EF4444] border border-[#EF4444]/20 flex items-center justify-center mx-auto">
          <AlertTriangle className="w-7 h-7" />
        </div>

        <div className="space-y-1.5">
          <h2 className="text-lg font-semibold text-[#0B1B3F]">
            Admin Console Error
          </h2>
          <p className="text-xs text-[#5E6C87] leading-relaxed">
            Failed to retrieve administrative data. Please retry or refresh your session.
          </p>
        </div>

        <div className="flex flex-col sm:flex-row items-center gap-3 pt-2">
          <Button
            variant="primary"
            size="md"
            fullWidth
            onClick={() => reset()}
            className="h-10 text-sm font-medium rounded-lg"
          >
            <RefreshCw className="w-4 h-4 mr-2" />
            Retry
          </Button>

          <Button
            asChild
            variant="secondary"
            size="md"
            fullWidth
            className="h-10 text-sm font-medium rounded-lg"
          >
            <Link href="/admin">
              <LayoutDashboard className="w-4 h-4 mr-2" />
              Console Home
            </Link>
          </Button>
        </div>
      </div>
    </div>
  );
}
