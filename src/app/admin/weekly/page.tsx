import React from "react";
import { redirect } from "next/navigation";
import { requireAdmin } from "@/lib/auth";
import { getAdminWeeklyMatrixData } from "@/lib/admin-weekly";
import { AdminWeeklyMatrix } from "@/components/AdminWeeklyMatrix";

export const metadata = {
  title: "Weekly Attendance Matrix | Bitnox Attendance",
  description: "View student attendance matrix for Monday through Friday",
};

export default async function AdminWeeklyPage({
  searchParams,
}: {
  searchParams: Promise<{ week?: string }>;
}) {
  // 1. Guard server-side with requireAdmin()
  const adminAuth = await requireAdmin();
  if (!adminAuth) {
    redirect("/login?role=admin");
  }

  // 2. Fetch weekly matrix data
  const { week } = await searchParams;
  const data = await getAdminWeeklyMatrixData(week);

  return <AdminWeeklyMatrix data={data} />;
}
