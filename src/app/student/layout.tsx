import React from "react";
import Image from "next/image";
import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { Badge, Card, CardContent, LogoutButton } from "@/components";
import { Clock, AlertOctagon } from "lucide-react";

export default async function StudentLayout({
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
    redirect("/login?role=student");
  }

  // 2. Verify profile and role on the server
  const { data: profile } = await supabase
    .from("profiles")
    .select("full_name, role, status, is_active")
    .eq("id", user.id)
    .single();

  if (!profile || !profile.is_active) {
    await supabase.auth.signOut();
    redirect("/login?role=student");
  }

  // If user is actually an admin, redirect them to the admin portal
  if (profile.role !== "student") {
    redirect("/admin");
  }

  const firstName = profile.full_name?.trim().split(" ")[0] || "Student";

  // 3. Pending and rejected students see ONLY a status screen (with logout)
  // They cannot reach the dashboard, scanner, or attendance interface.
  if (profile.status === "pending" || profile.status === "rejected") {
    const isPending = profile.status === "pending";

    return (
      <div className="min-h-screen bg-[#F8FAFC] flex flex-col justify-between">
        <header className="sticky top-0 z-40 bg-white border-b border-border shadow-xs">
          <div className="max-w-md mx-auto px-4 h-16 flex items-center justify-between">
            <Image
              src="/images/bitnox-logo.png"
              alt="Bitnox"
              width={120}
              height={30}
              priority
              className="h-7 w-auto object-contain"
            />
            <LogoutButton />
          </div>
        </header>

        <main className="flex-1 max-w-md w-full mx-auto p-4 flex flex-col justify-center">
          <Card className="bg-white text-center shadow-xs">
            <CardContent className="p-6 space-y-4">
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-soft text-primary">
                {isPending ? (
                  <Clock className="h-7 w-7 text-late animate-pulse" />
                ) : (
                  <AlertOctagon className="h-7 w-7 text-absent" />
                )}
              </div>

              <div className="space-y-1.5">
                <h2 className="text-xl font-bold text-primary">
                  {isPending ? "Enrollment Pending Approval" : "Enrollment Not Approved"}
                </h2>
                <p className="text-xs text-muted leading-relaxed px-1">
                  {isPending
                    ? `Hello ${firstName}, your account is waiting for administrator approval. Once approved, your attendance dashboard and QR scanner will activate.`
                    : `Hello ${firstName}, your student enrollment request was not approved. Please speak with the Bitnox administration at the hub.`}
                </p>
              </div>

              <div className="pt-2">
                <Badge variant={isPending ? "late" : "absent"} withDot>
                  {isPending ? "Status: Pending Review" : "Status: Rejected"}
                </Badge>
              </div>

              <div className="pt-4 border-t border-border flex justify-center">
                <LogoutButton />
              </div>
            </CardContent>
          </Card>
        </main>

        <footer className="border-t border-border bg-footer py-4 text-center text-xs text-muted">
          Bitnox Attendance • Abeokuta Hub
        </footer>
      </div>
    );
  }

  // 4. Approved student layout
  return (
    <div className="min-h-screen bg-[#F8FAFC] flex flex-col justify-between">
      {/* Mobile-first Header */}
      <header className="sticky top-0 z-40 bg-white border-b border-border shadow-xs">
        <div className="max-w-2xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          {/* Logo */}
          <Link href="/student" className="flex items-center gap-2">
            <Image
              src="/images/bitnox-logo.png"
              alt="Bitnox"
              width={120}
              height={30}
              priority
              className="h-7 w-auto object-contain"
            />
          </Link>

          {/* User info & Logout */}
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-primary">
                {firstName}
              </span>
              <Badge variant="primary" className="hidden sm:inline-flex text-[11px] py-0.5">
                Student
              </Badge>
            </div>
            <LogoutButton />
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 max-w-2xl w-full mx-auto p-4 sm:p-6">
        {children}
      </main>

      {/* Minimal Footer */}
      <footer className="border-t border-border bg-footer py-4 text-center text-xs text-muted">
        <div className="max-w-2xl mx-auto px-4">
          Bitnox Attendance • Abeokuta Hub
        </div>
      </footer>
    </div>
  );
}
