/**
 * Unit tests for auth.ts — no emulator required.
 * Admin SDK is fully mocked; tests focus on validation logic in setUserRole.
 */

// ── Mocks (must be declared before imports) ──────────────────────────────────

const mockSet = jest.fn().mockResolvedValue(undefined);
const mockUpdate = jest.fn().mockResolvedValue(undefined);
const mockSetCustomUserClaims = jest.fn().mockResolvedValue(undefined);

jest.mock("firebase-admin/app", () => ({
  initializeApp: jest.fn(),
  getApps: jest.fn(() => [{name: "mock-app"}]), // non-empty → skip initializeApp
}));

jest.mock("firebase-admin/firestore", () => ({
  getFirestore: jest.fn(() => ({
    collection: jest.fn(() => ({
      doc: jest.fn(() => ({set: mockSet, update: mockUpdate})),
    })),
  })),
  FieldValue: {serverTimestamp: jest.fn(() => "mock-timestamp")},
}));

jest.mock("firebase-admin/auth", () => ({
  getAuth: jest.fn(() => ({setCustomUserClaims: mockSetCustomUserClaims})),
}));

jest.mock("firebase-functions/logger", () => ({
  info: jest.fn(),
  error: jest.fn(),
}));

// ── Imports (after mocks) ─────────────────────────────────────────────────────

import firebaseFunctionsTest from "firebase-functions-test";
import {setUserRole} from "../auth.js";

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
    ).rejects.toMatchObject({code: "unauthenticated"});
  });

  it("throws permission-denied for a non-admin caller", async () => {
    await expect(
      setUserRole.run(makeRequest({auth: {uid: "u1", token: {role: "standard_user"}}}))
    ).rejects.toMatchObject({code: "permission-denied"});
  });

  it("throws permission-denied for a business_user caller", async () => {
    await expect(
      setUserRole.run(makeRequest({auth: {uid: "u1", token: {role: "business_user"}}}))
    ).rejects.toMatchObject({code: "permission-denied"});
  });

  it("throws invalid-argument for an empty uid", async () => {
    await expect(
      setUserRole.run(makeRequest({data: {uid: "", role: "content_manager"}}))
    ).rejects.toMatchObject({code: "invalid-argument"});
  });

  it("throws invalid-argument for a non-string uid", async () => {
    await expect(
      setUserRole.run(makeRequest({data: {uid: 123, role: "content_manager"}}))
    ).rejects.toMatchObject({code: "invalid-argument"});
  });

  it("throws invalid-argument for an unknown role", async () => {
    await expect(
      setUserRole.run(makeRequest({data: {uid: "target-uid", role: "superuser"}}))
    ).rejects.toMatchObject({code: "invalid-argument"});
  });
});

describe("setUserRole — success path", () => {
  it("updates Firestore and Auth, returns { success: true }", async () => {
    const result = await setUserRole.run(makeRequest({}));

    expect(result).toEqual({success: true});
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
