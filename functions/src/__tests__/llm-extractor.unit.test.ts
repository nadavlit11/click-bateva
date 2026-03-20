/**
 * Unit tests for enrichment/llm-extractor.ts — pure functions,
 * no mocks needed.
 */

import {fixNightTimeErrors} from "../enrichment/llm-extractor";

describe("fixNightTimeErrors", () => {
  it("fixes 23:00 → 01:00 when source says ל1 בלילה", () => {
    const hours = {
      sunday: {open: "12:00", close: "23:00"},
      monday: {open: "12:00", close: "23:00"},
    };
    fixNightTimeErrors(hours, "פתוח בין 12 בצהריים ל1 בלילה");
    expect(hours.sunday.close).toBe("01:00");
    expect(hours.monday.close).toBe("01:00");
  });

  it("fixes 22:00 → 02:00 when source says ל2 בלילה", () => {
    const hours = {
      sunday: {open: "18:00", close: "22:00"},
    };
    fixNightTimeErrors(hours, "עד ל2 בלילה");
    expect(hours.sunday.close).toBe("02:00");
  });

  it("fixes 24:00 → 03:00 when source says ל3 בלילה", () => {
    const hours = {
      friday: {open: "20:00", close: "24:00"},
    };
    fixNightTimeErrors(hours, "סוגר ל-3 בלילה");
    expect(hours.friday.close).toBe("03:00");
  });

  it("handles dash before number: ל-1 בלילה", () => {
    const hours = {
      thursday: {open: "10:00", close: "23:00"},
    };
    fixNightTimeErrors(hours, "פתוח ל-1 בלילה");
    expect(hours.thursday.close).toBe("01:00");
  });

  it("handles en-dash: ל–1 בלילה", () => {
    const hours = {
      sunday: {open: "12:00", close: "23:00"},
    };
    fixNightTimeErrors(hours, "עד ל–1 בלילה");
    expect(hours.sunday.close).toBe("01:00");
  });

  it("does nothing when source has no בלילה", () => {
    const hours = {
      sunday: {open: "09:00", close: "17:00"},
    };
    fixNightTimeErrors(hours, "שעות פתיחה: 09:00-17:00");
    expect(hours.sunday.close).toBe("17:00");
  });

  it("does nothing when night hour is >= 6", () => {
    const hours = {
      sunday: {open: "12:00", close: "23:00"},
    };
    fixNightTimeErrors(hours, "עד ל7 בלילה");
    expect(hours.sunday.close).toBe("23:00");
  });

  it("does not modify already correct times", () => {
    const hours = {
      sunday: {open: "12:00", close: "01:00"},
    };
    fixNightTimeErrors(hours, "פתוח ל1 בלילה");
    expect(hours.sunday.close).toBe("01:00");
  });

  it("skips null days", () => {
    const hours: Record<string, {open: string; close: string} | null> = {
      sunday: null,
      monday: {open: "12:00", close: "23:00"},
    };
    fixNightTimeErrors(hours, "סוגר ל1 בלילה");
    expect(hours.sunday).toBeNull();
    expect(hours.monday!.close).toBe("01:00");
  });

  it("only fixes 22:00/23:00/24:00, leaves 21:00 alone", () => {
    const hours = {
      sunday: {open: "12:00", close: "21:00"},
    };
    fixNightTimeErrors(hours, "עד ל1 בלילה");
    expect(hours.sunday.close).toBe("21:00");
  });

  it("does nothing when no ל pattern match", () => {
    const hours = {
      sunday: {open: "12:00", close: "23:00"},
    };
    fixNightTimeErrors(hours, "פתוח בלילה בלבד");
    expect(hours.sunday.close).toBe("23:00");
  });
});
