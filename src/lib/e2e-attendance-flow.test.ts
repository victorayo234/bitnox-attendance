import { describe, it, expect, beforeEach, vi } from "vitest";

// Mock server-only so Vitest can execute server modules in test environment
vi.mock("server-only", () => ({}));
vi.mock("./supabase/admin", () => ({
  createAdminClient: () => ({
    from: () => ({
      select: () => ({
        eq: () => ({
          eq: () => ({
            maybeSingle: () => Promise.resolve({ data: null, error: null }),
          }),
        }),
      }),
      insert: () => Promise.resolve({ error: null }),
      update: () => ({
        eq: () => ({
          is: () => ({
            select: () => Promise.resolve({ data: [{ id: "rec-1" }], error: null }),
          }),
        }),
      }),
    }),
  }),
}));

import {
  evaluateScan,
  getGateState,
  greeting,
  toLagosDateString,
  isWorkday,
  TodayAttendanceRecord,
} from "./attendance-rules";
import { processAttendanceScan } from "./attendance-scan";
import { Profile } from "@/types";
import { _resetRateLimit } from "./qr-utils";

// Helper to construct exact Lagos local times
function lagosInstant(dateStr: string, timeStr: string): Date {
  const [year, month, day] = dateStr.split("-").map(Number);
  const [hours, minutes, seconds] = timeStr.split(":").map(Number);
  // Lagos is UTC+1 (subtract 1 from hour to get UTC)
  return new Date(Date.UTC(year, month - 1, day, hours - 1, minutes, seconds));
}

describe("End-to-End Attendance Verification Flow", () => {
  const TEST_DATE = "2026-10-07"; // Wednesday workday
  const IN_SECRET = "bitnox-in-3e14bd4925d07bb6f099bcae0e9c8330";
  const OUT_SECRET = "bitnox-out-5a68f52ee29ec63887bdf0b87eaae18a";

  beforeEach(() => {
    _resetRateLimit();
    process.env.QR_IN_SECRET = IN_SECRET;
    process.env.QR_OUT_SECRET = OUT_SECRET;
  });

  const mockStudentProfile: Profile = {
    id: "e2e-test-student-id",
    full_name: "Chukwudi Okafor",
    email: "chukwudi@bitnox.qc",
    role: "student",
    status: "approved",
    is_active: true,
    created_at: new Date().toISOString(),
  };

  it("Step 1: Admin creates student -> Profile is approved student", () => {
    expect(mockStudentProfile.role).toBe("student");
    expect(mockStudentProfile.status).toBe("approved");
    expect(mockStudentProfile.is_active).toBe(true);
  });

  it("Step 2: Student logs in at 08:10 -> Evaluated as GATE_BLOCKING", () => {
    const time0810 = lagosInstant(TEST_DATE, "08:10:00");
    expect(isWorkday(time0810)).toBe(true);

    // No attendance record yet for today
    const todayRecord: TodayAttendanceRecord | null = null;
    const gateState = getGateState(time0810, todayRecord);

    expect(gateState).toBe("GATE_BLOCKING");
  });

  it("Step 3: Student scans OUT at 08:10 -> Rejected (WRONG_CODE_NEED_CHECKIN)", () => {
    const time0810 = lagosInstant(TEST_DATE, "08:10:00");
    const todayRecord: TodayAttendanceRecord | null = null;

    const evaluation = evaluateScan(time0810, "OUT", todayRecord);
    expect(evaluation.allowed).toBe(false);
    expect(evaluation.code).toBe("WRONG_CODE_NEED_CHECKIN");
    expect(evaluation.message).toBe("Wrong code. Please scan the CHECK IN code.");
  });

  it("Step 4: Student scans IN at 08:10 -> Accepted as Present", () => {
    const time0810 = lagosInstant(TEST_DATE, "08:10:00");
    const todayRecord: TodayAttendanceRecord | null = null;

    const evaluation = evaluateScan(time0810, "IN", todayRecord);
    expect(evaluation.allowed).toBe(true);
    expect(evaluation.code).toBe("OK");
    expect(evaluation.status).toBe("present");
    expect(evaluation.message).toBe("Checked in (Present)");

    // Welcome greeting
    const welcome = greeting(time0810, "IN", "Chukwudi");
    expect(welcome).toContain("Chukwudi");
    expect(welcome).toContain("Good Morning");
  });

  it("Step 5: Student scans IN again -> Rejected (ALREADY_CHECKED_IN)", () => {
    const time0815 = lagosInstant(TEST_DATE, "08:15:00");
    const todayRecord: TodayAttendanceRecord = {
      check_in_at: lagosInstant(TEST_DATE, "08:10:00").toISOString(),
      check_out_at: null,
      status: "present",
    };

    const evaluation = evaluateScan(time0815, "IN", todayRecord);
    expect(evaluation.allowed).toBe(false);
    expect(evaluation.code).toBe("ALREADY_CHECKED_IN");
    expect(evaluation.message).toBe("You have already checked in today.");
  });

  it("Step 6: Student tries OUT at 11:00 -> Rejected (CHECKOUT_NOT_OPEN)", () => {
    const time1100 = lagosInstant(TEST_DATE, "11:00:00");
    const todayRecord: TodayAttendanceRecord = {
      check_in_at: lagosInstant(TEST_DATE, "08:10:00").toISOString(),
      check_out_at: null,
      status: "present",
    };

    // Layout gate state is CHECKED_IN (cannot check out before 12:00)
    const gateState = getGateState(time1100, todayRecord);
    expect(gateState).toBe("CHECKED_IN");

    // Scan evaluation is rejected
    const evaluation = evaluateScan(time1100, "OUT", todayRecord);
    expect(evaluation.allowed).toBe(false);
    expect(evaluation.code).toBe("CHECKOUT_NOT_OPEN");
    expect(evaluation.message).toBe("Check-out opens at 12:00 p.m.");
  });

  it("Step 7: Student checks out at 12:30 -> Accepted as complete", () => {
    const time1230 = lagosInstant(TEST_DATE, "12:30:00");
    const todayRecord: TodayAttendanceRecord = {
      check_in_at: lagosInstant(TEST_DATE, "08:10:00").toISOString(),
      check_out_at: null,
      status: "present",
    };

    // Layout gate state is CHECKOUT_AVAILABLE
    const gateState = getGateState(time1230, todayRecord);
    expect(gateState).toBe("CHECKOUT_AVAILABLE");

    // Scan evaluation is allowed
    const evaluation = evaluateScan(time1230, "OUT", todayRecord);
    expect(evaluation.allowed).toBe(true);
    expect(evaluation.code).toBe("OK");

    // Farewell greeting
    const farewell = greeting(time1230, "OUT", "Chukwudi");
    expect(farewell).toContain("Chukwudi");
    expect(farewell).toContain("See you tomorrow");
  });

  it("Step 8: Admin sees correct data after checkout", () => {
    const completedRecord: TodayAttendanceRecord = {
      check_in_at: lagosInstant(TEST_DATE, "08:10:00").toISOString(),
      check_out_at: lagosInstant(TEST_DATE, "12:30:00").toISOString(),
      status: "present",
    };

    const finalGateState = getGateState(
      lagosInstant(TEST_DATE, "13:00:00"),
      completedRecord
    );
    expect(finalGateState).toBe("COMPLETE");

    // Attempting another checkout is rejected
    const extraCheckout = evaluateScan(
      lagosInstant(TEST_DATE, "13:05:00"),
      "OUT",
      completedRecord
    );
    expect(extraCheckout.allowed).toBe(false);
    expect(extraCheckout.code).toBe("ALREADY_CHECKED_OUT");
  });

  it("Security Edge Case: Deactivated student cannot scan", async () => {
    const deactivatedProfile: Profile = {
      ...mockStudentProfile,
      is_active: false,
    };

    const result = await processAttendanceScan({
      profile: deactivatedProfile,
      rawCode: IN_SECRET,
      now: lagosInstant(TEST_DATE, "08:10:00"),
    });

    expect(result.status).toBe(403);
    expect(result.data.ok).toBe(false);
    expect(result.data.code).toBe("ACCOUNT_INACTIVE");
  });
});
