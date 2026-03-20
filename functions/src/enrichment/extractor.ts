/**
 * Programmatic data extraction — zero hallucination risk.
 *
 * Uses regex and HTML parsing to extract structured data from
 * scraped pages. Every value comes directly from the source HTML.
 */

import {
  DayHours, DayKey, ScrapedPage, ProgrammaticResult,
} from "./types";

// ── Phone extraction ────────────────────────────────────────────

const ISRAELI_MOBILE_RE = /0[5][0-9][-\s]?\d{3}[-\s]?\d{4}/g;
const ISRAELI_LANDLINE_RE = /0[2-9][-\s]?\d{7}/g;
const TEL_HREF_RE = /href=["']tel:([^"']+)["']/gi;

function extractPhones(html: string): string[] {
  const phones = new Set<string>();

  let match: RegExpExecArray | null;
  while ((match = TEL_HREF_RE.exec(html)) !== null) {
    const cleaned = match[1]
      .replace(/[\s-()]/g, "")
      .replace(/^\+972/, "0");
    if (/^0[2-9]\d{7,8}$/.test(cleaned)) phones.add(cleaned);
  }

  const text = html.replace(/<[^>]+>/g, " ");
  for (const m of text.matchAll(ISRAELI_MOBILE_RE)) {
    phones.add(m[0].replace(/[\s-]/g, ""));
  }
  for (const m of text.matchAll(ISRAELI_LANDLINE_RE)) {
    const cleaned = m[0].replace(/[\s-]/g, "");
    if (cleaned.length >= 9 && cleaned.length <= 10) {
      phones.add(cleaned);
    }
  }

  return [...phones];
}

// ── Email extraction ────────────────────────────────────────────

const MAILTO_RE = /href=["']mailto:([^"'?]+)/gi;
const EMAIL_RE =
  /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;

function extractEmails(html: string): string[] {
  const emails = new Set<string>();

  let match: RegExpExecArray | null;
  while ((match = MAILTO_RE.exec(html)) !== null) {
    emails.add(match[1].toLowerCase().trim());
  }

  const text = html.replace(/<[^>]+>/g, " ");
  for (const m of text.matchAll(EMAIL_RE)) {
    const email = m[0].toLowerCase();
    if (
      !email.endsWith(".png") &&
      !email.endsWith(".jpg") &&
      !email.includes("example.")
    ) {
      emails.add(email);
    }
  }

  return [...emails];
}

// ── YouTube extraction ──────────────────────────────────────────

const YOUTUBE_PATTERNS = [
  /(?:https?:\/\/)?(?:www\.)?youtube\.com\/watch\?v=([\w-]{11})/gi,
  /(?:https?:\/\/)?(?:www\.)?youtube\.com\/embed\/([\w-]{11})/gi,
  /(?:https?:\/\/)?youtu\.be\/([\w-]{11})/gi,
];

function extractYouTubeVideos(html: string): string[] {
  const videoIds = new Set<string>();

  for (const pattern of YOUTUBE_PATTERNS) {
    let match: RegExpExecArray | null;
    while ((match = pattern.exec(html)) !== null) {
      videoIds.add(match[1]);
    }
  }

  return [...videoIds].map(
    (id) => `https://www.youtube.com/watch?v=${id}`,
  );
}

// ── Image extraction ────────────────────────────────────────────

const IMG_SRC_RE =
  /<img\s[^>]*src=["']([^"']+)["'][^>]*>/gi;
const OG_IMAGE_RE =
  // eslint-disable-next-line max-len
  /<meta\s[^>]*property=["']og:image["'][^>]*content=["']([^"']+)["']/gi;
const BG_IMAGE_RE =
  /background[-_]image:\s*url\(\s*['"]?([^'")\s]+)['"]?\s*\)/gi;
const DATA_SRC_RE =
  // eslint-disable-next-line max-len
  /(?:data-src|data-lazy-src|data-bg|data-image)=["']([^"']+)["']/gi;

interface ImageCandidate {
  url: string;
  source: string;
  priority: number;
}

function extractImages(
  html: string,
  baseUrl: string,
): string[] {
  const images: ImageCandidate[] = [];
  const seen = new Set<string>();

  let match: RegExpExecArray | null;

  // og:image (highest priority)
  while ((match = OG_IMAGE_RE.exec(html)) !== null) {
    const url = resolveImageUrl(match[1], baseUrl);
    if (url && !seen.has(url) && !isLikelyUIImage("", url)) {
      images.push({url, source: "og:image", priority: 0});
      seen.add(url);
    }
  }

  // Regular <img> tags
  while ((match = IMG_SRC_RE.exec(html)) !== null) {
    const url = resolveImageUrl(match[1], baseUrl);
    if (!url || seen.has(url)) continue;
    if (isLikelyUIImage(match[0].toLowerCase(), url)) continue;
    images.push({url, source: "img", priority: 1});
    seen.add(url);
  }

  // CSS background-image
  while ((match = BG_IMAGE_RE.exec(html)) !== null) {
    const url = resolveImageUrl(match[1], baseUrl);
    if (!url || seen.has(url)) continue;
    if (isLikelyUIImage("", url)) continue;
    images.push({url, source: "background-image", priority: 1});
    seen.add(url);
  }

  // Lazy-loaded images (data-src, data-bg, etc.)
  while ((match = DATA_SRC_RE.exec(html)) !== null) {
    const url = resolveImageUrl(match[1], baseUrl);
    if (!url || seen.has(url)) continue;
    if (isLikelyUIImage("", url)) continue;
    images.push({url, source: "data-src", priority: 1});
    seen.add(url);
  }

  return images
    .sort((a, b) => a.priority - b.priority)
    .map((img) => img.url);
}

export function isLikelyUIImage(
  imgTag: string,
  url: string,
): boolean {
  const lower = url.toLowerCase();
  if (lower.startsWith("data:")) return true;
  if (lower.endsWith(".svg")) return true;
  if (lower.includes("pixel") || lower.includes("tracking")) {
    return true;
  }
  if (lower.includes("favicon")) return true;
  if (lower.includes("logo") && lower.includes("small")) {
    return true;
  }

  const widthMatch = imgTag.match(/width=["']?(\d+)/);
  const heightMatch = imgTag.match(/height=["']?(\d+)/);
  if (widthMatch && parseInt(widthMatch[1]) < 50) return true;
  if (heightMatch && parseInt(heightMatch[1]) < 50) return true;

  return false;
}

function resolveImageUrl(
  src: string,
  baseUrl: string,
): string | null {
  if (!src || src.startsWith("data:")) return null;
  try {
    return new URL(src, baseUrl).href;
  } catch {
    return null;
  }
}

// ── Facebook extraction ─────────────────────────────────────────

const FACEBOOK_RE =
  /https?:\/\/(?:www\.)?facebook\.com\/[a-zA-Z0-9.]+\/?/gi;

function extractFacebook(html: string): string | null {
  const urls = new Set<string>();
  for (const m of html.matchAll(FACEBOOK_RE)) {
    if (
      m[0].includes("sharer") ||
      m[0].includes("share.php")
    ) continue;
    urls.add(m[0]);
  }
  return [...urls][0] || null;
}

// ── JSON-LD / schema.org extraction ─────────────────────────────

const JSON_LD_RE =
  // eslint-disable-next-line max-len
  /<script\s+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi;

interface JsonLdResult {
  openingHours: Record<DayKey, DayHours | null> | null;
  location: { lat: number; lng: number } | null;
  phone: string | null;
  email: string | null;
}

const SCHEMA_DAY_MAP: Record<string, DayKey> = {
  "sunday": "sunday", "monday": "monday",
  "tuesday": "tuesday", "wednesday": "wednesday",
  "thursday": "thursday", "friday": "friday",
  "saturday": "saturday",
  "https://schema.org/sunday": "sunday",
  "https://schema.org/monday": "monday",
  "https://schema.org/tuesday": "tuesday",
  "https://schema.org/wednesday": "wednesday",
  "https://schema.org/thursday": "thursday",
  "https://schema.org/friday": "friday",
  "https://schema.org/saturday": "saturday",
};

function extractJsonLd(html: string): JsonLdResult {
  const results: JsonLdResult = {
    openingHours: null,
    location: null,
    phone: null,
    email: null,
  };

  let match: RegExpExecArray | null;
  while ((match = JSON_LD_RE.exec(html)) !== null) {
    try {
      const data = JSON.parse(match[1]);
      const items = Array.isArray(data) ? data : [data];

      for (const item of items) {
        if (item.openingHoursSpecification) {
          results.openingHours = parseSchemaOpeningHours(
            item.openingHoursSpecification,
          );
        }

        if (item.geo) {
          const lat = parseFloat(item.geo.latitude);
          const lng = parseFloat(item.geo.longitude);
          if (!isNaN(lat) && !isNaN(lng)) {
            results.location = {lat, lng};
          }
        }
        if (item.address?.geo) {
          const lat = parseFloat(item.address.geo.latitude);
          const lng = parseFloat(item.address.geo.longitude);
          if (!isNaN(lat) && !isNaN(lng)) {
            results.location = {lat, lng};
          }
        }

        if (item.telephone) {
          const cleaned = item.telephone
            .replace(/[\s-()]/g, "")
            .replace(/^\+972/, "0");
          if (/^0[2-9]\d{7,8}$/.test(cleaned)) {
            results.phone = cleaned;
          }
        }

        if (item.email) results.email = item.email;
      }
    } catch {
      // Invalid JSON-LD — skip
    }
  }

  return results;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function parseSchemaOpeningHours(specs: any[]):
  Record<DayKey, DayHours | null> | null {
  if (!Array.isArray(specs)) return null;

  const hours: Record<DayKey, DayHours | null> = {
    sunday: null, monday: null, tuesday: null,
    wednesday: null, thursday: null, friday: null,
    saturday: null,
  };

  for (const spec of specs) {
    const days = Array.isArray(spec.dayOfWeek) ?
      spec.dayOfWeek : [spec.dayOfWeek];
    const open = spec.opens?.slice(0, 5) as string | undefined;
    const close = spec.closes?.slice(0, 5) as string | undefined;
    if (!open || !close) continue;

    for (const day of days) {
      const key = SCHEMA_DAY_MAP[day?.toLowerCase?.()];
      if (key) hours[key] = {open, close};
    }
  }

  const hasAny = Object.values(hours).some((v) => v !== null);
  return hasAny ? hours : null;
}

// ── Google Maps embed extraction ────────────────────────────────

const MAPS_EMBED_RE =
  // eslint-disable-next-line max-len
  /google\.com\/maps[^"']*[@q]=(-?\d+\.?\d*),\s*(-?\d+\.?\d*)/gi;

function extractMapLocation(
  html: string,
): { lat: number; lng: number } | null {
  const match = MAPS_EMBED_RE.exec(html);
  if (!match) return null;
  const lat = parseFloat(match[1]);
  const lng = parseFloat(match[2]);
  if (isNaN(lat) || isNaN(lng)) return null;
  return {lat, lng};
}

// ── Main extraction function ────────────────────────────────────

/**
 * Run all programmatic extractors across all scraped pages.
 * @param {ScrapedPage[]} pages Scraped page data.
 * @return {ProgrammaticResult} Extracted fields.
 */
export function extractProgrammatic(
  pages: ScrapedPage[],
): ProgrammaticResult {
  const allHtml = pages.map((p) => p.html).join("\n");
  const baseUrl = pages[0]?.url || "";

  const phones = extractPhones(allHtml);
  const emails = extractEmails(allHtml);
  const videos = extractYouTubeVideos(allHtml);
  const images = extractImages(allHtml, baseUrl);
  const facebook = extractFacebook(allHtml);
  const jsonLd = extractJsonLd(allHtml);
  const mapLocation = extractMapLocation(allHtml);

  const mobile = phones.find((p) => p.startsWith("05"));
  const landline = phones.find((p) => !p.startsWith("05"));
  const bestPhone =
    jsonLd.phone || mobile || landline || phones[0] || null;

  return {
    phone: bestPhone,
    whatsapp: mobile || null,
    email: jsonLd.email || emails[0] || null,
    videos,
    images,
    facebook,
    openingHours: jsonLd.openingHours,
    location: jsonLd.location || mapLocation,
  };
}
