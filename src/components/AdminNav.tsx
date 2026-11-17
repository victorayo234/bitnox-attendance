"use client";

import React, {
  useState,
  useEffect,
  useRef,
  useTransition,
  useCallback,
} from "react";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Menu,
  X,
  LayoutDashboard,
  CalendarDays,
  Users,
  UserCheck,
  QrCode,
  GraduationCap,
  ArrowUpRight,
  Shield,
  LogOut,
  ChevronRight,
  ChevronDown,
} from "lucide-react";
import { logoutAction } from "@/lib/actions/auth";

export interface AdminHeaderProps {
  userName?: string;
  userEmail?: string;
  pendingCount?: number;
}

function getInitials(name?: string): string {
  if (!name || !name.trim()) return "AD";
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

function getPageName(pathname: string): string {
  if (pathname === "/admin") return "Dashboard";
  if (pathname.startsWith("/admin/weekly")) return "Weekly";
  if (pathname.startsWith("/admin/students")) return "Students";
  if (pathname.startsWith("/admin/approvals")) return "Approvals";
  if (pathname.startsWith("/admin/qr")) return "QR Codes";
  return "Dashboard";
}

export function AdminHeader({
  userName = "",
  userEmail = "",
  pendingCount = 0,
}: AdminHeaderProps) {
  const pathname = usePathname();
  const [isNavOpen, setIsNavOpen] = useState(false);
  const [isAccountOpen, setIsAccountOpen] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);
  const [isLoggingOut, startLogoutTransition] = useTransition();

  const navContainerRef = useRef<HTMLDivElement>(null);
  const accountContainerRef = useRef<HTMLDivElement>(null);
  const navButtonRef = useRef<HTMLButtonElement>(null);
  const accountButtonRef = useRef<HTMLButtonElement>(null);
  const accountLogoutRef = useRef<HTMLButtonElement>(null);
  const navItemRefs = useRef<(HTMLAnchorElement | HTMLButtonElement | null)[]>([]);

  const currentPageName = getPageName(pathname);
  const initials = getInitials(userName);
  const hasUserLoaded = Boolean(userName && userName.trim().length > 0);
  const hasPending = pendingCount > 0;

  const handleLogout = useCallback(() => {
    startLogoutTransition(async () => {
      await logoutAction();
    });
  }, []);

  // 1. Scroll listener for subtle shadow (>4px scroll)
  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 4);
    };
    handleScroll();
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  // 2. Close on route change
  useEffect(() => {
    setIsNavOpen(false);
    setIsAccountOpen(false);
  }, [pathname]);

  // 3. Close on click outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      const target = event.target as Node;
      if (
        isNavOpen &&
        navContainerRef.current &&
        !navContainerRef.current.contains(target)
      ) {
        setIsNavOpen(false);
      }
      if (
        isAccountOpen &&
        accountContainerRef.current &&
        !accountContainerRef.current.contains(target)
      ) {
        setIsAccountOpen(false);
      }
    }

    if (isNavOpen || isAccountOpen) {
      document.addEventListener("mousedown", handleClickOutside);
      return () => {
        document.removeEventListener("mousedown", handleClickOutside);
      };
    }
  }, [isNavOpen, isAccountOpen]);

  // 4. Close on Escape and return focus
  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        if (isNavOpen) {
          setIsNavOpen(false);
          navButtonRef.current?.focus();
        }
        if (isAccountOpen) {
          setIsAccountOpen(false);
          accountButtonRef.current?.focus();
        }
      }
    }

    if (isNavOpen || isAccountOpen) {
      document.addEventListener("keydown", handleKeyDown);
      return () => {
        document.removeEventListener("keydown", handleKeyDown);
      };
    }
  }, [isNavOpen, isAccountOpen]);

  // 5. Lock body scroll on mobile while navigation sheet is open
  useEffect(() => {
    if (isNavOpen && typeof window !== "undefined") {
      if (window.innerWidth < 640) {
        const originalOverflow = document.body.style.overflow;
        document.body.style.overflow = "hidden";
        return () => {
          document.body.style.overflow = originalOverflow;
        };
      }
    }
  }, [isNavOpen]);

  // 6. Auto-focus active or first item when nav menu opens
  useEffect(() => {
    if (isNavOpen) {
      const timer = setTimeout(() => {
        const items = navItemRefs.current.filter(Boolean) as (
          | HTMLAnchorElement
          | HTMLButtonElement
        )[];
        const activeItem = items.find(
          (item) => item.getAttribute("aria-current") === "page"
        );
        if (activeItem) {
          activeItem.focus();
        } else if (items[0]) {
          items[0].focus();
        }
      }, 50);
      return () => clearTimeout(timer);
    }
  }, [isNavOpen]);

  // 7. Auto-focus logout item when account popover opens
  useEffect(() => {
    if (isAccountOpen) {
      const timer = setTimeout(() => {
        accountLogoutRef.current?.focus();
      }, 50);
      return () => clearTimeout(timer);
    }
  }, [isAccountOpen]);

  const toggleNav = () => {
    setIsNavOpen((prev) => {
      const next = !prev;
      if (next) setIsAccountOpen(false);
      return next;
    });
  };

  const toggleAccount = () => {
    setIsAccountOpen((prev) => {
      const next = !prev;
      if (next) setIsNavOpen(false);
      return next;
    });
  };

  const navItems = [
    {
      name: "Dashboard",
      href: "/admin",
      icon: LayoutDashboard,
      isActive: pathname === "/admin",
      badge: null,
    },
    {
      name: "Weekly",
      href: "/admin/weekly",
      icon: CalendarDays,
      isActive: pathname.startsWith("/admin/weekly"),
      badge: null,
    },
    {
      name: "Students",
      href: "/admin/students",
      icon: Users,
      isActive:
        pathname === "/admin/students" || pathname.startsWith("/admin/students/"),
      badge: null,
    },
    {
      name: "Approvals",
      href: "/admin/approvals",
      icon: UserCheck,
      isActive: pathname.startsWith("/admin/approvals"),
      badge: hasPending ? pendingCount : null,
    },
    {
      name: "QR Codes",
      href: "/admin/qr",
      icon: QrCode,
      isActive: pathname.startsWith("/admin/qr"),
      badge: null,
    },
  ];

  const handleNavMenuKeyDown = (e: React.KeyboardEvent) => {
    const items = navItemRefs.current.filter(Boolean) as (
      | HTMLAnchorElement
      | HTMLButtonElement
    )[];
    if (items.length === 0) return;

    const currentIndex = items.indexOf(
      document.activeElement as HTMLAnchorElement | HTMLButtonElement
    );

    if (e.key === "ArrowDown") {
      e.preventDefault();
      const nextIndex =
        currentIndex >= 0 && currentIndex < items.length - 1
          ? currentIndex + 1
          : 0;
      items[nextIndex]?.focus();
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      const prevIndex =
        currentIndex > 0 ? currentIndex - 1 : items.length - 1;
      items[prevIndex]?.focus();
    } else if (e.key === "Home") {
      e.preventDefault();
      items[0]?.focus();
    } else if (e.key === "End") {
      e.preventDefault();
      items[items.length - 1]?.focus();
    } else if (e.key === "Tab") {
      if (typeof window !== "undefined" && window.innerWidth < 640) {
        if (e.shiftKey) {
          if (document.activeElement === items[0]) {
            e.preventDefault();
            items[items.length - 1]?.focus();
          }
        } else {
          if (document.activeElement === items[items.length - 1]) {
            e.preventDefault();
            items[0]?.focus();
          }
        }
      }
    }
  };

  return (
    <>
      <style>{`
        @keyframes adminDropdownEnter {
          from {
            opacity: 0;
            transform: translateY(-4px) scale(0.98);
          }
          to {
            opacity: 1;
            transform: translateY(0) scale(1);
          }
        }
        .admin-dropdown-anim {
          animation: adminDropdownEnter 150ms cubic-bezier(0.16, 1, 0.3, 1) forwards;
        }
        @media (prefers-reduced-motion: reduce) {
          .admin-dropdown-anim {
            animation: none !important;
            transform: none !important;
          }
        }
      `}</style>

      <header
        className={`sticky top-0 z-40 bg-white border-b border-[#DDE3EE] h-[56px] sm:h-16 transition-shadow duration-150 ${
          isScrolled ? "shadow-[0_1px_3px_rgba(11,27,63,0.06)]" : "shadow-none"
        }`}
      >
        <div className="max-w-6xl w-full mx-auto px-4 sm:px-6 h-full flex items-center justify-between gap-3 whitespace-nowrap">
          {/* LEFT ZONE: Hamburger, Logo, Breadcrumb */}
          <div className="flex items-center gap-3 min-w-0">
            {/* Hamburger Button with Popover / Sheet Container */}
            <div ref={navContainerRef} className="relative shrink-0">
              <button
                ref={navButtonRef}
                id="admin-hamburger-btn"
                type="button"
                onClick={toggleNav}
                aria-label={isNavOpen ? "Close menu" : "Open menu"}
                aria-expanded={isNavOpen}
                aria-controls="admin-nav-menu"
                aria-haspopup="menu"
                className="w-10 h-10 min-w-[40px] rounded-[8px] bg-transparent hover:bg-[#F1F4FB] text-[#0B1B3F] transition-colors relative flex items-center justify-center cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0B1B3F] focus-visible:ring-offset-2"
              >
                {isNavOpen ? (
                  <X className="w-5 h-5 shrink-0" aria-hidden="true" />
                ) : (
                  <Menu className="w-5 h-5 shrink-0" aria-hidden="true" />
                )}

                {/* Pending approvals dot */}
                {hasPending && (
                  <span
                    className="absolute top-1.5 right-1.5 w-2.5 h-2.5 rounded-full bg-[#F59E0B] ring-2 ring-white"
                    aria-hidden="true"
                    title={`${pendingCount} pending approvals`}
                  >
                    <span className="sr-only">
                      {pendingCount} pending approvals
                    </span>
                  </span>
                )}
              </button>

              {/* HAMBURGER MENU: Desktop Dropdown & Mobile Sheet */}
              {isNavOpen && (
                <>
                  {/* Dimmed mobile backdrop covering below the header */}
                  <div
                    className="sm:hidden fixed inset-0 top-[56px] bg-[rgba(11,27,63,0.35)] z-40"
                    onClick={() => setIsNavOpen(false)}
                    aria-hidden="true"
                  />

                  {/* Panel */}
                  <div
                    id="admin-nav-menu"
                    role="menu"
                    aria-labelledby="admin-hamburger-btn"
                    onKeyDown={handleNavMenuKeyDown}
                    className="admin-dropdown-anim fixed sm:absolute top-[56px] sm:top-full left-0 right-0 sm:right-auto sm:mt-2 z-50 w-full sm:w-[300px] bg-white rounded-b-[12px] sm:rounded-[12px] border-b sm:border border-x sm:border-x-[#DDE3EE] border-[#DDE3EE] shadow-[0_10px_30px_rgba(11,27,63,0.12)] p-2 max-h-[calc(100dvh-56px)] sm:max-h-none overflow-y-auto sm:overflow-visible pb-[max(1rem,env(safe-area-inset-bottom,0px))] sm:pb-2 origin-top-left"
                  >
                    {/* Section label: Navigate */}
                    <div className="text-[11px] font-semibold uppercase tracking-wider text-[#5E6C87] pl-3 py-1.5 select-none">
                      Navigate
                    </div>

                    {/* 5 Navigation Rows */}
                    <div className="space-y-0.5">
                      {navItems.map((item, index) => {
                        const Icon = item.icon;
                        const active = item.isActive;
                        return (
                          <Link
                            key={item.href}
                            href={item.href}
                            role="menuitem"
                            ref={(el) => {
                              navItemRefs.current[index] = el;
                            }}
                            aria-current={active ? "page" : undefined}
                            onClick={() => setIsNavOpen(false)}
                            className={`relative flex items-center gap-3 h-[44px] px-3 rounded-[8px] text-[14px] font-medium whitespace-nowrap transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0B1B3F] focus-visible:ring-offset-1 ${
                              active
                                ? "bg-[#EEF1F8] text-[#0B1B3F] font-semibold"
                                : "text-[#5E6C87] hover:text-[#0B1B3F] hover:bg-[#F1F4FB]"
                            }`}
                          >
                            {/* 3px vertical rounded active bar inside the row */}
                            {active && (
                              <span
                                className="absolute left-1.5 top-2.5 bottom-2.5 w-[3px] bg-[#0B1B3F] rounded-full"
                                aria-hidden="true"
                              />
                            )}
                            <Icon
                              className={`w-[18px] h-[18px] shrink-0 ${
                                active ? "text-[#0B1B3F]" : "text-[#5E6C87]"
                              }`}
                              aria-hidden="true"
                            />
                            <span>{item.name}</span>

                            {/* Approvals pending badge */}
                            {item.badge !== null && item.badge > 0 && (
                              <span className="ml-auto px-2 py-0.5 rounded-full text-[12px] font-semibold bg-[#FEF3C7] text-[#92400E] shrink-0">
                                {item.badge}
                              </span>
                            )}
                          </Link>
                        );
                      })}
                    </div>

                    {/* 1px divider */}
                    <div
                      className="my-2 border-t border-[#DDE3EE]"
                      aria-hidden="true"
                    />

                    {/* Section label: Switch view */}
                    <div className="text-[11px] font-semibold uppercase tracking-wider text-[#5E6C87] pl-3 py-1.5 select-none">
                      Switch view
                    </div>

                    {/* Student view row */}
                    <Link
                      href="/api/view-mode?mode=student"
                      role="menuitem"
                      ref={(el) => {
                        navItemRefs.current[5] = el;
                      }}
                      onClick={() => setIsNavOpen(false)}
                      className="group flex items-center justify-between h-[44px] px-3 rounded-[8px] text-[#0B1B3F] hover:bg-[#F1F4FB] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0B1B3F] focus-visible:ring-offset-1"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <GraduationCap
                          className="w-[18px] h-[18px] text-[#5E6C87] group-hover:text-[#0B1B3F] shrink-0"
                          aria-hidden="true"
                        />
                        <div className="flex flex-col text-left">
                          <span className="text-[14px] font-medium text-[#0B1B3F] leading-tight">
                            Student view
                          </span>
                          <span className="text-[12px] text-[#5E6C87] leading-tight">
                            See what students see
                          </span>
                        </div>
                      </div>
                      <ArrowUpRight
                        className="w-4 h-4 text-[#5E6C87] group-hover:text-[#0B1B3F] shrink-0 ml-auto"
                        aria-hidden="true"
                      />
                    </Link>

                    {/* Mobile-only Account Block and Logout Button */}
                    <div className="sm:hidden">
                      <div
                        className="my-2 border-t border-[#DDE3EE]"
                        aria-hidden="true"
                      />
                      <div className="p-2 space-y-3">
                        <div className="flex items-center gap-3">
                          <div
                            className="w-10 h-10 rounded-full bg-[#E8ECF6] text-[#0B1B3F] font-semibold text-[14px] flex items-center justify-center shrink-0 select-none"
                            aria-hidden="true"
                          >
                            {initials}
                          </div>
                          <div className="flex flex-col min-w-0 text-left">
                            <span
                              className="text-[14px] font-semibold text-[#0B1B3F] truncate leading-tight"
                              title={userName}
                            >
                              {userName || "Administrator"}
                            </span>
                            <span
                              className="text-[12px] text-[#5E6C87] truncate leading-tight mt-0.5"
                              title={userEmail}
                            >
                              {userEmail}
                            </span>
                            <div className="mt-1">
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium bg-[#E8ECF6] text-[#0B1B3F]">
                                <Shield className="w-3 h-3 shrink-0" />
                                Administrator
                              </span>
                            </div>
                          </div>
                        </div>

                        <button
                          type="button"
                          role="menuitem"
                          ref={(el) => {
                            navItemRefs.current[6] = el;
                          }}
                          onClick={handleLogout}
                          disabled={isLoggingOut}
                          className="w-full h-[44px] px-3 rounded-[8px] border border-[#DDE3EE] bg-white hover:bg-[#FEF2F2] hover:text-[#DC2626] text-[#0B1B3F] font-medium text-[14px] flex items-center justify-center gap-2 transition-colors cursor-pointer disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#DC2626] focus-visible:ring-offset-1"
                        >
                          <LogOut className="w-4 h-4 shrink-0 text-[#DC2626]" />
                          <span>{isLoggingOut ? "Signing out..." : "Log out"}</span>
                        </button>
                      </div>
                    </div>
                  </div>
                </>
              )}
            </div>

            {/* Bitnox Logo */}
            <Link
              href="/admin"
              className="flex items-center shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0B1B3F] focus-visible:ring-offset-2 rounded"
              aria-label="Bitnox Attendance Admin Home"
            >
              <Image
                src="/images/bitnox-logo.png"
                alt="Bitnox Attendance"
                width={120}
                height={28}
                priority
                className="h-7 w-auto object-contain shrink-0"
              />
            </Link>

            {/* Breadcrumb: desktop (divider + Console > page) / mobile (current page name only) */}
            <div className="hidden sm:flex items-center gap-3 min-w-0">
              <span
                className="w-[1px] h-5 bg-[#DDE3EE] shrink-0"
                aria-hidden="true"
              />
              <span className="text-[13px] text-[#5E6C87] select-none shrink-0 font-normal">
                Console
              </span>
              <ChevronRight
                className="w-3.5 h-3.5 text-[#5E6C87] shrink-0"
                aria-hidden="true"
              />
              <span className="text-[14px] font-medium text-[#0B1B3F] truncate">
                {currentPageName}
              </span>
            </div>

            {/* Mobile-only Current Page Name */}
            <span className="sm:hidden text-[14px] font-medium text-[#0B1B3F] truncate min-w-0">
              {currentPageName}
            </span>
          </div>

          {/* RIGHT ZONE: Account Chip & Popover */}
          <div ref={accountContainerRef} className="relative shrink-0">
            <button
              ref={accountButtonRef}
              id="admin-account-btn"
              type="button"
              onClick={toggleAccount}
              aria-label="Account menu"
              aria-expanded={isAccountOpen}
              aria-controls="admin-account-popover"
              aria-haspopup="menu"
              className="min-h-[40px] min-w-[40px] p-1.5 rounded-[8px] hover:bg-[#F1F4FB] transition-colors flex items-center gap-2 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0B1B3F] focus-visible:ring-offset-2"
            >
              {/* 36px Initials Circle or Skeleton */}
              {hasUserLoaded ? (
                <div
                  className="w-9 h-9 min-w-[36px] rounded-full bg-[#E8ECF6] text-[#0B1B3F] font-semibold text-[13px] flex items-center justify-center shrink-0 select-none"
                  aria-hidden="true"
                >
                  {initials}
                </div>
              ) : (
                <div
                  className="w-9 h-9 min-w-[36px] rounded-full bg-[#E8ECF6] animate-pulse shrink-0"
                  aria-hidden="true"
                />
              )}

              {/* Stacked lines and chevron (visible from 1024px up) */}
              <div className="hidden lg:flex items-center gap-2 text-left">
                <div className="flex flex-col">
                  <span
                    className="text-[14px] font-medium text-[#0B1B3F] truncate max-w-[160px] leading-tight"
                    title={userName}
                  >
                    {userName || "Administrator"}
                  </span>
                  <span className="text-[12px] text-[#5E6C87] leading-tight">
                    Administrator
                  </span>
                </div>
                <ChevronDown
                  className="w-4 h-4 text-[#5E6C87] shrink-0 ml-0.5"
                  aria-hidden="true"
                />
              </div>
            </button>

            {/* Account Popover */}
            {isAccountOpen && (
              <div
                id="admin-account-popover"
                role="menu"
                aria-labelledby="admin-account-btn"
                className="admin-dropdown-anim absolute right-0 top-full mt-2 z-50 w-[260px] bg-white rounded-[12px] border border-[#DDE3EE] shadow-[0_10px_30px_rgba(11,27,63,0.12)] p-2 origin-top-right"
              >
                {/* Header block with 40px initials circle, name, email, role */}
                <div className="p-2 flex items-start gap-3">
                  <div
                    className="w-10 h-10 rounded-full bg-[#E8ECF6] text-[#0B1B3F] font-semibold text-[14px] flex items-center justify-center shrink-0 select-none"
                    aria-hidden="true"
                  >
                    {initials}
                  </div>
                  <div className="flex flex-col min-w-0 text-left">
                    <span
                      className="text-[14px] font-semibold text-[#0B1B3F] truncate leading-tight"
                      title={userName}
                    >
                      {userName || "Administrator"}
                    </span>
                    <span
                      className="text-[13px] text-[#5E6C87] truncate max-w-[170px] leading-tight mt-0.5"
                      title={userEmail}
                    >
                      {userEmail}
                    </span>
                    <div className="mt-1">
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium bg-[#E8ECF6] text-[#0B1B3F]">
                        <Shield className="w-3 h-3 shrink-0" />
                        Administrator
                      </span>
                    </div>
                  </div>
                </div>

                {/* 1px divider */}
                <div
                  className="my-2 border-t border-[#DDE3EE]"
                  aria-hidden="true"
                />

                {/* ONE item "Log out" */}
                <button
                  ref={accountLogoutRef}
                  type="button"
                  role="menuitem"
                  onClick={handleLogout}
                  disabled={isLoggingOut}
                  className="w-full h-[44px] px-3 rounded-[8px] flex items-center gap-2 text-[14px] font-medium text-[#DC2626] hover:bg-[#FEF2F2] transition-colors cursor-pointer disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#DC2626] focus-visible:ring-offset-1"
                >
                  <LogOut className="w-3.5 h-3.5 shrink-0 text-[#DC2626]" />
                  <span>{isLoggingOut ? "Signing out..." : "Log out"}</span>
                </button>
              </div>
            )}
          </div>
        </div>
      </header>
    </>
  );
}

// Backward compatible export
export function AdminNav({ pendingCount = 0 }: { pendingCount?: number }) {
  return null;
}
