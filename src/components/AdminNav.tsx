"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  CalendarRange,
  Users,
  UserCheck,
  QrCode,
} from "lucide-react";

interface AdminNavProps {
  pendingCount?: number;
}

export function AdminNav({ pendingCount = 0 }: AdminNavProps) {
  const pathname = usePathname();

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
      isActive: pathname === "/admin/students" || pathname.startsWith("/admin/students/"),
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

  return (
    <nav className="max-w-5xl mx-auto px-4 sm:px-6 flex items-center gap-1 sm:gap-2 overflow-x-auto py-2">
      {navItems.map((item) => {
        const Icon = item.icon;
        const active = item.isActive;
        return (
          <Link
            key={item.href}
            href={item.href}
            className={`inline-flex items-center gap-1.5 px-3.5 py-2 rounded-full text-xs font-semibold whitespace-nowrap transition-colors min-h-[44px] ${
              active
                ? "bg-[#0B1B3F] text-white shadow-2xs"
                : "text-[#5E6C87] hover:text-[#0B1B3F] hover:bg-[#F1F4FB]"
            }`}
          >
            <Icon className="h-3.5 w-3.5" />
            <span>{item.name}</span>
            {item.badge !== null && item.badge !== undefined && (
              <span
                className={`ml-0.5 px-1.5 py-0.2 rounded-full text-[10px] font-bold ${
                  active ? "bg-white text-[#0B1B3F]" : "bg-late text-white"
                }`}
              >
                {item.badge}
              </span>
            )}
          </Link>
        );
      })}
    </nav>
  );
}
