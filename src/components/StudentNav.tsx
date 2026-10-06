"use client";

import React, { useTransition } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, CalendarCheck, LogOut } from "lucide-react";
import { logoutAction } from "@/lib/actions/auth";

export function StudentDesktopNav() {
  const pathname = usePathname();

  const isHome = pathname === "/student";
  const isWeekly = pathname.startsWith("/student/weekly");

  return (
    <nav className="hidden md:flex items-center space-x-6">
      <Link
        href="/student"
        className={`text-sm font-medium transition-colors ${
          isHome
            ? "text-[#0B1B3F] font-semibold border-b-2 border-[#00E6FF] pb-0.5"
            : "text-[#5E6C87] hover:text-[#0B1B3F]"
        }`}
      >
        Home
      </Link>
      <Link
        href="/student/weekly"
        className={`text-sm font-medium transition-colors ${
          isWeekly
            ? "text-[#0B1B3F] font-semibold border-b-2 border-[#00E6FF] pb-0.5"
            : "text-[#5E6C87] hover:text-[#0B1B3F]"
        }`}
      >
        Weekly Attendance
      </Link>
    </nav>
  );
}

export function StudentMobileNav() {
  const pathname = usePathname();
  const [isPending, startTransition] = useTransition();

  const isHome = pathname === "/student";
  const isWeekly = pathname.startsWith("/student/weekly");

  const handleLogout = () => {
    startTransition(async () => {
      await logoutAction();
    });
  };

  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-white border-t border-[#DDE3EE] px-4 py-1.5 flex items-center justify-around shadow-lg">
      <Link
        href="/student"
        className={`flex flex-col items-center justify-center min-h-[48px] min-w-[48px] py-1 px-3 text-xs font-medium transition-colors ${
          isHome ? "text-[#0B1B3F] font-semibold" : "text-[#5E6C87] hover:text-[#0B1B3F]"
        }`}
        aria-label="Student Home"
      >
        <div className={`p-1 rounded-full ${isHome ? "text-[#0B1B3F]" : ""}`}>
          <Home className="w-5 h-5" />
        </div>
        <span>Home</span>
      </Link>

      <Link
        href="/student/weekly"
        className={`flex flex-col items-center justify-center min-h-[48px] min-w-[48px] py-1 px-3 text-xs font-medium transition-colors ${
          isWeekly ? "text-[#0B1B3F] font-semibold" : "text-[#5E6C87] hover:text-[#0B1B3F]"
        }`}
        aria-label="Weekly Attendance"
      >
        <div className={`p-1 rounded-full ${isWeekly ? "text-[#0B1B3F]" : ""}`}>
          <CalendarCheck className="w-5 h-5" />
        </div>
        <span>Weekly</span>
      </Link>

      <button
        type="button"
        onClick={handleLogout}
        disabled={isPending}
        className="flex flex-col items-center justify-center min-h-[48px] min-w-[48px] py-1 px-3 text-xs font-medium text-[#5E6C87] hover:text-red-600 transition-colors cursor-pointer disabled:opacity-50"
        aria-label="Sign out"
      >
        <div className="p-1 rounded-full">
          <LogOut className="w-5 h-5" />
        </div>
        <span>{isPending ? "Exiting..." : "Logout"}</span>
      </button>
    </nav>
  );
}
