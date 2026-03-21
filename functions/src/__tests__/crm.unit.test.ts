/* eslint-disable @typescript-eslint/no-var-requires */
/**
 * Unit tests for crm.ts — no emulator required.
 * Admin SDK is fully mocked; tests focus on validation logic in
 * createCrmUser and deleteCrmUser.
 */

// ── Mocks (must be declared before imports) ──────────────────────────────────

const mockDocDelete = jest.fn().mockResolvedValue(undefined);
const mockSet = jest.fn().mockResolvedValue(undefined);
const mockDoc = jest.fn(() => ({delete: mockDocDelete, set: mockSet}));
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
import {createCrmUser, deleteCrmUser} from "../crm.js";

const testEnv = firebaseFunctionsTest();

// ── Helpers ───────────────────────────────────────────────────────────────────

function makeCreateRequest(overrides: object) {
  return {
    auth: {uid: "admin-uid", token: {role: "admin"}},
    data: {
      email: "crm@example.com",
      password: "StrongPass1!",
      name: "CRM User",
    },
    rawRequest: {},
    ...overrides,
  } as any; // eslint-disable-line @typescript-eslint/no-explicit-any
}

function makeDeleteRequest(overrides: object) {
  return {
    auth: {uid: "admin-uid", token: {role: "admin"}},
    data: {uid: "crm-uid"},
    rawRequest: {},
    ...overrides,
  } as any; // eslint-disable-line @typescript-eslint/no-explicit-any
}

// ── Tests ─────────────────────────────────────────────────────────────────────

afterAll(() => testEnv.cleanup());
afterEach(() => jest.clearAllMocks());

// ── createCrmUser ─────────────────────────────────────────────────────────────

describe("createCrmUser — validation", () => {
  it("throws unauthenticated when request.auth is null", async () => {
    await expect(
      createCrmUser.run(makeCreateRequest({auth: null}))
    ).rejects.toMatchObject({
      code: "unauthenticated",
      message: "Must be authenticated.",
    });
  });

  it("throws permission-denied for a non-admin caller", async () => {
    await expect(
      createCrmUser.run(
        makeCreateRequest({
          auth: {uid: "u1", token: {role: "crm_user"}},
        })
      )
    ).rejects.toMatchObject({
      code: "permission-denied",
      message: "Only admins can create CRM users.",
    });
  });

  it("throws invalid-argument for a missing email", async () => {
    await expect(
      createCrmUser.run(
        makeCreateRequest({
          data: {email: "", password: "Pass1!", name: "N"},
        })
      )
    ).rejects.toMatchObject({
      code: "invalid-argument",
      message: "Email is required",
    });
  });

  it("throws invalid-argument for non-string email", async () => {
    await expect(
      createCrmUser.run(
        makeCreateRequest({
          data: {email: 123, password: "Pass1!", name: "N"},
        })
      )
    ).rejects.toMatchObject({code: "invalid-argument"});
  });

  it("throws invalid-argument for a missing password", async () => {
    await expect(
      createCrmUser.run(
        makeCreateRequest({
          data: {email: "a@b.com", password: "", name: "N"},
        })
      )
    ).rejects.toMatchObject({
      code: "invalid-argument",
      message: "Password is required",
    });
  });

  it("throws invalid-argument for non-string password", async () => {
    await expect(
      createCrmUser.run(
        makeCreateRequest({
          data: {email: "a@b.com", password: 123, name: "N"},
        })
      )
    ).rejects.toMatchObject({code: "invalid-argument"});
  });

  it("throws invalid-argument for a missing name", async () => {
    await expect(
      createCrmUser.run(
        makeCreateRequest({
          data: {email: "a@b.com", password: "Pass1!", name: ""},
        })
      )
    ).rejects.toMatchObject({
      code: "invalid-argument",
      message: "Name is required",
    });
  });

  it("throws invalid-argument for non-string name", async () => {
    await expect(
      createCrmUser.run(
        makeCreateRequest({
          data: {email: "a@b.com", password: "Pass1!", name: 42},
        })
      )
    ).rejects.toMatchObject({code: "invalid-argument"});
  });
});

describe("createCrmUser — success path", () => {
  it("creates Auth user, sets claims, and writes Firestore doc", async () => {
    const result = await createCrmUser.run(makeCreateRequest({}));

    expect(result).toEqual({uid: "new-uid"});
    expect(mockCreateUser).toHaveBeenCalledWith({
      email: "crm@example.com",
      password: "StrongPass1!",
      displayName: "CRM User",
    });
    expect(mockSetCustomUserClaims).toHaveBeenCalledWith(
      "new-uid", {role: "crm_user"}
    );
    expect(mockCollection).toHaveBeenCalledWith("users");
    expect(mockDoc).toHaveBeenCalledWith("new-uid");
    expect(mockSet).toHaveBeenCalledWith({
      email: "crm@example.com",
      name: "CRM User",
      role: "crm_user",
      blocked: false,
      createdAt: "mock-timestamp",
    });
  });

  it("trims email and name before passing to Auth and Firestore",
    async () => {
      const data = {
        email: "  crm@example.com  ",
        password: "StrongPass1!",
        name: "  CRM User  ",
      };
      await createCrmUser.run(makeCreateRequest({data}));

      expect(mockCreateUser).toHaveBeenCalledWith({
        email: "crm@example.com",
        password: "StrongPass1!",
        displayName: "CRM User",
      });
      expect(mockSet).toHaveBeenCalledWith(
        expect.objectContaining({
          email: "crm@example.com",
          name: "CRM User",
        }),
      );
    });

  it("logs creation with uid and caller", async () => {
    const loggerInfo = require("firebase-functions/logger").info;
    await createCrmUser.run(makeCreateRequest({}));

    expect(loggerInfo).toHaveBeenCalledWith(
      "CRM user created",
      {uid: "new-uid", by: "admin-uid"},
    );
  });

  it("maps auth/email-already-exists to already-exists", async () => {
    mockCreateUser.mockRejectedValueOnce({
      code: "auth/email-already-exists",
    });

    await expect(
      createCrmUser.run(makeCreateRequest({}))
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
        createCrmUser.run(makeCreateRequest({}))
      ).rejects.toMatchObject({
        code: "internal",
        message: "Failed to create user",
      });

      expect(sentryCapture).toHaveBeenCalledWith(
        unknownErr,
        {tags: {source: "createCrmUser"}},
      );
    });
});

// ── deleteCrmUser ─────────────────────────────────────────────────────────────

describe("deleteCrmUser — validation", () => {
  it("throws unauthenticated when request.auth is null", async () => {
    await expect(
      deleteCrmUser.run(makeDeleteRequest({auth: null}))
    ).rejects.toMatchObject({
      code: "unauthenticated",
      message: "Must be authenticated.",
    });
  });

  it("throws permission-denied for a non-admin caller", async () => {
    await expect(
      deleteCrmUser.run(
        makeDeleteRequest({
          auth: {uid: "u1", token: {role: "crm_user"}},
        })
      )
    ).rejects.toMatchObject({
      code: "permission-denied",
      message: "Only admins can delete CRM users.",
    });
  });

  it("throws invalid-argument for an empty uid", async () => {
    await expect(
      deleteCrmUser.run(makeDeleteRequest({data: {uid: ""}}))
    ).rejects.toMatchObject({
      code: "invalid-argument",
      message: "uid must be a non-empty string.",
    });
  });

  it("throws invalid-argument for a non-string uid", async () => {
    await expect(
      deleteCrmUser.run(makeDeleteRequest({data: {uid: 123}}))
    ).rejects.toMatchObject({code: "invalid-argument"});
  });
});

describe("deleteCrmUser — success path", () => {
  it("deletes Auth user and Firestore user doc", async () => {
    const result = await deleteCrmUser.run(makeDeleteRequest({}));

    expect(result).toEqual({uid: "crm-uid"});
    expect(mockDeleteUser).toHaveBeenCalledWith("crm-uid");
    expect(mockCollection).toHaveBeenCalledWith("users");
    expect(mockDoc).toHaveBeenCalledWith("crm-uid");
    expect(mockDocDelete).toHaveBeenCalled();
  });

  it("logs deletion with uid and caller", async () => {
    const loggerInfo = require("firebase-functions/logger").info;
    await deleteCrmUser.run(makeDeleteRequest({}));

    expect(loggerInfo).toHaveBeenCalledWith(
      "CRM user deleted",
      {uid: "crm-uid", by: "admin-uid"},
    );
  });

  it("tolerates auth/user-not-found and still cleans up Firestore",
    async () => {
      mockDeleteUser.mockRejectedValueOnce({
        code: "auth/user-not-found",
      });

      const result = await deleteCrmUser.run(makeDeleteRequest({}));

      expect(result).toEqual({uid: "crm-uid"});
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
        deleteCrmUser.run(makeDeleteRequest({}))
      ).rejects.toMatchObject({
        code: "internal",
        message: "Failed to delete user.",
      });

      expect(sentryCapture).toHaveBeenCalledWith(
        unknownErr,
        {tags: {source: "deleteCrmUser"}},
      );
      expect(loggerError).toHaveBeenCalledWith(
        "Unexpected error deleting Firebase Auth user",
        unknownErr,
      );
    });
});
