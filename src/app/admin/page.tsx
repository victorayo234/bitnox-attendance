import { createClient } from "@/lib/supabase/server";
import { Card, CardContent, CardHeader, CardTitle, Badge } from "@/components";
import { ShieldCheck, Users, CalendarCheck2 } from "lucide-react";

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

  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <h1 className="text-2xl font-bold tracking-tight text-primary">
          Welcome, {name}
        </h1>
        <p className="text-sm text-muted">
          Bitnox Attendance Administrator Dashboard.
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Card className="bg-white">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-base font-semibold">System Status</CardTitle>
            <Badge variant="present" withDot>
              Online
            </Badge>
          </CardHeader>
          <CardContent className="space-y-3 pt-2">
            <div className="flex items-center gap-3 text-xs text-muted">
              <ShieldCheck className="h-4 w-4 text-primary shrink-0" />
              <span>Full administrator access verified</span>
            </div>
            <div className="flex items-center gap-3 text-xs text-muted">
              <CalendarCheck2 className="h-4 w-4 text-primary shrink-0" />
              <span>Africa/Lagos attendance clock active</span>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-white">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-base font-semibold">Hub Community</CardTitle>
            <Badge variant="neutral">
              Abeokuta
            </Badge>
          </CardHeader>
          <CardContent className="space-y-3 pt-2">
            <div className="flex items-center gap-3 text-xs text-muted">
              <Users className="h-4 w-4 text-primary shrink-0" />
              <span>Student attendance logs and reports</span>
            </div>
            <p className="text-xs text-muted">
              Admin controls and student management will be loaded here.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
