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
  let body: {
    fullName?: string;
    email?: string;
    tempPassword?: string;
  };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { ok: false, error: "Invalid JSON request payload" },
      { status: 400 }
    );
  }

  const { fullName, email, tempPassword } = body;

  // 3. Validate inputs
  if (!fullName || typeof fullName !== "string" || fullName.trim().length < 2) {
    return NextResponse.json(
      { ok: false, error: "Full name is required (minimum 2 characters)" },
      { status: 400 }
    );
  }

  if (
    !email ||
    typeof email !== "string" ||
    !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())
  ) {
    return NextResponse.json(
      { ok: false, error: "A valid email address is required" },
      { status: 400 }
    );
  }

  if (!tempPassword || typeof tempPassword !== "string" || tempPassword.length < 8) {
    return NextResponse.json(
      { ok: false, error: "Password must be at least 8 characters long" },
      { status: 400 }
    );
  }

  const normalizedEmail = email.trim().toLowerCase();
  const trimmedFullName = fullName.trim();
  const adminClient = createAdminClient();

  // 4. Return an error if the email already exists in profiles
  const { data: existingProfile } = await adminClient
    .from("profiles")
    .select("id, email")
    .eq("email", normalizedEmail)
    .maybeSingle();

  if (existingProfile) {
    return NextResponse.json(
      { ok: false, error: "A user with this email already exists" },
      { status: 400 }
    );
  }

  // 5. Use Supabase Admin API to create auth user (email confirmed)
  const { data: authData, error: authError } = await adminClient.auth.admin.createUser({
    email: normalizedEmail,
    password: tempPassword,
    email_confirm: true,
    user_metadata: {
      full_name: trimmedFullName,
    },
  });

  if (authError || !authData?.user) {
    return NextResponse.json(
      { ok: false, error: authError?.message || "Failed to create authentication user" },
      { status: 400 }
    );
  }

  // 6. Ensure profile is created with role 'student' (NEVER allow creating admins)
  const { data: profile, error: profileError } = await adminClient
    .from("profiles")
    .upsert({
      id: authData.user.id,
      full_name: trimmedFullName,
      email: normalizedEmail,
      role: "student", // Strictly hardcoded to student
      status: "approved",
      is_active: true,
    })
    .select()
    .single();

  if (profileError || !profile) {
    console.error("Failed to create profile:", profileError);
    return NextResponse.json(
      { ok: false, error: "User was created but profile update failed" },
      { status: 500 }
    );
  }

  return NextResponse.json(
    {
      ok: true,
      message: "Student created successfully",
      student: profile,
    },
    { status: 201 }
  );
}
