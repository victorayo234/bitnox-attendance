/**
 * Attendance Scan Processing Engine
 * Source of truth: PROJECT_BRIEF.md
 */

import { formatInTimeZone } from "date-fns-tz";
import {
  TIMEZONE,
  toLagosDateString,
  evaluateScan,
  greeting,
  ScanType,
  ScanEvaluation,
} from "./attendance-rules";
import { createAdminClient } from "./supabase/admin";
import { Profile } from "@/types";
import {
  extractQrSecret,
  safeCompareSecret,
  checkRateLimit,
} from "./qr-utils";

export { extractQrSecret, safeCompareSecret, checkRateLimit };

export interface ScanRequestResult {
  status: number;
  data: {
    ok: boolean;
    code?: string;
    message: string;
    type?: ScanType;
    time?: string;
    status?: "present" | "late";
  };
}

/**
 * Pure server-side scan processing handler.
 */
export async function processAttendanceScan({
  profile,
  rawCode,
  now = new Date(),
}: {
  profile: Profile;
  rawCode: string;
  now?: Date;
}): Promise<ScanRequestResult> {
  // 1. Validate profile
  if (!profile || !profile.is_active || profile.status !== "approved") {
    return {
      status: 403,
      data: {
        ok: false,
        code: "ACCOUNT_INACTIVE",
        message: "Your account is not approved to record attendance.",
      },
    };
  }

  // Rate limit check
  if (!checkRateLimit(profile.id)) {
    return {
      status: 429,
      data: {
        ok: false,
        code: "RATE_LIMITED",
        message: "Too many scan attempts. Please wait a minute before trying again.",
      },
    };
  }

  // Validate rawCode length & format
  if (!rawCode || typeof rawCode !== "string" || rawCode.length > 500) {
    return {
      status: 400,
      data: {
        ok: false,
        code: "INVALID_REQUEST",
        message: "Invalid QR code format.",
      },
    };
  }

  // 2. Extract secret and compare with constant-time equality
  const secret = extractQrSecret(rawCode);
  const inSecret = process.env.QR_IN_SECRET || "";
  const outSecret = process.env.QR_OUT_SECRET || "";

  const isMatchIn = safeCompareSecret(secret, inSecret);
  const isMatchOut = safeCompareSecret(secret, outSecret);

  if (!isMatchIn && !isMatchOut) {
    console.error("Attendance scan failed: unrecognized QR code", { userId: profile.id });
    return {
      status: 400,
      data: {
        ok: false,
        code: "INVALID_CODE",
        message: "This QR code is not recognised.",
      },
    };
  }

  const scanType: ScanType = isMatchIn ? "IN" : "OUT";

  // 3. Server time now & load today's attendance row
  const lagosDate = toLagosDateString(now);
  const adminClient = createAdminClient();

  const { data: todayRow, error: fetchError } = await adminClient
    .from("attendance")
    .select("id, check_in_at, check_out_at, status")
    .eq("student_id", profile.id)
    .eq("attendance_date", lagosDate)
    .maybeSingle();

  if (fetchError) {
    console.error("Database error fetching attendance row", { userId: profile.id, error: fetchError.message });
    return {
      status: 500,
      data: {
        ok: false,
        code: "SERVER_ERROR",
        message: "An internal server error occurred.",
      },
    };
  }

  // 4. Call evaluateScan
  const evaluation: ScanEvaluation = evaluateScan(now, scanType, todayRow);

  if (!evaluation.allowed) {
    // 403 for time-based rejections, 409 for state conflicts
    const httpStatus =
      evaluation.code === "CHECKOUT_NOT_OPEN" || evaluation.code === "WRONG_CODE_NEED_CHECKIN"
        ? 403
        : 409;

    return {
      status: httpStatus,
      data: {
        ok: false,
        code: evaluation.code,
        message: evaluation.message,
      },
    };
  }

  const firstName = profile.full_name?.trim().split(" ")[0] || "Student";
  const formattedTime = formatInTimeZone(now, TIMEZONE, "hh:mm a");

  // 5. Database write
  if (scanType === "IN") {
    // Insert new attendance record
    const { error: insertError } = await adminClient
      .from("attendance")
      .insert({
        student_id: profile.id,
        attendance_date: lagosDate,
        check_in_at: now.toISOString(),
        status: evaluation.status || "present",
        marked_by_admin: false,
      });

    if (insertError) {
      // Catch unique-constraint race condition (concurrent duplicate check-in)
      if (insertError.code === "23505" || insertError.message.toLowerCase().includes("unique")) {
        return {
          status: 409,
          data: {
            ok: false,
            code: "ALREADY_CHECKED_IN",
            message: "You have already checked in today.",
          },
        };
      }

      console.error("Failed to insert attendance check-in", { userId: profile.id, error: insertError.message });
      return {
        status: 500,
        data: {
          ok: false,
          code: "SERVER_ERROR",
          message: "Failed to record check-in.",
        },
      };
    }

    // 6. Return success response
    return {
      status: 200,
      data: {
        ok: true,
        type: "IN",
        message: greeting(now, "IN", firstName),
        time: formattedTime,
        status: evaluation.status,
      },
    };
  }

  // scanType === "OUT"
  // Update check_out_at WHERE id = todayRow.id AND check_out_at IS NULL
  if (!todayRow) {
    return {
      status: 409,
      data: {
        ok: false,
        code: "NO_CHECK_IN",
        message: "You need to check in first.",
      },
    };
  }

  const { data: updatedRows, error: updateError } = await adminClient
    .from("attendance")
    .update({
      check_out_at: now.toISOString(),
    })
    .eq("id", todayRow.id)
    .is("check_out_at", null)
    .select();

  if (updateError) {
    console.error("Failed to record check-out", { userId: profile.id, error: updateError.message });
    return {
      status: 500,
      data: {
        ok: false,
        code: "SERVER_ERROR",
        message: "Failed to record check-out.",
      },
    };
  }

  // Handle zero rows updated (concurrent double checkout)
  if (!updatedRows || updatedRows.length === 0) {
    return {
      status: 409,
      data: {
        ok: false,
        code: "ALREADY_CHECKED_OUT",
        message: "You have already checked out today.",
      },
    };
  }

  // 6. Return success response
  return {
    status: 200,
    data: {
      ok: true,
      type: "OUT",
      message: greeting(now, "OUT", firstName),
      time: formattedTime,
      status: todayRow.status as "present" | "late",
    },
  };
}
