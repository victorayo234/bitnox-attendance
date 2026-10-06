"use client";

import React, { useState, useEffect, useTransition } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button, Card, CardContent, LogoutButton } from "@/components";
import { Clock, AlertTriangle, RefreshCw, Mail, User, ShieldX } from "lucide-react";

interface PendingClientProps {
  fullName: string;
  email: string;
  status: "pending" | "rejected";
}

export function PendingClient({ fullName, email, status }: PendingClientProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [countdown, setCountdown] = useState(30);

  // Auto re-check every 30 seconds
  useEffect(() => {
    if (status !== "pending") return;

    const timer = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          startTransition(() => {
            router.refresh();
          });
          return 30;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [status, router]);

  function handleCheckAgain() {
    setCountdown(30);
    startTransition(() => {
      router.refresh();
    });
  }

  const isRejected = status === "rejected";

  return (
    <div className="min-h-screen bg-[#F1F4FB] flex flex-col justify-between p-4 sm:p-6">
      {/* Top bar with logo */}
      <header className="max-w-md mx-auto w-full py-4 flex items-center justify-between">
        <Link href="/" className="inline-block transition-opacity hover:opacity-85">
          <div className="flex flex-col">
            <Image
              src="/images/bitnox-logo.png"
              alt="Bitnox Attendance"
              width={130}
              height={32}
              priority
              className="h-8 w-auto object-contain"
            />
            <div className="h-0.5 w-8 bg-[#00E6FF] rounded-full mt-1" />
          </div>
        </Link>
        <LogoutButton />
      </header>

      {/* Main card */}
      <main className="max-w-md mx-auto w-full my-auto py-6">
        <Card className="bg-white border border-[#DDE3EE] shadow-sm rounded-2xl overflow-hidden">
          {isRejected ? (
            /* Rejected Screen */
            <CardContent className="pt-8 pb-8 px-6 text-center space-y-6">
              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-red-50 text-[#EF4444] border border-red-200">
                <ShieldX className="h-8 w-8" />
              </div>

              <div className="space-y-2">
                <h1 className="text-xl font-bold tracking-tight text-[#0B1B3F]">
                  Sign-up Not Approved
                </h1>
                <p className="text-sm text-[#5E6C87] leading-relaxed px-2">
                  Your sign-up was not approved. Please contact the admin.
                </p>
              </div>

              {/* Student Identity Box */}
              <div className="rounded-xl bg-[#F1F4FB] border border-[#DDE3EE] p-4 text-left space-y-2.5 text-xs">
                <div className="flex items-center gap-2 text-[#0B1B3F] font-medium">
                  <User className="h-4 w-4 text-[#5E6C87]" />
                  <span>{fullName}</span>
                </div>
                <div className="flex items-center gap-2 text-[#5E6C87]">
                  <Mail className="h-4 w-4 text-[#5E6C87]" />
                  <span>{email}</span>
                </div>
                <div className="pt-1 flex items-center justify-between border-t border-[#DDE3EE]/60 text-[11px]">
                  <span className="text-[#5E6C87]">Enrollment status:</span>
                  <span className="font-semibold text-[#EF4444] bg-red-50 px-2 py-0.5 rounded-full border border-red-200">
                    Rejected
                  </span>
                </div>
              </div>

              {/* Rejected user only sees Logout */}
              <div className="pt-2">
                <LogoutButton />
              </div>
            </CardContent>
          ) : (
            /* Pending Approval Screen */
            <CardContent className="pt-8 pb-8 px-6 text-center space-y-6">
              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-amber-50 text-[#F59E0B] border border-amber-200">
                <Clock className="h-8 w-8 animate-pulse" />
              </div>

              <div className="space-y-2">
                <h1 className="text-xl font-bold tracking-tight text-[#0B1B3F]">
                  Waiting for Approval
                </h1>
                <p className="text-sm text-[#5E6C87] leading-relaxed px-2">
                  Your account is waiting for approval. Please ask the admin at the hub to approve you.
                </p>
              </div>

              {/* Student Identity Box */}
              <div className="rounded-xl bg-[#F1F4FB] border border-[#DDE3EE] p-4 text-left space-y-2.5 text-xs">
                <div className="flex items-center gap-2 text-[#0B1B3F] font-medium">
                  <User className="h-4 w-4 text-[#5E6C87]" />
                  <span>{fullName}</span>
                </div>
                <div className="flex items-center gap-2 text-[#5E6C87]">
                  <Mail className="h-4 w-4 text-[#5E6C87]" />
                  <span>{email}</span>
                </div>
                <div className="pt-1 flex items-center justify-between border-t border-[#DDE3EE]/60 text-[11px]">
                  <span className="text-[#5E6C87]">Enrollment status:</span>
                  <span className="font-semibold text-[#F59E0B] bg-amber-50 px-2 py-0.5 rounded-full border border-amber-200">
                    Pending Admin Approval
                  </span>
                </div>
              </div>

              {/* Check Again Button & Auto-refresh status */}
              <div className="space-y-3 pt-2">
                <Button
                  variant="primary"
                  size="lg"
                  fullWidth
                  disabled={isPending}
                  onClick={handleCheckAgain}
                  className="py-3 text-xs font-semibold flex items-center justify-center gap-2"
                >
                  <RefreshCw className={`h-4 w-4 ${isPending ? "animate-spin" : ""}`} />
                  {isPending ? "Checking status..." : "Check again"}
                </Button>

                <p className="text-[11px] text-[#5E6C87] flex items-center justify-center gap-1.5">
                  <span className="inline-block w-1.5 h-1.5 rounded-full bg-emerald-500 animate-ping" />
                  Auto-checking every 30s ({countdown}s)
                </p>
              </div>

              {/* Logout Option */}
              <div className="pt-2 border-t border-[#DDE3EE]">
                <LogoutButton />
              </div>
            </CardContent>
          )}
        </Card>
      </main>

      {/* Footer */}
      <footer className="max-w-md mx-auto w-full py-4 text-center text-xs text-[#5E6C87]">
        Bitnox Attendance • Abeokuta Hub
      </footer>
    </div>
  );
}
