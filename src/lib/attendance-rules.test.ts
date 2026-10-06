import { describe, it, expect } from "vitest";
import {
  lagosNow,
  toLagosDateString,
  lagosMinutesOfDay,
  lagosSecondsOfDay,
  isWorkday,
  getGateState,
  evaluateScan,
  greeting,
  getWeekRange,
} from "./attendance-rules";

// Helper to construct ISO timestamps from Lagos local time (Lagos is UTC+1)
// Lagos HH:mm:ss corresponds to UTC (HH - 1):mm:ss
function lagosTime(dateStr: string, timeStr: string): string {
  // Format: "2026-10-07" and "08:30:00"
  // If Lagos is 08:30:00, UTC is 07:30:00Z
  const [year, month, day] = dateStr.split("-").map(Number);
  const [hours, minutes, seconds] = timeStr.split(":").map(Number);
  const d = new Date(Date.UTC(year, month - 1, day, hours - 1, minutes, seconds));
  return d.toISOString();
}

describe("Attendance Rules Engine", () => {
  // A standard Wednesday workday in Lagos
  const WORKDAY_DATE = "2026-10-07";
  // A standard Saturday non-workday in Lagos
  const SATURDAY_DATE = "2026-10-10";

  describe("1. Timezone & Helpers", () => {
    it("lagosNow returns a valid Date instance", () => {
      expect(lagosNow()).toBeInstanceOf(Date);
    });

    it("toLagosDateString converts timestamps to YYYY-MM-DD in Africa/Lagos", () => {
      const time = lagosTime(WORKDAY_DATE, "09:15:00");
      expect(toLagosDateString(time)).toBe(WORKDAY_DATE);
    });

    it("handles date rollover at 00:00 Lagos time (UTC 23:30 previous day is already next day in Lagos)", () => {
      // 2026-10-05 23:30:00 UTC = 2026-10-06 00:30:00 in Africa/Lagos (UTC+1)
      const rolloverInstant = "2026-10-05T23:30:00.000Z";
      expect(toLagosDateString(rolloverInstant)).toBe("2026-10-06");
      expect(lagosMinutesOfDay(rolloverInstant)).toBe(30);
      expect(lagosSecondsOfDay(rolloverInstant)).toBe(1800);
    });

    it("lagosMinutesOfDay returns minutes since midnight in Lagos", () => {
      expect(lagosMinutesOfDay(lagosTime(WORKDAY_DATE, "00:00:00"))).toBe(0);
      expect(lagosMinutesOfDay(lagosTime(WORKDAY_DATE, "08:00:00"))).toBe(480);
      expect(lagosMinutesOfDay(lagosTime(WORKDAY_DATE, "08:30:00"))).toBe(510);
      expect(lagosMinutesOfDay(lagosTime(WORKDAY_DATE, "12:00:00"))).toBe(720);
      expect(lagosMinutesOfDay(lagosTime(WORKDAY_DATE, "23:59:00"))).toBe(1439);
    });

    it("isWorkday correctly identifies workdays vs weekends in Lagos", () => {
      // Monday 2026-10-05 to Friday 2026-10-09 are workdays
      expect(isWorkday(lagosTime("2026-10-05", "10:00:00"))).toBe(true);
      expect(isWorkday(lagosTime("2026-10-07", "10:00:00"))).toBe(true);
      expect(isWorkday(lagosTime("2026-10-09", "10:00:00"))).toBe(true);
      // Saturday 2026-10-10 & Sunday 2026-10-11 are non-workdays
      expect(isWorkday(lagosTime("2026-10-10", "10:00:00"))).toBe(false);
      expect(isWorkday(lagosTime("2026-10-11", "10:00:00"))).toBe(false);
    });
  });

  describe("2. Gate State (getGateState)", () => {
    describe("Non-workday (Saturday / Sunday)", () => {
      it("returns NO_ACTION on Saturday even during 08:00-12:00", () => {
        const time = lagosTime(SATURDAY_DATE, "09:00:00");
        expect(getGateState(time, null)).toBe("NO_ACTION");
      });

      it("returns NO_ACTION on Saturday after 12:00 with no record", () => {
        const time = lagosTime(SATURDAY_DATE, "13:00:00");
        expect(getGateState(time, null)).toBe("NO_ACTION");
      });
    });

    describe("Workday with NO record today", () => {
      it("returns NO_ACTION at boundary 07:59 (before 08:00)", () => {
        const time = lagosTime(WORKDAY_DATE, "07:59:00");
        expect(getGateState(time, null)).toBe("NO_ACTION");
      });

      it("returns GATE_BLOCKING at exact boundary 08:00", () => {
        const time = lagosTime(WORKDAY_DATE, "08:00:00");
        expect(getGateState(time, null)).toBe("GATE_BLOCKING");
      });

      it("returns GATE_BLOCKING at 08:30:00", () => {
        const time = lagosTime(WORKDAY_DATE, "08:30:00");
        expect(getGateState(time, null)).toBe("GATE_BLOCKING");
      });

      it("returns GATE_BLOCKING at 08:30:01", () => {
        const time = lagosTime(WORKDAY_DATE, "08:30:01");
        expect(getGateState(time, null)).toBe("GATE_BLOCKING");
      });

      it("returns GATE_BLOCKING at boundary 11:59", () => {
        const time = lagosTime(WORKDAY_DATE, "11:59:00");
        expect(getGateState(time, null)).toBe("GATE_BLOCKING");
      });

      it("returns CHECKIN_AVAILABLE_LATE at exact boundary 12:00", () => {
        const time = lagosTime(WORKDAY_DATE, "12:00:00");
        expect(getGateState(time, null)).toBe("CHECKIN_AVAILABLE_LATE");
      });

      it("returns CHECKIN_AVAILABLE_LATE at boundary 12:01", () => {
        const time = lagosTime(WORKDAY_DATE, "12:01:00");
        expect(getGateState(time, null)).toBe("CHECKIN_AVAILABLE_LATE");
      });
    });

    describe("Workday with check-in record", () => {
      const checkedInRecord = {
        check_in_at: lagosTime(WORKDAY_DATE, "08:15:00"),
        check_out_at: null,
      };

      it("returns CHECKED_IN before 12:00", () => {
        const time1 = lagosTime(WORKDAY_DATE, "09:00:00");
        const time2 = lagosTime(WORKDAY_DATE, "11:59:59");
        expect(getGateState(time1, checkedInRecord)).toBe("CHECKED_IN");
        expect(getGateState(time2, checkedInRecord)).toBe("CHECKED_IN");
      });

      it("returns CHECKOUT_AVAILABLE at 12:00 and after", () => {
        const time1 = lagosTime(WORKDAY_DATE, "12:00:00");
        const time2 = lagosTime(WORKDAY_DATE, "12:01:00");
        const time3 = lagosTime(WORKDAY_DATE, "16:30:00");
        expect(getGateState(time1, checkedInRecord)).toBe("CHECKOUT_AVAILABLE");
        expect(getGateState(time2, checkedInRecord)).toBe("CHECKOUT_AVAILABLE");
        expect(getGateState(time3, checkedInRecord)).toBe("CHECKOUT_AVAILABLE");
      });

      it("returns COMPLETE when both check_in_at and check_out_at are present", () => {
        const completeRecord = {
          check_in_at: lagosTime(WORKDAY_DATE, "08:15:00"),
          check_out_at: lagosTime(WORKDAY_DATE, "16:30:00"),
        };
        const time = lagosTime(WORKDAY_DATE, "17:00:00");
        expect(getGateState(time, completeRecord)).toBe("COMPLETE");
      });
    });
  });

  describe("3. Scan Evaluation (evaluateScan)", () => {
    describe("CHECK IN Scan", () => {
      it("allows check-in before 08:00 with status 'present' (07:59)", () => {
        const time = lagosTime(WORKDAY_DATE, "07:59:00");
        const res = evaluateScan(time, "IN", null);
        expect(res.allowed).toBe(true);
        expect(res.code).toBe("OK");
        expect(res.status).toBe("present");
      });

      it("allows check-in at 08:00 with status 'present'", () => {
        const time = lagosTime(WORKDAY_DATE, "08:00:00");
        const res = evaluateScan(time, "IN", null);
        expect(res.allowed).toBe(true);
        expect(res.code).toBe("OK");
        expect(res.status).toBe("present");
      });

      it("allows check-in at boundary 08:30:00 with status 'present'", () => {
        const time = lagosTime(WORKDAY_DATE, "08:30:00");
        const res = evaluateScan(time, "IN", null);
        expect(res.allowed).toBe(true);
        expect(res.code).toBe("OK");
        expect(res.status).toBe("present");
      });

      it("allows check-in at boundary 08:30:01 with status 'late'", () => {
        const time = lagosTime(WORKDAY_DATE, "08:30:01");
        const res = evaluateScan(time, "IN", null);
        expect(res.allowed).toBe(true);
        expect(res.code).toBe("OK");
        expect(res.status).toBe("late");
      });

      it("allows check-in at boundary 11:59 with status 'late'", () => {
        const time = lagosTime(WORKDAY_DATE, "11:59:00");
        const res = evaluateScan(time, "IN", null);
        expect(res.allowed).toBe(true);
        expect(res.code).toBe("OK");
        expect(res.status).toBe("late");
      });

      it("allows check-in at boundary 12:00 with status 'late'", () => {
        const time = lagosTime(WORKDAY_DATE, "12:00:00");
        const res = evaluateScan(time, "IN", null);
        expect(res.allowed).toBe(true);
        expect(res.code).toBe("OK");
        expect(res.status).toBe("late");
      });

      it("allows check-in at boundary 12:01 with status 'late'", () => {
        const time = lagosTime(WORKDAY_DATE, "12:01:00");
        const res = evaluateScan(time, "IN", null);
        expect(res.allowed).toBe(true);
        expect(res.code).toBe("OK");
        expect(res.status).toBe("late");
      });

      it("rejects double check-in when already checked in (ALREADY_CHECKED_IN)", () => {
        const checkedInRecord = {
          check_in_at: lagosTime(WORKDAY_DATE, "08:15:00"),
          check_out_at: null,
        };
        const time = lagosTime(WORKDAY_DATE, "09:00:00");
        const res = evaluateScan(time, "IN", checkedInRecord);
        expect(res.allowed).toBe(false);
        expect(res.code).toBe("ALREADY_CHECKED_IN");
      });
    });

    describe("CHECK OUT Scan", () => {
      it("rejects OUT code before 12:00 when not checked in with WRONG_CODE_NEED_CHECKIN", () => {
        const time = lagosTime(WORKDAY_DATE, "09:00:00");
        const res = evaluateScan(time, "OUT", null);
        expect(res.allowed).toBe(false);
        expect(res.code).toBe("WRONG_CODE_NEED_CHECKIN");
        expect(res.message).toBe("Wrong code. Please scan the CHECK IN code.");
      });

      it("rejects OUT code at or after 12:00 when not checked in with NO_CHECK_IN", () => {
        const timeAtNoon = lagosTime(WORKDAY_DATE, "12:00:00");
        const timeAfterNoon = lagosTime(WORKDAY_DATE, "13:00:00");

        const res1 = evaluateScan(timeAtNoon, "OUT", null);
        expect(res1.allowed).toBe(false);
        expect(res1.code).toBe("NO_CHECK_IN");
        expect(res1.message).toBe("You need to check in first.");

        const res2 = evaluateScan(timeAfterNoon, "OUT", null);
        expect(res2.allowed).toBe(false);
        expect(res2.code).toBe("NO_CHECK_IN");
      });

      it("rejects OUT code before 12:00 when checked in with CHECKOUT_NOT_OPEN", () => {
        const checkedInRecord = {
          check_in_at: lagosTime(WORKDAY_DATE, "08:15:00"),
          check_out_at: null,
        };
        const time1159 = lagosTime(WORKDAY_DATE, "11:59:59");
        const res = evaluateScan(time1159, "OUT", checkedInRecord);
        expect(res.allowed).toBe(false);
        expect(res.code).toBe("CHECKOUT_NOT_OPEN");
        expect(res.message).toBe("Check-out opens at 12:00 p.m.");
      });

      it("allows OUT scan at exact boundary 12:00:00 when checked in", () => {
        const checkedInRecord = {
          check_in_at: lagosTime(WORKDAY_DATE, "08:15:00"),
          check_out_at: null,
        };
        const time1200 = lagosTime(WORKDAY_DATE, "12:00:00");
        const res = evaluateScan(time1200, "OUT", checkedInRecord);
        expect(res.allowed).toBe(true);
        expect(res.code).toBe("OK");
      });

      it("allows OUT scan at boundary 12:01:00 and later", () => {
        const checkedInRecord = {
          check_in_at: lagosTime(WORKDAY_DATE, "08:15:00"),
          check_out_at: null,
        };
        const time1201 = lagosTime(WORKDAY_DATE, "12:01:00");
        const res = evaluateScan(time1201, "OUT", checkedInRecord);
        expect(res.allowed).toBe(true);
        expect(res.code).toBe("OK");
      });

      it("rejects double check-out when already checked out (ALREADY_CHECKED_OUT)", () => {
        const completeRecord = {
          check_in_at: lagosTime(WORKDAY_DATE, "08:15:00"),
          check_out_at: lagosTime(WORKDAY_DATE, "15:00:00"),
        };
        const time = lagosTime(WORKDAY_DATE, "16:00:00");
        const res = evaluateScan(time, "OUT", completeRecord);
        expect(res.allowed).toBe(false);
        expect(res.code).toBe("ALREADY_CHECKED_OUT");
      });
    });
  });

  describe("4. Greetings (greeting)", () => {
    it("returns 'Good Morning, {firstName}! Welcome back to Bitnox.' before 12:00", () => {
      const time = lagosTime(WORKDAY_DATE, "09:30:00");
      expect(greeting(time, "IN", "Chidi")).toBe(
        "Good Morning, Chidi! Welcome back to Bitnox."
      );
    });

    it("returns 'Good Afternoon, {firstName}! Welcome back to Bitnox.' at 12:00 and after", () => {
      const timeNoon = lagosTime(WORKDAY_DATE, "12:00:00");
      const timeAfternoon = lagosTime(WORKDAY_DATE, "14:15:00");
      expect(greeting(timeNoon, "IN", "Amina")).toBe(
        "Good Afternoon, Amina! Welcome back to Bitnox."
      );
      expect(greeting(timeAfternoon, "IN", "Amina")).toBe(
        "Good Afternoon, Amina! Welcome back to Bitnox."
      );
    });

    it("returns 'Goodnight, {firstName}! See you tomorrow.' for check-out", () => {
      const time = lagosTime(WORKDAY_DATE, "17:00:00");
      expect(greeting(time, "OUT", "Samuel")).toBe(
        "Goodnight, Samuel! See you tomorrow."
      );
    });
  });

  describe("5. Week Range (getWeekRange)", () => {
    it("returns Monday to Sunday and 5 workdays for Wednesday 2026-10-07", () => {
      const range = getWeekRange(lagosTime("2026-10-07", "10:00:00"));
      expect(range.startDate).toBe("2026-10-05"); // Monday
      expect(range.endDate).toBe("2026-10-11");   // Sunday
      expect(range.workdays).toEqual([
        "2026-10-05",
        "2026-10-06",
        "2026-10-07",
        "2026-10-08",
        "2026-10-09",
      ]);
      expect(range.workdays).toHaveLength(5);
    });

    it("returns identical Monday to Sunday range when given a Saturday", () => {
      const range = getWeekRange(lagosTime("2026-10-10", "14:00:00"));
      expect(range.startDate).toBe("2026-10-05");
      expect(range.endDate).toBe("2026-10-11");
    });

    it("returns identical Monday to Sunday range when given a Sunday", () => {
      const range = getWeekRange(lagosTime("2026-10-11", "20:00:00"));
      expect(range.startDate).toBe("2026-10-05");
      expect(range.endDate).toBe("2026-10-11");
    });

    it("correctly computes week range during date rollover at 00:00 Lagos", () => {
      // 2026-10-05 23:30:00 UTC = 2026-10-06 in Lagos (Tuesday)
      const range = getWeekRange("2026-10-05T23:30:00.000Z");
      expect(range.startDate).toBe("2026-10-05");
      expect(range.endDate).toBe("2026-10-11");
      expect(range.workdays[1]).toBe("2026-10-06");
    });
  });
});
