import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { processAttendanceScan } from "@/lib/attendance-scan";
import { Profile } from "@/types";

export async function POST(request: NextRequest) {
  // 1. Get session from cookies. Not logged in -> 401
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json(
      { ok: false, code: "UNAUTHORIZED", message: "Please sign in to scan attendance." },
      { status: 401 }
    );
  }

  // Load profile via admin client to ensure fresh status check
  const adminClient = createAdminClient();
  const { data: profile } = await adminClient
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .single();

  if (!profile || !profile.is_active || profile.status !== "approved") {
    await supabase.auth.signOut();
    return NextResponse.json(
      {
        ok: false,
        code: "ACCOUNT_INACTIVE",
        message: "Your account is not active or approved to record attendance.",
      },
      { status: 403 }
    );
  }

  // Parse request body
  let body: { code?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { ok: false, code: "INVALID_JSON", message: "Invalid request payload." },
      { status: 400 }
    );
  }

  if (!body.code || typeof body.code !== "string") {
    return NextResponse.json(
      { ok: false, code: "MISSING_CODE", message: "QR code is required." },
      { status: 400 }
    );
  }

  // Time determination (Server time now; support mock time in non-production for automated tests)
  let now = new Date();
  if (process.env.NODE_ENV !== "production") {
    const mockTimeHeader = request.headers.get("x-mock-time");
    if (mockTimeHeader) {
      const parsedMock = new Date(mockTimeHeader);
      if (!isNaN(parsedMock.getTime())) {
        now = parsedMock;
      }
    }
  }

  // Execute attendance scan
  const result = await processAttendanceScan({
    profile: profile as Profile,
    rawCode: body.code,
    now,
  });

  return NextResponse.json(result.data, { status: result.status });
}
