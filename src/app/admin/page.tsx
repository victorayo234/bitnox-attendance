import { createClient } from "@/lib/supabase/server";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle, Badge, Button } from "@/components";
import { ShieldCheck, Users, CalendarCheck2, UserCheck, ArrowRight } from "lucide-react";

export const metadata = {
  title: "Admin Dashboard | Bitnox Attendance",
};

export default async function AdminPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: profile } = await supabase
    .from("profiles")
    .select("full_name, email")
    .eq("id", user?.id || "")
    .single();

  const name = profile?.full_name || "Admin";

  // Dashboard counts MUST include ONLY approved, active students
  const { count: approvedStudentsCount } = await supabase
    .from("profiles")
    .select("id", { count: "exact", head: true })
    .eq("role", "student")
    .eq("status", "approved")
    .eq("is_active", true);

  const { count: pendingCount } = await supabase
    .from("profiles")
    .select("id", { count: "exact", head: true })
    .eq("status", "pending");

  const { count: adminsCount } = await supabase
    .from("profiles")
    .select("id", { count: "exact", head: true })
    .eq("role", "admin")
    .eq("is_active", true);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="space-y-1">
          <h1 className="text-2xl font-bold tracking-tight text-primary">
            Welcome, {name}
          </h1>
          <p className="text-xs sm:text-sm text-muted">
            Bitnox Attendance Console • Africa/Lagos Timezone
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Link href="/admin/approvals">
            <Button
              variant="outline"
              size="sm"
              leftIcon={<UserCheck className="h-4 w-4" />}
              className="text-xs"
            >
              Approvals ({pendingCount || 0})
            </Button>
          </Link>
          <Link href="/admin/students">
            <Button
              variant="primary"
              size="sm"
              leftIcon={<Users className="h-4 w-4" />}
              className="text-xs"
            >
              Directory
            </Button>
          </Link>
        </div>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="bg-white shadow-xs">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-semibold text-muted uppercase tracking-wider">
              Approved Students
            </CardTitle>
            <Badge variant="present" withDot className="text-[10px]">
              Active
            </Badge>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="text-3xl font-extrabold text-primary">
              {approvedStudentsCount || 0}
            </div>
            <p className="text-[11px] text-muted mt-1">
              Eligible to record attendance today
            </p>
          </CardContent>
        </Card>

        <Card className="bg-white shadow-xs">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-semibold text-muted uppercase tracking-wider">
              Pending Approvals
            </CardTitle>
            <Badge variant={pendingCount && pendingCount > 0 ? "late" : "neutral"} className="text-[10px]">
              Review
            </Badge>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="text-3xl font-extrabold text-primary">
              {pendingCount || 0}
            </div>
            <p className="text-[11px] text-muted mt-1">
              New self-registered enrollments
            </p>
          </CardContent>
        </Card>

        <Card className="bg-white shadow-xs">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-semibold text-muted uppercase tracking-wider">
              Administrators
            </CardTitle>
            <Badge variant="primary" className="text-[10px]">
              Privileged
            </Badge>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="text-3xl font-extrabold text-primary">
              {adminsCount || 1}
            </div>
            <p className="text-[11px] text-muted mt-1">
              Authorized to manage hub accounts
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Overview Details */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Card className="bg-white shadow-xs">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold">Attendance Clock & Gate</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 pt-1">
            <div className="flex items-center gap-3 text-xs text-muted">
              <CalendarCheck2 className="h-4 w-4 text-primary shrink-0" />
              <span>Gate window: 08:00 AM - 12:00 PM</span>
            </div>
            <div className="flex items-center gap-3 text-xs text-muted">
              <ShieldCheck className="h-4 w-4 text-primary shrink-0" />
              <span>Server clock authority: Africa/Lagos</span>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-white shadow-xs">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold">Quick Actions</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 pt-1 text-xs">
            <Link
              href="/admin/approvals"
              className="flex items-center justify-between p-2.5 rounded-xl bg-soft hover:bg-border/60 transition-colors"
            >
              <span className="font-medium text-primary">Review Pending Applications</span>
              <ArrowRight className="h-4 w-4 text-muted" />
            </Link>
            <Link
              href="/admin/students"
              className="flex items-center justify-between p-2.5 rounded-xl bg-soft hover:bg-border/60 transition-colors"
            >
              <span className="font-medium text-primary">Manage Students & Promote Admins</span>
              <ArrowRight className="h-4 w-4 text-muted" />
            </Link>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
