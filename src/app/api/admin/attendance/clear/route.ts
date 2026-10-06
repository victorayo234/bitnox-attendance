import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";

export async function POST(request: NextRequest) {
  // 1. Verify caller is a logged-in, active admin
  const adminAuth = await requireAdmin();
  if (!adminAuth) {
    return NextResponse.json(
      { ok: false, error: "Forbidden: Active administrator access required" },
      { status: 403 }
    );
  }

  // 2. Parse request body
  let body: { studentId?: string; date?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { ok: false, error: "Invalid JSON request payload" },
      { status: 400 }
    );
  }

  const { studentId, date } = body;

  // 3. Validate inputs
  if (!studentId || typeof studentId !== "string" || !studentId.trim()) {
    return NextResponse.json(
      { ok: false, error: "studentId is required" },
      { status: 400 }
    );
  }

  if (!date || typeof date !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    return NextResponse.json(
      { ok: false, error: "Valid date in YYYY-MM-DD format is required" },
      { status: 400 }
    );
  }

  const adminClient = createAdminClient();

  // 4. Remove that day's attendance record
  const { data: deleted, error: deleteError } = await adminClient
    .from("attendance")
    .delete()
    .eq("student_id", studentId)
    .eq("attendance_date", date)
    .select();

  if (deleteError) {
    return NextResponse.json(
      { ok: false, error: "Failed to clear attendance record: " + deleteError.message },
      { status: 500 }
    );
  }

  const count = deleted?.length || 0;

  return NextResponse.json({
    ok: true,
    message: count > 0 ? "Attendance record cleared successfully" : "No attendance record found for specified date",
    clearedCount: count,
  });
}
