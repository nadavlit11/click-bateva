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
    data: {name: "Test Business", email: "test@example.com", password: "Pass1234"},
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
    ).rejects.toMatchObject({
      code: "unauthenticated",
      message: "Must be authenticated.",
    });
  });

  it("throws permission-denied for a non-admin caller", async () => {
    await expect(
      createBusinessUser.run(
        makeCreateRequest({
          auth: {uid: "u1", token: {role: "content_manager"}},
        })
      )
    ).rejects.toMatchObject({
      code: "permission-denied",
      message: "Only admins can create business users.",
    });
  });

  it("throws permission-denied for a business_user caller",
    async () => {
      await expect(
        createBusinessUser.run(
          makeCreateRequest({
            auth: {uid: "u1", token: {role: "business_user"}},
          })
        )
      ).rejects.toMatchObject({code: "permission-denied"});
    });
});

describe("createBusinessUser — input validation", () => {
  it("throws invalid-argument for empty name", async () => {
    const data = {name: "", email: "a@b.com", password: "Pass1234"};
    await expect(
      createBusinessUser.run(makeCreateRequest({data}))
    ).rejects.toMatchObject({code: "invalid-argument", message: "name must be a non-empty string."});
  });

  it("throws invalid-argument for non-string name", async () => {
    const data = {name: 123, email: "a@b.com", password: "Pass1234"};
    await expect(
      createBusinessUser.run(makeCreateRequest({data}))
    ).rejects.toMatchObject({code: "invalid-argument", message: "name must be a non-empty string."});
  });

  it("throws invalid-argument for empty email", async () => {
    const data = {name: "Biz", email: "", password: "Pass1234"};
    await expect(
      createBusinessUser.run(makeCreateRequest({data}))
    ).rejects.toMatchObject({code: "invalid-argument", message: "email must be a non-empty string."});
  });

  it("throws invalid-argument for invalid email format", async () => {
    const data = {name: "Biz", email: "notanemail", password: "Pass1234"};
    await expect(
      createBusinessUser.run(makeCreateRequest({data}))
    ).rejects.toMatchObject({code: "invalid-argument", message: "email must be a valid email address."});
  });

  it("throws invalid-argument for email without domain", async () => {
    const data = {name: "Biz", email: "user@", password: "Pass1234"};
    await expect(
      createBusinessUser.run(makeCreateRequest({data}))
    ).rejects.toMatchObject({code: "invalid-argument", message: "email must be a valid email address."});
  });

  it("throws invalid-argument for short password", async () => {
    const data = {name: "Biz", email: "a@b.com", password: "12345"};
    await expect(
      createBusinessUser.run(makeCreateRequest({data}))
    ).rejects.toMatchObject({code: "invalid-argument", message: "password must be at least 6 characters."});
  });

  it("throws invalid-argument for non-string password", async () => {
    const data = {name: "Biz", email: "a@b.com", password: 123456};
    await expect(
      createBusinessUser.run(makeCreateRequest({data}))
    ).rejects.toMatchObject({code: "invalid-argument"});
  });
});

describe("createBusinessUser — success path", () => {
  beforeEach(() => {
    mockCreateUser.mockResolvedValue({uid: "new-uid"});
  });

  it("creates Auth user with the provided email and returns uid",
    async () => {
      const result = await createBusinessUser.run(
        makeCreateRequest({})
      );

      expect(result).toEqual({uid: "new-uid"});
      expect(mockCreateUser).toHaveBeenCalledWith({
        email: "test@example.com",
        password: "Pass1234",
      });
    });

  it("lowercases and trims the email", async () => {
    const data = {
      name: "Biz",
      email: "  Test@Example.COM  ",
      password: "Pass1234",
    };
    await createBusinessUser.run(makeCreateRequest({data}));

    expect(mockCreateUser).toHaveBeenCalledWith({
      email: "test@example.com",
      password: "Pass1234",
    });
  });

  it("trims the business name", async () => {
    const data = {
      name: "  Biz Name  ",
      email: "a@b.com",
      password: "Pass1234",
    };
    await createBusinessUser.run(makeCreateRequest({data}));

    expect(mockBatchSet).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({name: "Biz Name"}),
    );
  });

  it("sets business_user role and businessRef custom claims",
    async () => {
      await createBusinessUser.run(makeCreateRequest({}));

      expect(mockSetCustomUserClaims).toHaveBeenCalledWith(
        "new-uid",
        {
          role: "business_user",
          businessRef:
            "/databases/(default)/documents/businesses/new-uid",
        },
      );
    });

  it("writes user doc with correct fields in batch", async () => {
    await createBusinessUser.run(makeCreateRequest({}));

    expect(mockBatchSet).toHaveBeenCalledWith(
      "doc-ref-new-uid",
      {
        uid: "new-uid",
        email: "test@example.com",
        role: "business_user",
        businessRef:
          "/databases/(default)/documents/businesses/new-uid",
        createdAt: "mock-timestamp",
        updatedAt: "mock-timestamp",
      },
    );
  });

  it("writes business doc with correct fields in batch",
    async () => {
      await createBusinessUser.run(makeCreateRequest({}));

      expect(mockBatchSet).toHaveBeenCalledWith(
        "doc-ref-new-uid",
        {
          id: "new-uid",
          name: "Test Business",
          email: "test@example.com",
          ownerUid: "new-uid",
          associatedUserIds: ["new-uid"],
          createdAt: "mock-timestamp",
          updatedAt: "mock-timestamp",
        },
      );
    });

  it("creates both Firestore documents in a batch", async () => {
    await createBusinessUser.run(makeCreateRequest({}));

    expect(mockBatch).toHaveBeenCalled();
    expect(mockBatchSet).toHaveBeenCalledTimes(2);
    expect(mockBatchCommit).toHaveBeenCalled();
  });

  it("logs creation with uid, email, name, and caller",
    async () => {
      const loggerInfo =
        require("firebase-functions/logger").info;
      await createBusinessUser.run(makeCreateRequest({}));

      expect(loggerInfo).toHaveBeenCalledWith(
        "Business user created",
        {
          uid: "new-uid",
          email: "test@example.com",
          name: "Test Business",
          by: "admin-uid",
        },
      );
    });
});

describe("createBusinessUser — error handling", () => {
  it("throws already-exists for duplicate email", async () => {
    mockCreateUser.mockRejectedValue({
      code: "auth/email-already-exists",
    });

    await expect(
      createBusinessUser.run(makeCreateRequest({}))
    ).rejects.toMatchObject({
      code: "already-exists",
      message: "(auth/email-already-in-use)",
    });
  });

  it("reports unknown errors to Sentry and throws internal",
    async () => {
      const sentryCapture =
        require("@sentry/node").captureException;
      const loggerError =
        require("firebase-functions/logger").error;
      const unknownErr = new Error("boom");
      mockCreateUser.mockRejectedValue(unknownErr);

      await expect(
        createBusinessUser.run(makeCreateRequest({}))
      ).rejects.toMatchObject({
        code: "internal",
        message: "Failed to create user.",
      });

      expect(sentryCapture).toHaveBeenCalledWith(
        unknownErr,
        {tags: {source: "createBusinessUser"}},
      );
      expect(loggerError).toHaveBeenCalledWith(
        "Unexpected error creating Firebase Auth user",
        unknownErr,
      );
    });
});

// ── deleteBusinessUser ───────────────────────────────────────────────────────

describe("deleteBusinessUser — auth checks", () => {
  it("throws unauthenticated when request.auth is null", async () => {
    await expect(
      deleteBusinessUser.run(makeDeleteRequest({auth: null}))
    ).rejects.toMatchObject({
      code: "unauthenticated",
      message: "Must be authenticated.",
    });
  });

  it("throws permission-denied for a non-admin caller", async () => {
    await expect(
      deleteBusinessUser.run(
        makeDeleteRequest({
          auth: {uid: "u1", token: {role: "content_manager"}},
        })
      )
    ).rejects.toMatchObject({
      code: "permission-denied",
      message: "Only admins can delete business users.",
    });
  });
});

describe("deleteBusinessUser — input validation", () => {
  it("throws invalid-argument for empty uid", async () => {
    await expect(
      deleteBusinessUser.run(makeDeleteRequest({data: {uid: ""}}))
    ).rejects.toMatchObject({
      code: "invalid-argument",
      message: "uid must be a non-empty string.",
    });
  });

  it("throws invalid-argument for non-string uid", async () => {
    await expect(
      deleteBusinessUser.run(
        makeDeleteRequest({data: {uid: 123}})
      )
    ).rejects.toMatchObject({code: "invalid-argument"});
  });
});

describe("deleteBusinessUser — success path", () => {
  it("deletes Auth user and both Firestore docs in a batch",
    async () => {
      const result = await deleteBusinessUser.run(
        makeDeleteRequest({})
      );

      expect(result).toEqual({uid: "target-uid"});
      expect(mockDeleteUser).toHaveBeenCalledWith("target-uid");
      expect(mockBatch).toHaveBeenCalled();
      expect(mockBatchDelete).toHaveBeenCalledTimes(2);
      expect(mockBatchCommit).toHaveBeenCalled();
    });

  it("deletes from both users and businesses collections",
    async () => {
      await deleteBusinessUser.run(makeDeleteRequest({}));

      expect(mockCollection).toHaveBeenCalledWith("users");
      expect(mockCollection).toHaveBeenCalledWith("businesses");
      expect(mockDoc).toHaveBeenCalledWith("target-uid");
    });

  it("logs deletion with uid and caller", async () => {
    const loggerInfo = require("firebase-functions/logger").info;
    await deleteBusinessUser.run(makeDeleteRequest({}));

    expect(loggerInfo).toHaveBeenCalledWith(
      "Business user deleted",
      {uid: "target-uid", by: "admin-uid"},
    );
  });

  it("tolerates auth/user-not-found and still cleans Firestore",
    async () => {
      mockDeleteUser.mockRejectedValueOnce({
        code: "auth/user-not-found",
      });

      const result = await deleteBusinessUser.run(
        makeDeleteRequest({})
      );

      expect(result).toEqual({uid: "target-uid"});
      expect(mockBatchDelete).toHaveBeenCalledTimes(2);
      expect(mockBatchCommit).toHaveBeenCalled();
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
        deleteBusinessUser.run(makeDeleteRequest({}))
      ).rejects.toMatchObject({
        code: "internal",
        message: "Failed to delete user.",
      });

      expect(sentryCapture).toHaveBeenCalledWith(
        unknownErr,
        {tags: {source: "deleteBusinessUser"}},
      );
      expect(loggerError).toHaveBeenCalledWith(
        "Unexpected error deleting Firebase Auth user",
        unknownErr,
      );
    });
});
