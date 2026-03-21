/**
 * Unit tests for enrichment/llm-extractor.ts
 */

// ── Mocks ────────────────────────────────────────

const mockLogger = {
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
  debug: jest.fn(),
};
jest.mock("firebase-functions/logger", () => mockLogger);

import {
  fixNightTimeErrors,
  callClaude,
  extractWithLLM,
  verifyWithLLM,
  rankImagesWithVision,
  extractFromDescriptionWithLLM,
} from "../enrichment/llm-extractor";
import {ScrapedPage} from "../enrichment/types";

// Mock global fetch
const mockFetch = jest.fn();
// eslint-disable-next-line @typescript-eslint/no-explicit-any
(global as any).fetch = mockFetch;

// ── Helpers ──────────────────────────────────────

function claudeOk(text: string) {
  return {
    ok: true,
    json: jest.fn().mockResolvedValue({
      content: [{text}],
    }),
  };
}

function claudeErr(status: number, body: string) {
  return {
    ok: false,
    status,
    text: jest.fn().mockResolvedValue(body),
  };
}

function mkPage(
  markdown = "content", url = "https://x.com",
): ScrapedPage {
  return {url, markdown, html: "", metadata: {}};
}

function mkImgResp(
  ct = "image/jpeg", size = 2000,
) {
  const buf = Buffer.alloc(size, "x");
  return {
    ok: true,
    headers: {get: jest.fn(() => ct)},
    arrayBuffer: jest.fn().mockResolvedValue(
      buf.buffer.slice(
        buf.byteOffset,
        buf.byteOffset + buf.byteLength,
      ),
    ),
  };
}

// ── fixNightTimeErrors ───────────────────────────

describe("fixNightTimeErrors", () => {
  it("fixes 23:00 → 01:00 for ל1 בלילה", () => {
    const h = {
      sunday: {open: "12:00", close: "23:00"},
      monday: {open: "12:00", close: "23:00"},
    };
    fixNightTimeErrors(
      h, "פתוח בין 12 בצהריים ל1 בלילה",
    );
    expect(h.sunday.close).toBe("01:00");
    expect(h.monday.close).toBe("01:00");
  });

  it("fixes 22:00 → 02:00 for ל2 בלילה", () => {
    const h = {sunday: {open: "18:00", close: "22:00"}};
    fixNightTimeErrors(h, "עד ל2 בלילה");
    expect(h.sunday.close).toBe("02:00");
  });

  it("fixes 24:00 → 03:00 for ל3 בלילה", () => {
    const h = {friday: {open: "20:00", close: "24:00"}};
    fixNightTimeErrors(h, "סוגר ל-3 בלילה");
    expect(h.friday.close).toBe("03:00");
  });

  it("handles dash: ל-1 בלילה", () => {
    const h = {thu: {open: "10:00", close: "23:00"}};
    fixNightTimeErrors(h, "פתוח ל-1 בלילה");
    expect(h.thu.close).toBe("01:00");
  });

  it("handles en-dash: ל–1 בלילה", () => {
    const h = {sun: {open: "12:00", close: "23:00"}};
    fixNightTimeErrors(h, "עד ל–1 בלילה");
    expect(h.sun.close).toBe("01:00");
  });

  it("does nothing without בלילה", () => {
    const h = {sun: {open: "09:00", close: "17:00"}};
    fixNightTimeErrors(h, "שעות: 09:00-17:00");
    expect(h.sun.close).toBe("17:00");
  });

  it("does nothing when night hour >= 6", () => {
    const h = {sun: {open: "12:00", close: "23:00"}};
    fixNightTimeErrors(h, "עד ל7 בלילה");
    expect(h.sun.close).toBe("23:00");
  });

  it("does not modify already correct times", () => {
    const h = {sun: {open: "12:00", close: "01:00"}};
    fixNightTimeErrors(h, "פתוח ל1 בלילה");
    expect(h.sun.close).toBe("01:00");
  });

  it("skips null days", () => {
    const h: Record<
      string, {open: string; close: string} | null
    > = {
      sun: null,
      mon: {open: "12:00", close: "23:00"},
    };
    fixNightTimeErrors(h, "סוגר ל1 בלילה");
    expect(h.sun).toBeNull();
    expect(h.mon!.close).toBe("01:00");
  });

  it("leaves 21:00 alone", () => {
    const h = {sun: {open: "12:00", close: "21:00"}};
    fixNightTimeErrors(h, "עד ל1 בלילה");
    expect(h.sun.close).toBe("21:00");
  });

  it("does nothing without ל pattern match", () => {
    const h = {sun: {open: "12:00", close: "23:00"}};
    fixNightTimeErrors(h, "פתוח בלילה בלבד");
    expect(h.sun.close).toBe("23:00");
  });

  it("zero-pads single digit hours", () => {
    const h = {sun: {open: "12:00", close: "23:00"}};
    fixNightTimeErrors(h, "ל1 בלילה");
    expect(h.sun.close).toBe("01:00");
  });
});

// ── callClaude ───────────────────────────────────

describe("callClaude", () => {
  beforeEach(() => jest.clearAllMocks());

  it("returns response text on success", async () => {
    mockFetch.mockResolvedValue(claudeOk("hello"));
    const r = await callClaude({
      systemPrompt: "sys",
      content: "test",
      anthropicKey: "key",
    });
    expect(r).toBe("hello");
  });

  it("throws on API error with status and body", async () => {
    mockFetch.mockResolvedValue(
      claudeErr(429, "rate limited"),
    );
    await expect(callClaude({
      systemPrompt: "sys",
      content: "test",
      anthropicKey: "key",
    })).rejects.toThrow(
      "Claude API 429: rate limited",
    );
  });

  it("returns empty string when no content", async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: jest.fn().mockResolvedValue({}),
    });
    const r = await callClaude({
      systemPrompt: "sys",
      content: "test",
      anthropicKey: "key",
    });
    expect(r).toBe("");
  });

  it("sends correct headers and body", async () => {
    mockFetch.mockResolvedValue(claudeOk("ok"));
    await callClaude({
      systemPrompt: "system",
      content: "user input",
      anthropicKey: "my-key",
      maxTokens: 500,
    });
    const [url, opts] = mockFetch.mock.calls[0];
    expect(url).toBe(
      "https://api.anthropic.com/v1/messages",
    );
    expect(opts.headers["x-api-key"]).toBe("my-key");
    expect(opts.headers["anthropic-version"]).toBe(
      "2023-06-01",
    );
    const body = JSON.parse(opts.body);
    expect(body.max_tokens).toBe(500);
    expect(body.system).toBe("system");
    expect(body.messages[0].content).toBe("user input");
  });

  it("uses default maxTokens of 2048", async () => {
    mockFetch.mockResolvedValue(claudeOk("ok"));
    await callClaude({
      systemPrompt: "sys",
      content: "test",
      anthropicKey: "key",
    });
    const body = JSON.parse(
      mockFetch.mock.calls[0][1].body,
    );
    expect(body.max_tokens).toBe(2048);
  });

  it("slices error body to 300 chars", async () => {
    const longBody = "x".repeat(500);
    mockFetch.mockResolvedValue(
      claudeErr(500, longBody),
    );
    try {
      await callClaude({
        systemPrompt: "sys",
        content: "test",
        anthropicKey: "key",
      });
    } catch (e: unknown) {
      const msg = (e as Error).message;
      // "Claude API 500: " (16 chars) + 300 chars
      expect(msg).toHaveLength(16 + 300);
    }
  });
});

// ── extractWithLLM ───────────────────────────────

describe("extractWithLLM", () => {
  beforeEach(() => jest.clearAllMocks());

  it("returns parsed extraction result", async () => {
    const data = {
      openingHours: {
        sunday: {open: "09:00", close: "17:00"},
      },
      price: "כניסה: 50₪",
      whatsapp: "0521234567",
      description: "מסעדה",
      address: "רח' הרצל 1",
    };
    mockFetch.mockResolvedValue(
      claudeOk(JSON.stringify(data)),
    );
    const r = await extractWithLLM([mkPage()], "key");
    expect(r.price).toBe("כניסה: 50₪");
    expect(r.whatsapp).toBe("0521234567");
    expect(r.description).toBe("מסעדה");
    expect(r.address).toBe("רח' הרצל 1");
    expect(r.openingHours?.sunday).toEqual(
      {open: "09:00", close: "17:00"},
    );
  });

  it("returns nulls on API failure", async () => {
    mockFetch.mockResolvedValue(
      claudeErr(500, "error"),
    );
    const r = await extractWithLLM([mkPage()], "key");
    expect(r.openingHours).toBeNull();
    expect(r.price).toBeNull();
    expect(r.whatsapp).toBeNull();
    expect(r.description).toBeNull();
    expect(r.address).toBeNull();
  });

  it("logs warning on failure", async () => {
    mockFetch.mockResolvedValue(
      claudeErr(500, "bad"),
    );
    await extractWithLLM([mkPage()], "key");
    expect(mockLogger.warn).toHaveBeenCalledWith(
      expect.stringContaining("LLM extraction failed"),
    );
  });

  it("handles JSON in code block", async () => {
    const resp = "```json\n{\"price\": \"50₪\"}\n```";
    mockFetch.mockResolvedValue(claudeOk(resp));
    const r = await extractWithLLM([mkPage()], "key");
    expect(r.price).toBe("50₪");
  });

  it("appends instructions to system prompt", async () => {
    const nullResult = JSON.stringify({
      openingHours: null,
      price: null,
      whatsapp: null,
      description: null,
      address: null,
    });
    mockFetch.mockResolvedValue(claudeOk(nullResult));
    await extractWithLLM(
      [mkPage()], "key", "Extra rule",
    );
    const body = JSON.parse(
      mockFetch.mock.calls[0][1].body,
    );
    expect(body.system).toContain("Extra rule");
  });

  it("does not append when no instructions", async () => {
    const nullResult = JSON.stringify({
      openingHours: null,
      price: null,
      whatsapp: null,
      description: null,
      address: null,
    });
    mockFetch.mockResolvedValue(claudeOk(nullResult));
    await extractWithLLM([mkPage()], "key");
    const body = JSON.parse(
      mockFetch.mock.calls[0][1].body,
    );
    expect(body.system).not.toContain(
      "Additional instructions",
    );
  });

  it("joins multiple pages with separator", async () => {
    const nullResult = JSON.stringify({
      openingHours: null,
      price: null,
      whatsapp: null,
      description: null,
      address: null,
    });
    mockFetch.mockResolvedValue(claudeOk(nullResult));
    await extractWithLLM(
      [mkPage("page1"), mkPage("page2")], "key",
    );
    const body = JSON.parse(
      mockFetch.mock.calls[0][1].body,
    );
    const content = body.messages[0].content;
    expect(content).toContain("page1");
    expect(content).toContain("page2");
  });

  it("returns null for missing fields", async () => {
    mockFetch.mockResolvedValue(
      claudeOk(JSON.stringify({})),
    );
    const r = await extractWithLLM([mkPage()], "key");
    expect(r.openingHours).toBeNull();
    expect(r.price).toBeNull();
  });

  it("handles invalid JSON gracefully", async () => {
    mockFetch.mockResolvedValue(
      claudeOk("not json at all"),
    );
    const r = await extractWithLLM([mkPage()], "key");
    expect(r.openingHours).toBeNull();
    expect(r.price).toBeNull();
    expect(mockLogger.warn).toHaveBeenCalled();
  });

  it("handles non-Error thrown objects", async () => {
    mockFetch.mockRejectedValue("string error");
    const r = await extractWithLLM([mkPage()], "key");
    expect(r.price).toBeNull();
    expect(mockLogger.warn).toHaveBeenCalledWith(
      expect.stringContaining("string error"),
    );
  });
});

// ── verifyWithLLM ────────────────────────────────

describe("verifyWithLLM", () => {
  beforeEach(() => jest.clearAllMocks());

  it("preserves programmatic results", async () => {
    const prog = {phone: "054-1234567"};
    const ext = {phone: "054-1234567"};
    const r = await verifyWithLLM(
      [mkPage()], ext, prog, "key",
    );
    expect(r.phone).toBe("054-1234567");
  });

  it("skips when all covered by prog", async () => {
    const prog = {phone: "054"};
    const ext = {phone: "054"};
    const r = await verifyWithLLM(
      [mkPage()], ext, prog, "key",
    );
    expect(mockFetch).not.toHaveBeenCalled();
    expect(r.phone).toBe("054");
  });

  it("skips null/undefined extracted values", async () => {
    const r = await verifyWithLLM(
      [mkPage()],
      {phone: null, email: undefined},
      {},
      "key",
    );
    expect(mockFetch).not.toHaveBeenCalled();
    expect(r).toEqual({});
  });

  it("verifies LLM-only fields via Claude", async () => {
    mockFetch.mockResolvedValue(
      claudeOk(JSON.stringify({price: "50₪"})),
    );
    const r = await verifyWithLLM(
      [mkPage("מחיר: 50₪")],
      {price: "50₪"},
      {},
      "key",
    );
    expect(r.price).toBe("50₪");
  });

  it("nullifies whatsapp not found in source", async () => {
    const r = await verifyWithLLM(
      [mkPage("no phone here")],
      {whatsapp: "0521111111"},
      {},
      "key",
    );
    // whatsapp nullified → no more fields → else branch
    expect(r.whatsapp).toBeNull();
  });

  it("keeps whatsapp found in source text", async () => {
    mockFetch.mockResolvedValue(
      claudeOk(
        JSON.stringify({whatsapp: "0521111111"}),
      ),
    );
    const r = await verifyWithLLM(
      [mkPage("call 052-111-1111")],
      {whatsapp: "0521111111"},
      {},
      "key",
    );
    expect(r.whatsapp).toBe("0521111111");
  });

  it("finds whatsapp after stripping spaces", async () => {
    mockFetch.mockResolvedValue(
      claudeOk(
        JSON.stringify({whatsapp: "0521111111"}),
      ),
    );
    const r = await verifyWithLLM(
      [mkPage("call 052 111 1111")],
      {whatsapp: "0521111111"},
      {},
      "key",
    );
    expect(r.whatsapp).toBe("0521111111");
  });

  it("nullifies hours when no times in source", async () => {
    const hours = {
      sunday: {open: "09:00", close: "17:00"},
    };
    const r = await verifyWithLLM(
      [mkPage("no times")],
      {openingHours: hours},
      {},
      "key",
    );
    // openingHours nullified → no more fields → else
    expect(r.openingHours).toBeNull();
  });

  it("keeps hours when times found in source", async () => {
    const hours = {
      sunday: {open: "09:00", close: "17:00"},
    };
    mockFetch.mockResolvedValue(
      claudeOk(
        JSON.stringify({openingHours: hours}),
      ),
    );
    const r = await verifyWithLLM(
      [mkPage("Open 09:00 to 17:00")],
      {openingHours: hours},
      {},
      "key",
    );
    expect(r.openingHours).toEqual(hours);
  });

  it("falls back on LLM verification failure", async () => {
    mockFetch.mockResolvedValue(
      claudeErr(500, "error"),
    );
    const r = await verifyWithLLM(
      [mkPage("price: 50₪")],
      {price: "50₪"},
      {},
      "key",
    );
    expect(r.price).toBeUndefined();
    expect(mockLogger.warn).toHaveBeenCalledWith(
      expect.stringContaining(
        "LLM verification failed",
      ),
    );
  });

  it("skips prog fields with non-empty arrays", async () => {
    const r = await verifyWithLLM(
      [mkPage()],
      {images: ["other.jpg"]},
      {images: ["img.jpg"]},
      "key",
    );
    expect(mockFetch).not.toHaveBeenCalled();
    expect(r.images).toEqual(["img.jpg"]);
  });

  it("verifies when prog array is empty", async () => {
    mockFetch.mockResolvedValue(
      claudeOk(
        JSON.stringify({images: ["new.jpg"]}),
      ),
    );
    const r = await verifyWithLLM(
      [mkPage()],
      {images: ["new.jpg"]},
      {images: []},
      "key",
    );
    expect(r.images).toEqual(["new.jpg"]);
  });

  it("hits else branch when all llmOnly nullified", async () => {
    // whatsapp NOT found → nullified
    // hours times NOT found → nullified
    // needsLlmVerify empty → else branch
    const hours = {
      sunday: {open: "09:00", close: "17:00"},
    };
    const r = await verifyWithLLM(
      [mkPage("no relevant data")],
      {whatsapp: "0521111111", openingHours: hours},
      {},
      "key",
    );
    expect(mockFetch).not.toHaveBeenCalled();
    expect(r.whatsapp).toBeNull();
    expect(r.openingHours).toBeNull();
  });

  it("handles non-Error in verification catch", async () => {
    mockFetch.mockRejectedValue("string error");
    const r = await verifyWithLLM(
      [mkPage()],
      {price: "50₪"},
      {},
      "key",
    );
    expect(r.price).toBeUndefined();
    expect(mockLogger.warn).toHaveBeenCalledWith(
      expect.stringContaining("string error"),
    );
  });
});

// ── rankImagesWithVision ─────────────────────────

describe("rankImagesWithVision", () => {
  beforeEach(() => jest.clearAllMocks());

  it("returns empty for no candidates", async () => {
    const r = await rankImagesWithVision([], "P", "k");
    expect(r).toEqual([]);
  });

  it("returns as-is for 1 candidate", async () => {
    const urls = ["https://a.com/1.jpg"];
    const r = await rankImagesWithVision(urls, "P", "k");
    expect(r).toEqual(urls);
    expect(mockFetch).not.toHaveBeenCalled();
  });

  it("returns as-is for 2 candidates", async () => {
    const urls = [
      "https://a.com/1.jpg",
      "https://a.com/2.jpg",
    ];
    const r = await rankImagesWithVision(urls, "P", "k");
    expect(r).toEqual(urls);
    expect(mockFetch).not.toHaveBeenCalled();
  });

  it("downloads and ranks via Vision", async () => {
    const urls = [
      "https://a.com/1.jpg",
      "https://a.com/2.jpg",
      "https://a.com/3.jpg",
    ];
    mockFetch
      .mockResolvedValueOnce(mkImgResp())
      .mockResolvedValueOnce(mkImgResp())
      .mockResolvedValueOnce(mkImgResp())
      .mockResolvedValueOnce(
        claudeOk(JSON.stringify([
          "https://a.com/3.jpg",
          "https://a.com/1.jpg",
        ])),
      );
    const r = await rankImagesWithVision(
      urls, "Test", "key",
    );
    expect(r).toEqual([
      "https://a.com/3.jpg",
      "https://a.com/1.jpg",
    ]);
  });

  it("falls back when all downloads fail", async () => {
    const urls = [
      "https://a.com/1.jpg",
      "https://a.com/2.jpg",
      "https://a.com/3.jpg",
    ];
    mockFetch.mockResolvedValue(
      {ok: false, status: 404},
    );
    const r = await rankImagesWithVision(
      urls, "P", "key",
    );
    expect(r).toEqual(urls.slice(0, 5));
  });

  it("returns downloaded URLs when <= 2 succeed", async () => {
    const urls = [
      "https://a.com/1.jpg",
      "https://a.com/2.jpg",
      "https://a.com/3.jpg",
    ];
    mockFetch
      .mockResolvedValueOnce(mkImgResp())
      .mockResolvedValueOnce({ok: false, status: 404})
      .mockResolvedValueOnce({ok: false, status: 404});
    const r = await rankImagesWithVision(
      urls, "P", "key",
    );
    expect(r).toEqual(["https://a.com/1.jpg"]);
  });

  it("skips non-image content types", async () => {
    const urls = [
      "https://a.com/1.jpg",
      "https://a.com/2.html",
      "https://a.com/3.jpg",
    ];
    mockFetch
      .mockResolvedValueOnce(mkImgResp())
      .mockResolvedValueOnce({
        ok: true,
        headers: {get: jest.fn(() => "text/html")},
      })
      .mockResolvedValueOnce(mkImgResp());
    const r = await rankImagesWithVision(
      urls, "P", "key",
    );
    // 2 downloaded (<=2) → return directly
    expect(r).toHaveLength(2);
  });

  it("skips null content type", async () => {
    const urls = [
      "https://a.com/1.jpg",
      "https://a.com/2.jpg",
      "https://a.com/3.jpg",
    ];
    mockFetch
      .mockResolvedValueOnce(mkImgResp())
      .mockResolvedValueOnce({
        ok: true,
        headers: {get: jest.fn(() => null)},
      })
      .mockResolvedValueOnce(mkImgResp());
    const r = await rankImagesWithVision(
      urls, "P", "key",
    );
    expect(r).toHaveLength(2);
  });

  it("skips too-small images (<1KB)", async () => {
    const urls = [
      "https://a.com/1.jpg",
      "https://a.com/2.jpg",
      "https://a.com/3.jpg",
    ];
    mockFetch
      .mockResolvedValueOnce(mkImgResp("image/jpeg", 500))
      .mockResolvedValueOnce(mkImgResp())
      .mockResolvedValueOnce(mkImgResp());
    const r = await rankImagesWithVision(
      urls, "P", "key",
    );
    // 2 valid (<=2) → return directly
    expect(r).toHaveLength(2);
    expect(r).not.toContain("https://a.com/1.jpg");
  });

  it("skips too-large images (>5MB)", async () => {
    const urls = [
      "https://a.com/1.jpg",
      "https://a.com/2.jpg",
      "https://a.com/3.jpg",
    ];
    const bigSize = 6 * 1024 * 1024;
    mockFetch
      .mockResolvedValueOnce(
        mkImgResp("image/jpeg", bigSize),
      )
      .mockResolvedValueOnce(mkImgResp())
      .mockResolvedValueOnce(mkImgResp());
    const r = await rankImagesWithVision(
      urls, "P", "key",
    );
    expect(r).toHaveLength(2);
  });

  it("normalizes image/jpg to image/jpeg", async () => {
    const urls = [
      "https://a.com/1.jpg",
      "https://a.com/2.jpg",
      "https://a.com/3.jpg",
    ];
    mockFetch
      .mockResolvedValueOnce(mkImgResp("image/jpg"))
      .mockResolvedValueOnce(mkImgResp("image/jpg"))
      .mockResolvedValueOnce(mkImgResp("image/jpg"))
      .mockResolvedValueOnce(
        claudeOk(JSON.stringify([
          "https://a.com/1.jpg",
        ])),
      );
    const r = await rankImagesWithVision(
      urls, "P", "key",
    );
    // Check media_type in Vision request
    const body = JSON.parse(
      mockFetch.mock.calls[3][1].body,
    );
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const img = body.messages[0].content.find(
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (c: any) => c.type === "image",
    );
    expect(img.source.media_type).toBe("image/jpeg");
    expect(r).toEqual(["https://a.com/1.jpg"]);
  });

  it("falls back on ranking failure", async () => {
    const urls = [
      "https://a.com/1.jpg",
      "https://a.com/2.jpg",
      "https://a.com/3.jpg",
    ];
    mockFetch
      .mockResolvedValueOnce(mkImgResp())
      .mockResolvedValueOnce(mkImgResp())
      .mockResolvedValueOnce(mkImgResp())
      .mockResolvedValueOnce(claudeErr(500, "error"));
    const r = await rankImagesWithVision(
      urls, "P", "key",
    );
    expect(r).toHaveLength(3);
    expect(mockLogger.warn).toHaveBeenCalledWith(
      expect.stringContaining("Image ranking failed"),
    );
  });

  it("falls back when response is not array", async () => {
    const urls = [
      "https://a.com/1.jpg",
      "https://a.com/2.jpg",
      "https://a.com/3.jpg",
    ];
    mockFetch
      .mockResolvedValueOnce(mkImgResp())
      .mockResolvedValueOnce(mkImgResp())
      .mockResolvedValueOnce(mkImgResp())
      .mockResolvedValueOnce(
        claudeOk(JSON.stringify({not: "array"})),
      );
    const r = await rankImagesWithVision(
      urls, "P", "key",
    );
    expect(r).toHaveLength(3);
  });

  it("filters ranked to only downloaded URLs", async () => {
    const urls = [
      "https://a.com/1.jpg",
      "https://a.com/2.jpg",
      "https://a.com/3.jpg",
    ];
    mockFetch
      .mockResolvedValueOnce(mkImgResp())
      .mockResolvedValueOnce(mkImgResp())
      .mockResolvedValueOnce(mkImgResp())
      .mockResolvedValueOnce(
        claudeOk(JSON.stringify([
          "https://a.com/1.jpg",
          "https://fake.com/x.jpg",
        ])),
      );
    const r = await rankImagesWithVision(
      urls, "P", "key",
    );
    expect(r).toEqual(["https://a.com/1.jpg"]);
  });

  it("limits ranked output to 5", async () => {
    const urls = Array.from(
      {length: 8},
      (_, i) => `https://a.com/${i}.jpg`,
    );
    for (let i = 0; i < 8; i++) {
      mockFetch.mockResolvedValueOnce(mkImgResp());
    }
    mockFetch.mockResolvedValueOnce(
      claudeOk(JSON.stringify(urls)),
    );
    const r = await rankImagesWithVision(
      urls, "P", "key",
    );
    expect(r.length).toBeLessThanOrEqual(5);
  });

  it("logs debug for download failures", async () => {
    const urls = [
      "https://a.com/1.jpg",
      "https://a.com/2.jpg",
      "https://a.com/3.jpg",
    ];
    mockFetch
      .mockRejectedValueOnce(new Error("timeout"))
      .mockResolvedValueOnce({ok: false, status: 404})
      .mockResolvedValueOnce({ok: false, status: 404});
    await rankImagesWithVision(urls, "P", "key");
    expect(mockLogger.debug).toHaveBeenCalledWith(
      expect.stringContaining("Image download skipped"),
    );
  });

  it("limits candidates to 15", async () => {
    const urls = Array.from(
      {length: 20},
      (_, i) => `https://a.com/${i}.jpg`,
    );
    mockFetch.mockResolvedValue(
      {ok: false, status: 404},
    );
    await rankImagesWithVision(urls, "P", "key");
    expect(mockFetch.mock.calls.length).toBe(15);
  });

  it("includes POI name in prompt", async () => {
    const urls = [
      "https://a.com/1.jpg",
      "https://a.com/2.jpg",
      "https://a.com/3.jpg",
    ];
    mockFetch
      .mockResolvedValueOnce(mkImgResp())
      .mockResolvedValueOnce(mkImgResp())
      .mockResolvedValueOnce(mkImgResp())
      .mockResolvedValueOnce(
        claudeOk(JSON.stringify([])),
      );
    await rankImagesWithVision(
      urls, "My POI", "key",
    );
    const body = JSON.parse(
      mockFetch.mock.calls[3][1].body,
    );
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const txt = body.messages[0].content.find(
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (c: any) =>
        c.type === "text" &&
        c.text.includes("My POI"),
    );
    expect(txt).toBeDefined();
  });

  it("handles non-Error in download catch", async () => {
    const urls = [
      "https://a.com/1.jpg",
      "https://a.com/2.jpg",
      "https://a.com/3.jpg",
    ];
    mockFetch
      .mockRejectedValueOnce("string error")
      .mockResolvedValueOnce({ok: false, status: 404})
      .mockResolvedValueOnce({ok: false, status: 404});
    await rankImagesWithVision(urls, "P", "key");
    expect(mockLogger.debug).toHaveBeenCalledWith(
      expect.stringContaining("string error"),
    );
  });
});

// ── extractFromDescriptionWithLLM ────────────────

describe("extractFromDescriptionWithLLM", () => {
  beforeEach(() => jest.clearAllMocks());

  it("returns parsed extraction result with cleanedDescription", async () => {
    const data = {
      openingHours: {
        sunday: {open: "09:00", close: "17:00"},
        monday: null, tuesday: null, wednesday: null,
        thursday: null, friday: null, saturday: null,
      },
      price: "כניסה 80₪",
      whatsapp: "0521234567",
      phone: "0521234567",
      address: "רח' הרצל 1, תל אביב",
      minPeople: "10",
      maxPeople: "30",
      cleanedDescription: "מסעדה ים תיכונית עם נוף מדהים",
    };
    mockFetch.mockResolvedValue(claudeOk(JSON.stringify(data)));
    const r = await extractFromDescriptionWithLLM(
      "מסעדה ים תיכונית. טל 052-123-4567. כניסה 80₪.",
      "key",
    );
    expect(r.price).toBe("כניסה 80₪");
    expect(r.phone).toBe("0521234567");
    expect(r.description).toBeNull();
    expect(r.minPeople).toBe("10");
    expect(r.maxPeople).toBe("30");
    expect(r.cleanedDescription).toBe(
      "מסעדה ים תיכונית עם נוף מדהים",
    );
    expect(r.openingHours?.sunday).toEqual(
      {open: "09:00", close: "17:00"},
    );
  });

  it("returns all nulls on API failure", async () => {
    mockFetch.mockResolvedValue(claudeErr(500, "error"));
    const r = await extractFromDescriptionWithLLM("text", "key");
    expect(r.openingHours).toBeNull();
    expect(r.price).toBeNull();
    expect(r.phone).toBeNull();
    expect(r.minPeople).toBeNull();
    expect(r.maxPeople).toBeNull();
    expect(r.cleanedDescription).toBeNull();
    expect(r.description).toBeNull();
  });

  it("logs warning on failure", async () => {
    mockFetch.mockResolvedValue(claudeErr(500, "bad"));
    await extractFromDescriptionWithLLM("text", "key");
    expect(mockLogger.warn).toHaveBeenCalledWith(
      expect.stringContaining("Description LLM extraction failed"),
    );
  });

  it("handles JSON in code block", async () => {
    const resp = "```json\n{\"price\": \"50₪\"}\n```";
    mockFetch.mockResolvedValue(claudeOk(resp));
    const r = await extractFromDescriptionWithLLM("text", "key");
    expect(r.price).toBe("50₪");
  });

  it("appends instructions to system prompt", async () => {
    const nullResult = JSON.stringify({
      openingHours: null, price: null, whatsapp: null,
      phone: null, address: null, minPeople: null,
      maxPeople: null, cleanedDescription: null,
    });
    mockFetch.mockResolvedValue(claudeOk(nullResult));
    await extractFromDescriptionWithLLM("text", "key", "Extra rule");
    const body = JSON.parse(mockFetch.mock.calls[0][1].body);
    expect(body.system).toContain("Extra rule");
  });

  it("converts numeric minPeople/maxPeople to strings", async () => {
    const data = {
      openingHours: null, price: null, whatsapp: null,
      phone: null, address: null, cleanedDescription: null,
      minPeople: 5, maxPeople: 20,
    };
    mockFetch.mockResolvedValue(claudeOk(JSON.stringify(data)));
    const r = await extractFromDescriptionWithLLM("text", "key");
    expect(r.minPeople).toBe("5");
    expect(r.maxPeople).toBe("20");
  });

  it("always returns description: null", async () => {
    const data = {
      openingHours: null, price: null, whatsapp: null,
      phone: null, address: null, minPeople: null,
      maxPeople: null, cleanedDescription: null,
      description: "should be ignored",
    };
    mockFetch.mockResolvedValue(claudeOk(JSON.stringify(data)));
    const r = await extractFromDescriptionWithLLM("text", "key");
    expect(r.description).toBeNull();
  });
});
