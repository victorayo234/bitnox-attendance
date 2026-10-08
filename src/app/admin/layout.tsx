import React from "react";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { AdminHeader } from "@/components/AdminNav";

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

  // Fetch pending students count for the navigation badge
  const { count: pendingCount } = await supabase
    .from("profiles")
    .select("id", { count: "exact", head: true })
    .eq("status", "pending");

  return (
    <div className="min-h-screen bg-[#F5F8FE] flex flex-col justify-between">
      {/* Desktop and Mobile Polished Header */}
      <AdminHeader
        userName={profile.full_name || "Administrator"}
        userEmail={user.email || ""}
        pendingCount={pendingCount || 0}
      />

      {/* Main Content Area: max-w-6xl for ample room */}
      <main className="flex-1 max-w-6xl w-full mx-auto p-4 sm:p-6 md:pb-12">
        {children}
      </main>

      {/* Minimal Footer */}
      <footer className="border-t border-border bg-footer py-4 text-center text-xs text-muted">
        <div className="max-w-6xl mx-auto px-4">
          Bitnox Attendance Admin Console • Abeokuta Hub
        </div>
      </footer>
    </div>
  );
}
