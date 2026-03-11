/**
 * Unit tests for agent.ts — no emulator required.
 * Admin SDK is fully mocked; tests focus on validation logic in
 * createTravelAgent and deleteTravelAgent.
 */

// ── Mocks (must be declared before imports) ──────────────────────────────────

const mockDocDelete = jest.fn().mockResolvedValue(undefined);
const mockUpdate = jest.fn().mockResolvedValue(undefined);
const mockSet = jest.fn().mockResolvedValue(undefined);
const mockDoc = jest.fn(() => ({delete: mockDocDelete, update: mockUpdate, set: mockSet}));
const mockCollection = jest.fn(() => ({doc: mockDoc}));
const mockDeleteUser = jest.fn().mockResolvedValue(undefined);
const mockCreateUser = jest.fn().mockResolvedValue({uid: "new-uid"});
const mockSetCustomUserClaims = jest.fn().mockResolvedValue(undefined);

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
    createUser: mockCreateUser,
    setCustomUserClaims: mockSetCustomUserClaims,
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
import {createTravelAgent, deleteTravelAgent} from "../agent.js";

const testEnv = firebaseFunctionsTest();

// ── Helpers ───────────────────────────────────────────────────────────────────

function makeCreateRequest(overrides: object) {
  return {
    auth: {uid: "admin-uid", token: {role: "admin"}},
    data: {email: "agent@example.com", password: "StrongPass1!"},
    rawRequest: {},
    ...overrides,
  } as any;
}

function makeDeleteRequest(overrides: object) {
  return {
    auth: {uid: "admin-uid", token: {role: "admin"}},
    data: {uid: "agent-uid"},
    rawRequest: {},
    ...overrides,
  } as any;
}

// ── Tests ─────────────────────────────────────────────────────────────────────

afterAll(() => testEnv.cleanup());
afterEach(() => jest.clearAllMocks());

describe("createTravelAgent — validation", () => {
  it("throws unauthenticated when request.auth is null", async () => {
    await expect(
      createTravelAgent.run(makeCreateRequest({auth: null}))
    ).rejects.toMatchObject({code: "unauthenticated"});
  });

  it("throws permission-denied for a non-admin caller", async () => {
    await expect(
      createTravelAgent.run(
        makeCreateRequest({auth: {uid: "u1", token: {role: "content_manager"}}})
      )
    ).rejects.toMatchObject({code: "permission-denied"});
  });

  it("throws invalid-argument for a missing email", async () => {
    await expect(
      createTravelAgent.run(makeCreateRequest({data: {email: "", password: "StrongPass1!"}}))
    ).rejects.toMatchObject({code: "invalid-argument"});
  });

  it("throws invalid-argument for a missing password", async () => {
    await expect(
      createTravelAgent.run(makeCreateRequest({data: {email: "agent@example.com", password: ""}}))
    ).rejects.toMatchObject({code: "invalid-argument"});
  });
});

describe("createTravelAgent — success path", () => {
  it("creates Auth user, sets custom claims, and writes Firestore doc", async () => {
    const result = await createTravelAgent.run(makeCreateRequest({}));

    expect(result).toEqual({uid: "new-uid"});
    expect(mockCreateUser).toHaveBeenCalledWith({
      email: "agent@example.com",
      password: "StrongPass1!",
    });
    expect(mockSetCustomUserClaims).toHaveBeenCalledWith("new-uid", {role: "travel_agent"});
    expect(mockCollection).toHaveBeenCalledWith("users");
    expect(mockDoc).toHaveBeenCalledWith("new-uid");
    expect(mockSet).toHaveBeenCalledWith({
      email: "agent@example.com",
      name: null,
      role: "travel_agent",
      blocked: false,
      createdAt: "mock-timestamp",
    });
  });

  it("passes displayName when name is provided", async () => {
    const result = await createTravelAgent.run(makeCreateRequest({
      data: {email: "agent@example.com", password: "StrongPass1!", name: "Yossi"},
    }));

    expect(result).toEqual({uid: "new-uid"});
    expect(mockCreateUser).toHaveBeenCalledWith({
      email: "agent@example.com",
      password: "StrongPass1!",
      displayName: "Yossi",
    });
    expect(mockSet).toHaveBeenCalledWith({
      email: "agent@example.com",
      name: "Yossi",
      role: "travel_agent",
      blocked: false,
      createdAt: "mock-timestamp",
    });
  });

  it("maps auth/email-already-exists to already-exists HttpsError", async () => {
    mockCreateUser.mockRejectedValueOnce({code: "auth/email-already-exists"});

    await expect(
      createTravelAgent.run(makeCreateRequest({}))
    ).rejects.toMatchObject({code: "already-exists"});
  });
});

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
});

describe("deleteTravelAgent — success path", () => {
  it("deletes Auth user and Firestore user doc", async () => {
    const result = await deleteTravelAgent.run(makeDeleteRequest({}));

    expect(result).toEqual({uid: "agent-uid"});
    expect(mockDeleteUser).toHaveBeenCalledWith("agent-uid");
    expect(mockCollection).toHaveBeenCalledWith("users");
    expect(mockDocDelete).toHaveBeenCalled();
  });

  it("tolerates auth/user-not-found and still cleans up Firestore", async () => {
    mockDeleteUser.mockRejectedValueOnce({code: "auth/user-not-found"});

    const result = await deleteTravelAgent.run(makeDeleteRequest({}));

    expect(result).toEqual({uid: "agent-uid"});
    expect(mockDocDelete).toHaveBeenCalled();
  });
});
