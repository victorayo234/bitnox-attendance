import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  toLagosDateString,
  lagosSecondsOfDay,
} from "@/lib/attendance-rules";

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
    studentId?: string;
    date?: string;
    action?: string;
    time?: string;
  };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { ok: false, error: "Invalid JSON request payload" },
      { status: 400 }
    );
  }

  const { studentId, date: inputDate, action, time } = body;

  // 3. Input validation
  if (!studentId || typeof studentId !== "string" || !studentId.trim()) {
    return NextResponse.json(
      { ok: false, error: "studentId is required" },
      { status: 400 }
    );
  }

  if (action !== "check_in" && action !== "check_out") {
    return NextResponse.json(
      { ok: false, error: "Invalid action. Must be 'check_in' or 'check_out'" },
      { status: 400 }
    );
  }

  const todayLagos = toLagosDateString(new Date());
  let date = todayLagos;

  if (inputDate) {
    if (typeof inputDate !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(inputDate)) {
      return NextResponse.json(
        { ok: false, error: "Invalid date format. Expected YYYY-MM-DD" },
        { status: 400 }
      );
    }

    const parsedDate = new Date(inputDate);
    if (isNaN(parsedDate.getTime())) {
      return NextResponse.json(
        { ok: false, error: "Invalid calendar date" },
        { status: 400 }
      );
    }

    // Validate the date is not in the future (compared to Lagos date)
    if (inputDate > todayLagos) {
      return NextResponse.json(
        { ok: false, error: "Attendance date cannot be in the future" },
        { status: 400 }
      );
    }

    date = inputDate;
  }

  // 4. Time resolution and validation
  let targetDate: Date;
  if (time) {
    if (typeof time !== "string" || !/^([01]\d|2[0-3]):([0-5]\d)$/.test(time)) {
      return NextResponse.json(
        { ok: false, error: "Invalid time format. Expected HH:mm in 24-hour format" },
        { status: 400 }
      );
    }
    // Africa/Lagos is UTC+1 with no DST
    targetDate = new Date(`${date}T${time}:00+01:00`);
  } else {
    if (date === todayLagos) {
      targetDate = new Date();
    } else {
      // Sensible defaults for past dates if time omitted
      const defaultTime = action === "check_in" ? "08:30" : "16:00";
      targetDate = new Date(`${date}T${defaultTime}:00+01:00`);
    }
  }

  const adminClient = createAdminClient();

  // 5. Verify student exists and is active
  const { data: student, error: studentError } = await adminClient
    .from("profiles")
    .select("id, full_name, email, role, is_active, status")
    .eq("id", studentId)
    .maybeSingle();

  if (studentError || !student) {
    return NextResponse.json(
      { ok: false, error: "Student not found" },
      { status: 404 }
    );
  }

  if (!student.is_active) {
    return NextResponse.json(
      { ok: false, error: "Student account is deactivated" },
      { status: 400 }
    );
  }

  if (student.role !== "student") {
    return NextResponse.json(
      { ok: false, error: "Target user is not a student" },
      { status: 400 }
    );
  }

  // 6. Fetch existing attendance row for this student and date
  const { data: existingRow, error: fetchRowError } = await adminClient
    .from("attendance")
    .select("*")
    .eq("student_id", studentId)
    .eq("attendance_date", date)
    .maybeSingle();

  if (fetchRowError) {
    return NextResponse.json(
      { ok: false, error: "Failed to query attendance record: " + fetchRowError.message },
      { status: 500 }
    );
  }

  // 7. Validate check_out is not before check_in
  if (action === "check_out") {
    if (existingRow?.check_in_at) {
      const checkInTime = new Date(existingRow.check_in_at).getTime();
      if (targetDate.getTime() < checkInTime) {
        return NextResponse.json(
          { ok: false, error: "Check-out time cannot be before check-in time" },
          { status: 400 }
        );
      }
    }
  } else if (action === "check_in") {
    if (existingRow?.check_out_at) {
      const checkOutTime = new Date(existingRow.check_out_at).getTime();
      if (targetDate.getTime() > checkOutTime) {
        return NextResponse.json(
          { ok: false, error: "Check-in time cannot be after check-out time" },
          { status: 400 }
        );
      }
    }
  }

  // 8. Compute status with late rule (late if check-in after 08:30 Lagos)
  let status: "present" | "late";
  if (action === "check_in") {
    const seconds = lagosSecondsOfDay(targetDate);
    const LATE_CUTOFF_SECONDS = 8 * 3600 + 30 * 60; // 08:30:00 (30,600s)
    status = seconds > LATE_CUTOFF_SECONDS ? "late" : "present";
  } else {
    status = existingRow?.status || "present";
  }

  // 9. Create or update attendance row
  if (existingRow) {
    const updatePayload: {
      check_in_at?: string;
      check_out_at?: string;
      status?: "present" | "late";
      marked_by_admin: boolean;
    } = {
      marked_by_admin: true,
    };

    if (action === "check_in") {
      updatePayload.check_in_at = targetDate.toISOString();
      updatePayload.status = status;
    } else {
      updatePayload.check_out_at = targetDate.toISOString();
    }

    const { data: updated, error: updateError } = await adminClient
      .from("attendance")
      .update(updatePayload)
      .eq("id", existingRow.id)
      .select()
      .single();

    if (updateError || !updated) {
      return NextResponse.json(
        { ok: false, error: "Failed to update attendance record: " + updateError?.message },
        { status: 500 }
      );
    }

    return NextResponse.json({
      ok: true,
      message: `Attendance ${action === "check_in" ? "check-in" : "check-out"} successfully updated by admin`,
      attendance: updated,
    });
  } else {
    const insertPayload = {
      student_id: studentId,
      attendance_date: date,
      check_in_at: action === "check_in" ? targetDate.toISOString() : null,
      check_out_at: action === "check_out" ? targetDate.toISOString() : null,
      status: status,
      marked_by_admin: true,
    };

    const { data: inserted, error: insertError } = await adminClient
      .from("attendance")
      .insert(insertPayload)
      .select()
      .single();

    if (insertError || !inserted) {
      return NextResponse.json(
        { ok: false, error: "Failed to create attendance record: " + insertError?.message },
        { status: 500 }
      );
    }

    return NextResponse.json({
      ok: true,
      message: `Attendance ${action === "check_in" ? "check-in" : "check-out"} successfully recorded by admin`,
      attendance: inserted,
    });
  }
}
