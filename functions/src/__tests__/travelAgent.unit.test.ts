/**
 * Unit tests for travelAgent.ts — no emulator required.
 * Admin SDK is fully mocked; tests focus on validation logic and
 * success/error paths of createTravelAgent and deleteTravelAgent.
 */

// ── Mocks (must be declared before imports) ──────────────────────────────────

const mockDocSet = jest.fn().mockResolvedValue(undefined);
const mockDocDelete = jest.fn().mockResolvedValue(undefined);
const mockDoc = jest.fn(() => ({set: mockDocSet, delete: mockDocDelete}));
const mockCollection = jest.fn(() => ({doc: mockDoc}));

const mockGetUser = jest.fn();
const mockCreateUser = jest.fn().mockResolvedValue({uid: "new-agent-uid"});
const mockDeleteUser = jest.fn().mockResolvedValue(undefined);
const mockSetCustomUserClaims = jest.fn().mockResolvedValue(undefined);

jest.mock("firebase-admin/app", () => ({
  initializeApp: jest.fn(),
  getApps: jest.fn(() => [{name: "mock-app"}]),
}));

jest.mock("firebase-admin/firestore", () => ({
  getFirestore: jest.fn(() => ({collection: mockCollection})),
  FieldValue: {serverTimestamp: jest.fn(() => "mock-timestamp")},
}));

jest.mock("firebase-admin/auth", () => ({
  getAuth: jest.fn(() => ({
    createUser: mockCreateUser,
    deleteUser: mockDeleteUser,
    getUser: mockGetUser,
    setCustomUserClaims: mockSetCustomUserClaims,
  })),
}));

jest.mock("firebase-functions/logger", () => ({
  info: jest.fn(),
  error: jest.fn(),
}));

jest.mock("@sentry/node", () => ({
  captureException: jest.fn(),
  init: jest.fn(),
}));

// ── Imports (after mocks) ─────────────────────────────────────────────────────

import firebaseFunctionsTest from "firebase-functions-test";
import {createTravelAgent, deleteTravelAgent} from "../travelAgent.js";

const testEnv = firebaseFunctionsTest();

// ── Helpers ───────────────────────────────────────────────────────────────────

function makeAdminRequest(overrides: object = {}) {
  return {
    auth: {uid: "admin-uid", token: {role: "admin"}},
    data: {email: "agent@example.com", password: "password123", displayName: "Test Agent"},
    rawRequest: {},
    ...overrides,
  } as any;
}

function makeDeleteRequest(overrides: object = {}) {
  return {
    auth: {uid: "admin-uid", token: {role: "admin"}},
    data: {uid: "agent-uid"},
    rawRequest: {},
    ...overrides,
  } as any;
}

// ── Setup / Teardown ──────────────────────────────────────────────────────────

afterAll(() => testEnv.cleanup());
afterEach(() => jest.clearAllMocks());

// ── createTravelAgent ─────────────────────────────────────────────────────────

describe("createTravelAgent — validation", () => {
  it("throws unauthenticated when request.auth is null", async () => {
    await expect(
      createTravelAgent.run(makeAdminRequest({auth: null}))
    ).rejects.toMatchObject({code: "unauthenticated"});
  });

  it("throws permission-denied for a non-admin caller", async () => {
    await expect(
      createTravelAgent.run(
        makeAdminRequest({auth: {uid: "u1", token: {role: "content_manager"}}})
      )
    ).rejects.toMatchObject({code: "permission-denied"});
  });

  it("throws invalid-argument for an empty email", async () => {
    await expect(
      createTravelAgent.run(makeAdminRequest({data: {email: "", password: "pass123", displayName: "Test"}}))
    ).rejects.toMatchObject({code: "invalid-argument"});
  });

  it("throws invalid-argument for a non-string email", async () => {
    await expect(
      createTravelAgent.run(makeAdminRequest({data: {email: 123, password: "pass123", displayName: "Test"}}))
    ).rejects.toMatchObject({code: "invalid-argument"});
  });

  it("throws invalid-argument for a password shorter than 6 characters", async () => {
    await expect(
      createTravelAgent.run(makeAdminRequest({data: {email: "a@b.com", password: "abc", displayName: "Test"}}))
    ).rejects.toMatchObject({code: "invalid-argument"});
  });

  it("throws invalid-argument for an empty displayName", async () => {
    await expect(
      createTravelAgent.run(makeAdminRequest({data: {email: "a@b.com", password: "pass123", displayName: ""}}))
    ).rejects.toMatchObject({code: "invalid-argument"});
  });
});

describe("createTravelAgent — success path", () => {
  it("creates Auth user, sets travel_agent claim, writes Firestore doc, returns uid", async () => {
    const result = await createTravelAgent.run(makeAdminRequest());

    expect(result).toEqual({uid: "new-agent-uid"});
    expect(mockCreateUser).toHaveBeenCalledWith({
      email: "agent@example.com",
      password: "password123",
      displayName: "Test Agent",
    });
    expect(mockSetCustomUserClaims).toHaveBeenCalledWith("new-agent-uid", {role: "travel_agent"});
    expect(mockCollection).toHaveBeenCalledWith("users");
    expect(mockDocSet).toHaveBeenCalledWith(expect.objectContaining({
      uid: "new-agent-uid",
      role: "travel_agent",
    }));
  });

  it("normalizes email to lowercase", async () => {
    mockCreateUser.mockResolvedValueOnce({uid: "uid-2"});
    await createTravelAgent.run(
      makeAdminRequest({data: {email: "Agent@Example.COM", password: "pass123", displayName: "Test"}})
    );
    expect(mockCreateUser).toHaveBeenCalledWith(expect.objectContaining({
      email: "agent@example.com",
    }));
  });
});

describe("createTravelAgent — error handling", () => {
  it("throws already-exists when Firebase returns auth/email-already-exists", async () => {
    mockCreateUser.mockRejectedValueOnce({code: "auth/email-already-exists"});
    await expect(
      createTravelAgent.run(makeAdminRequest())
    ).rejects.toMatchObject({code: "already-exists"});
  });

  it("throws internal for unexpected Auth errors", async () => {
    mockCreateUser.mockRejectedValueOnce(new Error("network error"));
    await expect(
      createTravelAgent.run(makeAdminRequest())
    ).rejects.toMatchObject({code: "internal"});
  });
});

// ── deleteTravelAgent ─────────────────────────────────────────────────────────

describe("deleteTravelAgent — validation", () => {
  it("throws unauthenticated when request.auth is null", async () => {
    await expect(
      deleteTravelAgent.run(makeDeleteRequest({auth: null}))
    ).rejects.toMatchObject({code: "unauthenticated"});
  });

  it("throws permission-denied for a non-admin caller", async () => {
    await expect(
      deleteTravelAgent.run(
        makeDeleteRequest({auth: {uid: "u1", token: {role: "content_manager"}}})
      )
    ).rejects.toMatchObject({code: "permission-denied"});
  });

  it("throws invalid-argument for an empty uid", async () => {
    await expect(
      deleteTravelAgent.run(makeDeleteRequest({data: {uid: ""}}))
    ).rejects.toMatchObject({code: "invalid-argument"});
  });

  it("throws invalid-argument for a non-string uid", async () => {
    await expect(
      deleteTravelAgent.run(makeDeleteRequest({data: {uid: 123}}))
    ).rejects.toMatchObject({code: "invalid-argument"});
  });

  it("throws failed-precondition when target user is not a travel_agent", async () => {
    mockGetUser.mockResolvedValueOnce({customClaims: {role: "content_manager"}});
    await expect(
      deleteTravelAgent.run(makeDeleteRequest())
    ).rejects.toMatchObject({code: "failed-precondition"});
  });
});

describe("deleteTravelAgent — success path", () => {
  beforeEach(() => {
    mockGetUser.mockResolvedValue({customClaims: {role: "travel_agent"}});
  });

  it("deletes Auth user and Firestore user doc, returns uid", async () => {
    const result = await deleteTravelAgent.run(makeDeleteRequest());

    expect(result).toEqual({uid: "agent-uid"});
    expect(mockGetUser).toHaveBeenCalledWith("agent-uid");
    expect(mockDeleteUser).toHaveBeenCalledWith("agent-uid");
    expect(mockCollection).toHaveBeenCalledWith("users");
    expect(mockDocDelete).toHaveBeenCalled();
  });

  it("tolerates auth/user-not-found and still cleans up Firestore", async () => {
    mockGetUser.mockRejectedValueOnce({code: "auth/user-not-found"});

    const result = await deleteTravelAgent.run(makeDeleteRequest());

    expect(result).toEqual({uid: "agent-uid"});
    expect(mockDocDelete).toHaveBeenCalled();
    // deleteUser should NOT be called since getUser threw user-not-found
    expect(mockDeleteUser).not.toHaveBeenCalled();
  });
});
