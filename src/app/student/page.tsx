import { createClient } from "@/lib/supabase/server";
import { Card, CardContent, CardHeader, CardTitle, Badge } from "@/components";
import { UserCheck, QrCode } from "lucide-react";

export const metadata = {
  title: "Student Dashboard | Bitnox Attendance",
};

export default async function StudentPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: profile } = await supabase
    .from("profiles")
    .select("full_name, email")
    .eq("id", user?.id || "")
    .single();

  const name = profile?.full_name || "Student";

  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <h1 className="text-2xl font-bold tracking-tight text-primary">
          Welcome, {name}
        </h1>
        <p className="text-sm text-muted">
          Your student attendance dashboard is active.
        </p>
      </div>

      <Card className="bg-white">
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-base font-semibold">Attendance Overview</CardTitle>
          <Badge variant="present" withDot>
            Enrolled
          </Badge>
        </CardHeader>
        <CardContent className="space-y-4 pt-2">
          <div className="rounded-[16px] bg-soft border border-border p-5 flex items-center gap-4">
            <div className="h-12 w-12 rounded-full bg-white flex items-center justify-center border border-border shadow-xs text-primary">
              <UserCheck className="h-6 w-6" />
            </div>
            <div>
              <p className="text-sm font-semibold text-primary">{name}</p>
              <p className="text-xs text-muted">{profile?.email}</p>
            </div>
          </div>

          <div className="rounded-[16px] bg-white border border-border p-4 text-center space-y-2">
            <div className="inline-flex p-3 rounded-full bg-soft text-primary">
              <QrCode className="h-6 w-6" />
            </div>
            <p className="text-xs font-medium text-muted">
              QR Scanner module will be loaded here.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
