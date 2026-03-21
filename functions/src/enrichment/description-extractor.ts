/**
 * Programmatic extraction from plain-text POI descriptions.
 *
 * Extracts structured contact data (phone, whatsapp, email)
 * from unstructured description text — no HTML parsing needed.
 */

// Kept in sync with extractor.ts
const ISRAELI_MOBILE_RE = /0[5][0-9][-\s]?\d{3}[-\s]?\d{4}/g;
const ISRAELI_LANDLINE_RE = /0[2-9][-\s]?\d{7}/g;
const EMAIL_RE =
  /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;

export interface DescriptionProgrammaticResult {
  phone: string | null;
  whatsapp: string | null;
  email: string | null;
}

/**
 * Extract contact details from a plain-text POI description.
 * @param {string} text Plain-text description string.
 * @return {DescriptionProgrammaticResult} Extracted fields.
 */
export function extractFromDescription(
  text: string,
): DescriptionProgrammaticResult {
  const mobiles: string[] = [];
  for (const m of text.matchAll(ISRAELI_MOBILE_RE)) {
    mobiles.push(m[0].replace(/[\s-]/g, ""));
  }

  const landlines: string[] = [];
  for (const m of text.matchAll(ISRAELI_LANDLINE_RE)) {
    const cleaned = m[0].replace(/[\s-]/g, "");
    if (cleaned.length >= 9 && cleaned.length <= 10) {
      landlines.push(cleaned);
    }
  }

  const emails: string[] = [];
  for (const m of text.matchAll(EMAIL_RE)) {
    const email = m[0].toLowerCase();
    if (
      !email.endsWith(".png") &&
      !email.endsWith(".jpg") &&
      !email.includes("example.")
    ) {
      emails.push(email);
    }
  }

  return {
    phone: mobiles[0] || landlines[0] || null,
    whatsapp: mobiles[0] || null,
    email: emails[0] || null,
  };
}
