"use client";

import React, { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  CalendarRange,
  Users,
  UserCheck,
  QrCode,
  X,
  Shield,
  ArrowRight,
} from "lucide-react";
import { LogoutButton } from "@/components/LogoutButton";

interface AdminHeaderProps {
  userName: string;
  userEmail: string;
  pendingCount?: number;
}

function getInitials(name: string): string {
  if (!name) return "AD";
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

export function AdminHeader({
  userName,
  userEmail,
  pendingCount = 0,
}: AdminHeaderProps) {
  const pathname = usePathname();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const navItems = [
    {
      name: "Dashboard",
      href: "/admin",
      icon: LayoutDashboard,
      isActive: pathname === "/admin",
    },
    {
      name: "Weekly",
      href: "/admin/weekly",
      icon: CalendarRange,
      isActive: pathname.startsWith("/admin/weekly"),
    },
    {
      name: "Students",
      href: "/admin/students",
      icon: Users,
      isActive:
        pathname === "/admin/students" || pathname.startsWith("/admin/students/"),
    },
    {
      name: "Approvals",
      href: "/admin/approvals",
      icon: UserCheck,
      isActive: pathname.startsWith("/admin/approvals"),
      badge: pendingCount > 0 ? pendingCount : null,
    },
    {
      name: "QR Codes",
      href: "/admin/qr",
      icon: QrCode,
      isActive: pathname.startsWith("/admin/qr"),
    },
  ];

  const initials = getInitials(userName);

  return (
    <>
      <header className="sticky top-0 z-40 bg-white border-b border-border shadow-[0_1px_2px_rgba(11,27,63,0.04)]">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          {/* Left: Logo & Console Indicator (Desktop) */}
          <div className="flex items-center gap-3">
            <Link href="/admin" className="flex items-center" aria-label="Bitnox Attendance Admin Home">
              <Image
                src="/images/bitnox-logo.png"
                alt="Bitnox Attendance"
                width={120}
                height={30}
                priority
                className="h-7 w-auto object-contain"
              />
            </Link>

            {/* Plain muted text divider & Console indicator */}
            <div className="hidden md:flex items-center gap-3">
              <span className="h-5 w-[1px] bg-border" aria-hidden="true" />
              <span className="text-sm text-muted font-normal select-none">
                Console
              </span>
            </div>
          </div>

          {/* Center: Desktop Navigation Tabs */}
          <nav className="hidden md:flex items-center gap-1 lg:gap-2 h-16">
            {navItems.map((item) => {
              const Icon = item.icon;
              const active = item.isActive;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`inline-flex items-center gap-1.5 px-3 h-16 text-sm transition-colors border-b-2 select-none ${
                    active
                      ? "text-primary font-semibold border-primary"
                      : "text-muted hover:text-primary font-medium border-transparent"
                  }`}
                >
                  <Icon className="h-4 w-4 shrink-0" />
                  <span>{item.name}</span>
                  {item.badge !== null && item.badge !== undefined && (
                    <span className="px-1.5 py-0.5 rounded-full text-[11px] font-semibold bg-primary/10 text-primary">
                      {item.badge}
                    </span>
                  )}
                </Link>
              );
            })}
          </nav>

          {/* Right: Desktop Controls (View switcher | User block | Log out) */}
          <div className="hidden md:flex items-center">
            {/* View switcher */}
            <div className="bg-soft p-1 rounded-lg border border-border inline-flex items-center text-xs">
              <span className="bg-white text-primary border border-border shadow-[0_1px_2px_rgba(11,27,63,0.04)] px-2.5 py-1 font-medium rounded-md select-none">
                Admin console
              </span>
              <Link
                href="/api/view-mode?mode=student"
                className="text-muted hover:text-primary px-2.5 py-1 font-medium transition-colors rounded-md"
              >
                Student view
              </Link>
            </div>

            <span className="h-5 w-[1px] bg-border mx-3" aria-hidden="true" />

            {/* User block */}
            <div className="flex items-center gap-2.5">
              <div
                className="w-8 h-8 rounded-full bg-primary/10 text-primary font-semibold text-xs flex items-center justify-center shrink-0 select-none"
                aria-hidden="true"
              >
                {initials}
              </div>
              <div className="flex flex-col text-left max-w-[130px]">
                <span className="text-sm font-medium text-primary truncate leading-tight" title={userName}>
                  {userName}
                </span>
                <span className="text-xs text-muted leading-tight">
                  Administrator
                </span>
              </div>
            </div>

            <span className="h-5 w-[1px] bg-border mx-3" aria-hidden="true" />

            {/* Log out icon button */}
            <LogoutButton variant="ghost" />
          </div>

          {/* Mobile Right: Avatar Button */}
          <div className="md:hidden flex items-center">
            <button
              type="button"
              onClick={() => setMobileMenuOpen(true)}
              className="w-8 h-8 rounded-full bg-primary/10 text-primary font-semibold text-xs flex items-center justify-center focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
              aria-label="Open user profile and options"
            >
              {initials}
            </button>
          </div>
        </div>
      </header>

      {/* Mobile User Popover / Bottom Sheet */}
      {mobileMenuOpen && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/40 backdrop-blur-xs p-0 sm:p-4"
          onClick={() => setMobileMenuOpen(false)}
        >
          <div
            className="bg-white rounded-t-2xl sm:rounded-xl max-w-sm w-full p-5 border border-border shadow-2xl space-y-4 animate-in slide-in-from-bottom"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between pb-3 border-b border-border">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-primary/10 text-primary font-bold text-sm flex items-center justify-center shrink-0">
                  {initials}
                </div>
                <div className="flex flex-col">
                  <span className="text-sm font-semibold text-primary">
                    {userName}
                  </span>
                  <span className="text-xs text-muted truncate max-w-[180px]">
                    {userEmail}
                  </span>
                  <span className="text-[11px] font-medium text-muted mt-0.5 inline-flex items-center gap-1">
                    <Shield className="w-3 h-3 text-primary" />
                    Administrator
                  </span>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setMobileMenuOpen(false)}
                className="w-8 h-8 rounded-lg flex items-center justify-center text-muted hover:text-primary hover:bg-soft transition-colors"
                aria-label="Close menu"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Mobile View Switcher */}
            <div className="space-y-1.5">
              <span className="text-xs font-medium text-muted">Portal Mode</span>
              <div className="grid grid-cols-2 gap-1 p-1 bg-soft rounded-lg border border-border text-xs">
                <span className="bg-white text-primary border border-border shadow-[0_1px_2px_rgba(11,27,63,0.04)] py-2 text-center font-medium rounded-md">
                  Admin console
                </span>
                <Link
                  href="/api/view-mode?mode=student"
                  onClick={() => setMobileMenuOpen(false)}
                  className="text-muted hover:text-primary py-2 text-center font-medium transition-colors rounded-md"
                >
                  Student view
                </Link>
              </div>
            </div>

            {/* Full-width Log out button */}
            <div className="pt-2">
              <LogoutButton variant="secondary" showText fullWidth />
            </div>
          </div>
        </div>
      )}

      {/* Fixed Mobile Bottom Bar */}
      <nav
        aria-label="Mobile Navigation"
        className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-white border-t border-border flex items-center justify-around px-2 py-1 shadow-[0_-1px_3px_rgba(11,27,63,0.05)] pb-[max(0.35rem,env(safe-area-inset-bottom,0px))]"
      >
        {navItems.map((item) => {
          const Icon = item.icon;
          const active = item.isActive;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex flex-col items-center justify-center min-h-[44px] min-w-[52px] py-1 px-1 text-[11px] font-medium transition-colors relative select-none ${
                active ? "text-primary font-semibold" : "text-muted hover:text-primary"
              }`}
            >
              {active && (
                <span className="absolute top-0 left-3 right-3 h-0.5 bg-primary rounded-full" />
              )}
              <div className="relative">
                <Icon className="w-5 h-5" />
                {item.badge !== null && item.badge !== undefined && (
                  <span className="absolute -top-1 -right-2 px-1 min-w-[14px] h-3.5 flex items-center justify-center rounded-full text-[9px] font-bold bg-primary text-white">
                    {item.badge}
                  </span>
                )}
              </div>
              <span className="mt-0.5 truncate max-w-[60px]">{item.name}</span>
            </Link>
          );
        })}
      </nav>
    </>
  );
}

// Backward compatible export
export function AdminNav({ pendingCount = 0 }: { pendingCount?: number }) {
  return null;
}
