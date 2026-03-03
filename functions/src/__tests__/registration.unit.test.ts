/**
 * Unit tests for registration.ts — no emulator required.
 * Nodemailer is fully mocked; tests focus on validation logic and
 * email sending in sendRegistrationRequest.
 */

// ── Mocks (must be declared before imports) ──────────────────────────────────

const mockSendMail = jest.fn().mockResolvedValue({messageId: "mock-id"});

jest.mock("nodemailer", () => ({
  createTransport: jest.fn(() => ({sendMail: mockSendMail})),
}));

jest.mock("firebase-admin/app", () => ({
  initializeApp: jest.fn(),
  getApps: jest.fn(() => [{name: "mock-app"}]),
}));

jest.mock("firebase-functions/params", () => ({
  defineSecret: jest.fn((name: string) => ({
    value: () => name === "GMAIL_USER" ? "test@gmail.com" : "test-app-password",
  })),
}));

jest.mock("firebase-functions/logger", () => ({
  info: jest.fn(),
  error: jest.fn(),
  warn: jest.fn(),
}));

jest.mock("@sentry/node", () => ({
  captureException: jest.fn(),
}));

// ── Imports (after mocks) ─────────────────────────────────────────────────────

import firebaseFunctionsTest from "firebase-functions-test";
import {sendRegistrationRequest, escapeHtml, validateStringField} from "../registration.js";

const testEnv = firebaseFunctionsTest();

// ── Helpers ───────────────────────────────────────────────────────────────────

function makeRequest(overrides: object = {}) {
  return {
    data: {
      companyName: "חברת בדיקה",
      contactName: "ישראל ישראלי",
      phone: "0501234567",
      type: "business",
    },
    rawRequest: {},
    ...overrides,
  } as any;
}

// ── Tests ─────────────────────────────────────────────────────────────────────

afterAll(() => testEnv.cleanup());
afterEach(() => jest.clearAllMocks());

describe("sendRegistrationRequest — validation", () => {
  it("throws invalid-argument for missing companyName", async () => {
    await expect(
      sendRegistrationRequest.run(makeRequest({data: {companyName: "", contactName: "a", phone: "0501234567", type: "business"}}))
    ).rejects.toMatchObject({code: "invalid-argument"});
  });

  it("throws invalid-argument for non-string companyName", async () => {
    await expect(
      sendRegistrationRequest.run(makeRequest({data: {companyName: 123, contactName: "a", phone: "0501234567", type: "business"}}))
    ).rejects.toMatchObject({code: "invalid-argument"});
  });

  it("throws invalid-argument for missing contactName", async () => {
    await expect(
      sendRegistrationRequest.run(makeRequest({data: {companyName: "a", contactName: "", phone: "0501234567", type: "business"}}))
    ).rejects.toMatchObject({code: "invalid-argument"});
  });

  it("throws invalid-argument for missing phone", async () => {
    await expect(
      sendRegistrationRequest.run(makeRequest({data: {companyName: "a", contactName: "b", phone: "", type: "business"}}))
    ).rejects.toMatchObject({code: "invalid-argument"});
  });

  it("throws invalid-argument for invalid type", async () => {
    await expect(
      sendRegistrationRequest.run(makeRequest({data: {companyName: "a", contactName: "b", phone: "0501234567", type: "invalid"}}))
    ).rejects.toMatchObject({code: "invalid-argument"});
  });

  it("throws invalid-argument for field exceeding max length", async () => {
    const longString = "a".repeat(201);
    await expect(
      sendRegistrationRequest.run(makeRequest({data: {companyName: longString, contactName: "b", phone: "0501234567", type: "business"}}))
    ).rejects.toMatchObject({code: "invalid-argument"});
  });
});

describe("sendRegistrationRequest — success path", () => {
  it("sends email and returns success for business type", async () => {
    const result = await sendRegistrationRequest.run(makeRequest({}));

    expect(result).toEqual({success: true});
    expect(mockSendMail).toHaveBeenCalledTimes(1);
    const mailOptions = mockSendMail.mock.calls[0][0];
    expect(mailOptions.to).toBe("bateva365@gmail.com");
    expect(mailOptions.subject).toContain("בית עסק");
    expect(mailOptions.html).toContain("חברת בדיקה");
  });

  it("sends email with agent type label", async () => {
    const result = await sendRegistrationRequest.run(
      makeRequest({data: {companyName: "סוכנות", contactName: "דן", phone: "0521111111", type: "agent"}})
    );

    expect(result).toEqual({success: true});
    const mailOptions = mockSendMail.mock.calls[0][0];
    expect(mailOptions.subject).toContain("סוכן נסיעות");
  });
});

describe("sendRegistrationRequest — failure path", () => {
  it("throws internal error when sendMail fails", async () => {
    mockSendMail.mockRejectedValueOnce(new Error("SMTP error"));

    await expect(
      sendRegistrationRequest.run(makeRequest({}))
    ).rejects.toMatchObject({code: "internal"});
  });
});

describe("escapeHtml", () => {
  it("escapes all HTML special characters", () => {
    expect(escapeHtml('<script>alert("xss")</script>')).toBe(
      "&lt;script&gt;alert(&quot;xss&quot;)&lt;/script&gt;"
    );
  });

  it("escapes ampersand and single quotes", () => {
    expect(escapeHtml("Tom & Jerry's")).toBe("Tom &amp; Jerry&#39;s");
  });

  it("returns plain strings unchanged", () => {
    expect(escapeHtml("Hello World")).toBe("Hello World");
  });
});

describe("validateStringField", () => {
  it("returns trimmed value for valid input", () => {
    expect(validateStringField("  hello  ", 200, "error")).toBe("hello");
  });

  it("throws for empty string", () => {
    expect(() => validateStringField("", 200, "error")).toThrow();
  });

  it("throws for whitespace-only string", () => {
    expect(() => validateStringField("   ", 200, "error")).toThrow();
  });

  it("throws for non-string value", () => {
    expect(() => validateStringField(123, 200, "error")).toThrow();
  });

  it("throws for string exceeding max length", () => {
    expect(() => validateStringField("a".repeat(201), 200, "error")).toThrow();
  });

  it("accepts string at exactly max length", () => {
    expect(validateStringField("a".repeat(200), 200, "error")).toBe("a".repeat(200));
  });
});
