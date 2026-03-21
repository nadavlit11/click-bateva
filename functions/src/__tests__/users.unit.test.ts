/**
 * Unit tests for users.ts — no emulator required.
 * Admin SDK is fully mocked; tests focus on validation logic in
 * deleteContentManager and blockContentManager.
 */

// ── Mocks (must be declared before imports) ──────────────────────────────────

const mockDocDelete = jest.fn().mockResolvedValue(undefined);
const mockUpdate = jest.fn().mockResolvedValue(undefined);
const mockSet = jest.fn().mockResolvedValue(undefined);
const mockDoc = jest.fn(() => ({delete: mockDocDelete, update: mockUpdate, set: mockSet}));
const mockCollection = jest.fn(() => ({doc: mockDoc}));
const mockDeleteUser = jest.fn().mockResolvedValue(undefined);
const mockUpdateUser = jest.fn().mockResolvedValue(undefined);
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
    updateUser: mockUpdateUser,
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
import {deleteContentManager, blockContentManager, createContentManager} from "../users.js";

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
    ).rejects.toMatchObject({
      code: "unauthenticated",
      message: "Must be authenticated.",
    });
  });

  it("throws permission-denied for a non-admin caller", async () => {
    await expect(
      deleteContentManager.run(
        makeRequest({auth: {uid: "u1", token: {role: "content_manager"}}})
      )
    ).rejects.toMatchObject({
      code: "permission-denied",
      message: "Only admins can delete content managers.",
    });
  });

  it("throws invalid-argument for an empty uid", async () => {
    await expect(
      deleteContentManager.run(makeRequest({data: {uid: ""}}))
    ).rejects.toMatchObject({
      code: "invalid-argument",
      message: "uid must be a non-empty string.",
    });
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
    expect(mockDoc).toHaveBeenCalledWith("cm-uid");
    expect(mockDocDelete).toHaveBeenCalled();
  });

  it("logs deletion with uid and caller", async () => {
    const loggerInfo = require("firebase-functions/logger").info;
    await deleteContentManager.run(makeRequest({}));

    expect(loggerInfo).toHaveBeenCalledWith(
      "Content manager deleted",
      {uid: "cm-uid", by: "admin-uid"},
    );
  });

  it("tolerates auth/user-not-found and still cleans up Firestore",
    async () => {
      mockDeleteUser.mockRejectedValueOnce({
        code: "auth/user-not-found",
      });

      const result = await deleteContentManager.run(makeRequest({}));

      expect(result).toEqual({uid: "cm-uid"});
      expect(mockDocDelete).toHaveBeenCalled();
    });

  it("reports unexpected errors to Sentry and throws internal",
    async () => {
      const sentryCapture =
        require("@sentry/node").captureException;
      const loggerError =
        require("firebase-functions/logger").error;
      const unknownErr = new Error("boom");
      mockDeleteUser.mockRejectedValueOnce(unknownErr);

      await expect(
        deleteContentManager.run(makeRequest({}))
      ).rejects.toMatchObject({
        code: "internal",
        message: "Failed to delete user.",
      });

      expect(sentryCapture).toHaveBeenCalledWith(
        unknownErr,
        {tags: {source: "deleteContentManager"}},
      );
      expect(loggerError).toHaveBeenCalledWith(
        "Unexpected error deleting Firebase Auth user",
        unknownErr,
      );
    });
});

describe("blockContentManager — validation", () => {
  it("throws unauthenticated when request.auth is null", async () => {
    await expect(
      blockContentManager.run(makeRequest({auth: null}))
    ).rejects.toMatchObject({
      code: "unauthenticated",
      message: "Must be authenticated.",
    });
  });

  it("throws permission-denied for a non-admin caller", async () => {
    await expect(
      blockContentManager.run(
        makeRequest({auth: {uid: "u1", token: {role: "content_manager"}}})
      )
    ).rejects.toMatchObject({
      code: "permission-denied",
      message: "Only admins can block content managers.",
    });
  });

  it("throws invalid-argument for an empty uid", async () => {
    await expect(
      blockContentManager.run(makeRequest({data: {uid: ""}}))
    ).rejects.toMatchObject({
      code: "invalid-argument",
      message: "uid must be a non-empty string.",
    });
  });

  it("throws invalid-argument for non-string uid", async () => {
    await expect(
      blockContentManager.run(makeRequest({data: {uid: 123}}))
    ).rejects.toMatchObject({code: "invalid-argument"});
  });
});

describe("blockContentManager — success path", () => {
  it("disables Auth user and marks Firestore doc as blocked", async () => {
    const result = await blockContentManager.run(makeRequest({}));

    expect(result).toEqual({uid: "cm-uid"});
    expect(mockUpdateUser).toHaveBeenCalledWith(
      "cm-uid", {disabled: true}
    );
    expect(mockCollection).toHaveBeenCalledWith("users");
    expect(mockDoc).toHaveBeenCalledWith("cm-uid");
    expect(mockUpdate).toHaveBeenCalledWith({
      blocked: true,
      updatedAt: "mock-timestamp",
    });
  });

  it("logs blocking with uid and caller", async () => {
    const loggerInfo = require("firebase-functions/logger").info;
    await blockContentManager.run(makeRequest({}));

    expect(loggerInfo).toHaveBeenCalledWith(
      "Content manager blocked",
      {uid: "cm-uid", by: "admin-uid"},
    );
  });

  it("reports unexpected errors to Sentry and throws internal",
    async () => {
      const sentryCapture =
        require("@sentry/node").captureException;
      const loggerError =
        require("firebase-functions/logger").error;
      const unknownErr = new Error("boom");
      mockUpdateUser.mockRejectedValueOnce(unknownErr);

      await expect(
        blockContentManager.run(makeRequest({}))
      ).rejects.toMatchObject({
        code: "internal",
        message: "Failed to block user.",
      });

      expect(sentryCapture).toHaveBeenCalledWith(
        unknownErr,
        {tags: {source: "blockContentManager"}},
      );
      expect(loggerError).toHaveBeenCalledWith(
        "Unexpected error blocking Firebase Auth user",
        unknownErr,
      );
    });
});

function makeCreateRequest(overrides: object) {
  return {
    auth: {uid: "admin-uid", token: {role: "admin"}},
    data: {email: "new@example.com", password: "StrongPass1!"},
    rawRequest: {},
    ...overrides,
  } as any;
}

describe("createContentManager — validation", () => {
  it("throws unauthenticated when request.auth is null",
    async () => {
      await expect(
        createContentManager.run(
          makeCreateRequest({auth: null})
        )
      ).rejects.toMatchObject({
        code: "unauthenticated",
        message: "Must be authenticated.",
      });
    });

  it("throws permission-denied for a non-admin caller",
    async () => {
      await expect(
        createContentManager.run(
          makeCreateRequest({
            auth: {uid: "u1", token: {role: "content_manager"}},
          })
        )
      ).rejects.toMatchObject({
        code: "permission-denied",
        message: "Admin access required",
      });
    });

  it("throws invalid-argument for a missing email", async () => {
    const data = {email: "", password: "StrongPass1!"};
    await expect(
      createContentManager.run(makeCreateRequest({data}))
    ).rejects.toMatchObject({
      code: "invalid-argument",
      message: "Email is required",
    });
  });

  it("throws invalid-argument for non-string email", async () => {
    const data = {email: 123, password: "StrongPass1!"};
    await expect(
      createContentManager.run(makeCreateRequest({data}))
    ).rejects.toMatchObject({code: "invalid-argument"});
  });

  it("throws invalid-argument for a missing password", async () => {
    const data = {email: "new@example.com", password: ""};
    await expect(
      createContentManager.run(makeCreateRequest({data}))
    ).rejects.toMatchObject({
      code: "invalid-argument",
      message: "Password is required",
    });
  });

  it("throws invalid-argument for non-string password",
    async () => {
      const data = {email: "new@example.com", password: 123};
      await expect(
        createContentManager.run(makeCreateRequest({data}))
      ).rejects.toMatchObject({code: "invalid-argument"});
    });
});

describe("createContentManager — success path", () => {
  it("creates Auth user, sets claims, and writes Firestore doc",
    async () => {
      const result = await createContentManager.run(
        makeCreateRequest({})
      );

      expect(result).toEqual({uid: "new-uid"});
      expect(mockCreateUser).toHaveBeenCalledWith({
        email: "new@example.com",
        password: "StrongPass1!",
      });
      expect(mockSetCustomUserClaims).toHaveBeenCalledWith(
        "new-uid", {role: "content_manager"}
      );
      expect(mockCollection).toHaveBeenCalledWith("users");
      expect(mockDoc).toHaveBeenCalledWith("new-uid");
      expect(mockSet).toHaveBeenCalledWith({
        email: "new@example.com",
        role: "content_manager",
        blocked: false,
        createdAt: "mock-timestamp",
      });
    });

  it("trims email before passing to Auth and Firestore",
    async () => {
      const data = {
        email: "  new@example.com  ",
        password: "StrongPass1!",
      };
      await createContentManager.run(makeCreateRequest({data}));

      expect(mockCreateUser).toHaveBeenCalledWith({
        email: "new@example.com",
        password: "StrongPass1!",
      });
      expect(mockSet).toHaveBeenCalledWith(
        expect.objectContaining({email: "new@example.com"}),
      );
    });

  it("logs creation with uid and caller", async () => {
    const loggerInfo = require("firebase-functions/logger").info;
    await createContentManager.run(makeCreateRequest({}));

    expect(loggerInfo).toHaveBeenCalledWith(
      "Content manager created",
      {uid: "new-uid", by: "admin-uid"},
    );
  });

  it("maps auth/email-already-exists to already-exists",
    async () => {
      mockCreateUser.mockRejectedValueOnce({
        code: "auth/email-already-exists",
      });

      await expect(
        createContentManager.run(makeCreateRequest({}))
      ).rejects.toMatchObject({
        code: "already-exists",
        message: "auth/email-already-in-use",
      });
    });

  it("reports unknown errors to Sentry and throws internal",
    async () => {
      const sentryCapture =
        require("@sentry/node").captureException;
      const unknownErr = new Error("boom");
      mockCreateUser.mockRejectedValueOnce(unknownErr);

      await expect(
        createContentManager.run(makeCreateRequest({}))
      ).rejects.toMatchObject({
        code: "internal",
        message: "Failed to create user",
      });

      expect(sentryCapture).toHaveBeenCalledWith(unknownErr);
    });
});
