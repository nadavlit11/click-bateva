/**
 * Unit tests for enrichment/scraper.ts
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
  discoverSubpages, scrapeWebsite,
} from "../enrichment/scraper";
import {ScrapedPage} from "../enrichment/types";

// Mock global fetch
const mockFetch = jest.fn();
// eslint-disable-next-line @typescript-eslint/no-explicit-any
(global as any).fetch = mockFetch;

// Instant setTimeout so tests don't wait 1s per sub-page
const origSetTimeout = global.setTimeout;
beforeAll(() => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (global as any).setTimeout = (fn: () => void) => {
    fn();
    return 0;
  };
});
afterAll(() => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (global as any).setTimeout = origSetTimeout;
});

// ── Helpers ──────────────────────────────────────

function makePage(
  html: string, url = "https://example.co.il",
): ScrapedPage {
  return {url, html, markdown: "", metadata: {}};
}

function firecrawlOk(
  url: string, html = "<html></html>",
) {
  return {
    ok: true,
    json: jest.fn().mockResolvedValue({
      success: true,
      data: {markdown: "content", html, metadata: {}},
    }),
  };
}

function firecrawlHttpErr(status: number, body: string) {
  return {
    ok: false,
    status,
    text: jest.fn().mockResolvedValue(body),
  };
}

function firecrawlApiErr() {
  return {
    ok: true,
    json: jest.fn().mockResolvedValue({
      success: false,
      error: "API error",
    }),
  };
}

// ── discoverSubpages ─────────────────────────────

describe("discoverSubpages", () => {
  const B = "https://example.co.il";

  it("finds contact by צור קשר", () => {
    const p = makePage("<a href=\"/c\">צור קשר</a>");
    const r = discoverSubpages(p, B);
    expect(r).toEqual([{url: `${B}/c`, type: "contact"}]);
  });

  it("finds contact by יצירת קשר", () => {
    const p = makePage("<a href=\"/r\">יצירת קשר</a>");
    expect(discoverSubpages(p, B)[0].type).toBe("contact");
  });

  it("finds contact by English text", () => {
    const p = makePage("<a href=\"/c\">contact</a>");
    expect(discoverSubpages(p, B)[0].type).toBe("contact");
  });

  it("finds gallery by גלריה", () => {
    const p = makePage("<a href=\"/g\">גלריה</a>");
    expect(discoverSubpages(p, B)[0].type).toBe("gallery");
  });

  it("finds gallery by גלריי", () => {
    const p = makePage("<a href=\"/g\">גלריי</a>");
    expect(discoverSubpages(p, B)[0].type).toBe("gallery");
  });

  it("finds gallery by תמונות", () => {
    const p = makePage("<a href=\"/p\">תמונות</a>");
    expect(discoverSubpages(p, B)[0].type).toBe("gallery");
  });

  it("finds gallery by English photos", () => {
    const p = makePage("<a href=\"/p\">photos</a>");
    expect(discoverSubpages(p, B)[0].type).toBe("gallery");
  });

  it("finds gallery by English gallery", () => {
    const p = makePage("<a href=\"/g\">gallery</a>");
    expect(discoverSubpages(p, B)[0].type).toBe("gallery");
  });

  it("finds about by אודות", () => {
    const p = makePage("<a href=\"/a\">אודות</a>");
    expect(discoverSubpages(p, B)[0].type).toBe("about");
  });

  it("finds about by מי אנחנו", () => {
    const p = makePage("<a href=\"/w\">מי אנחנו</a>");
    expect(discoverSubpages(p, B)[0].type).toBe("about");
  });

  it("finds about by English about", () => {
    const p = makePage("<a href=\"/a\">about</a>");
    expect(discoverSubpages(p, B)[0].type).toBe("about");
  });

  it("matches pattern in href URL", () => {
    const p = makePage(
      "<a href=\"/pages/contact\">Click</a>",
    );
    expect(discoverSubpages(p, B)[0].type).toBe("contact");
  });

  it("deduplicates by type", () => {
    const html =
      "<a href=\"/c1\">צור קשר</a>" +
      "<a href=\"/c2\">Contact</a>";
    const r = discoverSubpages(makePage(html), B);
    expect(r).toHaveLength(1);
  });

  it("strips inner HTML from link text", () => {
    const html =
      "<a href=\"/c\"><span>צור קשר</span></a>";
    expect(discoverSubpages(makePage(html), B)).toHaveLength(1);
  });

  it("skips # fragment links", () => {
    const html = "<a href=\"#contact\">Contact</a>";
    expect(discoverSubpages(makePage(html), B)).toHaveLength(0);
  });

  it("skips javascript: links", () => {
    const html =
      "<a href=\"javascript:void(0)\">Contact</a>";
    expect(discoverSubpages(makePage(html), B)).toHaveLength(0);
  });

  it("skips mailto: links", () => {
    const html =
      "<a href=\"mailto:x@y.com\">Contact</a>";
    expect(discoverSubpages(makePage(html), B)).toHaveLength(0);
  });

  it("skips tel: links", () => {
    const html = "<a href=\"tel:+97254\">Contact</a>";
    expect(discoverSubpages(makePage(html), B)).toHaveLength(0);
  });

  it("returns empty for empty HTML", () => {
    expect(discoverSubpages(makePage(""), B)).toHaveLength(0);
  });

  it("resolves relative URLs", () => {
    const html = "<a href=\"/sub/g\">Gallery</a>";
    const r = discoverSubpages(makePage(html), B);
    expect(r[0].url).toBe(`${B}/sub/g`);
  });

  it("preserves absolute URLs", () => {
    const html =
      "<a href=\"https://other.com/g\">Gallery</a>";
    const r = discoverSubpages(makePage(html), B);
    expect(r[0].url).toBe("https://other.com/g");
  });

  it("finds multiple sub-page types", () => {
    const html =
      "<a href=\"/c\">Contact</a>" +
      "<a href=\"/g\">Gallery</a>" +
      "<a href=\"/a\">About</a>";
    const r = discoverSubpages(makePage(html), B);
    expect(r).toHaveLength(3);
    const types = r.map((x) => x.type);
    expect(types).toContain("contact");
    expect(types).toContain("gallery");
    expect(types).toContain("about");
  });

  it("handles undefined html gracefully", () => {
    const page: ScrapedPage = {
      url: B,
      html: undefined as unknown as string,
      markdown: "",
      metadata: {},
    };
    expect(discoverSubpages(page, B)).toHaveLength(0);
  });
});

// ── scrapeWebsite ────────────────────────────────

describe("scrapeWebsite", () => {
  beforeEach(() => jest.clearAllMocks());

  it("strips protocol from input", async () => {
    mockFetch.mockResolvedValue(
      firecrawlOk("https://x.com"),
    );
    await scrapeWebsite("https://x.com", "key");
    const body = JSON.parse(
      mockFetch.mock.calls[0][1].body,
    );
    expect(body.url).toBe("https://x.com");
  });

  it("strips trailing slashes", async () => {
    mockFetch.mockResolvedValue(
      firecrawlOk("https://x.com"),
    );
    await scrapeWebsite("x.com///", "key");
    const body = JSON.parse(
      mockFetch.mock.calls[0][1].body,
    );
    expect(body.url).toBe("https://x.com");
  });

  it("returns success with homepage data", async () => {
    mockFetch.mockResolvedValue(
      firecrawlOk("https://x.com"),
    );
    const r = await scrapeWebsite("x.com", "key");
    expect(r.success).toBe(true);
    expect(r.pages).toHaveLength(1);
  });

  it("falls back to http when https fails", async () => {
    mockFetch
      .mockResolvedValueOnce(firecrawlHttpErr(500, "err"))
      .mockResolvedValueOnce(
        firecrawlOk("http://x.com"),
      );
    const r = await scrapeWebsite("x.com", "key");
    expect(r.success).toBe(true);
    expect(r.pages).toHaveLength(1);
  });

  it("returns failure when both protocols fail", async () => {
    const resp = firecrawlHttpErr(500, "err");
    mockFetch
      .mockResolvedValueOnce(resp)
      .mockResolvedValueOnce(resp);
    const r = await scrapeWebsite("x.com", "key");
    expect(r.success).toBe(false);
    expect(r.pages).toHaveLength(0);
  });

  it("includes error message on failure", async () => {
    const resp = firecrawlHttpErr(500, "server err");
    mockFetch
      .mockResolvedValueOnce(resp)
      .mockResolvedValueOnce(resp);
    const r = await scrapeWebsite("x.com", "key");
    expect(r.error).toContain("Firecrawl 500");
  });

  it("handles API returning unsuccessful", async () => {
    mockFetch
      .mockResolvedValueOnce(firecrawlApiErr())
      .mockResolvedValueOnce(firecrawlApiErr());
    const r = await scrapeWebsite("x.com", "key");
    expect(r.success).toBe(false);
  });

  it("handles Firecrawl unsuccessful error msg", async () => {
    const resp = {
      ok: true,
      json: jest.fn().mockResolvedValue({
        success: false,
      }),
    };
    mockFetch
      .mockResolvedValueOnce(resp)
      .mockResolvedValueOnce(resp);
    const r = await scrapeWebsite("x.com", "key");
    expect(r.error).toContain(
      "Firecrawl returned unsuccessful",
    );
  });

  it("handles fetch exception", async () => {
    mockFetch.mockRejectedValue(
      new Error("network error"),
    );
    const r = await scrapeWebsite("x.com", "key");
    expect(r.success).toBe(false);
    expect(r.error).toContain("Fetch error: network error");
  });

  it("scrapes discovered sub-pages", async () => {
    const contactHtml =
      "<a href=\"/contact\">צור קשר</a>";
    mockFetch
      .mockResolvedValueOnce(
        firecrawlOk("https://x.com", contactHtml),
      )
      .mockResolvedValueOnce(
        firecrawlOk("https://x.com/contact"),
      );
    const r = await scrapeWebsite("x.com", "key");
    expect(r.pages).toHaveLength(2);
    expect(r.pages[1].subpageType).toBe("contact");
  });

  it("logs sub-page discovery", async () => {
    const html = "<a href=\"/contact\">Contact</a>";
    mockFetch.mockResolvedValue(
      firecrawlOk("https://x.com", html),
    );
    await scrapeWebsite("x.com", "key");
    expect(mockLogger.info).toHaveBeenCalledWith(
      expect.stringContaining("Sub-page:"),
    );
  });

  it("limits sub-pages to 2", async () => {
    const html =
      "<a href=\"/c\">Contact</a>" +
      "<a href=\"/g\">Gallery</a>" +
      "<a href=\"/a\">About</a>";
    mockFetch.mockResolvedValue(
      firecrawlOk("https://x.com", html),
    );
    await scrapeWebsite("x.com", "key");
    // homepage(1) + max 2 sub-pages = 3 calls
    expect(mockFetch.mock.calls.length).toBeLessThanOrEqual(
      3,
    );
  });

  it("skips failed sub-page scrapes", async () => {
    const html = "<a href=\"/c\">Contact</a>";
    mockFetch
      .mockResolvedValueOnce(
        firecrawlOk("https://x.com", html),
      )
      .mockResolvedValueOnce(
        firecrawlHttpErr(404, "not found"),
      );
    const r = await scrapeWebsite("x.com", "key");
    expect(r.success).toBe(true);
    expect(r.pages).toHaveLength(1);
  });

  it("sends correct Authorization header", async () => {
    mockFetch.mockResolvedValue(
      firecrawlOk("https://x.com"),
    );
    await scrapeWebsite("x.com", "test-api-key");
    const headers = mockFetch.mock.calls[0][1].headers;
    expect(headers.Authorization).toBe(
      "Bearer test-api-key",
    );
  });

  it("sends correct Content-Type header", async () => {
    mockFetch.mockResolvedValue(
      firecrawlOk("https://x.com"),
    );
    await scrapeWebsite("x.com", "key");
    const headers = mockFetch.mock.calls[0][1].headers;
    expect(headers["Content-Type"]).toBe(
      "application/json",
    );
  });

  it("uses POST method", async () => {
    mockFetch.mockResolvedValue(
      firecrawlOk("https://x.com"),
    );
    await scrapeWebsite("x.com", "key");
    expect(mockFetch.mock.calls[0][1].method).toBe("POST");
  });

  it("handles non-Error thrown objects", async () => {
    mockFetch.mockRejectedValue("string error");
    const r = await scrapeWebsite("x.com", "key");
    expect(r.success).toBe(false);
    expect(r.error).toContain("Fetch error: string error");
  });

  it("returns default markdown/html for missing data", async () => {
    const resp = {
      ok: true,
      json: jest.fn().mockResolvedValue({
        success: true,
        data: {},
      }),
    };
    mockFetch.mockResolvedValue(resp);
    const r = await scrapeWebsite("x.com", "key");
    expect(r.pages[0].markdown).toBe("");
    expect(r.pages[0].html).toBe("");
  });
});
