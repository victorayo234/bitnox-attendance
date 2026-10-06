import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function POST(_request: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Verify user is an approved, active student
  const { data: profile } = await supabase
    .from("profiles")
    .select("role, status, is_active")
    .eq("id", user.id)
    .single();

  if (!profile || !profile.is_active || profile.status !== "approved") {
    return NextResponse.json(
      { error: "Forbidden: Account is not approved to record attendance" },
      { status: 403 }
    );
  }

  return NextResponse.json({
    message: "Attendance scan endpoint ready. Waiting for scan parameters.",
  });
}
