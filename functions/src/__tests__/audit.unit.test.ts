/**
 * Unit tests for audit.ts — POI change audit logging.
 * Admin SDK is fully mocked; no emulator required.
 */

// ── Mocks (must be declared before imports) ──────────────────────────

const mockAdd = jest.fn().mockResolvedValue({id: "log-1"});
const mockCollection = jest.fn(() => ({add: mockAdd}));

jest.mock("firebase-admin/app", () => ({
  initializeApp: jest.fn(),
  getApps: jest.fn(() => [{name: "mock-app"}]),
}));

class MockTimestamp {
  constructor(public _seconds: number, public _nanoseconds: number) {}
  toMillis() {
    return this._seconds * 1000 + this._nanoseconds / 1e6;
  }
}

jest.mock("firebase-admin/firestore", () => ({
  getFirestore: jest.fn(() => ({collection: mockCollection})),
  FieldValue: {serverTimestamp: jest.fn(() => "mock-ts")},
  Timestamp: MockTimestamp,
}));

jest.mock("firebase-functions/logger", () => ({
  info: jest.fn(),
  error: jest.fn(),
}));

// Capture the onDocumentWritten handler
type Handler = (event: unknown) => Promise<void>;
let capturedHandler: Handler;

jest.mock("firebase-functions/v2/firestore", () => ({
  onDocumentWritten: (_path: string, fn: Handler) => {
    capturedHandler = fn;
    return fn;
  },
}));

// ── Imports ──────────────────────────────────────────────────────────

import * as logger from "firebase-functions/logger";
import "../audit.js";

// ── Helpers ──────────────────────────────────────────────────────────

function makeEvent(
  beforeData: Record<string, unknown> | undefined,
  afterData: Record<string, unknown> | undefined,
  poiId = "poi-1",
) {
  return {
    params: {poiId},
    data: {
      before: beforeData ? {data: () => beforeData} : undefined,
      after: afterData ? {data: () => afterData} : undefined,
    },
  };
}

// ── Tests ────────────────────────────────────────────────────────────

afterEach(() => jest.clearAllMocks());

describe("auditPoiChanges", () => {
  it("logs a create event with full snapshot", async () => {
    const doc = {
      name: "Test POI",
      categoryId: "cat-1",
      createdBy: "user-1",
    };

    await capturedHandler(makeEvent(undefined, doc));

    expect(mockCollection).toHaveBeenCalledWith("audit_log");
    expect(mockAdd).toHaveBeenCalledWith({
      collection: "points_of_interest",
      documentId: "poi-1",
      action: "create",
      userId: "user-1",
      changes: null,
      snapshot: doc,
      timestamp: "mock-ts",
    });
    expect(logger.info).toHaveBeenCalledWith(
      "Audit log entry created",
      {poiId: "poi-1", action: "create", userId: "user-1"},
    );
  });

  it("logs an update event with field-level diff", async () => {
    const before = {
      name: "Old Name",
      categoryId: "cat-1",
      active: true,
    };
    const after = {
      name: "New Name",
      categoryId: "cat-1",
      active: true,
      updatedBy: "user-2",
    };

    await capturedHandler(makeEvent(before, after));

    expect(mockAdd).toHaveBeenCalledWith(
      expect.objectContaining({
        action: "update",
        userId: "user-2",
        snapshot: null,
        changes: {
          name: {old: "Old Name", new: "New Name"},
          updatedBy: {old: undefined, new: "user-2"},
        },
      }),
    );
  });

  it("logs a delete event with full snapshot", async () => {
    const doc = {
      name: "Deleted POI",
      categoryId: "cat-1",
    };

    await capturedHandler(makeEvent(doc, undefined));

    expect(mockAdd).toHaveBeenCalledWith(
      expect.objectContaining({
        action: "delete",
        userId: null,
        changes: null,
        snapshot: doc,
      }),
    );
  });

  it("skips when both before and after are undefined", async () => {
    await capturedHandler(makeEvent(undefined, undefined));

    expect(mockAdd).not.toHaveBeenCalled();
    expect(logger.info).not.toHaveBeenCalled();
  });

  it("handles missing createdBy on create", async () => {
    const doc = {name: "No Author", categoryId: "cat-1"};

    await capturedHandler(makeEvent(undefined, doc));

    expect(mockAdd).toHaveBeenCalledWith(
      expect.objectContaining({userId: null}),
    );
  });
});
