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
    redirect(`/login?role=student&next=${encodeURIComponent(nextPath)}`);
  }

  // 2. Load user profile
  const adminClient = createAdminClient();
  const { data: profile } = await adminClient
    .from("profiles")
    .select("role, is_active, status, full_name")
    .eq("id", user.id)
    .single();

  // 3. Admin fallback: Admins cannot record student attendance through scanner link
  if (profile?.role === "admin") {
    return (
      <div className="min-h-screen bg-[#F5F8FE] flex flex-col justify-between p-4 sm:p-6">
        <header className="max-w-md mx-auto w-full py-4 flex items-center justify-between">
          <div className="flex flex-col">
            <Image
              src="/images/bitnox-logo.png"
              alt="Bitnox"
              width={120}
              height={30}
              priority
              className="h-7 w-auto object-contain"
            />
            <div className="h-0.5 w-8 bg-[#00E6FF] rounded-full mt-1" />
          </div>
          <LogoutButton />
        </header>

        <main className="max-w-md mx-auto w-full my-auto py-6">
          <Card className="bg-white border border-[#DDE3EE] p-6 text-center space-y-4 shadow-sm">
            <div className="w-12 h-12 rounded-full bg-amber-50 text-amber-600 flex items-center justify-center mx-auto">
              <ShieldAlert className="w-6 h-6" />
            </div>

            <div className="space-y-1">
              <h2 className="text-lg font-bold text-[#0B1B3F]">Administrator Account</h2>
              <p className="text-xs text-[#5E6C87] leading-relaxed">
                Use a student account to scan.
              </p>
            </div>

            <div className="pt-2">
              <Button asChild className="w-full rounded-full bg-[#0B1B3F] text-white py-3 text-xs font-medium">
                <Link href="/admin">
                  Go to Admin Dashboard
                  <ArrowRight className="w-4 h-4 ml-1.5" />
                </Link>
              </Button>
            </div>
          </Card>
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
