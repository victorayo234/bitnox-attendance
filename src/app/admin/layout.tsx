import React from "react";
import Image from "next/image";
import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { Badge, LogoutButton } from "@/components";
import { AdminNav } from "@/components/AdminNav";
import { Shield } from "lucide-react";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();

  // 1. Verify session on the server
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login?role=admin");
  }

  // 2. Verify profile and role on the server
  const { data: profile } = await supabase
    .from("profiles")
    .select("full_name, role, status, is_active")
    .eq("id", user.id)
    .single();

  if (!profile || !profile.is_active || profile.status !== "approved") {
    await supabase.auth.signOut();
    redirect("/login?role=admin");
  }

  // CRITICAL: A student must NEVER see an admin page!
  if (profile.role !== "admin") {
    redirect("/student");
  }

  const firstName = profile.full_name?.trim().split(" ")[0] || "Admin";

  // Fetch pending students count for the navigation badge
  const { count: pendingCount } = await supabase
    .from("profiles")
    .select("id", { count: "exact", head: true })
    .eq("status", "pending");

  return (
    <div className="min-h-screen bg-[#F8FAFC] flex flex-col justify-between">
      {/* Mobile-first Header */}
      <header className="sticky top-0 z-40 bg-white border-b border-border shadow-xs">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          {/* Logo & Console Indicator */}
          <Link href="/admin" className="flex items-center gap-2">
            <Image
              src="/images/bitnox-logo.png"
              alt="Bitnox"
              width={120}
              height={30}
              priority
              className="h-7 w-auto object-contain"
            />
            <span className="hidden sm:inline-block text-xs font-semibold px-2 py-0.5 rounded-full bg-soft text-primary border border-border">
              Console
            </span>
          </Link>

          {/* User info & Logout */}
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-primary">
                {firstName}
              </span>
              <Badge variant="primary" className="text-[11px] py-0.5 inline-flex items-center gap-1">
                <Shield className="h-3 w-3" />
                Admin
              </Badge>
            </div>
            <LogoutButton />
          </div>
        </div>

        {/* Admin Navigation Bar */}
        <div className="border-t border-border/70 bg-white">
          <AdminNav pendingCount={pendingCount || 0} />
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 max-w-5xl w-full mx-auto p-4 sm:p-6">
        {children}
      </main>

      {/* Minimal Footer */}
      <footer className="border-t border-border bg-footer py-4 text-center text-xs text-muted">
        <div className="max-w-5xl mx-auto px-4">
          Bitnox Attendance Admin Console • Abeokuta Hub
        </div>
      </footer>
    </div>
  );
}
