/**
 * LLM-based extraction and verification using Claude API.
 *
 * - extractWithLLM: extracts unstructured fields (opening hours, price, whatsapp)
 * - verifyWithLLM: grounding check — verifies LLM-extracted data against source
 */

import fetch from "node-fetch";

const ANTHROPIC_API = "https://api.anthropic.com/v1/messages";
const ANTHROPIC_KEY = process.env.ANTHROPIC_API_KEY;
const MODEL = "claude-haiku-4-5-20251001";

// ─── Claude API helper ───────────────────────────────────────────────────────

async function callClaude(systemPrompt, userMessage) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 60000);

  const res = await fetch(ANTHROPIC_API, {
    method: "POST",
    headers: {
      "x-api-key": ANTHROPIC_KEY,
      "anthropic-version": "2023-06-01",
      "content-type": "application/json",
    },
    body: JSON.stringify({
      model: MODEL,
      max_tokens: 2048,
      system: systemPrompt,
      messages: [{ role: "user", content: userMessage }],
    }),
    signal: controller.signal,
  });

  clearTimeout(timeout);

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Claude API ${res.status}: ${body.slice(0, 300)}`);
  }

  const json = await res.json();
  return json.content?.[0]?.text || "";
}

function parseJsonResponse(text) {
  // Extract JSON from markdown code blocks if present
  const codeBlockMatch = text.match(/```(?:json)?\s*([\s\S]*?)```/);
  const jsonStr = codeBlockMatch ? codeBlockMatch[1].trim() : text.trim();
  return JSON.parse(jsonStr);
}

// ─── LLM Extraction ─────────────────────────────────────────────────────────

const EXTRACTION_SYSTEM = `You are a data extraction assistant. Extract structured data from website content.
Return ONLY valid JSON — no explanation, no markdown wrapping.
If a field cannot be found, use null.
All data must come from the provided text — never invent or guess values.`;

const EXTRACTION_PROMPT = `Extract the following fields from this website content. The website is for an Israeli business/point of interest.

Return JSON with these fields:
- "openingHours": object with keys "sunday","monday","tuesday","wednesday","thursday","friday","saturday". Each value is either {"open":"HH:MM","close":"HH:MM"} or null if closed/unknown that day.
  IMPORTANT rules for opening hours:
  - Parse Hebrew day names: ראשון=sunday, שני=monday, שלישי=tuesday, רביעי=wednesday, חמישי=thursday, שישי=friday, שבת=saturday.
  - Also parse א'=sunday, ב'=monday, ג'=tuesday, ד'=wednesday, ה'=thursday, ו'=friday.
  - Ranges like "א'-ה' 09:00-17:00" mean sunday through thursday.
  - CRITICAL: "בלילה" means AFTER MIDNIGHT (AM). "1 בלילה" = "01:00", "2 בלילה" = "02:00", "3 בלילה" = "03:00". These are NEVER PM. Do NOT use 23:00 or 22:00 for "1 בלילה".
  - "בצהריים" means noon/PM. "12 בצהריים" = "12:00".
  - When a business opens at noon and closes "בלילה", the closing time is ALWAYS after midnight (00:XX or 01:XX or 02:XX), NEVER 23:00.
  - Example: "פתוח בין 12 בצהריים ל1 בלילה" → open:"12:00", close:"01:00" (1 AM next day, NOT 23:00).
  - These are the GENERAL/regular opening hours of the business. Ignore special events, holiday hours, or one-time event times.
  - If the business is a hotel or accommodation, opening hours are usually not applicable — return all null.
- "price": free-text string describing pricing. MUST include context of what the price is for (e.g. "ארוחת צהריים החל מ-109₪", "כניסה: 80-120 ש\"ח", "כניסה חופשית"). Do NOT extract a price without its context. Return null if no clear pricing found.
- "whatsapp": WhatsApp phone number if explicitly mentioned as WhatsApp (Israeli format starting with 05), or null
- "description": a short Hebrew description of the business/point of interest (1-3 sentences). Extract from the website's "about us", intro section, or meta description. Return null if no suitable description found.
- "address": the full street address of the business (e.g. "רח' הרצל 42, תל אביב"), or null if not found

Website content:
---
{CONTENT}
---`;

/**
 * Post-process opening hours to fix "בלילה" misinterpretation.
 * LLMs often convert "1 בלילה" (1 AM) to 23:00 instead of 01:00.
 * If source text mentions "בלילה" and close times are 22:00/23:00, fix them.
 */
export function fixNightTimeErrors(hours, sourceText) {
  if (!sourceText.includes("בלילה")) return;

  // Extract the actual hour from "X בלילה" pattern
  const nightMatch = sourceText.match(/ל[-–]?\s*(\d{1,2})\s*בלילה/);
  if (!nightMatch) return;

  const nightHour = parseInt(nightMatch[1]);
  if (nightHour >= 6) return; // not a valid "night" hour, skip

  const correctClose = String(nightHour).padStart(2, "0") + ":00";

  for (const day of Object.keys(hours)) {
    if (!hours[day]) continue;
    const close = hours[day].close;
    // Fix if the LLM guessed 22:00 or 23:00 instead of the actual night hour
    if (close === "22:00" || close === "23:00" || close === "24:00") {
      hours[day].close = correctClose;
    }
  }
}

/**
 * Extract unstructured fields using Claude API.
 * Only used for fields that programmatic extraction can't handle well.
 *
 * @param {Array<{url, markdown, html}>} pages
 * @returns {object} extracted fields (openingHours, price, whatsapp)
 */
export async function extractWithLLM(pages) {
  // Use markdown content (cleaner for LLM)
  const content = pages.map(p => p.markdown).join("\n\n---\n\n").slice(0, 8000);

  try {
    const response = await callClaude(
      EXTRACTION_SYSTEM,
      EXTRACTION_PROMPT.replace("{CONTENT}", content),
    );

    const data = parseJsonResponse(response);

    return {
      openingHours: data.openingHours || null,
      price: data.price || null,
      whatsapp: data.whatsapp || null,
      description: data.description || null,
      address: data.address || null,
    };
  } catch (err) {
    console.warn(`    LLM extraction failed: ${err.message}`);
    return {
      openingHours: null, price: null, whatsapp: null,
      description: null, address: null,
    };
  }
}

// ─── LLM Verification ───────────────────────────────────────────────────────

const VERIFICATION_SYSTEM = `You are a data verification assistant. Your job is to check whether extracted data is supported by the source text.
For each field, find the EXACT text in the source that supports the extracted value.
Return ONLY valid JSON — no explanation.`;

const VERIFICATION_PROMPT = `Verify each extracted field against the source website content.

For each field in "extracted", check if the value can be found in or directly derived from the source text.
Return JSON with the same field names. For each field:
- If VERIFIED: include the field with its value
- If NOT verified (value not found in source): set to null

Extracted data:
{EXTRACTED}

Source content:
---
{CONTENT}
---`;

/**
 * Verify LLM-extracted data against source content.
 * Merges programmatic + LLM results, preferring programmatic (higher confidence).
 *
 * @param {Array<{url, markdown, html}>} pages
 * @param {object} allExtracted - merged programmatic + LLM extracted data
 * @param {object} programmatic - programmatic-only results (always trusted)
 * @returns {object} verified data
 */
export async function verifyWithLLM(pages, allExtracted, programmatic) {
  // Programmatic results are always trusted — no verification needed
  const verified = { ...programmatic };

  // Only verify LLM-extracted fields that aren't covered by programmatic extraction
  const llmOnlyFields = {};
  for (const [key, value] of Object.entries(allExtracted)) {
    if (value === null || value === undefined) continue;

    // Skip fields that programmatic extraction already found
    const progValue = programmatic[key];
    if (progValue !== null && progValue !== undefined) {
      if (!Array.isArray(progValue) || progValue.length > 0) continue;
    }

    llmOnlyFields[key] = value;
  }

  // If no LLM-only fields, skip verification
  if (Object.keys(llmOnlyFields).length === 0) {
    return verified;
  }

  // Layer A: Programmatic verification for specific fields
  const sourceText = pages.map(p => p.markdown).join("\n");

  if (llmOnlyFields.whatsapp) {
    // WhatsApp number must appear in source text
    const cleaned = llmOnlyFields.whatsapp.replace(/[\s-]/g, "");
    if (!sourceText.includes(cleaned) && !sourceText.replace(/[\s-]/g, "").includes(cleaned)) {
      llmOnlyFields.whatsapp = null;
    }
  }

  if (llmOnlyFields.openingHours && typeof llmOnlyFields.openingHours === "object") {
    // At least some time strings should appear in source
    const times = Object.values(llmOnlyFields.openingHours)
      .filter(v => v !== null)
      .flatMap(v => [v.open, v.close]);
    const foundInSource = times.filter(t => sourceText.includes(t));
    if (times.length > 0 && foundInSource.length === 0) {
      llmOnlyFields.openingHours = null;
    }
  }

  // Layer B: LLM verification for remaining unverified fields
  const fieldsNeedingLlmVerification = {};
  for (const [key, value] of Object.entries(llmOnlyFields)) {
    if (value !== null && value !== undefined) {
      fieldsNeedingLlmVerification[key] = value;
    }
  }

  if (Object.keys(fieldsNeedingLlmVerification).length > 0) {
    try {
      const content = pages.map(p => p.markdown).join("\n\n").slice(0, 6000);
      const response = await callClaude(
        VERIFICATION_SYSTEM,
        VERIFICATION_PROMPT
          .replace("{EXTRACTED}", JSON.stringify(fieldsNeedingLlmVerification, null, 2))
          .replace("{CONTENT}", content),
      );

      const verifiedByLlm = parseJsonResponse(response);

      // Merge LLM-verified fields
      for (const [key, value] of Object.entries(verifiedByLlm)) {
        if (value !== null && value !== undefined) {
          verified[key] = value;
        }
      }
    } catch (err) {
      console.warn(`    LLM verification failed: ${err.message}`);
      // On verification failure, don't include unverified LLM data
    }
  } else {
    // All LLM fields passed programmatic verification
    Object.assign(verified, llmOnlyFields);
  }

  return verified;
}

// ─── Image Ranking via Claude Vision ─────────────────────────────────────────

const IMAGE_RANKING_SYSTEM = `You are an image curator for a tourism/business directory. Your job is to select the best photos that represent a business or point of interest.

Return ONLY a JSON array of the image URLs you selected, in order of quality (best first). No explanation.`;

const IMAGE_RANKING_PROMPT = `Below are candidate images from a business website. Select the best photos (up to 5) for a tourism directory listing.

Rules:
- SKIP: logos, icons, UI elements, navigation graphics, transparent backgrounds, decorative borders, social media icons, payment method icons
- PREFER: photos of the venue, food, activities, scenery, people enjoying the place, interior/exterior shots
- PREFER: larger, higher quality images over small thumbnails
- Return the selected image URLs as a JSON array, best first
- If fewer than 5 good photos exist, return fewer

Business name: {NAME}`;

/**
 * Use Claude Vision to rank and select the best images from candidates.
 * Downloads images first and sends as base64 since many sites block direct URL access.
 *
 * @param {string[]} candidateUrls - all extracted image URLs
 * @param {string} poiName - name of the POI (helps Claude understand context)
 * @returns {string[]} top 5 image URLs ranked by quality
 */
export async function rankImagesWithVision(candidateUrls, poiName) {
  if (candidateUrls.length === 0) return [];
  if (candidateUrls.length <= 2) return candidateUrls;

  // Limit to 15 candidates
  const candidates = candidateUrls.slice(0, 15);

  // Download images and convert to base64
  const downloaded = [];
  for (const url of candidates) {
    try {
      const res = await fetch(url, { timeout: 10000 });
      if (!res.ok) continue;
      const contentType = res.headers.get("content-type")?.split(";")[0]?.trim();
      if (!contentType?.startsWith("image/")) continue;

      const buffer = await res.buffer();
      if (buffer.length < 1024 || buffer.length > 5 * 1024 * 1024) continue;

      const mediaType = contentType === "image/jpg" ? "image/jpeg" : contentType;
      downloaded.push({
        url,
        base64: buffer.toString("base64"),
        mediaType,
      });
    } catch {
      // Skip images that can't be downloaded
    }
  }

  if (downloaded.length === 0) return candidateUrls.slice(0, 5);
  if (downloaded.length <= 2) return downloaded.map(d => d.url);

  // Build message with base64 images for Claude Vision
  const content = [
    { type: "text", text: IMAGE_RANKING_PROMPT.replace("{NAME}", poiName) },
  ];

  for (let i = 0; i < downloaded.length; i++) {
    const d = downloaded[i];
    content.push({
      type: "image",
      source: { type: "base64", media_type: d.mediaType, data: d.base64 },
    });
    content.push({
      type: "text",
      text: `Image ${i + 1} URL: ${d.url}`,
    });
  }

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 90000);

    const res = await fetch(ANTHROPIC_API, {
      method: "POST",
      headers: {
        "x-api-key": ANTHROPIC_KEY,
        "anthropic-version": "2023-06-01",
        "content-type": "application/json",
      },
      body: JSON.stringify({
        model: MODEL,
        max_tokens: 1024,
        system: IMAGE_RANKING_SYSTEM,
        messages: [{ role: "user", content }],
      }),
      signal: controller.signal,
    });

    clearTimeout(timeout);

    if (!res.ok) {
      const body = await res.text();
      throw new Error(`Claude API ${res.status}: ${body.slice(0, 300)}`);
    }

    const json = await res.json();
    const text = json.content?.[0]?.text || "[]";
    const ranked = parseJsonResponse(text);

    if (!Array.isArray(ranked)) return downloaded.map(d => d.url).slice(0, 5);

    // Validate returned URLs are from our candidate list
    const downloadedUrls = downloaded.map(d => d.url);
    const validUrls = ranked.filter(url => downloadedUrls.includes(url));
    return validUrls.slice(0, 5);
  } catch (err) {
    console.warn(`    Image ranking failed: ${err.message}`);
    return downloaded.map(d => d.url).slice(0, 5);
  }
}
