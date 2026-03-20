/**
 * Cloud Function: enrichPoiFromWebsite
 *
 * Runs the enrichment pipeline server-side (API keys stay as
 * Firebase secrets). Returns extracted data for admin preview.
 * Does NOT write to Firestore — the admin reviews and saves.
 */

import {onCall, HttpsError} from "firebase-functions/v2/https";
import {defineSecret} from "firebase-functions/params";
import {getFirestore} from "firebase-admin/firestore";
import {getStorage} from "firebase-admin/storage";
import * as logger from "firebase-functions/logger";
import * as Sentry from "@sentry/node";

import {scrapeWebsite} from "./scraper";
import {extractProgrammatic} from "./extractor";
import {
  callClaude,
  extractWithLLM,
  verifyWithLLM,
  fixNightTimeErrors,
  rankImagesWithVision,
} from "./llm-extractor";
import {processImages} from "./image-processor";
import {
  DayHours, DayKey, EnrichmentResult, ProgrammaticResult,
} from "./types";

const firecrawlKey = defineSecret("FIRECRAWL_API_KEY");
const anthropicKey = defineSecret("ANTHROPIC_API_KEY");

const db = getFirestore();

interface LlmFields {
  openingHours: Record<DayKey, DayHours | null> | null;
  price: string | null;
  whatsapp: string | null;
}

/**
 * Merge programmatic + LLM results. Programmatic takes
 * precedence for openingHours and whatsapp. Price comes
 * only from LLM.
 * @param {ProgrammaticResult} prog Programmatic extraction.
 * @param {LlmFields} llm LLM extraction.
 * @return {Record<string, unknown>} Merged result.
 */
export function mergeResults(
  prog: ProgrammaticResult, llm: LlmFields,
): Record<string, unknown> {
  return {
    ...prog,
    openingHours: prog.openingHours || llm.openingHours,
    price: llm.price,
    whatsapp: prog.whatsapp || llm.whatsapp,
  };
}

/**
 * Format enrichment instructions data into a prompt string.
 * @param {Record<string, unknown>|undefined} data Firestore doc.
 * @return {string|undefined} Formatted instructions.
 */
export function formatInstructions(
  data: Record<string, unknown> | undefined,
): string | undefined {
  if (!data) return undefined;

  const parts: string[] = [];
  if (data.general) {
    parts.push(`General: ${data.general}`);
  }
  for (const [field, rule] of Object.entries(data)) {
    if (field === "general") continue;
    if (typeof rule === "string") {
      parts.push(`${field}: ${rule}`);
    }
  }
  return parts.length > 0 ? parts.join("\n") : undefined;
}

/**
 * Load enrichment instructions from Firestore.
 * @return {Promise<string|undefined>} Instructions string.
 */
async function loadInstructions(): Promise<string | undefined> {
  try {
    const doc = await db
      .doc("settings/enrichment_instructions").get();
    if (!doc.exists) return undefined;
    return formatInstructions(doc.data());
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    logger.warn(
      `Failed to load enrichment instructions: ${msg}`,
    );
    return undefined;
  }
}

/**
 * Callable Cloud Function: admin-only enrichment pipeline.
 * Scrapes a POI website, extracts structured data, ranks
 * images via Vision, and uploads images to Storage.
 * Returns EnrichmentResult for admin preview.
 */
export const enrichPoiFromWebsite = onCall(
  {
    cors: true,
    enforceAppCheck: true,
    timeoutSeconds: 300,
    memory: "512MiB",
    secrets: [firecrawlKey, anthropicKey],
  },
  async (request) => {
    // Auth guard
    if (!request.auth) {
      throw new HttpsError(
        "unauthenticated", "Must be authenticated.",
      );
    }
    if (request.auth.token.role !== "admin") {
      throw new HttpsError(
        "permission-denied", "Only admins can enrich POIs.",
      );
    }

    // Validate input
    const {website, poiName, poiId} = request.data as {
      website: unknown;
      poiName: unknown;
      poiId: unknown;
    };

    if (typeof website !== "string" || !website.trim()) {
      throw new HttpsError(
        "invalid-argument", "website is required.",
      );
    }
    if (typeof poiName !== "string" || !poiName.trim()) {
      throw new HttpsError(
        "invalid-argument", "poiName is required.",
      );
    }
    if (typeof poiId !== "string" || !poiId.trim()) {
      throw new HttpsError(
        "invalid-argument", "poiId is required.",
      );
    }

    try {
      logger.info(
        `Enriching POI "${poiName}" from ${website}`,
      );

      // Stage 1: Scrape website
      const scrapeResult = await scrapeWebsite(
        website.trim(), firecrawlKey.value(),
      );
      if (!scrapeResult.success || scrapeResult.pages.length === 0) {
        throw new HttpsError(
          "internal",
          `Scraping failed: ${scrapeResult.error || "no pages"}`,
        );
      }
      logger.info(
        `Scraped ${scrapeResult.pages.length} page(s)`,
      );

      // Stage 2: Programmatic extraction
      const programmatic = extractProgrammatic(
        scrapeResult.pages,
      );

      // Stage 3: LLM extraction
      const instructions = await loadInstructions();
      const llmResult = await extractWithLLM(
        scrapeResult.pages,
        anthropicKey.value(),
        instructions,
      );

      // Fix night time errors before verification
      if (llmResult.openingHours) {
        const sourceText = scrapeResult.pages
          .map((p) => p.markdown).join("\n");
        fixNightTimeErrors(llmResult.openingHours, sourceText);
      }

      // Stage 4: Merge + verify
      const merged = mergeResults(programmatic, llmResult);

      const verified = await verifyWithLLM(
        scrapeResult.pages,
        merged as unknown as Record<string, unknown>,
        programmatic as unknown as Record<string, unknown>,
        anthropicKey.value(),
      );

      // Stage 5: Image ranking via Vision
      const candidateImages =
        (verified.images as string[]) || programmatic.images;
      let rankedImages = candidateImages;
      if (candidateImages.length > 2) {
        rankedImages = await rankImagesWithVision(
          candidateImages,
          poiName.trim(),
          anthropicKey.value(),
        );
      }

      // Stage 6: Upload images to Firebase Storage
      const bucket = getStorage().bucket();
      const storageUrls = await processImages(
        poiId.trim(), rankedImages, bucket,
      );

      const result: EnrichmentResult = {
        phone: (verified.phone as string) || null,
        whatsapp: (verified.whatsapp as string) || null,
        email: (verified.email as string) || null,
        videos: (verified.videos as string[]) || [],
        images: storageUrls,
        facebook: (verified.facebook as string) || null,
        openingHours:
          (verified.openingHours as EnrichmentResult["openingHours"]) ||
          null,
        price: (verified.price as string) || null,
      };

      logger.info(
        `Enrichment complete: ${storageUrls.length} images, ` +
        `phone=${!!result.phone}, email=${!!result.email}`,
      );

      return result;
    } catch (err: unknown) {
      if (err instanceof HttpsError) throw err;
      const msg = err instanceof Error ? err.message : String(err);
      logger.error(`Enrichment failed: ${msg}`);
      Sentry.captureException(err);
      throw new HttpsError("internal", `Enrichment failed: ${msg}`);
    }
  },
);

// ── Self-improving feedback loop ─────────────────────────

/* eslint-disable max-len */
const INSTRUCTION_UPDATE_SYSTEM =
  "You are an AI that maintains extraction rules for a web scraping pipeline. " +
  "Given current rules and recent user feedback, update the rules to improve future extractions. " +
  "Return ONLY valid JSON with field keys (opening_hours, images, price, general) and string rule values. No explanation.";

const INSTRUCTION_UPDATE_PROMPT = `Here are the current extraction rules and recent user feedback for a POI enrichment pipeline.

Current rules:
{RULES}

Recent feedback (last 20 sessions):
{FEEDBACK}

Update the rules to address the feedback. Keep rules concise and actionable. Return JSON with keys: "general", "opening_hours", "images", "price", and any other fields mentioned in feedback. Each value is a short instruction string.`;
/* eslint-enable max-len */

/**
 * Callable Cloud Function: updates enrichment instructions
 * based on accumulated feedback. Called after feedback is
 * saved from the EnrichModal.
 */
export const updateEnrichmentInstructions = onCall(
  {
    cors: true,
    enforceAppCheck: true,
    timeoutSeconds: 60,
    secrets: [anthropicKey],
  },
  async (request) => {
    // Auth guard
    if (!request.auth) {
      throw new HttpsError(
        "unauthenticated", "Must be authenticated.",
      );
    }
    if (request.auth.token.role !== "admin") {
      throw new HttpsError(
        "permission-denied",
        "Only admins can update instructions.",
      );
    }

    try {
      // Load current instructions
      const instructionsDoc = await db
        .doc("settings/enrichment_instructions").get();
      const currentRules = instructionsDoc.exists ?
        instructionsDoc.data() : {};

      // Load last 20 feedback docs
      const feedbackSnap = await db
        .collection("enrichment_feedback")
        .orderBy("timestamp", "desc")
        .limit(20)
        .get();

      if (feedbackSnap.empty) {
        return {updated: false, reason: "No feedback yet"};
      }

      const feedback = feedbackSnap.docs.map((d) => {
        const data = d.data();
        return {
          appliedFields: data.appliedFields,
          skippedFields: data.skippedFields,
          fieldRatings: data.fieldRatings,
          note: data.note,
        };
      });

      // Call Claude to update instructions
      const response = await callClaude({
        systemPrompt: INSTRUCTION_UPDATE_SYSTEM,
        content: INSTRUCTION_UPDATE_PROMPT
          .replace(
            "{RULES}",
            JSON.stringify(currentRules, null, 2),
          )
          .replace(
            "{FEEDBACK}",
            JSON.stringify(feedback, null, 2),
          ),
        anthropicKey: anthropicKey.value(),
      });

      // Parse updated rules
      const codeBlockMatch =
        response.match(/```(?:json)?\s*([\s\S]*?)```/);
      const jsonStr = codeBlockMatch ?
        codeBlockMatch[1].trim() : response.trim();
      const updatedRules = JSON.parse(jsonStr);

      // Write back to Firestore
      await db
        .doc("settings/enrichment_instructions")
        .set(updatedRules);

      logger.info(
        "Enrichment instructions updated from feedback",
      );

      return {updated: true};
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      logger.error(
        `Instruction update failed: ${msg}`,
      );
      Sentry.captureException(err);
      throw new HttpsError(
        "internal", `Instruction update failed: ${msg}`,
      );
    }
  },
);
