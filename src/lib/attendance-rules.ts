/**
 * Bitnox Attendance Pure Rules Engine
 * Source of truth: PROJECT_BRIEF.md
 * 
 * Rules:
 * - Pure and testable: does NOT touch the database.
 * - Accepts time as a parameter so tests can inject any instant.
 * - All times evaluated in Africa/Lagos timezone (UTC+1).
 */

import { formatInTimeZone, fromZonedTime } from "date-fns-tz";
import { TIMEZONE } from "./config";

export { TIMEZONE };

export type GateState =
  | "GATE_BLOCKING"          // 08:00 to before 12:00, no check-in today, workday
  | "CHECKIN_AVAILABLE_LATE" // 12:00 or later, no check-in, workday
  | "CHECKED_IN"             // check-in done, not out, before 12:00
  | "CHECKOUT_AVAILABLE"     // checked in, not out, 12:00 or later
  | "COMPLETE"               // both check-in and check-out done
  | "NO_ACTION";             // before 08:00 with no record, or non-workday

export type ScanType = "IN" | "OUT";

export type ScanErrorCode =
  | "OK"
  | "ALREADY_CHECKED_IN"
  | "WRONG_CODE_NEED_CHECKIN"
  | "NO_CHECK_IN"
  | "CHECKOUT_NOT_OPEN"
  | "ALREADY_CHECKED_OUT";

export interface ScanEvaluation {
  allowed: boolean;
  code: ScanErrorCode;
  message: string;
  status?: "present" | "late";
}

export interface TodayAttendanceRecord {
  check_in_at?: string | null;
  check_out_at?: string | null;
  status?: "present" | "late";
}

export interface WeekRange {
  startDate: string;   // YYYY-MM-DD (Monday)
  endDate: string;     // YYYY-MM-DD (Sunday)
  workdays: string[];  // 5 dates Mon-Fri in YYYY-MM-DD
  startOfWeek: Date;   // Monday 00:00:00 in Lagos
  endOfWeek: Date;     // Sunday 23:59:59.999 in Lagos
}

/**
 * 1. Returns current instant.
 */
export function lagosNow(): Date {
  if (process.env.NODE_ENV !== "production" && process.env.DEV_OVERRIDE_TIME) {
    const override = new Date(process.env.DEV_OVERRIDE_TIME);
    if (!isNaN(override.getTime())) {
      return override;
    }
  }
  return new Date();
}

/**
 * Returns "YYYY-MM-DD" calendar date in Africa/Lagos.
 */
export function toLagosDateString(date: Date | string | number): string {
  const d = new Date(date);
  return formatInTimeZone(d, TIMEZONE, "yyyy-MM-dd");
}

/**
 * Returns minutes since midnight in Africa/Lagos (0 to 1439).
 */
export function lagosMinutesOfDay(date: Date | string | number): number {
  const d = new Date(date);
  const hours = parseInt(formatInTimeZone(d, TIMEZONE, "HH"), 10);
  const minutes = parseInt(formatInTimeZone(d, TIMEZONE, "mm"), 10);
  return hours * 60 + minutes;
}

/**
 * Returns seconds since midnight in Africa/Lagos (0 to 86399).
 * Used for precise boundary checks (e.g. 08:30:00 vs 08:30:01).
 */
export function lagosSecondsOfDay(date: Date | string | number): number {
  const d = new Date(date);
  const hours = parseInt(formatInTimeZone(d, TIMEZONE, "HH"), 10);
  const minutes = parseInt(formatInTimeZone(d, TIMEZONE, "mm"), 10);
  const seconds = parseInt(formatInTimeZone(d, TIMEZONE, "ss"), 10);
  return hours * 3600 + minutes * 60 + seconds;
}

/**
 * Checks if the given date falls on a Monday-Friday workday in Africa/Lagos.
 */
export function isWorkday(date: Date | string | number): boolean {
  const d = new Date(date);
  const isoDay = parseInt(formatInTimeZone(d, TIMEZONE, "i"), 10); // 1 = Mon, 5 = Fri, 6 = Sat, 7 = Sun
  return isoDay >= 1 && isoDay <= 5;
}

/**
 * 2. Determines current gate state for a student.
 */
export function getGateState(
  now: Date | string | number,
  todayRecord?: TodayAttendanceRecord | null
): GateState {
  const hasCheckIn = Boolean(todayRecord?.check_in_at);
  const hasCheckOut = Boolean(todayRecord?.check_out_at);

  // Both check-in and check-out completed
  if (hasCheckIn && hasCheckOut) {
    return "COMPLETE";
  }

  const minutes = lagosMinutesOfDay(now);
  const isPastNoon = minutes >= 720; // 12:00 PM

  // Checked in, but not checked out yet
  if (hasCheckIn && !hasCheckOut) {
    return isPastNoon ? "CHECKOUT_AVAILABLE" : "CHECKED_IN";
  }

  // No check-in today: check workday and gate window
  if (!isWorkday(now)) {
    return "NO_ACTION";
  }

  // Before 08:00 on a workday with no record
  if (minutes < 480) {
    return "NO_ACTION";
  }

  // 08:00 to before 12:00 on a workday: blocking pop-up gate
  if (minutes >= 480 && minutes < 720) {
    return "GATE_BLOCKING";
  }

  // 12:00 or later with no check-in: banner and late scan allowed
  return "CHECKIN_AVAILABLE_LATE";
}

/**
 * 3. Evaluates QR scan attempt against daily rules.
 */
export function evaluateScan(
  now: Date | string | number,
  scanType: ScanType,
  todayRecord?: TodayAttendanceRecord | null
): ScanEvaluation {
  const hasCheckIn = Boolean(todayRecord?.check_in_at);
  const hasCheckOut = Boolean(todayRecord?.check_out_at);
  const seconds = lagosSecondsOfDay(now);

  const LATE_CUTOFF_SECONDS = 8 * 3600 + 30 * 60; // 08:30:00 (30,600s)
  const NOON_SECONDS = 12 * 3600;                 // 12:00:00 (43,200s)

  if (scanType === "IN") {
    if (hasCheckIn) {
      return {
        allowed: false,
        code: "ALREADY_CHECKED_IN",
        message: "You have already checked in today.",
      };
    }

    // Check-in after 08:30 is late; at or before 08:30 is present.
    // Check-in before 08:00 is allowed (present).
    const isLate = seconds > LATE_CUTOFF_SECONDS;
    const status = isLate ? "late" : "present";

    return {
      allowed: true,
      code: "OK",
      status,
      message: isLate ? "Checked in (Late)" : "Checked in (Present)",
    };
  }

  // scanType === "OUT"
  if (!hasCheckIn) {
    if (seconds < NOON_SECONDS) {
      return {
        allowed: false,
        code: "WRONG_CODE_NEED_CHECKIN",
        message: "Wrong code. Please scan the CHECK IN code.",
      };
    }
    return {
      allowed: false,
      code: "NO_CHECK_IN",
      message: "You need to check in first.",
    };
  }

  // Check-in already done
  if (seconds < NOON_SECONDS) {
    return {
      allowed: false,
      code: "CHECKOUT_NOT_OPEN",
      message: "Check-out opens at 12:00 p.m.",
    };
  }

  if (hasCheckOut) {
    return {
      allowed: false,
      code: "ALREADY_CHECKED_OUT",
      message: "You have already checked out today.",
    };
  }

  return {
    allowed: true,
    code: "OK",
    message: "Check-out allowed",
  };
}

/**
 * 4. Generates success greeting message.
 */
export function greeting(
  now: Date | string | number,
  type: ScanType,
  firstName: string
): string {
  const name = firstName?.trim() || "Student";
  const seconds = lagosSecondsOfDay(now);
  const isPastNoon = seconds >= 12 * 3600;

  if (type === "IN") {
    const timeOfDay = isPastNoon ? "Good Afternoon" : "Good Morning";
    return `${timeOfDay}, ${name}! Welcome back to Bitnox.`;
  }

  return `Goodnight, ${name}! See you tomorrow.`;
}

/**
 * 5. Returns Monday-Sunday week range and workdays for any date in Africa/Lagos.
 */
export function getWeekRange(dateInLagos: Date | string | number): WeekRange {
  const d = new Date(dateInLagos);
  const dayOfWeek = parseInt(formatInTimeZone(d, TIMEZONE, "i"), 10); // 1 = Mon, 7 = Sun
  const dateStr = formatInTimeZone(d, TIMEZONE, "yyyy-MM-dd");

  const [year, month, day] = dateStr.split("-").map(Number);
  const targetUtcDate = new Date(Date.UTC(year, month - 1, day));

  const mondayDiffDays = dayOfWeek - 1;
  const mondayUtc = new Date(targetUtcDate.getTime() - mondayDiffDays * 24 * 60 * 60 * 1000);

  const workdays: string[] = [];
  for (let i = 0; i < 5; i++) {
    const wd = new Date(mondayUtc.getTime() + i * 24 * 60 * 60 * 1000);
    workdays.push(wd.toISOString().slice(0, 10));
  }

  const sundayUtc = new Date(mondayUtc.getTime() + 6 * 24 * 60 * 60 * 1000);
  const startDate = workdays[0];
  const endDate = sundayUtc.toISOString().slice(0, 10);

  const startOfWeek = fromZonedTime(`${startDate} 00:00:00`, TIMEZONE);
  const endOfWeek = fromZonedTime(`${endDate} 23:59:59.999`, TIMEZONE);

  return {
    startDate,
    endDate,
    workdays,
    startOfWeek,
    endOfWeek,
  };
}
