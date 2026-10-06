import React from "react";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { PendingClient } from "./PendingClient";

export const metadata = {
  title: "Enrollment Status | Bitnox Attendance",
  description: "Check your Bitnox student enrollment approval status",
};

export default async function PendingPage() {
  const supabase = await createClient();

  // 1. Verify session on the server
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login?role=student");
  }

  // 2. Fetch fresh profile from database via admin client
  const adminClient = createAdminClient();
  const { data: profile } = await adminClient
    .from("profiles")
    .select("full_name, email, role, status, is_active")
    .eq("id", user.id)
    .single();

  if (!profile || !profile.is_active) {
    await supabase.auth.signOut();
    redirect("/login?role=student");
  }

  // Admin users belong in the admin section
  if (profile.role === "admin") {
    redirect("/admin");
  }

  // Approved students are redirected away from /pending to their dashboard
  if (profile.status === "approved") {
    redirect("/student");
  }

  // Render pending or rejected status
  return (
    <PendingClient
      fullName={profile.full_name}
      email={profile.email}
      status={profile.status as "pending" | "rejected"}
    />
  );
}
