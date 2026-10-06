import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  // 1. Verify caller is a logged-in, active admin
  const adminAuth = await requireAdmin();
  if (!adminAuth) {
    return NextResponse.json(
      { ok: false, error: "Forbidden: Active administrator access required" },
      { status: 403 }
    );
  }

  // 2. Validate student ID param
  const { id: studentId } = await params;
  if (
    !studentId ||
    !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(studentId)
  ) {
    return NextResponse.json(
      { ok: false, error: "Invalid student ID parameter" },
      { status: 400 }
    );
  }

  // 3. Parse request body
  let body: {
    fullName?: string;
    isActive?: boolean;
    password?: string;
  };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { ok: false, error: "Invalid JSON request payload" },
      { status: 400 }
    );
  }

  const { fullName, isActive, password } = body;

  // Validate at least one field is provided
  if (fullName === undefined && isActive === undefined && password === undefined) {
    return NextResponse.json(
      {
        ok: false,
        error: "At least one field (fullName, isActive, or password) must be provided for update",
      },
      { status: 400 }
    );
  }

  // Validate individual fields
  if (fullName !== undefined) {
    if (typeof fullName !== "string" || fullName.trim().length < 2) {
      return NextResponse.json(
        { ok: false, error: "Full name must be at least 2 characters long" },
        { status: 400 }
      );
    }
  }

  if (isActive !== undefined && typeof isActive !== "boolean") {
    return NextResponse.json(
      { ok: false, error: "isActive must be a boolean" },
      { status: 400 }
    );
  }

  if (password !== undefined) {
    if (typeof password !== "string" || password.length < 8) {
      return NextResponse.json(
        { ok: false, error: "Password must be at least 8 characters long" },
        { status: 400 }
      );
    }
  }

  const adminClient = createAdminClient();

  // 4. Verify target user exists and is a student
  const { data: targetProfile, error: targetError } = await adminClient
    .from("profiles")
    .select("*")
    .eq("id", studentId)
    .maybeSingle();

  if (targetError || !targetProfile) {
    return NextResponse.json(
      { ok: false, error: "Student not found" },
      { status: 404 }
    );
  }

  if (targetProfile.role !== "student") {
    return NextResponse.json(
      { ok: false, error: "Target user is not a student" },
      { status: 400 }
    );
  }

  // 5. Update auth password if provided
  if (password !== undefined) {
    const { error: pwdError } = await adminClient.auth.admin.updateUserById(
      studentId,
      { password }
    );

    if (pwdError) {
      return NextResponse.json(
        { ok: false, error: "Failed to reset password: " + pwdError.message },
        { status: 400 }
      );
    }
  }

  // 6. Update profile fields if provided (never allow changing role or status here)
  let updatedProfile = targetProfile;
  if (fullName !== undefined || isActive !== undefined) {
    const profileUpdates: { full_name?: string; is_active?: boolean } = {};
    if (fullName !== undefined) {
      profileUpdates.full_name = fullName.trim();
    }
    if (isActive !== undefined) {
      profileUpdates.is_active = isActive;
    }

    const { data: updated, error: updateError } = await adminClient
      .from("profiles")
      .update(profileUpdates)
      .eq("id", studentId)
      .select()
      .single();

    if (updateError || !updated) {
      console.error("Failed to update profile:", updateError);
      return NextResponse.json(
        { ok: false, error: "Failed to update profile" },
        { status: 500 }
      );
    }

    updatedProfile = updated;
  }

  return NextResponse.json({
    ok: true,
    message: "Student updated successfully",
    profile: updatedProfile,
  });
}
