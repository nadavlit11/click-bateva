/**
 * Unit tests for enrichment/index.ts — pure functions only.
 */

// ── Mocks (must be declared before imports) ──────

jest.mock("firebase-admin/app", () => ({
  initializeApp: jest.fn(),
  getApps: jest.fn(() => [{name: "mock-app"}]),
}));

jest.mock("firebase-admin/firestore", () => ({
  getFirestore: jest.fn(() => ({doc: jest.fn()})),
}));

jest.mock("firebase-admin/storage", () => ({
  getStorage: jest.fn(),
}));

jest.mock("firebase-functions/params", () => ({
  defineSecret: jest.fn(() => ({value: jest.fn()})),
}));

jest.mock("@sentry/node", () => ({
  init: jest.fn(),
  captureException: jest.fn(),
}));

import {
  formatInstructions,
  mergeResults,
} from "../enrichment/index";
import {ProgrammaticResult} from "../enrichment/types";

function makeProgResult(
  overrides: Partial<ProgrammaticResult> = {},
): ProgrammaticResult {
  return {
    phone: null,
    whatsapp: null,
    email: null,
    videos: [],
    images: [],
    facebook: null,
    openingHours: null,
    location: null,
    ...overrides,
  };
}

describe("formatInstructions", () => {
  it("returns undefined for undefined data", () => {
    expect(formatInstructions(undefined)).toBeUndefined();
  });

  it("returns undefined for empty object", () => {
    expect(formatInstructions({})).toBeUndefined();
  });

  it("formats general rule", () => {
    const result = formatInstructions({
      general: "Check contact page carefully",
    });
    expect(result).toBe(
      "General: Check contact page carefully",
    );
  });

  it("formats per-field rules", () => {
    const result = formatInstructions({
      opening_hours: "Check for בלילה",
      price: "Include context",
    });
    expect(result).toContain(
      "opening_hours: Check for בלילה",
    );
    expect(result).toContain("price: Include context");
  });

  it("puts general first, then per-field", () => {
    const result = formatInstructions({
      general: "General rule",
      images: "Skip logos",
    });
    expect(result).toBe(
      "General: General rule\nimages: Skip logos",
    );
  });

  it("skips non-string values", () => {
    const result = formatInstructions({
      general: "A rule",
      count: 42,
      nested: {foo: "bar"},
    });
    expect(result).toBe("General: A rule");
  });
});

describe("mergeResults", () => {
  const llmEmpty = {
    openingHours: null,
    price: null,
    whatsapp: null,
  };

  it("uses programmatic openingHours when present", () => {
    const progHours = {
      sunday: {open: "09:00", close: "17:00"},
      monday: null, tuesday: null, wednesday: null,
      thursday: null, friday: null, saturday: null,
    };
    const llmHours = {
      sunday: {open: "10:00", close: "18:00"},
      monday: null, tuesday: null, wednesday: null,
      thursday: null, friday: null, saturday: null,
    };
    const prog = makeProgResult(
      {openingHours: progHours},
    );
    const result = mergeResults(
      prog, {...llmEmpty, openingHours: llmHours},
    );
    expect(result.openingHours).toBe(progHours);
  });

  it("falls back to LLM openingHours when programmatic is null", () => {
    const llmHours = {
      sunday: {open: "10:00", close: "18:00"},
      monday: null, tuesday: null, wednesday: null,
      thursday: null, friday: null, saturday: null,
    };
    const prog = makeProgResult({openingHours: null});
    const result = mergeResults(
      prog, {...llmEmpty, openingHours: llmHours},
    );
    expect(result.openingHours).toBe(llmHours);
  });

  it("uses programmatic whatsapp when present", () => {
    const prog = makeProgResult(
      {whatsapp: "0521234567"},
    );
    const result = mergeResults(
      prog, {...llmEmpty, whatsapp: "0529876543"},
    );
    expect(result.whatsapp).toBe("0521234567");
  });

  it("falls back to LLM whatsapp when programmatic is null", () => {
    const prog = makeProgResult({whatsapp: null});
    const result = mergeResults(
      prog, {...llmEmpty, whatsapp: "0529876543"},
    );
    expect(result.whatsapp).toBe("0529876543");
  });

  it("price always comes from LLM", () => {
    const prog = makeProgResult();
    const result = mergeResults(
      prog, {...llmEmpty, price: "כניסה: 80₪"},
    );
    expect(result.price).toBe("כניסה: 80₪");
  });

  it("preserves programmatic phone and email", () => {
    const prog = makeProgResult({
      phone: "046816000",
      email: "info@example.co.il",
    });
    const result = mergeResults(prog, llmEmpty);
    expect(result.phone).toBe("046816000");
    expect(result.email).toBe("info@example.co.il");
  });

  it("preserves programmatic images and videos", () => {
    const prog = makeProgResult({
      images: ["https://example.com/a.jpg"],
      videos: ["https://youtube.com/watch?v=abc"],
    });
    const result = mergeResults(prog, llmEmpty);
    expect(result.images).toEqual(
      ["https://example.com/a.jpg"],
    );
    expect(result.videos).toEqual(
      ["https://youtube.com/watch?v=abc"],
    );
  });
});
