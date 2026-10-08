"use client";

import { useTransition } from "react";
import { logoutAction } from "@/lib/actions/auth";
import { LogOut } from "lucide-react";

export interface LogoutButtonProps {
  variant?: "ghost" | "secondary";
  showText?: boolean;
  fullWidth?: boolean;
  className?: string;
}

export function LogoutButton({
  variant = "ghost",
  showText = false,
  fullWidth = false,
  className = "",
}: LogoutButtonProps) {
  const [isPending, startTransition] = useTransition();

  const baseClasses =
    "inline-flex items-center justify-center gap-1.5 transition-all duration-150 ease-in-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 disabled:opacity-50 select-none cursor-pointer rounded-lg";

  const variantClass =
    variant === "secondary"
      ? "bg-white border border-border text-primary hover:bg-soft h-10 px-4 text-sm font-medium shadow-[0_1px_2px_rgba(11,27,63,0.04)]"
      : showText
      ? "bg-transparent text-muted hover:text-primary hover:bg-soft h-10 px-4 text-sm font-medium"
      : "h-8 w-8 text-muted hover:text-primary hover:bg-soft";

  return (
    <button
      onClick={() => {
        startTransition(async () => {
          await logoutAction();
        });
      }}
      disabled={isPending}
      className={`${baseClasses} ${variantClass} ${fullWidth ? "w-full" : ""} ${className}`.trim()}
      title="Log out"
      aria-label="Log out"
    >
      <LogOut className="h-4 w-4 shrink-0" />
      {showText && <span>{isPending ? "Signing out..." : "Log out"}</span>}
    </button>
  );
}
