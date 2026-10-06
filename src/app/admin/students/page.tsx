import { createClient } from "@/lib/supabase/server";
import { StudentsManager } from "./StudentsManager";
import { Profile } from "@/types";

export const metadata = {
  title: "Students & Staff Management | Bitnox Attendance",
  description: "Manage students, enrollments, and administrator privileges",
};

export default async function StudentsPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: profiles } = await supabase
    .from("profiles")
    .select("*")
    .order("created_at", { ascending: false });

  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <h1 className="text-2xl font-bold tracking-tight text-primary">
          Students & Staff Directory
        </h1>
        <p className="text-xs sm:text-sm text-muted">
          Manage enrolled students, review roles, and grant administrator access.
        </p>
      </div>

      <StudentsManager
        initialProfiles={(profiles as Profile[]) || []}
        currentUserId={user?.id || ""}
      />
    </div>
  );
}
