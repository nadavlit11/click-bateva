import { describe, it, expect } from "vitest";
import { getOpeningStatusText } from "./openingStatus";
import type { DayHours } from "../types";

function mkHours(overrides: Partial<Record<string, DayHours | null>> = {}): Record<string, DayHours | null> {
  return {
    sunday: null, monday: null, tuesday: null, wednesday: null,
    thursday: null, friday: null, saturday: null,
    ...overrides,
  };
}

// Helper: create a Date for a specific day and time.
// dayIndex: 0=Sunday, 1=Monday, ...
function dateAt(dayIndex: number, time: string): Date {
  // Use a known Sunday: 2026-02-22 is a Sunday
  const base = new Date(2026, 1, 22); // Feb 22, 2026 = Sunday
  base.setDate(base.getDate() + dayIndex);
  const [h, m] = time.split(":").map(Number);
  base.setHours(h, m, 0, 0);
  return base;
}

describe("getOpeningStatusText", () => {
  it("returns first line of legacy string", () => {
    expect(getOpeningStatusText("פתוח כל היום\nסגור בשבת")).toBe("פתוח כל היום");
  });

  it("returns full legacy string when no newlines", () => {
    expect(getOpeningStatusText("בתיאום מראש")).toBe("בתיאום מראש");
  });

  it("shows 'פתוח עד' when currently open", () => {
    const hours = mkHours({ sunday: { open: "09:00", close: "17:00" } });
    const now = dateAt(0, "12:00"); // Sunday 12:00
    expect(getOpeningStatusText(hours, now)).toBe("פתוח עד 17:00");
  });

  it("shows 'פתוח עד' at opening time exactly", () => {
    const hours = mkHours({ monday: { open: "10:00", close: "18:00" } });
    const now = dateAt(1, "10:00"); // Monday 10:00
    expect(getOpeningStatusText(hours, now)).toBe("פתוח עד 18:00");
  });

  it("shows 'סגור. יפתח ב-' when not yet open today", () => {
    const hours = mkHours({ sunday: { open: "10:00", close: "17:00" } });
    const now = dateAt(0, "08:30"); // Sunday 08:30
    expect(getOpeningStatusText(hours, now)).toBe("סגור. יפתח ב-10:00");
  });

  it("shows 'סגור. יפתח מחר' when closed today and tomorrow is open", () => {
    const hours = mkHours({ monday: { open: "09:00", close: "17:00" } });
    const now = dateAt(0, "18:00"); // Sunday 18:00, Monday is open
    expect(getOpeningStatusText(hours, now)).toBe("סגור. יפתח מחר ב-09:00");
  });

  it("shows 'סגור. יפתח ביום X' when next opening is 2+ days away", () => {
    const hours = mkHours({ wednesday: { open: "08:00", close: "16:00" } });
    const now = dateAt(0, "18:00"); // Sunday 18:00, next opening is Wednesday
    expect(getOpeningStatusText(hours, now)).toBe("סגור. יפתח ביום רביעי 08:00");
  });

  it("shows 'סגור. יפתח מחר' after closing time today with tomorrow open", () => {
    const hours = mkHours({
      sunday: { open: "09:00", close: "17:00" },
      monday: { open: "09:00", close: "17:00" },
    });
    const now = dateAt(0, "18:00"); // Sunday 18:00, past closing
    expect(getOpeningStatusText(hours, now)).toBe("סגור. יפתח מחר ב-09:00");
  });

  it("returns 'סגור' when all days are null", () => {
    const hours = mkHours();
    const now = dateAt(0, "12:00");
    expect(getOpeningStatusText(hours, now)).toBe("סגור");
  });

  it("shows 'סגור. יפתח ב-' at closing time exactly (closed)", () => {
    // At exactly 17:00, currentTime < close is false, so it's closed
    const hours = mkHours({
      sunday: { open: "09:00", close: "17:00" },
      monday: { open: "10:00", close: "18:00" },
    });
    const now = dateAt(0, "17:00"); // Sunday exactly at close
    expect(getOpeningStatusText(hours, now)).toBe("סגור. יפתח מחר ב-10:00");
  });

  it("wraps around the week correctly (Saturday → Sunday)", () => {
    const hours = mkHours({ sunday: { open: "10:00", close: "14:00" } });
    const now = dateAt(6, "20:00"); // Saturday 20:00
    expect(getOpeningStatusText(hours, now)).toBe("סגור. יפתח מחר ב-10:00");
  });
});
