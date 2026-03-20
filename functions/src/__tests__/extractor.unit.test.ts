/**
 * Unit tests for enrichment/extractor.ts — pure functions,
 * no mocks needed.
 */

import {extractProgrammatic} from "../enrichment/extractor";
import {ScrapedPage} from "../enrichment/types";

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
      expect(result.openingHours?.sunday).toEqual(
        {open: "09:00", close: "17:00"},
      );
      expect(result.openingHours?.friday).toEqual(
        {open: "09:00", close: "13:00"},
      );
      expect(result.openingHours?.saturday).toBeNull();
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
});
