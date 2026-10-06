import { createClient } from "@/lib/supabase/server";
import { ApprovalsList } from "./ApprovalsList";
import { Profile } from "@/types";

export const metadata = {
  title: "Pending Approvals | Bitnox Attendance",
  description: "Review and approve student enrollment requests",
};

export default async function ApprovalsPage() {
  const supabase = await createClient();

  const { data: pendingStudents } = await supabase
    .from("profiles")
    .select("*")
    .eq("status", "pending")
    .order("created_at", { ascending: false });

  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <h1 className="text-2xl font-bold tracking-tight text-primary">
          Pending Enrollment Approvals
        </h1>
        <p className="text-xs sm:text-sm text-muted">
          Review self-registered students before granting them access to the attendance system.
        </p>
      </div>

      <ApprovalsList initialPending={(pendingStudents as Profile[]) || []} />
    </div>
  );
}
