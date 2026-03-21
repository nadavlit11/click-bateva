/**
 * Unit tests for enrichment/image-processor.ts
 */

// ── Mocks ────────────────────────────────────────

const mockLogger = {
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
  debug: jest.fn(),
};
jest.mock("firebase-functions/logger", () => mockLogger);

jest.mock("crypto", () => ({
  randomBytes: jest.fn(() => ({
    toString: jest.fn(() => "abcd1234"),
  })),
  randomUUID: jest.fn(() => "test-uuid-1234"),
}));

import {processImages} from "../enrichment/image-processor";

// Mock global fetch
const mockFetch = jest.fn();
// eslint-disable-next-line @typescript-eslint/no-explicit-any
(global as any).fetch = mockFetch;

// ── Helpers ──────────────────────────────────────

function mkBucket(name = "test-bucket") {
  const mockSave = jest.fn().mockResolvedValue(undefined);
  const mockFile = jest.fn(() => ({save: mockSave}));
  return {
    file: mockFile,
    name,
    _save: mockSave,
    _file: mockFile,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } as any;
}

function imgResponse(
  contentType = "image/jpeg", size = 5000,
) {
  const buf = Buffer.alloc(size, "x");
  return {
    ok: true,
    headers: {
      get: jest.fn((h: string) =>
        h === "content-type" ? contentType : null,
      ),
    },
    arrayBuffer: jest.fn().mockResolvedValue(
      buf.buffer.slice(
        buf.byteOffset,
        buf.byteOffset + buf.byteLength,
      ),
    ),
  };
}

// ── Tests ────────────────────────────────────────

describe("processImages", () => {
  beforeEach(() => jest.clearAllMocks());

  it("uploads valid image and returns URL", async () => {
    mockFetch.mockResolvedValue(imgResponse());
    const b = mkBucket();
    const urls = await processImages(
      "poi1", ["https://cdn.com/i.jpg"], b,
    );
    expect(urls).toHaveLength(1);
    expect(urls[0]).toContain(
      "firebasestorage.googleapis.com",
    );
    expect(urls[0]).toContain("test-bucket");
    expect(urls[0]).toContain("test-uuid-1234");
  });

  it("builds correct storage path", async () => {
    mockFetch.mockResolvedValue(imgResponse());
    const b = mkBucket();
    await processImages(
      "poi1", ["https://cdn.com/i.jpg"], b,
    );
    const path = b._file.mock.calls[0][0];
    expect(path).toMatch(
      /^poi-media\/poi1-enriched-0-abcd1234\.jpg$/,
    );
  });

  it("encodes storage path in download URL", async () => {
    mockFetch.mockResolvedValue(imgResponse());
    const b = mkBucket();
    const urls = await processImages(
      "poi1", ["https://cdn.com/i.jpg"], b,
    );
    const expectedPath =
      "poi-media/poi1-enriched-0-abcd1234.jpg";
    expect(urls[0]).toContain(
      encodeURIComponent(expectedPath),
    );
  });

  it("limits to 5 images (MAX_IMAGES)", async () => {
    mockFetch.mockResolvedValue(imgResponse());
    const b = mkBucket();
    const inputs = Array.from(
      {length: 10},
      (_, i) => `https://cdn.com/${i}.jpg`,
    );
    const urls = await processImages("poi1", inputs, b);
    expect(urls).toHaveLength(5);
    expect(mockFetch).toHaveBeenCalledTimes(5);
  });

  it("skips HTTP error responses", async () => {
    mockFetch
      .mockResolvedValueOnce({ok: false, status: 404})
      .mockResolvedValueOnce(imgResponse());
    const b = mkBucket();
    const urls = await processImages(
      "poi1",
      ["https://cdn.com/bad", "https://cdn.com/ok"],
      b,
    );
    expect(urls).toHaveLength(1);
  });

  it("logs warning for HTTP errors", async () => {
    mockFetch.mockResolvedValue(
      {ok: false, status: 404},
    );
    const b = mkBucket();
    await processImages(
      "poi1", ["https://cdn.com/bad"], b,
    );
    expect(mockLogger.warn).toHaveBeenCalledWith(
      expect.stringContaining("HTTP 404"),
    );
  });

  it("rejects unsupported content type", async () => {
    mockFetch.mockResolvedValue(
      imgResponse("text/html"),
    );
    const b = mkBucket();
    const urls = await processImages(
      "poi1", ["https://cdn.com/bad"], b,
    );
    expect(urls).toHaveLength(0);
    expect(mockLogger.warn).toHaveBeenCalledWith(
      expect.stringContaining(
        "Unsupported type: text/html",
      ),
    );
  });

  it("rejects missing content type", async () => {
    const resp = {
      ok: true,
      headers: {get: jest.fn(() => null)},
      arrayBuffer: jest.fn().mockResolvedValue(
        new ArrayBuffer(5000),
      ),
    };
    mockFetch.mockResolvedValue(resp);
    const b = mkBucket();
    const urls = await processImages(
      "poi1", ["https://cdn.com/x"], b,
    );
    expect(urls).toHaveLength(0);
  });

  it("rejects files over 10MB", async () => {
    const bigSize = 11 * 1024 * 1024;
    mockFetch.mockResolvedValue(
      imgResponse("image/jpeg", bigSize),
    );
    const b = mkBucket();
    const urls = await processImages(
      "poi1", ["https://cdn.com/huge"], b,
    );
    expect(urls).toHaveLength(0);
    expect(mockLogger.warn).toHaveBeenCalledWith(
      expect.stringContaining("Too large"),
    );
  });

  it("rejects files under 1KB", async () => {
    mockFetch.mockResolvedValue(
      imgResponse("image/jpeg", 100),
    );
    const b = mkBucket();
    const urls = await processImages(
      "poi1", ["https://cdn.com/tiny"], b,
    );
    expect(urls).toHaveLength(0);
    expect(mockLogger.warn).toHaveBeenCalledWith(
      expect.stringContaining(
        "Too small (likely tracking pixel)",
      ),
    );
  });

  it("accepts jpeg, png, webp, gif", async () => {
    const types = [
      "image/jpeg",
      "image/png",
      "image/webp",
      "image/gif",
    ];
    for (const ct of types) {
      mockFetch.mockResolvedValueOnce(imgResponse(ct));
    }
    const b = mkBucket();
    const inputs = types.map(
      (_, i) => `https://cdn.com/${i}`,
    );
    const urls = await processImages("poi1", inputs, b);
    expect(urls).toHaveLength(4);
  });

  it("maps content type to correct extension", async () => {
    mockFetch.mockResolvedValue(
      imgResponse("image/png"),
    );
    const b = mkBucket();
    await processImages(
      "poi1", ["https://cdn.com/i"], b,
    );
    const path = b._file.mock.calls[0][0];
    expect(path).toContain(".png");
  });

  it("maps webp extension correctly", async () => {
    mockFetch.mockResolvedValue(
      imgResponse("image/webp"),
    );
    const b = mkBucket();
    await processImages(
      "poi1", ["https://cdn.com/i"], b,
    );
    const path = b._file.mock.calls[0][0];
    expect(path).toContain(".webp");
  });

  it("maps gif extension correctly", async () => {
    mockFetch.mockResolvedValue(
      imgResponse("image/gif"),
    );
    const b = mkBucket();
    await processImages(
      "poi1", ["https://cdn.com/i"], b,
    );
    const path = b._file.mock.calls[0][0];
    expect(path).toContain(".gif");
  });

  it("saves buffer with correct metadata", async () => {
    mockFetch.mockResolvedValue(imgResponse());
    const b = mkBucket();
    await processImages(
      "poi1", ["https://cdn.com/i.jpg"], b,
    );
    const saveCall = b._save.mock.calls[0];
    const meta = saveCall[1].metadata;
    expect(meta.contentType).toBe("image/jpeg");
    expect(
      meta.metadata.firebaseStorageDownloadTokens,
    ).toBe("test-uuid-1234");
  });

  it("continues after individual failure", async () => {
    mockFetch
      .mockRejectedValueOnce(new Error("timeout"))
      .mockResolvedValueOnce(imgResponse());
    const b = mkBucket();
    const urls = await processImages(
      "poi1",
      ["https://cdn.com/fail", "https://cdn.com/ok"],
      b,
    );
    expect(urls).toHaveLength(1);
  });

  it("returns empty array for empty input", async () => {
    const b = mkBucket();
    const urls = await processImages("poi1", [], b);
    expect(urls).toHaveLength(0);
  });

  it("handles content-type with charset", async () => {
    mockFetch.mockResolvedValue(
      imgResponse("image/jpeg; charset=utf-8"),
    );
    const b = mkBucket();
    const urls = await processImages(
      "poi1", ["https://cdn.com/i.jpg"], b,
    );
    // split(";")[0].trim() extracts "image/jpeg"
    expect(urls).toHaveLength(1);
  });

  it("logs truncated URL on failure", async () => {
    const longUrl = "https://cdn.com/" + "x".repeat(100);
    mockFetch.mockResolvedValue(
      {ok: false, status: 500},
    );
    const b = mkBucket();
    await processImages("poi1", [longUrl], b);
    const msg = mockLogger.warn.mock.calls[0][0];
    expect(msg).toContain("Image failed");
    // URL is sliced to 60 chars
    expect(msg.length).toBeLessThan(longUrl.length + 50);
  });

  it("handles non-Error thrown objects", async () => {
    mockFetch.mockRejectedValue("string error");
    const b = mkBucket();
    await processImages(
      "poi1", ["https://cdn.com/i.jpg"], b,
    );
    expect(mockLogger.warn).toHaveBeenCalledWith(
      expect.stringContaining("string error"),
    );
  });

  it("increments index correctly per success", async () => {
    mockFetch
      .mockRejectedValueOnce(new Error("fail"))
      .mockResolvedValueOnce(imgResponse())
      .mockResolvedValueOnce(imgResponse());
    const b = mkBucket();
    await processImages(
      "poi1",
      [
        "https://cdn.com/fail",
        "https://cdn.com/ok1",
        "https://cdn.com/ok2",
      ],
      b,
    );
    // Index is storageUrls.length at call time:
    // first success → index 0, second → index 1
    const p1 = b._file.mock.calls[0][0];
    const p2 = b._file.mock.calls[1][0];
    expect(p1).toContain("-enriched-0-");
    expect(p2).toContain("-enriched-1-");
  });
});
