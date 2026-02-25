/**
 * Unit tests for users.ts — no emulator required.
 * Admin SDK is fully mocked; tests focus on validation logic in
 * deleteContentManager and blockContentManager.
 */

// ── Mocks (must be declared before imports) ──────────────────────────────────

const mockDocDelete = jest.fn().mockResolvedValue(undefined);
const mockUpdate = jest.fn().mockResolvedValue(undefined);
const mockDoc = jest.fn(() => ({delete: mockDocDelete, update: mockUpdate}));
const mockCollection = jest.fn(() => ({doc: mockDoc}));
const mockDeleteUser = jest.fn().mockResolvedValue(undefined);
const mockUpdateUser = jest.fn().mockResolvedValue(undefined);

jest.mock("firebase-admin/app", () => ({
  initializeApp: jest.fn(),
  getApps: jest.fn(() => [{name: "mock-app"}]),
}));

jest.mock("firebase-admin/firestore", () => ({
  getFirestore: jest.fn(() => ({
    collection: mockCollection,
  })),
  FieldValue: {serverTimestamp: jest.fn(() => "mock-timestamp")},
}));

jest.mock("firebase-admin/auth", () => ({
  getAuth: jest.fn(() => ({
    deleteUser: mockDeleteUser,
    updateUser: mockUpdateUser,
  })),
}));

jest.mock("firebase-functions/logger", () => ({
  info: jest.fn(),
  error: jest.fn(),
}));

jest.mock("@sentry/node", () => ({
  captureException: jest.fn(),
}));

// ── Imports (after mocks) ─────────────────────────────────────────────────────

import firebaseFunctionsTest from "firebase-functions-test";
import {deleteContentManager, blockContentManager} from "../users.js";

const testEnv = firebaseFunctionsTest();

// ── Helpers ───────────────────────────────────────────────────────────────────

function makeRequest(overrides: object) {
  return {
    auth: {uid: "admin-uid", token: {role: "admin"}},
    data: {uid: "cm-uid"},
    rawRequest: {},
    ...overrides,
  } as any;
}

// ── Tests ─────────────────────────────────────────────────────────────────────

afterAll(() => testEnv.cleanup());
afterEach(() => jest.clearAllMocks());

describe("deleteContentManager — validation", () => {
  it("throws unauthenticated when request.auth is null", async () => {
    await expect(
      deleteContentManager.run(makeRequest({auth: null}))
    ).rejects.toMatchObject({code: "unauthenticated"});
  });

  it("throws permission-denied for a non-admin caller", async () => {
    await expect(
      deleteContentManager.run(
        makeRequest({auth: {uid: "u1", token: {role: "content_manager"}}})
      )
    ).rejects.toMatchObject({code: "permission-denied"});
  });

  it("throws invalid-argument for an empty uid", async () => {
    await expect(
      deleteContentManager.run(makeRequest({data: {uid: ""}}))
    ).rejects.toMatchObject({code: "invalid-argument"});
  });

  it("throws invalid-argument for a non-string uid", async () => {
    await expect(
      deleteContentManager.run(makeRequest({data: {uid: 123}}))
    ).rejects.toMatchObject({code: "invalid-argument"});
  });
});

describe("deleteContentManager — success path", () => {
  it("deletes Auth user and Firestore user doc", async () => {
    const result = await deleteContentManager.run(makeRequest({}));

    expect(result).toEqual({uid: "cm-uid"});
    expect(mockDeleteUser).toHaveBeenCalledWith("cm-uid");
    expect(mockCollection).toHaveBeenCalledWith("users");
    expect(mockDocDelete).toHaveBeenCalled();
  });

  it("tolerates auth/user-not-found and still cleans up Firestore", async () => {
    mockDeleteUser.mockRejectedValueOnce({code: "auth/user-not-found"});

    const result = await deleteContentManager.run(makeRequest({}));

    expect(result).toEqual({uid: "cm-uid"});
    expect(mockDocDelete).toHaveBeenCalled();
  });
});

describe("blockContentManager — validation", () => {
  it("throws unauthenticated when request.auth is null", async () => {
    await expect(
      blockContentManager.run(makeRequest({auth: null}))
    ).rejects.toMatchObject({code: "unauthenticated"});
  });

  it("throws permission-denied for a non-admin caller", async () => {
    await expect(
      blockContentManager.run(
        makeRequest({auth: {uid: "u1", token: {role: "content_manager"}}})
      )
    ).rejects.toMatchObject({code: "permission-denied"});
  });

  it("throws invalid-argument for an empty uid", async () => {
    await expect(
      blockContentManager.run(makeRequest({data: {uid: ""}}))
    ).rejects.toMatchObject({code: "invalid-argument"});
  });
});

describe("blockContentManager — success path", () => {
  it("disables Auth user and marks Firestore doc as blocked", async () => {
    const result = await blockContentManager.run(makeRequest({}));

    expect(result).toEqual({uid: "cm-uid"});
    expect(mockUpdateUser).toHaveBeenCalledWith("cm-uid", {disabled: true});
    expect(mockCollection).toHaveBeenCalledWith("users");
    expect(mockUpdate).toHaveBeenCalledWith({
      blocked: true,
      updatedAt: "mock-timestamp",
    });
  });
});
