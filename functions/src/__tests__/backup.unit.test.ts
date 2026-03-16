/**
 * Unit tests for backup.ts — daily Firestore export.
 * Mocks the Firestore Admin v1 client; no emulator required.
 */

// ── Mocks (must be declared before imports) ──────────────────────────

const mockExportDocuments = jest.fn();
const mockDatabasePath = jest.fn(
  (project: string, db: string) =>
    `projects/${project}/databases/${db}`
);

jest.mock("@google-cloud/firestore", () => ({
  v1: {
    FirestoreAdminClient: jest.fn(() => ({
      exportDocuments: mockExportDocuments,
      databasePath: mockDatabasePath,
    })),
  },
}));

jest.mock("firebase-functions/logger", () => ({
  info: jest.fn(),
  error: jest.fn(),
}));

// Capture the handler that onSchedule receives
let capturedHandler: (event: unknown) => Promise<void>;

jest.mock("firebase-functions/v2/scheduler", () => ({
  onSchedule: (
    _opts: unknown,
    fn: (event: unknown) => Promise<void>,
  ) => {
    capturedHandler = fn;
    return fn;
  },
}));

// ── Imports (after mocks) ────────────────────────────────────────────

import * as logger from "firebase-functions/logger";
import "../backup.js";

// ── Tests ────────────────────────────────────────────────────────────

afterEach(() => jest.clearAllMocks());

describe("dailyFirestoreExport", () => {
  const ORIG_ENV = process.env;

  beforeEach(() => {
    process.env = {
      ...ORIG_ENV,
      GCLOUD_PROJECT: "test-project",
    };
  });

  afterEach(() => {
    process.env = ORIG_ENV;
  });

  it("calls exportDocuments with correct params", async () => {
    const fakeDate = "2026-03-16";
    jest.useFakeTimers(
      {now: new Date(`${fakeDate}T02:00:00Z`)}
    );

    mockExportDocuments.mockResolvedValue([
      {name: "projects/test-project/operations/abc123"},
    ]);

    await capturedHandler({});

    expect(mockDatabasePath).toHaveBeenCalledWith(
      "test-project", "(default)",
    );
    expect(mockExportDocuments).toHaveBeenCalledWith({
      name: "projects/test-project/databases/(default)",
      outputUriPrefix:
        `gs://test-project-firestore-backups/${fakeDate}`,
      collectionIds: [],
    });
    expect(logger.info).toHaveBeenCalledWith(
      "Firestore export initiated",
      expect.objectContaining({
        destination:
          `gs://test-project-firestore-backups/${fakeDate}`,
      }),
    );

    jest.useRealTimers();
  });

  it("propagates errors from exportDocuments", async () => {
    mockExportDocuments.mockRejectedValue(
      new Error("Permission denied"),
    );

    await expect(capturedHandler({}))
      .rejects.toThrow("Permission denied");
  });
});
