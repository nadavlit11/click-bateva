/**
 * Unit tests for enrichment/description-extractor.ts — pure
 * functions, no mocks needed.
 */

import {extractFromDescription} from "../enrichment/description-extractor";

describe("extractFromDescription", () => {
  describe("phone extraction", () => {
    it("extracts Israeli mobile from plain text", () => {
      const result = extractFromDescription(
        "ליצירת קשר: 054-123-4567",
      );
      expect(result.phone).toBe("0541234567");
    });

    it("extracts Israeli landline from plain text", () => {
      const result = extractFromDescription(
        "טלפון משרד: 03-1234567",
      );
      expect(result.phone).toBe("031234567");
    });

    it("returns null when no phone found", () => {
      const result = extractFromDescription(
        "מסעדה ים תיכונית עם נוף מדהים",
      );
      expect(result.phone).toBeNull();
    });

    it("prefers mobile for whatsapp", () => {
      const result = extractFromDescription(
        "טל: 04-6816000. וואטסאפ: 052-9876543",
      );
      expect(result.whatsapp).toBe("0529876543");
      expect(result.phone).toBe("0529876543");
    });

    it("returns null whatsapp when only landline found", () => {
      const result = extractFromDescription(
        "טלפון: 04-6816000",
      );
      expect(result.whatsapp).toBeNull();
      expect(result.phone).toBe("046816000");
    });

    it("extracts mobile with spaces instead of dashes", () => {
      const result = extractFromDescription(
        "לפרטים 050 111 2222",
      );
      expect(result.phone).toBe("0501112222");
    });
  });

  describe("email extraction", () => {
    it("extracts email from plain text", () => {
      const result = extractFromDescription(
        "שלחו מייל ל Info@MyBusiness.co.il",
      );
      expect(result.email).toBe("info@mybusiness.co.il");
    });

    it("lowercases extracted email", () => {
      const result = extractFromDescription("Contact@MyBiz.co.il");
      expect(result.email).toBe("contact@mybiz.co.il");
    });

    it("filters out image-like email patterns", () => {
      const result = extractFromDescription(
        "image@photo.png and real@business.co.il",
      );
      expect(result.email).toBe("real@business.co.il");
    });

    it("filters out example. emails", () => {
      const result = extractFromDescription(
        "mail@example.com",
      );
      expect(result.email).toBeNull();
    });
  });

  describe("combined extraction", () => {
    it("returns all nulls for description with no contact data", () => {
      const result = extractFromDescription(
        "מסעדה משפחתית עם אוכל ים תיכוני. פתוחה בקיץ.",
      );
      expect(result.phone).toBeNull();
      expect(result.whatsapp).toBeNull();
      expect(result.email).toBeNull();
    });

    it("extracts phone and email together", () => {
      const result = extractFromDescription(
        "טל: 052-7654321. מייל: info@place.co.il",
      );
      expect(result.phone).toBe("0527654321");
      expect(result.whatsapp).toBe("0527654321");
      expect(result.email).toBe("info@place.co.il");
    });

    it("picks mobile over landline when both present", () => {
      const result = extractFromDescription(
        "משרד: 03-1234567. נייד: 054-9876543",
      );
      expect(result.phone).toBe("0549876543");
    });
  });
});
