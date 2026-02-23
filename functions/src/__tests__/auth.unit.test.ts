/**
 * Unit tests for auth.ts — no emulator required.
 * Admin SDK is fully mocked; tests focus on validation logic in setUserRole
 * and the onUserCreated auth trigger.
 */

// ── Mocks (must be declared before imports) ──────────────────────────────────

const mockSet = jest.fn().mockResolvedValue(undefined);
const mockUpdate = jest.fn().mockResolvedValue(undefined);
const mockDoc = jest.fn(() => ({set: mockSet, update: mockUpdate}));
const mockCollection = jest.fn(() => ({doc: mockDoc}));
const mockSetCustomUserClaims = jest.fn().mockResolvedValue(undefined);
const mockGetUser = jest.fn();

jest.mock("firebase-admin/app", () => ({
  initializeApp: jest.fn(),
  getApps: jest.fn(() => [{name: "mock-app"}]), // non-empty → skip initializeApp
}));

jest.mock("firebase-admin/firestore", () => ({
  getFirestore: jest.fn(() => ({collection: mockCollection})),
  FieldValue: {serverTimestamp: jest.fn(() => "mock-timestamp")},
}));

jest.mock("firebase-admin/auth", () => ({
  getAuth: jest.fn(() => ({
    setCustomUserClaims: mockSetCustomUserClaims,
    getUser: mockGetUser,
  })),
}));

jest.mock("firebase-functions/logger", () => ({
  info: jest.fn(),
  error: jest.fn(),
}));

// ── Imports (after mocks) ─────────────────────────────────────────────────────

import firebaseFunctionsTest from "firebase-functions-test";
import {setUserRole, onUserCreated} from "../auth.js";

const testEnv = firebaseFunctionsTest(); // offline mode — no real Firebase project

// ── Helpers ───────────────────────────────────────────────────────────────────

function makeRequest(overrides: object) {
  return {
    auth: {uid: "admin-uid", token: {role: "admin"}},
    data: {uid: "target-uid", role: "content_manager"},
    rawRequest: {},
    ...overrides,
  } as any;
}

// ── Tests ─────────────────────────────────────────────────────────────────────

afterAll(() => testEnv.cleanup());
afterEach(() => jest.clearAllMocks());

describe("setUserRole — validation", () => {
  it("throws unauthenticated when request.auth is null", async () => {
    await expect(
      setUserRole.run(makeRequest({auth: null}))
    ).rejects.toMatchObject({code: "unauthenticated", message: "Must be authenticated."});
  });

  it("throws permission-denied for a non-admin caller", async () => {
    await expect(
      setUserRole.run(makeRequest({auth: {uid: "u1", token: {role: "standard_user"}}}))
    ).rejects.toMatchObject({code: "permission-denied", message: "Only admins can assign roles."});
  });

  it("throws permission-denied for a business_user caller", async () => {
    await expect(
      setUserRole.run(makeRequest({auth: {uid: "u1", token: {role: "business_user"}}}))
    ).rejects.toMatchObject({code: "permission-denied"});
  });

  it("throws invalid-argument for an empty uid", async () => {
    await expect(
      setUserRole.run(makeRequest({data: {uid: "", role: "content_manager"}}))
    ).rejects.toMatchObject({code: "invalid-argument", message: "uid must be a non-empty string."});
  });

  it("throws invalid-argument for a non-string uid", async () => {
    await expect(
      setUserRole.run(makeRequest({data: {uid: 123, role: "content_manager"}}))
    ).rejects.toMatchObject({code: "invalid-argument", message: "uid must be a non-empty string."});
  });

  it("throws invalid-argument for an unknown role", async () => {
    await expect(
      setUserRole.run(makeRequest({data: {uid: "target-uid", role: "superuser"}}))
    ).rejects.toMatchObject({
      code: "invalid-argument",
      message: expect.stringContaining("role must be one of:"),
    });
  });

  it("includes valid roles in the invalid role error message", async () => {
    await expect(
      setUserRole.run(makeRequest({data: {uid: "target-uid", role: "superuser"}}))
    ).rejects.toMatchObject({
      message: expect.stringContaining("admin, content_manager"),
    });
  });
});

describe("setUserRole — success path", () => {
  it("updates Firestore and Auth, returns { success: true }", async () => {
    const result = await setUserRole.run(makeRequest({}));

    expect(result).toEqual({success: true});
    expect(mockCollection).toHaveBeenCalledWith("users");
    expect(mockUpdate).toHaveBeenCalledWith({
      role: "content_manager",
      updatedAt: "mock-timestamp",
    });
    expect(mockSetCustomUserClaims).toHaveBeenCalledWith("target-uid", {
      role: "content_manager",
    });
  });

  it("accepts all four valid roles", async () => {
    for (const role of ["admin", "content_manager", "business_user", "standard_user"]) {
      await expect(
        setUserRole.run(makeRequest({data: {uid: "u1", role}}))
      ).resolves.toEqual({success: true});
    }
  });
});

describe("onUserCreated", () => {
  const wrapped = testEnv.wrap(onUserCreated);

  it("creates Firestore doc and sets standard_user claim for new user", async () => {
    mockGetUser.mockResolvedValue({customClaims: {}});

    await wrapped({uid: "new-user", email: "test@example.com"} as any);

    expect(mockCollection).toHaveBeenCalledWith("users");
    expect(mockDoc).toHaveBeenCalledWith("new-user");
    expect(mockSet).toHaveBeenCalledWith({
      uid: "new-user",
      email: "test@example.com",
      role: "standard_user",
      createdAt: "mock-timestamp",
      updatedAt: "mock-timestamp",
    });
    expect(mockSetCustomUserClaims).toHaveBeenCalledWith("new-user", {role: "standard_user"});
  });

  it("handles null email gracefully", async () => {
    mockGetUser.mockResolvedValue({customClaims: {}});

    await wrapped({uid: "no-email-user"} as any);

    expect(mockSet).toHaveBeenCalledWith(
      expect.objectContaining({uid: "no-email-user", email: null}),
    );
  });

  it("skips setup when user already has a role claim", async () => {
    mockGetUser.mockResolvedValue({customClaims: {role: "business_user"}});

    await wrapped({uid: "biz-user", email: "biz@example.com"} as any);

    expect(mockSet).not.toHaveBeenCalled();
    expect(mockSetCustomUserClaims).not.toHaveBeenCalled();
  });
});
