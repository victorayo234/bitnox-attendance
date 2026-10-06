"use client";

import React, { useEffect } from "react";
import Image from "next/image";
import { CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/Button";

export interface SuccessPopupProps {
  isOpen: boolean;
  message: string;
  time?: string;
  type?: "IN" | "OUT";
  status?: "present" | "late";
  onClose: () => void;
}

export function SuccessPopup({
  isOpen,
  message,
  time,
  type,
  status,
  onClose,
}: SuccessPopupProps) {
  useEffect(() => {
    if (!isOpen) return;

    // Auto-closes after 3 seconds
    const timer = setTimeout(() => {
      onClose();
    }, 3000);

    return () => clearTimeout(timer);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs transition-opacity animate-in fade-in duration-200"
    >
      <div className="w-full max-w-sm rounded-[16px] border border-[#DDE3EE] bg-white p-6 shadow-2xl text-center space-y-4 animate-in zoom-in-95 duration-200">
        {/* Bitnox Logo with Cyan Accent */}
        <div className="flex flex-col items-center justify-center space-y-1.5">
          <Image
            src="/images/bitnox-logo.png"
            alt="Bitnox Attendance"
            width={120}
            height={30}
            priority
            className="h-7 w-auto object-contain"
          />
          <div className="h-0.5 w-12 bg-[#00E6FF] rounded-full" />
        </div>

        {/* Green Check Icon */}
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-green-50 text-[#16A34A] border border-green-200 shadow-xs">
          <CheckCircle2 className="h-8 w-8" />
        </div>

        {/* Message and Time details */}
        <div className="space-y-1.5">
          <h3 className="text-base font-bold text-[#0B1B3F] leading-snug">
            {message}
          </h3>
          {time && (
            <p className="text-xs font-semibold text-[#5E6C87]">
              Recorded at {time}
              {type && ` • ${type === "IN" ? "Check-In" : "Check-Out"}`}
              {status && ` (${status === "late" ? "Late" : "Present"})`}
            </p>
          )}
        </div>

        {/* Navy Continue Button */}
        <div className="pt-2">
          <Button
            className="w-full rounded-full bg-[#0B1B3F] hover:bg-[#0B1B3F]/90 text-white font-medium py-2.5 shadow-sm"
            onClick={onClose}
          >
            Continue
          </Button>
        </div>
      </div>
    </div>
  );
}
