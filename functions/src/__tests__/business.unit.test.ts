/**
 * Unit tests for business.ts — no emulator required.
 * Admin SDK is fully mocked; tests focus on validation logic in
 * createBusinessUser and deleteBusinessUser.
 */

// ── Mocks (must be declared before imports) ──────────────────────────────────

const mockBatchSet = jest.fn();
const mockBatchDelete = jest.fn();
const mockBatchCommit = jest.fn().mockResolvedValue(undefined);
const mockDoc = jest.fn((id: string) => `doc-ref-${id}`);
const mockCollection = jest.fn(() => ({doc: mockDoc}));
const mockBatch = jest.fn(() => ({
  set: mockBatchSet,
  delete: mockBatchDelete,
  commit: mockBatchCommit,
}));
const mockCreateUser = jest.fn();
const mockDeleteUser = jest.fn().mockResolvedValue(undefined);
const mockSetCustomUserClaims = jest.fn().mockResolvedValue(undefined);

jest.mock("firebase-admin/app", () => ({
  initializeApp: jest.fn(),
  getApps: jest.fn(() => [{name: "mock-app"}]),
}));

jest.mock("firebase-admin/firestore", () => ({
  getFirestore: jest.fn(() => ({
    collection: mockCollection,
    batch: mockBatch,
  })),
  FieldValue: {serverTimestamp: jest.fn(() => "mock-timestamp")},
}));

jest.mock("firebase-admin/auth", () => ({
  getAuth: jest.fn(() => ({
    createUser: mockCreateUser,
    deleteUser: mockDeleteUser,
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
import {createBusinessUser, deleteBusinessUser} from "../business.js";

const testEnv = firebaseFunctionsTest();

// ── Helpers ───────────────────────────────────────────────────────────────────

function makeCreateRequest(overrides: object) {
  return {
    auth: {uid: "admin-uid", token: {role: "admin"}},
    data: {name: "Test Business", username: "testuser", password: "Pass1234"},
    rawRequest: {},
    ...overrides,
  } as any;
}

function makeDeleteRequest(overrides: object) {
  return {
    auth: {uid: "admin-uid", token: {role: "admin"}},
    data: {uid: "target-uid"},
    rawRequest: {},
    ...overrides,
  } as any;
}

// ── Tests ─────────────────────────────────────────────────────────────────────

afterAll(() => testEnv.cleanup());
afterEach(() => jest.clearAllMocks());

// ── createBusinessUser ───────────────────────────────────────────────────────

describe("createBusinessUser — auth checks", () => {
  it("throws unauthenticated when request.auth is null", async () => {
    await expect(
      createBusinessUser.run(makeCreateRequest({auth: null}))
    ).rejects.toMatchObject({code: "unauthenticated"});
  });

  it("throws permission-denied for a non-admin caller", async () => {
    await expect(
      createBusinessUser.run(
        makeCreateRequest({auth: {uid: "u1", token: {role: "content_manager"}}})
      )
    ).rejects.toMatchObject({code: "permission-denied"});
  });

  it("throws permission-denied for a business_user caller", async () => {
    await expect(
      createBusinessUser.run(
        makeCreateRequest({auth: {uid: "u1", token: {role: "business_user"}}})
      )
    ).rejects.toMatchObject({code: "permission-denied"});
  });
});

describe("createBusinessUser — input validation", () => {
  it("throws invalid-argument for empty name", async () => {
    await expect(
      createBusinessUser.run(makeCreateRequest({data: {name: "", username: "user", password: "Pass1234"}}))
    ).rejects.toMatchObject({code: "invalid-argument", message: "name must be a non-empty string."});
  });

  it("throws invalid-argument for non-string name", async () => {
    await expect(
      createBusinessUser.run(makeCreateRequest({data: {name: 123, username: "user", password: "Pass1234"}}))
    ).rejects.toMatchObject({code: "invalid-argument", message: "name must be a non-empty string."});
  });

  it("throws invalid-argument for empty username", async () => {
    await expect(
      createBusinessUser.run(makeCreateRequest({data: {name: "Biz", username: "", password: "Pass1234"}}))
    ).rejects.toMatchObject({code: "invalid-argument", message: "username must be a non-empty string."});
  });

  it("throws invalid-argument for username shorter than 3 chars", async () => {
    await expect(
      createBusinessUser.run(makeCreateRequest({data: {name: "Biz", username: "ab", password: "Pass1234"}}))
    ).rejects.toMatchObject({code: "invalid-argument", message: "username must be at least 3 characters."});
  });

  it("throws invalid-argument for username with invalid characters", async () => {
    await expect(
      createBusinessUser.run(makeCreateRequest({data: {name: "Biz", username: "user@name", password: "Pass1234"}}))
    ).rejects.toMatchObject({code: "invalid-argument", message: expect.stringContaining("letters, numbers")});
  });

  it("throws invalid-argument for username with spaces", async () => {
    await expect(
      createBusinessUser.run(makeCreateRequest({data: {name: "Biz", username: "user name", password: "Pass1234"}}))
    ).rejects.toMatchObject({code: "invalid-argument"});
  });

  it("throws invalid-argument for short password", async () => {
    await expect(
      createBusinessUser.run(makeCreateRequest({data: {name: "Biz", username: "user", password: "12345"}}))
    ).rejects.toMatchObject({code: "invalid-argument", message: "password must be at least 6 characters."});
  });

  it("throws invalid-argument for non-string password", async () => {
    await expect(
      createBusinessUser.run(makeCreateRequest({data: {name: "Biz", username: "user", password: 123456}}))
    ).rejects.toMatchObject({code: "invalid-argument"});
  });
});

describe("createBusinessUser — success path", () => {
  beforeEach(() => {
    mockCreateUser.mockResolvedValue({uid: "new-uid"});
  });

  it("creates Auth user with generated email and returns uid", async () => {
    const result = await createBusinessUser.run(makeCreateRequest({}));

    expect(result).toEqual({uid: "new-uid"});
    expect(mockCreateUser).toHaveBeenCalledWith({
      email: "testuser@click-bateva.app",
      password: "Pass1234",
    });
  });

  it("lowercases and trims the username for email generation", async () => {
    await createBusinessUser.run(
      makeCreateRequest({data: {name: "Biz", username: "  TestUser  ", password: "Pass1234"}})
    );

    expect(mockCreateUser).toHaveBeenCalledWith({
      email: "testuser@click-bateva.app",
      password: "Pass1234",
    });
  });

  it("sets business_user role and businessRef custom claims", async () => {
    await createBusinessUser.run(makeCreateRequest({}));

    expect(mockSetCustomUserClaims).toHaveBeenCalledWith("new-uid", {
      role: "business_user",
      businessRef: "/databases/(default)/documents/businesses/new-uid",
    });
  });

  it("creates both user and business Firestore documents in a batch", async () => {
    await createBusinessUser.run(makeCreateRequest({}));

    expect(mockBatch).toHaveBeenCalled();
    expect(mockBatchSet).toHaveBeenCalledTimes(2);
    expect(mockBatchCommit).toHaveBeenCalled();
  });

  it("accepts username with dots, hyphens, underscores", async () => {
    mockCreateUser.mockResolvedValue({uid: "uid-2"});

    await expect(
      createBusinessUser.run(
        makeCreateRequest({data: {name: "Biz", username: "user.name-test_1", password: "Pass1234"}})
      )
    ).resolves.toEqual({uid: "uid-2"});
  });
});

describe("createBusinessUser — duplicate username", () => {
  it("throws already-exists when Firebase Auth email already exists", async () => {
    mockCreateUser.mockRejectedValue({code: "auth/email-already-exists"});

    await expect(
      createBusinessUser.run(makeCreateRequest({}))
    ).rejects.toMatchObject({code: "already-exists"});
  });
});

// ── deleteBusinessUser ───────────────────────────────────────────────────────

describe("deleteBusinessUser — auth checks", () => {
  it("throws unauthenticated when request.auth is null", async () => {
    await expect(
      deleteBusinessUser.run(makeDeleteRequest({auth: null}))
    ).rejects.toMatchObject({code: "unauthenticated"});
  });

  it("throws permission-denied for a non-admin caller", async () => {
    await expect(
      deleteBusinessUser.run(
        makeDeleteRequest({auth: {uid: "u1", token: {role: "content_manager"}}})
      )
    ).rejects.toMatchObject({code: "permission-denied"});
  });
});

describe("deleteBusinessUser — input validation", () => {
  it("throws invalid-argument for empty uid", async () => {
    await expect(
      deleteBusinessUser.run(makeDeleteRequest({data: {uid: ""}}))
    ).rejects.toMatchObject({code: "invalid-argument"});
  });

  it("throws invalid-argument for non-string uid", async () => {
    await expect(
      deleteBusinessUser.run(makeDeleteRequest({data: {uid: 123}}))
    ).rejects.toMatchObject({code: "invalid-argument"});
  });
});

describe("deleteBusinessUser — success path", () => {
  it("deletes Auth user and both Firestore docs in a batch", async () => {
    const result = await deleteBusinessUser.run(makeDeleteRequest({}));

    expect(result).toEqual({uid: "target-uid"});
    expect(mockDeleteUser).toHaveBeenCalledWith("target-uid");
    expect(mockBatch).toHaveBeenCalled();
    expect(mockBatchDelete).toHaveBeenCalledTimes(2);
    expect(mockBatchCommit).toHaveBeenCalled();
  });

  it("tolerates auth/user-not-found and still cleans up Firestore", async () => {
    mockDeleteUser.mockRejectedValueOnce({code: "auth/user-not-found"});

    const result = await deleteBusinessUser.run(makeDeleteRequest({}));

    expect(result).toEqual({uid: "target-uid"});
    expect(mockBatchDelete).toHaveBeenCalledTimes(2);
    expect(mockBatchCommit).toHaveBeenCalled();
  });
});
