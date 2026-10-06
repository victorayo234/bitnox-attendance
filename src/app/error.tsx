"use client";

import React, { useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import { AlertTriangle, RefreshCw, Home } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("Application error boundary triggered:", error);
  }, [error]);

  return (
    <div className="min-h-screen bg-[#F5F8FE] flex flex-col justify-between p-4 sm:p-6">
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

      <main className="max-w-md mx-auto w-full my-auto py-6">
        <Card className="bg-white border border-[#DDE3EE] p-6 sm:p-8 text-center space-y-5 rounded-2xl shadow-sm">
          <div className="w-14 h-14 rounded-full bg-red-50 text-[#EF4444] border border-red-200 flex items-center justify-center mx-auto shadow-xs">
            <AlertTriangle className="w-7 h-7" />
          </div>

          <div className="space-y-1.5">
            <h2 className="text-lg font-bold text-[#0B1B3F]">
              Something went wrong
            </h2>
            <p className="text-xs text-[#5E6C87] leading-relaxed max-w-xs mx-auto">
              We encountered an unexpected error while loading this page. Please try again.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row items-center gap-3 pt-2">
            <Button
              onClick={() => reset()}
              className="w-full min-h-[44px] rounded-full bg-[#0B1B3F] text-white text-xs font-semibold"
            >
              <RefreshCw className="w-4 h-4 mr-2" />
              Try Again
            </Button>

            <Button
              asChild
              variant="outline"
              className="w-full min-h-[44px] rounded-full text-xs font-semibold border-[#DDE3EE] text-[#0B1B3F]"
            >
              <Link href="/">
                <Home className="w-4 h-4 mr-2" />
                Go to Home
              </Link>
            </Button>
          </div>
        </Card>
      </main>

      <footer className="max-w-md mx-auto w-full py-4 text-center text-xs text-[#5E6C87]">
        Bitnox Attendance • Abeokuta Hub
      </footer>
    </div>
  );
}
