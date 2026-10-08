import { redirect } from "next/navigation";
import { requireAdmin } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { formatInTimeZone } from "date-fns-tz";
import { TIMEZONE } from "@/lib/config";
import {
  ApprovalsList,
  PendingStudentItem,
  RejectedStudentItem,
  DecisionHistoryItem,
  DecisionTimelineItem,
} from "./ApprovalsList";

export const metadata = {
  title: "Enrollment Approvals | Bitnox Attendance",
  description: "Review and approve student enrollment requests and decision history",
};

export default async function ApprovalsPage() {
  const adminAuth = await requireAdmin();
  if (!adminAuth) {
    redirect("/login?role=admin");
  }

  const adminClient = createAdminClient();

  // 1. Fetch current admin profile for name display
  const { data: adminProfile } = await adminClient
    .from("profiles")
    .select("full_name")
    .eq("id", adminAuth.user.id)
    .single();

  const currentAdminName = adminProfile?.full_name || "Administrator";

  // 2. Fetch pending students
  const { data: pendingData } = await adminClient
    .from("profiles")
    .select("id, full_name, email, created_at")
    .eq("role", "student")
    .eq("status", "pending")
    .order("created_at", { ascending: false });

  // 3. Fetch rejected students
  const { data: rejectedData } = await adminClient
    .from("profiles")
    .select("id, full_name, email, created_at, updated_at")
    .eq("role", "student")
    .eq("status", "rejected")
    .order("created_at", { ascending: false });

  // 4. Fetch decision history from approval_decisions table (with graceful fallback if table not yet migrated)
  let rawDecisions: Array<{
    id: string;
    student_id: string;
    decided_by: string | null;
    decision: "approved" | "rejected";
    note: string | null;
    previous_status: string | null;
    created_at: string;
  }> = [];

  try {
    const { data: decisionsData, error: decisionsError } = await adminClient
      .from("approval_decisions")
      .select("id, student_id, decided_by, decision, note, previous_status, created_at")
      .order("created_at", { ascending: false })
      .limit(100);

    if (!decisionsError && decisionsData) {
      rawDecisions = decisionsData;
    }
  } catch {
    rawDecisions = [];
  }

  // 5. Gather all related user IDs (admins + students) to resolve names and emails
  const userIdsToFetch = new Set<string>();
  rawDecisions.forEach((d) => {
    if (d.decided_by) userIdsToFetch.add(d.decided_by);
    if (d.student_id) userIdsToFetch.add(d.student_id);
  });

  const profilesMap = new Map<string, { full_name: string; email: string }>();

  // Pre-seed profilesMap with pending & rejected students
  (pendingData || []).forEach((p) => {
    profilesMap.set(p.id, { full_name: p.full_name, email: p.email });
  });
  (rejectedData || []).forEach((p) => {
    profilesMap.set(p.id, { full_name: p.full_name, email: p.email });
  });

  // Query any missing profiles needed for history
  const missingIds = Array.from(userIdsToFetch).filter((id) => !profilesMap.has(id));
  if (missingIds.length > 0) {
    const { data: fetchedProfiles } = await adminClient
      .from("profiles")
      .select("id, full_name, email")
      .in("id", missingIds);

    (fetchedProfiles || []).forEach((p) => {
      profilesMap.set(p.id, { full_name: p.full_name, email: p.email });
    });
  }

  // 6. Format Pending items
  const initialPending: PendingStudentItem[] = (pendingData || []).map((s) => ({
    id: s.id,
    name: s.full_name || "Unknown Student",
    email: s.email || "",
    createdAt: s.created_at,
    requestedDate: formatInTimeZone(new Date(s.created_at), TIMEZONE, "MMM d, yyyy"),
  }));

  // 7. Group decisions by student_id for timeline lookup
  const studentDecisionsMap = new Map<string, typeof rawDecisions>();
  rawDecisions.forEach((d) => {
    const list = studentDecisionsMap.get(d.student_id) || [];
    list.push(d);
    studentDecisionsMap.set(d.student_id, list);
  });

  // 8. Format Rejected items
  const initialRejected: RejectedStudentItem[] = (rejectedData || []).map((s) => {
    const decisions = studentDecisionsMap.get(s.id) || [];
    // Sort newest first
    decisions.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

    const latest = decisions[0];

    const timeline: DecisionTimelineItem[] = decisions.map((d) => {
      const adminInfo = d.decided_by ? profilesMap.get(d.decided_by) : null;
      const adminLabel = d.decided_by
        ? adminInfo?.full_name || "Administrator"
        : "before logging began";

      return {
        id: d.id,
        decision: d.decision,
        adminName: adminLabel,
        note: d.note,
        previousStatus: d.previous_status,
        createdAt: d.created_at,
        formattedDateTime: formatInTimeZone(
          new Date(d.created_at),
          TIMEZONE,
          "MMM d, yyyy 'at' h:mm a"
        ),
      };
    });

    const latestDate = latest
      ? formatInTimeZone(new Date(latest.created_at), TIMEZONE, "MMM d, yyyy 'at' h:mm a")
      : formatInTimeZone(
          new Date(s.updated_at || s.created_at),
          TIMEZONE,
          "MMM d, yyyy 'at' h:mm a"
        );

    const latestAdmin = latest
      ? latest.decided_by
        ? profilesMap.get(latest.decided_by)?.full_name || "Administrator"
        : "before logging began"
      : "before logging began";

    const latestNote = latest ? latest.note : null;

    return {
      id: s.id,
      name: s.full_name || "Unknown Student",
      email: s.email || "",
      requestedDate: formatInTimeZone(new Date(s.created_at), TIMEZONE, "MMM d, yyyy"),
      latestDecisionDate: latestDate,
      latestDecisionAdmin: latestAdmin,
      latestDecisionNote: latestNote,
      timeline,
    };
  });

  // 9. Format History items (latest 50 across the hub)
  const initialHistory: DecisionHistoryItem[] = rawDecisions.slice(0, 50).map((d) => {
    const studentInfo = profilesMap.get(d.student_id);
    const adminInfo = d.decided_by ? profilesMap.get(d.decided_by) : null;
    const adminLabel = d.decided_by
      ? adminInfo?.full_name || "Administrator"
      : "before logging began";

    return {
      id: d.id,
      studentId: d.student_id,
      studentName: studentInfo?.full_name || "Student",
      studentEmail: studentInfo?.email || "",
      adminName: adminLabel,
      decision: d.decision,
      note: d.note,
      createdAt: d.created_at,
      formattedDateTime: formatInTimeZone(
        new Date(d.created_at),
        TIMEZONE,
        "MMM d, yyyy 'at' h:mm a"
      ),
    };
  });

  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <h1 className="text-2xl font-semibold tracking-tight text-[#0B1B3F]">
          Student Approvals
        </h1>
        <p className="text-xs sm:text-sm text-[#5E6C87]">
          Review pending sign-ups, reconsider previously rejected applicants, and inspect hub decision history.
        </p>
      </div>

      <ApprovalsList
        initialPending={initialPending}
        initialRejected={initialRejected}
        initialHistory={initialHistory}
        currentAdminId={adminAuth.user.id}
        currentAdminName={currentAdminName}
      />
    </div>
  );
}
