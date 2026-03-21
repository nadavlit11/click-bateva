/**
 * Unit tests for email.ts — sendContactEmail Cloud Function.
 */

// ── Mocks (must be declared before imports) ──────

jest.mock("firebase-admin/app", () => ({
  initializeApp: jest.fn(),
  getApps: jest.fn(() => [{name: "mock-app"}]),
}));

const mockGetUser = jest.fn();
jest.mock("firebase-admin/auth", () => ({
  getAuth: jest.fn(() => ({getUser: mockGetUser})),
}));

const mockSendMail = jest.fn();
jest.mock("nodemailer", () => ({
  createTransport: jest.fn(() => ({sendMail: mockSendMail})),
}));

const mockLogger = {
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
  debug: jest.fn(),
};
jest.mock("firebase-functions/logger", () => mockLogger);

const mockSentry = {
  init: jest.fn(),
  captureException: jest.fn(),
};
jest.mock("@sentry/node", () => mockSentry);

import {sendContactEmail} from "../email";

// ── Helpers ──────────────────────────────────────

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function makeReq(overrides: object = {}): any {
  return {
    auth: {uid: "u1", token: {role: "crm_user"}},
    data: {
      to: "rcpt@example.com",
      subject: "Test Subject",
      body: "<p>Hello</p>",
    },
    rawRequest: {},
    ...overrides,
  };
}

// ── Tests ────────────────────────────────────────

describe("sendContactEmail", () => {
  const ORIG_ENV = process.env;

  beforeEach(() => {
    jest.clearAllMocks();
    process.env = {...ORIG_ENV};
    process.env.SMTP_USER = "smtp@gmail.com";
    process.env.SMTP_PASS = "pass123";
    mockGetUser.mockResolvedValue({
      displayName: "Test User",
      email: "test@example.com",
    });
    mockSendMail.mockResolvedValue({});
  });

  afterAll(() => {
    process.env = ORIG_ENV;
  });

  // ── Auth & permissions ────────────────────

  it("throws unauthenticated when no auth", async () => {
    await expect(
      sendContactEmail.run(makeReq({auth: null})),
    ).rejects.toMatchObject({
      code: "unauthenticated",
      message: "Must be authenticated.",
    });
  });

  it("throws permission-denied for viewer", async () => {
    const auth = {uid: "u1", token: {role: "viewer"}};
    await expect(
      sendContactEmail.run(makeReq({auth})),
    ).rejects.toMatchObject({
      code: "permission-denied",
      message: "Only CRM users can send emails.",
    });
  });

  it("allows admin role", async () => {
    const auth = {uid: "a1", token: {role: "admin"}};
    const r = await sendContactEmail.run(makeReq({auth}));
    expect(r).toEqual({success: true});
  });

  it("allows crm_user role", async () => {
    const r = await sendContactEmail.run(makeReq());
    expect(r).toEqual({success: true});
  });

  // ── Input validation ──────────────────────

  it("rejects non-string recipient", async () => {
    const data = {to: 123, subject: "S", body: "B"};
    await expect(
      sendContactEmail.run(makeReq({data})),
    ).rejects.toMatchObject({
      code: "invalid-argument",
      message: "Recipient email is required.",
    });
  });

  it("rejects empty recipient", async () => {
    const data = {to: "  ", subject: "S", body: "B"};
    await expect(
      sendContactEmail.run(makeReq({data})),
    ).rejects.toMatchObject({
      code: "invalid-argument",
      message: "Recipient email is required.",
    });
  });

  it("rejects non-string subject", async () => {
    const data = {to: "a@b.com", subject: null, body: "B"};
    await expect(
      sendContactEmail.run(makeReq({data})),
    ).rejects.toMatchObject({
      code: "invalid-argument",
      message: "Subject is required.",
    });
  });

  it("rejects empty subject", async () => {
    const data = {to: "a@b.com", subject: "", body: "B"};
    await expect(
      sendContactEmail.run(makeReq({data})),
    ).rejects.toMatchObject({
      code: "invalid-argument",
      message: "Subject is required.",
    });
  });

  it("rejects non-string body", async () => {
    const data = {to: "a@b.com", subject: "S", body: 42};
    await expect(
      sendContactEmail.run(makeReq({data})),
    ).rejects.toMatchObject({
      code: "invalid-argument",
      message: "Body is required.",
    });
  });

  // ── SMTP validation ───────────────────────

  it("throws when SMTP_USER missing", async () => {
    delete process.env.SMTP_USER;
    await expect(
      sendContactEmail.run(makeReq()),
    ).rejects.toMatchObject({
      code: "failed-precondition",
      message: "Email service not configured.",
    });
    expect(mockLogger.error).toHaveBeenCalledWith(
      "SMTP credentials not configured",
    );
  });

  it("throws when SMTP_PASS missing", async () => {
    delete process.env.SMTP_PASS;
    await expect(
      sendContactEmail.run(makeReq()),
    ).rejects.toMatchObject({
      code: "failed-precondition",
      message: "Email service not configured.",
    });
  });

  // ── Sender name ───────────────────────────

  it("uses displayName as sender", async () => {
    mockGetUser.mockResolvedValue({
      displayName: "John",
      email: "j@t.com",
    });
    await sendContactEmail.run(makeReq());
    expect(mockSendMail).toHaveBeenCalledWith(
      expect.objectContaining({
        from: "\"John\" <smtp@gmail.com>",
      }),
    );
  });

  it("falls back to email when no displayName", async () => {
    mockGetUser.mockResolvedValue({
      displayName: null,
      email: "fb@t.com",
    });
    await sendContactEmail.run(makeReq());
    expect(mockSendMail).toHaveBeenCalledWith(
      expect.objectContaining({
        from: "\"fb@t.com\" <smtp@gmail.com>",
      }),
    );
  });

  it("uses default name when getUser throws", async () => {
    mockGetUser.mockRejectedValue(new Error("nope"));
    await sendContactEmail.run(makeReq());
    const expected = "\"קליק בטבע CRM\" <smtp@gmail.com>";
    expect(mockSendMail).toHaveBeenCalledWith(
      expect.objectContaining({from: expected}),
    );
  });

  // ── Success path ──────────────────────────

  it("trims to and subject in sendMail", async () => {
    const data = {
      to: " user@t.com ",
      subject: " Subj ",
      body: "<p>Hi</p>",
    };
    await sendContactEmail.run(makeReq({data}));
    expect(mockSendMail).toHaveBeenCalledWith(
      expect.objectContaining({
        to: "user@t.com",
        subject: "Subj",
        html: "<p>Hi</p>",
      }),
    );
  });

  it("logs success with to and subject", async () => {
    await sendContactEmail.run(makeReq());
    expect(mockLogger.info).toHaveBeenCalledWith(
      "Email sent",
      {to: "rcpt@example.com", subject: "Test Subject"},
    );
  });

  it("returns success: true", async () => {
    const r = await sendContactEmail.run(makeReq());
    expect(r).toEqual({success: true});
  });

  // ── Attachments ───────────────────────────

  it("processes valid attachments", async () => {
    const att = {
      name: "file.pdf",
      url: "https://cdn.com/file.pdf",
    };
    const data = {
      to: "a@b.com",
      subject: "S",
      body: "B",
      attachments: [att],
    };
    await sendContactEmail.run(makeReq({data}));
    expect(mockSendMail).toHaveBeenCalledWith(
      expect.objectContaining({
        attachments: [{
          filename: "file.pdf",
          path: "https://cdn.com/file.pdf",
        }],
      }),
    );
  });

  it("skips invalid attachment objects", async () => {
    const data = {
      to: "a@b.com",
      subject: "S",
      body: "B",
      attachments: [
        null,
        "string",
        {name: 123, url: "ok"},
        {name: "f", url: 123},
      ],
    };
    await sendContactEmail.run(makeReq({data}));
    expect(mockSendMail).toHaveBeenCalledWith(
      expect.objectContaining({attachments: []}),
    );
  });

  it("ignores non-array attachments", async () => {
    const data = {
      to: "a@b.com",
      subject: "S",
      body: "B",
      attachments: "not-array",
    };
    await sendContactEmail.run(makeReq({data}));
    expect(mockSendMail).toHaveBeenCalledWith(
      expect.objectContaining({attachments: []}),
    );
  });

  // ── Error path ────────────────────────────

  it("captures Sentry on sendMail failure", async () => {
    const err = new Error("SMTP error");
    mockSendMail.mockRejectedValue(err);
    await expect(
      sendContactEmail.run(makeReq()),
    ).rejects.toMatchObject({
      code: "internal",
      message: "Failed to send email.",
    });
    expect(mockSentry.captureException).toHaveBeenCalledWith(
      err,
      {tags: {source: "sendContactEmail"}},
    );
  });

  it("logs error on sendMail failure", async () => {
    const err = new Error("SMTP error");
    mockSendMail.mockRejectedValue(err);
    await expect(
      sendContactEmail.run(makeReq()),
    ).rejects.toMatchObject({code: "internal"});
    expect(mockLogger.error).toHaveBeenCalledWith(
      "Email send failed", err,
    );
  });
});
