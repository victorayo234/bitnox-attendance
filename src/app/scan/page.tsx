import React from "react";
import Image from "next/image";
import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { ScanLinkProcessor } from "@/components/ScanLinkProcessor";
import { LogoutButton } from "@/components/LogoutButton";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { ShieldAlert, ArrowRight } from "lucide-react";

export const metadata = {
  title: "Process QR Scan | Bitnox Attendance",
};

export default async function ScanPage({
  searchParams,
}: {
  searchParams: Promise<{ code?: string }>;
}) {
  const { code = "" } = await searchParams;

  // 1. Check session on the server
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // If not logged in -> redirect to login preserving the code in `next`
  if (!user) {
    const nextPath = code ? `/scan?code=${encodeURIComponent(code)}` : "/scan";
    redirect(`/login?next=${encodeURIComponent(nextPath)}`);
  }

  // 2. Load user profile
  const adminClient = createAdminClient();
  const { data: profile } = await adminClient
    .from("profiles")
    .select("role, is_active, status, full_name")
    .eq("id", user.id)
    .single();

  if (!profile || !profile.is_active) {
    redirect("/login?role=student");
  }

  // Pending and rejected students cannot scan
  if (profile.role === "student" && (profile.status === "pending" || profile.status === "rejected")) {
    redirect("/pending");
  }

  // 3. Admin fallback: Admins cannot record student attendance through scanner link
  if (profile.role === "admin") {
    return (
      <div className="min-h-screen bg-[#F5F8FE] flex flex-col justify-between p-4 sm:p-6">
        <header className="max-w-md mx-auto w-full py-4 flex items-center justify-between">
          <Link href="/" className="inline-block transition-opacity hover:opacity-85">
            <Image
              src="/images/bitnox-logo.png"
              alt="Bitnox Attendance"
              width={120}
              height={30}
              priority
              className="h-7 w-auto object-contain"
            />
          </Link>
          <LogoutButton variant="ghost" />
        </header>

        <main className="max-w-md mx-auto w-full my-auto py-6">
          <div className="rounded-[12px] bg-white border border-[#DDE3EE] p-6 text-center space-y-4 shadow-[0_1px_2px_rgba(11,27,63,0.04)]">
            <div className="w-12 h-12 rounded-[10px] bg-[#F59E0B]/10 text-[#F59E0B] flex items-center justify-center mx-auto">
              <ShieldAlert className="w-6 h-6" />
            </div>

            <div className="space-y-1">
              <h2 className="text-lg font-semibold text-[#0B1B3F]">Administrator Account</h2>
              <p className="text-xs text-[#5E6C87] leading-relaxed">
                Use a student account to scan.
              </p>
            </div>

            <div className="pt-2">
              <Button asChild variant="primary" size="md" fullWidth className="h-10 text-sm font-medium">
                <Link href="/admin">
                  Go to Admin Dashboard
                  <ArrowRight className="w-4 h-4 ml-1.5" />
                </Link>
              </Button>
            </div>
          </div>
        </main>

        <footer className="max-w-md mx-auto w-full py-4 text-center text-xs text-[#5E6C87]">
          Bitnox Attendance • Abeokuta Hub
        </footer>
      </div>
    );
  }

  // 4. Student flow: Automatically process scan and provide feedback
  return <ScanLinkProcessor code={code} studentName={profile?.full_name} />;
}
