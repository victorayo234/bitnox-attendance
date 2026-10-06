import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { getAdminAttendanceConsoleData } from "@/lib/admin-attendance";

export async function GET(request: NextRequest) {
  // 1. Verify caller is a logged-in, active admin
  const adminAuth = await requireAdmin();
  if (!adminAuth) {
    return NextResponse.json(
      { ok: false, error: "Forbidden: Active administrator access required" },
      { status: 403 }
    );
  }

  // 2. Parse date parameter
  const { searchParams } = new URL(request.url);
  const date = searchParams.get("date") || undefined;

  try {
    const data = await getAdminAttendanceConsoleData(date);
    return NextResponse.json({
      ok: true,
      data,
    });
  } catch (err: unknown) {
    console.error("Failed to load attendance console data:", err);
    return NextResponse.json(
      { ok: false, error: "Failed to load attendance console data" },
      { status: 500 }
    );
  }
}
