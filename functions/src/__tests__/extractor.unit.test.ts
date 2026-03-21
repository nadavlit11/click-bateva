/**
 * Unit tests for enrichment/extractor.ts — pure functions,
 * no mocks needed.
 */

import {
  extractProgrammatic, isLikelyUIImage,
} from "../enrichment/extractor";
import {ScrapedPage, DAY_KEYS, DayHours} from "../enrichment/types";

function makePage(html: string, url = "https://example.co.il"): ScrapedPage {
  return {url, html, markdown: "", metadata: {}};
}

describe("extractProgrammatic", () => {
  describe("phone extraction", () => {
    it("extracts Israeli mobile from tel: link", () => {
      const page = makePage(
        "<a href=\"tel:+972-52-1234567\">Call</a>",
      );
      const result = extractProgrammatic([page]);
      expect(result.phone).toBe("0521234567");
      expect(result.whatsapp).toBe("0521234567");
    });

    it("extracts Israeli landline from visible text", () => {
      const page = makePage(
        "<p>Phone: 04-6816000</p>",
      );
      const result = extractProgrammatic([page]);
      expect(result.phone).toBe("046816000");
    });

    it("prefers mobile for whatsapp", () => {
      const page = makePage(
        "<a href=\"tel:04-1234567\">Office</a>" +
        "<p>WhatsApp: 054-1234567</p>",
      );
      const result = extractProgrammatic([page]);
      expect(result.whatsapp).toBe("0541234567");
    });

    it("returns null when no phone found", () => {
      const page = makePage("<p>No phone here</p>");
      const result = extractProgrammatic([page]);
      expect(result.phone).toBeNull();
      expect(result.whatsapp).toBeNull();
    });
  });

  describe("email extraction", () => {
    it("extracts from mailto: link", () => {
      const page = makePage(
        "<a href=\"mailto:Info@Example.co.il\">Email</a>",
      );
      const result = extractProgrammatic([page]);
      expect(result.email).toBe("info@example.co.il");
    });

    it("extracts from visible text", () => {
      const page = makePage(
        "<p>Contact us at hello@business.com</p>",
      );
      const result = extractProgrammatic([page]);
      expect(result.email).toBe("hello@business.com");
    });

    it("filters out image file emails", () => {
      const page = makePage(
        "<p>bg@image.png user@real.com</p>",
      );
      const result = extractProgrammatic([page]);
      expect(result.email).toBe("user@real.com");
    });
  });

  describe("YouTube extraction", () => {
    it("extracts from watch URL", () => {
      const page = makePage(
        "<a href=\"https://www.youtube.com/watch?v=Ao9leZMMKdk\">",
      );
      const result = extractProgrammatic([page]);
      expect(result.videos).toEqual([
        "https://www.youtube.com/watch?v=Ao9leZMMKdk",
      ]);
    });

    it("extracts from embed iframe", () => {
      const page = makePage(
        "<iframe src=\"https://youtube.com/embed/dQw4w9WgXcQ\">",
      );
      const result = extractProgrammatic([page]);
      expect(result.videos).toEqual([
        "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
      ]);
    });

    it("deduplicates video IDs", () => {
      const page = makePage(
        "<a href=\"https://youtube.com/watch?v=abc12345678\">" +
        "<iframe src=\"https://youtube.com/embed/abc12345678\">",
      );
      const result = extractProgrammatic([page]);
      expect(result.videos).toHaveLength(1);
    });
  });

  describe("image extraction", () => {
    it("extracts og:image first", () => {
      const page = makePage(
        "<meta property=\"og:image\" content=\"/hero.jpg\">" +
        "<img src=\"/photo.jpg\">",
      );
      const result = extractProgrammatic([page]);
      expect(result.images[0]).toBe(
        "https://example.co.il/hero.jpg",
      );
    });

    it("skips SVG and data URIs", () => {
      const page = makePage(
        "<img src=\"icon.svg\">" +
        "<img src=\"data:image/png;base64,abc\">" +
        "<img src=\"/real.jpg\">",
      );
      const result = extractProgrammatic([page]);
      expect(result.images).toEqual([
        "https://example.co.il/real.jpg",
      ]);
    });

    it("extracts from CSS background-image", () => {
      const page = makePage(
        "<div style=\"background-image: url('/bg.jpg')\">",
      );
      const result = extractProgrammatic([page]);
      expect(result.images).toContain(
        "https://example.co.il/bg.jpg",
      );
    });

    it("extracts from data-src attributes", () => {
      const page = makePage(
        "<img data-src=\"/lazy.jpg\" src=\"placeholder.svg\">",
      );
      const result = extractProgrammatic([page]);
      expect(result.images).toContain(
        "https://example.co.il/lazy.jpg",
      );
    });

    it("skips tiny images by dimension", () => {
      const page = makePage(
        "<img src=\"/tiny.jpg\" width=\"20\" height=\"20\">" +
        "<img src=\"/big.jpg\" width=\"800\" height=\"600\">",
      );
      const result = extractProgrammatic([page]);
      expect(result.images).toEqual([
        "https://example.co.il/big.jpg",
      ]);
    });
  });

  describe("Facebook extraction", () => {
    it("extracts Facebook page URL", () => {
      const page = makePage(
        "<a href=\"https://www.facebook.com/MyBiz/\">FB</a>",
      );
      const result = extractProgrammatic([page]);
      expect(result.facebook).toBe(
        "https://www.facebook.com/MyBiz/",
      );
    });

    it("skips sharer links", () => {
      const page = makePage(
        "<a href=\"https://facebook.com/sharer/sharer.php\">" +
        "<a href=\"https://facebook.com/RealPage/\">",
      );
      const result = extractProgrammatic([page]);
      expect(result.facebook).toBe(
        "https://facebook.com/RealPage/",
      );
    });
  });

  describe("JSON-LD extraction", () => {
    it("extracts opening hours from schema.org", () => {
      const jsonLd = JSON.stringify({
        "@type": "Restaurant",
        "openingHoursSpecification": [
          {
            "dayOfWeek": "Sunday",
            "opens": "09:00",
            "closes": "17:00",
          },
          {
            "dayOfWeek": "Friday",
            "opens": "09:00",
            "closes": "13:00",
          },
        ],
      });
      const page = makePage(
        `<script type="application/ld+json">${jsonLd}</script>`,
      );
      const result = extractProgrammatic([page]);
      const rh = result.openingHours as Record<string, DayHours | null>;
      expect(rh?.sunday).toEqual(
        {open: "09:00", close: "17:00"},
      );
      expect(rh?.friday).toEqual(
        {open: "09:00", close: "13:00"},
      );
      expect(rh?.saturday).toBeNull();
    });

    it("extracts phone from JSON-LD", () => {
      const jsonLd = JSON.stringify({
        "@type": "LocalBusiness",
        "telephone": "+972-4-681-6000",
      });
      const page = makePage(
        `<script type="application/ld+json">${jsonLd}</script>`,
      );
      const result = extractProgrammatic([page]);
      expect(result.phone).toBe("046816000");
    });

    it("handles invalid JSON-LD gracefully", () => {
      const page = makePage(
        "<script type=\"application/ld+json\">{invalid}</script>",
      );
      const result = extractProgrammatic([page]);
      expect(result.phone).toBeNull();
    });
  });

  describe("Google Maps embed extraction", () => {
    it("extracts location from Maps embed", () => {
      const page = makePage(
        "<iframe src=\"https://google.com/maps?q=32.5,35.2\">",
      );
      const result = extractProgrammatic([page]);
      expect(result.location).toEqual({lat: 32.5, lng: 35.2});
    });
  });

  describe("multi-page extraction", () => {
    it("merges data across multiple pages", () => {
      const pages = [
        makePage("<p>Phone: 054-1234567</p>"),
        makePage(
          "<a href=\"mailto:info@biz.com\">Email</a>" +
          "<a href=\"https://facebook.com/biz/\">FB</a>",
        ),
      ];
      const result = extractProgrammatic(pages);
      expect(result.phone).toBe("0541234567");
      expect(result.email).toBe("info@biz.com");
      expect(result.facebook).toBe(
        "https://facebook.com/biz/",
      );
    });
  });

  describe("phone edge cases", () => {
    it("normalizes +972 prefix to 0", () => {
      const page = makePage(
        "<a href=\"tel:+972-52-1234567\">Call</a>",
      );
      const r = extractProgrammatic([page]);
      expect(r.phone?.[0]).toBe("0");
    });

    it("strips parentheses and spaces", () => {
      const page = makePage(
        "<a href=\"tel:(052) 123-4567\">Call</a>",
      );
      const r = extractProgrammatic([page]);
      expect(r.phone).toBe("0521234567");
    });

    it("rejects too-short phone numbers", () => {
      const page = makePage("<p>04-12345</p>");
      const r = extractProgrammatic([page]);
      // 7 digits after 0 → too short for landline
      expect(r.phone).toBeNull();
    });

    it("prefers JSON-LD phone over regex", () => {
      const jsonLd = JSON.stringify({
        "@type": "LocalBusiness",
        "telephone": "+972-4-681-6000",
      });
      const page = makePage(
        "<script type=\"application/ld+json\">" +
        `${jsonLd}</script>` +
        "<p>054-1234567</p>",
      );
      const r = extractProgrammatic([page]);
      expect(r.phone).toBe("046816000");
    });

    it("selects mobile for whatsapp", () => {
      const page = makePage(
        "<p>04-6816000 054-1234567</p>",
      );
      const r = extractProgrammatic([page]);
      expect(r.whatsapp).toBe("0541234567");
    });

    it("returns null whatsapp without mobile", () => {
      const page = makePage(
        "<a href=\"tel:04-6816000\">Call</a>",
      );
      const r = extractProgrammatic([page]);
      expect(r.whatsapp).toBeNull();
    });
  });

  describe("email edge cases", () => {
    it("lowercases mailto emails", () => {
      const page = makePage(
        "<a href=\"mailto:INFO@BIZ.COM\">Email</a>",
      );
      const r = extractProgrammatic([page]);
      expect(r.email).toBe("info@biz.com");
    });

    it("trims mailto emails", () => {
      const page = makePage(
        "<a href=\"mailto: info@biz.com \">Email</a>",
      );
      const r = extractProgrammatic([page]);
      expect(r.email).toBe("info@biz.com");
    });

    it("filters .jpg emails", () => {
      const page = makePage(
        "<p>icon@image.jpg user@real.com</p>",
      );
      const r = extractProgrammatic([page]);
      expect(r.email).toBe("user@real.com");
    });

    it("filters .example emails", () => {
      const page = makePage(
        "<p>test@example.com user@real.com</p>",
      );
      const r = extractProgrammatic([page]);
      expect(r.email).toBe("user@real.com");
    });
  });

  describe("JSON-LD edge cases", () => {
    it("extracts geo from address.geo", () => {
      const jsonLd = JSON.stringify({
        "@type": "Restaurant",
        "address": {
          "geo": {
            "latitude": "32.5",
            "longitude": "35.2",
          },
        },
      });
      const page = makePage(
        "<script type=\"application/ld+json\">" +
        `${jsonLd}</script>`,
      );
      const r = extractProgrammatic([page]);
      expect(r.location).toEqual(
        {lat: 32.5, lng: 35.2},
      );
    });

    it("extracts email from JSON-LD", () => {
      const jsonLd = JSON.stringify({
        "@type": "LocalBusiness",
        "email": "info@biz.com",
      });
      const page = makePage(
        "<script type=\"application/ld+json\">" +
        `${jsonLd}</script>`,
      );
      const r = extractProgrammatic([page]);
      expect(r.email).toBe("info@biz.com");
    });

    it("handles dayOfWeek as array", () => {
      const jsonLd = JSON.stringify({
        "@type": "Restaurant",
        "openingHoursSpecification": [{
          "dayOfWeek": ["Sunday", "Monday"],
          "opens": "09:00:00",
          "closes": "17:00:00",
        }],
      });
      const page = makePage(
        "<script type=\"application/ld+json\">" +
        `${jsonLd}</script>`,
      );
      const r = extractProgrammatic([page]);
      const h = r.openingHours as Record<string, DayHours | null>;
      expect(h?.sunday).toEqual(
        {open: "09:00", close: "17:00"},
      );
      expect(h?.monday).toEqual(
        {open: "09:00", close: "17:00"},
      );
    });

    it("slices time to 5 chars (HH:MM)", () => {
      const jsonLd = JSON.stringify({
        "@type": "Restaurant",
        "openingHoursSpecification": [{
          "dayOfWeek": "Sunday",
          "opens": "09:00:00",
          "closes": "17:00:00",
        }],
      });
      const page = makePage(
        "<script type=\"application/ld+json\">" +
        `${jsonLd}</script>`,
      );
      const r = extractProgrammatic([page]);
      const h2 = r.openingHours as Record<string, DayHours | null>;
      expect(h2?.sunday?.open).toBe("09:00");
      expect(h2?.sunday?.close).toBe(
        "17:00",
      );
    });

    it("handles schema.org URL day format", () => {
      const jsonLd = JSON.stringify({
        "@type": "Restaurant",
        "openingHoursSpecification": [{
          "dayOfWeek": "https://schema.org/friday",
          "opens": "09:00",
          "closes": "14:00",
        }],
      });
      const page = makePage(
        "<script type=\"application/ld+json\">" +
        `${jsonLd}</script>`,
      );
      const r = extractProgrammatic([page]);
      const h3 = r.openingHours as Record<string, DayHours | null>;
      expect(h3?.friday).toEqual(
        {open: "09:00", close: "14:00"},
      );
    });

    it("handles JSON-LD as array", () => {
      const jsonLd = JSON.stringify([{
        "@type": "LocalBusiness",
        "telephone": "+972-4-681-6000",
      }]);
      const page = makePage(
        "<script type=\"application/ld+json\">" +
        `${jsonLd}</script>`,
      );
      const r = extractProgrammatic([page]);
      expect(r.phone).toBe("046816000");
    });

    it("returns null hours when no spec has data", () => {
      const jsonLd = JSON.stringify({
        "@type": "Restaurant",
        "openingHoursSpecification": [{
          "dayOfWeek": "Sunday",
        }],
      });
      const page = makePage(
        "<script type=\"application/ld+json\">" +
        `${jsonLd}</script>`,
      );
      const r = extractProgrammatic([page]);
      expect(r.openingHours).toBeNull();
    });

    it("skips invalid geo coordinates", () => {
      const jsonLd = JSON.stringify({
        "@type": "LocalBusiness",
        "geo": {
          "latitude": "invalid",
          "longitude": "invalid",
        },
      });
      const page = makePage(
        "<script type=\"application/ld+json\">" +
        `${jsonLd}</script>`,
      );
      const r = extractProgrammatic([page]);
      expect(r.location).toBeNull();
    });
  });

  describe("map extraction edge cases", () => {
    it("returns null for no map embed", () => {
      const page = makePage("<div>No map</div>");
      const r = extractProgrammatic([page]);
      expect(r.location).toBeNull();
    });
  });

  describe("youtu.be extraction", () => {
    it("extracts from youtu.be short URL", () => {
      const page = makePage(
        "<a href=\"https://youtu.be/dQw4w9WgXcQ\">",
      );
      const r = extractProgrammatic([page]);
      expect(r.videos).toContain(
        "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
      );
    });
  });
});

// ── isLikelyUIImage (exported) ───────────────────

describe("isLikelyUIImage", () => {
  it("returns true for data: URIs", () => {
    expect(
      isLikelyUIImage("", "data:image/png;base64,x"),
    ).toBe(true);
  });

  it("returns true for .svg files", () => {
    expect(
      isLikelyUIImage("", "https://x.com/icon.svg"),
    ).toBe(true);
  });

  it("returns true for pixel tracking", () => {
    expect(
      isLikelyUIImage("", "https://x.com/pixel.gif"),
    ).toBe(true);
  });

  it("returns true for tracking images", () => {
    expect(
      isLikelyUIImage("", "https://x.com/tracking.gif"),
    ).toBe(true);
  });

  it("returns true for favicon", () => {
    expect(
      isLikelyUIImage("", "https://x.com/favicon.ico"),
    ).toBe(true);
  });

  it("returns true for small logo", () => {
    expect(
      isLikelyUIImage("", "https://x.com/logo-small.png"),
    ).toBe(true);
  });

  it("returns false for large logo", () => {
    expect(
      isLikelyUIImage("", "https://x.com/logo.png"),
    ).toBe(false);
  });

  it("returns true for width < 50", () => {
    expect(
      isLikelyUIImage(
        "<img src=\"x\" width=\"30\">",
        "https://x.com/img.jpg",
      ),
    ).toBe(true);
  });

  it("returns true for height < 50", () => {
    expect(
      isLikelyUIImage(
        "<img src=\"x\" height=\"20\">",
        "https://x.com/img.jpg",
      ),
    ).toBe(true);
  });

  it("returns false for width >= 50", () => {
    expect(
      isLikelyUIImage(
        "<img src=\"x\" width=\"50\">",
        "https://x.com/img.jpg",
      ),
    ).toBe(false);
  });

  it("returns false for height >= 50", () => {
    expect(
      isLikelyUIImage(
        "<img src=\"x\" height=\"100\">",
        "https://x.com/img.jpg",
      ),
    ).toBe(false);
  });

  it("returns false for normal images", () => {
    expect(
      isLikelyUIImage("", "https://x.com/photo.jpg"),
    ).toBe(false);
  });
});

// ── DAY_KEYS (types.ts) ─────────────────────────

describe("DAY_KEYS", () => {
  it("has 7 day keys", () => {
    expect(DAY_KEYS).toHaveLength(7);
  });

  it("includes sunday and saturday", () => {
    expect(DAY_KEYS).toContain("sunday");
    expect(DAY_KEYS).toContain("saturday");
  });

  it("includes all weekdays", () => {
    const expected = [
      "sunday", "monday", "tuesday",
      "wednesday", "thursday", "friday",
      "saturday",
    ];
    expect(DAY_KEYS).toEqual(expected);
  });
});
