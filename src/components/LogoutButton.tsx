"use client";

import { useTransition } from "react";
import { logoutAction } from "@/lib/actions/auth";
import { LogOut } from "lucide-react";

export function LogoutButton() {
  const [isPending, startTransition] = useTransition();

  return (
    <button
      onClick={() => {
        startTransition(async () => {
          await logoutAction();
        });
      }}
      disabled={isPending}
      className="inline-flex items-center justify-center gap-1.5 px-4 min-h-[44px] rounded-full text-xs font-medium text-muted hover:text-absent hover:bg-absent/10 border border-border hover:border-absent/30 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-primary disabled:opacity-50"
      title="Sign out of your account"
      aria-label="Sign out of your account"
    >
      <LogOut className="h-3.5 w-3.5" />
      <span>{isPending ? "Exiting..." : "Log out"}</span>
    </button>
  );
}
