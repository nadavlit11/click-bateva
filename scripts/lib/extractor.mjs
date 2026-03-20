/**
 * Programmatic data extraction — zero hallucination risk.
 *
 * Uses regex and HTML parsing to extract structured data from scraped pages.
 * Every value comes directly from the source HTML/text.
 */

// ─── Phone extraction (reuses pattern from import-kmz-data.mjs) ─────────────

const ISRAELI_MOBILE_RE = /0[5][0-9][-\s]?\d{3}[-\s]?\d{4}/g;
const ISRAELI_LANDLINE_RE = /0[2-9][-\s]?\d{7}/g;
const TEL_HREF_RE = /href=["']tel:([^"']+)["']/gi;

function extractPhones(html) {
  const phones = new Set();

  // From tel: links (highest confidence)
  let match;
  while ((match = TEL_HREF_RE.exec(html)) !== null) {
    const cleaned = match[1].replace(/[\s-()]/g, "").replace(/^\+972/, "0");
    if (cleaned.match(/^0[2-9]\d{7,8}$/)) phones.add(cleaned);
  }

  // From visible text
  const text = html.replace(/<[^>]+>/g, " ");
  for (const m of text.matchAll(ISRAELI_MOBILE_RE)) {
    phones.add(m[0].replace(/[\s-]/g, ""));
  }
  for (const m of text.matchAll(ISRAELI_LANDLINE_RE)) {
    const cleaned = m[0].replace(/[\s-]/g, "");
    // Avoid matching dates, IDs, etc. — basic sanity check
    if (cleaned.length >= 9 && cleaned.length <= 10) {
      phones.add(cleaned);
    }
  }

  return [...phones];
}

// ─── Email extraction ────────────────────────────────────────────────────────

const MAILTO_RE = /href=["']mailto:([^"'?]+)/gi;
const EMAIL_RE = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;

function extractEmails(html) {
  const emails = new Set();

  let match;
  while ((match = MAILTO_RE.exec(html)) !== null) {
    emails.add(match[1].toLowerCase().trim());
  }

  const text = html.replace(/<[^>]+>/g, " ");
  for (const m of text.matchAll(EMAIL_RE)) {
    const email = m[0].toLowerCase();
    // Filter out common false positives
    if (!email.endsWith(".png") && !email.endsWith(".jpg") && !email.includes("example.")) {
      emails.add(email);
    }
  }

  return [...emails];
}

// ─── YouTube video extraction ────────────────────────────────────────────────

const YOUTUBE_PATTERNS = [
  /(?:https?:\/\/)?(?:www\.)?youtube\.com\/watch\?v=([\w-]{11})/gi,
  /(?:https?:\/\/)?(?:www\.)?youtube\.com\/embed\/([\w-]{11})/gi,
  /(?:https?:\/\/)?youtu\.be\/([\w-]{11})/gi,
];

function extractYouTubeVideos(html) {
  const videoIds = new Set();

  for (const pattern of YOUTUBE_PATTERNS) {
    let match;
    while ((match = pattern.exec(html)) !== null) {
      videoIds.add(match[1]);
    }
  }

  return [...videoIds].map(id => `https://www.youtube.com/watch?v=${id}`);
}

// ─── Image extraction ────────────────────────────────────────────────────────

const IMG_SRC_RE = /<img\s[^>]*src=["']([^"']+)["'][^>]*>/gi;
const OG_IMAGE_RE = /<meta\s[^>]*property=["']og:image["'][^>]*content=["']([^"']+)["']/gi;

function extractImages(html, baseUrl) {
  const images = [];
  const seen = new Set();

  // og:image first (highest priority)
  let match;
  while ((match = OG_IMAGE_RE.exec(html)) !== null) {
    const url = resolveImageUrl(match[1], baseUrl);
    if (url && !seen.has(url)) {
      images.push({ url, source: "og:image", priority: 0 });
      seen.add(url);
    }
  }

  // Regular <img> tags
  while ((match = IMG_SRC_RE.exec(html)) !== null) {
    const url = resolveImageUrl(match[1], baseUrl);
    if (!url || seen.has(url)) continue;

    // Filter out tiny images, tracking pixels, common UI elements
    const fullTag = match[0].toLowerCase();
    if (isLikelyUIImage(fullTag, url)) continue;

    images.push({ url, source: "img", priority: 1 });
    seen.add(url);
  }

  return images
    .sort((a, b) => a.priority - b.priority)
    .map(img => img.url);
}

function isLikelyUIImage(imgTag, url) {
  const lower = url.toLowerCase();

  // Skip data URIs, SVGs, and tiny tracking pixels
  if (lower.startsWith("data:")) return true;
  if (lower.endsWith(".svg")) return true;
  if (lower.includes("pixel") || lower.includes("tracking")) return true;
  if (lower.includes("favicon")) return true;
  if (lower.includes("logo") && lower.includes("small")) return true;

  // Skip images with explicit small dimensions
  const widthMatch = imgTag.match(/width=["']?(\d+)/);
  const heightMatch = imgTag.match(/height=["']?(\d+)/);
  if (widthMatch && parseInt(widthMatch[1]) < 50) return true;
  if (heightMatch && parseInt(heightMatch[1]) < 50) return true;

  return false;
}

function resolveImageUrl(src, baseUrl) {
  if (!src || src.startsWith("data:")) return null;
  try {
    return new URL(src, baseUrl).href;
  } catch {
    return null;
  }
}

// ─── Facebook URL extraction ─────────────────────────────────────────────────

const FACEBOOK_RE = /https?:\/\/(?:www\.)?facebook\.com\/[a-zA-Z0-9.]+\/?/gi;

function extractFacebook(html) {
  const matches = html.matchAll(FACEBOOK_RE);
  const urls = new Set();
  for (const m of matches) {
    // Skip share/sharer links
    if (m[0].includes("sharer") || m[0].includes("share.php")) continue;
    urls.add(m[0]);
  }
  return [...urls][0] || null;
}

// ─── JSON-LD / schema.org extraction ─────────────────────────────────────────

const JSON_LD_RE = /<script\s+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi;

function extractJsonLd(html) {
  const results = { openingHours: null, location: null, phone: null, email: null };

  let match;
  while ((match = JSON_LD_RE.exec(html)) !== null) {
    try {
      const data = JSON.parse(match[1]);
      const items = Array.isArray(data) ? data : [data];

      for (const item of items) {
        // Opening hours
        if (item.openingHoursSpecification) {
          results.openingHours = parseSchemaOpeningHours(item.openingHoursSpecification);
        }

        // Location
        if (item.geo) {
          const lat = parseFloat(item.geo.latitude);
          const lng = parseFloat(item.geo.longitude);
          if (!isNaN(lat) && !isNaN(lng)) {
            results.location = { lat, lng };
          }
        }
        if (item.address?.geo) {
          const lat = parseFloat(item.address.geo.latitude);
          const lng = parseFloat(item.address.geo.longitude);
          if (!isNaN(lat) && !isNaN(lng)) {
            results.location = { lat, lng };
          }
        }

        // Phone
        if (item.telephone) {
          const cleaned = item.telephone.replace(/[\s-()]/g, "").replace(/^\+972/, "0");
          if (cleaned.match(/^0[2-9]\d{7,8}$/)) results.phone = cleaned;
        }

        // Email
        if (item.email) results.email = item.email;
      }
    } catch {
      // Invalid JSON-LD — skip
    }
  }

  return results;
}

const SCHEMA_DAY_MAP = {
  sunday: "sunday", monday: "monday", tuesday: "tuesday",
  wednesday: "wednesday", thursday: "thursday", friday: "friday",
  saturday: "saturday",
  // schema.org uses full URLs
  "https://schema.org/sunday": "sunday",
  "https://schema.org/monday": "monday",
  "https://schema.org/tuesday": "tuesday",
  "https://schema.org/wednesday": "wednesday",
  "https://schema.org/thursday": "thursday",
  "https://schema.org/friday": "friday",
  "https://schema.org/saturday": "saturday",
};

function parseSchemaOpeningHours(specs) {
  if (!Array.isArray(specs)) return null;

  const hours = {
    sunday: null, monday: null, tuesday: null, wednesday: null,
    thursday: null, friday: null, saturday: null,
  };

  for (const spec of specs) {
    const days = Array.isArray(spec.dayOfWeek) ? spec.dayOfWeek : [spec.dayOfWeek];
    const open = spec.opens?.slice(0, 5);   // "09:00"
    const close = spec.closes?.slice(0, 5); // "17:00"

    if (!open || !close) continue;

    for (const day of days) {
      const key = SCHEMA_DAY_MAP[day?.toLowerCase?.()];
      if (key) {
        hours[key] = { open, close };
      }
    }
  }

  // Only return if at least one day has hours
  const hasAny = Object.values(hours).some(v => v !== null);
  return hasAny ? hours : null;
}

// ─── Google Maps embed extraction ────────────────────────────────────────────

const MAPS_EMBED_RE = /google\.com\/maps[^"']*[@q]=(-?\d+\.?\d*),\s*(-?\d+\.?\d*)/gi;

function extractMapLocation(html) {
  const match = MAPS_EMBED_RE.exec(html);
  if (!match) return null;
  const lat = parseFloat(match[1]);
  const lng = parseFloat(match[2]);
  if (isNaN(lat) || isNaN(lng)) return null;
  return { lat, lng };
}

// ─── Main extraction function ────────────────────────────────────────────────

/**
 * Run all programmatic extractors across all scraped pages.
 *
 * @param {Array<{url, html, markdown, metadata}>} pages
 * @returns {object} extracted fields
 */
export function extractProgrammatic(pages) {
  const allHtml = pages.map(p => p.html).join("\n");
  const baseUrl = pages[0]?.url || "";

  // Run all extractors
  const phones = extractPhones(allHtml);
  const emails = extractEmails(allHtml);
  const videos = extractYouTubeVideos(allHtml);
  const images = extractImages(allHtml, baseUrl);
  const facebook = extractFacebook(allHtml);
  const jsonLd = extractJsonLd(allHtml);
  const mapLocation = extractMapLocation(allHtml);

  // Pick the best phone (prefer mobile for whatsapp)
  const mobile = phones.find(p => p.startsWith("05"));
  const landline = phones.find(p => !p.startsWith("05"));
  const bestPhone = jsonLd.phone || mobile || landline || phones[0] || null;

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
