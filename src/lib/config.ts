/**
 * Bitnox Attendance Configuration Constants
 * Source of truth: PROJECT_BRIEF.md
 * All times are evaluated against Africa/Lagos server time.
 */

export const TIMEZONE = "Africa/Lagos";

export const GATE_START = "08:00";
export const LATE_AFTER = "08:30";
export const CHECKOUT_OPENS = "12:00";

// Monday (1) to Friday (5) as standard JS/date-fns workday indices (0 = Sunday, 6 = Saturday)
export const WORKDAYS = [1, 2, 3, 4, 5] as const;

export const WORKDAY_NAMES = [
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
] as const;

export type WorkdayIndex = (typeof WORKDAYS)[number];
