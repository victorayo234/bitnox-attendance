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
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs transition-opacity animate-in fade-in duration-200"
    >
      <div className="w-full max-w-sm rounded-[12px] border border-[#DDE3EE] bg-white p-6 shadow-xl text-center space-y-4 animate-in zoom-in-95 duration-200">
        {/* Bitnox Logo */}
        <div className="flex flex-col items-center justify-center">
          <Image
            src="/images/bitnox-logo.png"
            alt="Bitnox Attendance"
            width={120}
            height={30}
            priority
            className="h-7 w-auto object-contain"
          />
        </div>

        {/* Green Check Icon Tile */}
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-[10px] bg-[#16A34A]/10 text-[#16A34A] border border-[#16A34A]/20">
          <CheckCircle2 className="h-8 w-8" />
        </div>

        {/* Message and Time details */}
        <div className="space-y-1.5">
          <h3 className="text-base font-semibold text-[#0B1B3F] leading-snug">
            {message}
          </h3>
          {time && (
            <p className="text-xs font-medium text-[#5E6C87]">
              Recorded at {time}
              {type && ` • ${type === "IN" ? "Check-In" : "Check-Out"}`}
              {status && ` (${status === "late" ? "Late" : "Present"})`}
            </p>
          )}
        </div>

        {/* Navy Continue Button */}
        <div className="pt-2">
          <Button
            variant="primary"
            size="md"
            fullWidth
            className="h-10 text-sm font-medium"
            onClick={onClose}
          >
            Continue
          </Button>
        </div>
      </div>
    </div>
  );
}
