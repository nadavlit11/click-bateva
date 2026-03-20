/**
 * POI Data Enrichment Pipeline
 *
 * Scrapes POI websites to extract phone, images, YouTube videos, opening hours,
 * and other structured data. Includes LLM extraction with verification to
 * eliminate hallucinations.
 *
 * Usage:
 *   # Dry run from CSV input (test on specific POIs)
 *   node scripts/enrich-pois.mjs --dry-run --input scripts/input/test-pois.csv
 *
 *   # Apply approved report to Firestore
 *   node scripts/enrich-pois.mjs --apply scripts/output/enrichment-report.json
 *
 *   # Full batch dry run (all POIs with websites)
 *   node scripts/enrich-pois.mjs --dry-run --all
 *
 *   # Resume interrupted run
 *   node scripts/enrich-pois.mjs --dry-run --all --resume
 *
 * Environment variables:
 *   GOOGLE_APPLICATION_CREDENTIALS  path to serviceAccount.json
 *   FIRECRAWL_API_KEY               Firecrawl API key
 *   ANTHROPIC_API_KEY               Claude API key
 */

import { readFileSync } from "fs";
import { initializeApp, cert } from "firebase-admin/app";
import { getFirestore, Timestamp } from "firebase-admin/firestore";
import { getStorage } from "firebase-admin/storage";
import { loadProgress, saveProgress, markCompleted, markFailed, isAlreadyProcessed } from "./lib/progress.mjs";
import { buildReportEntry, writeReport, loadReport } from "./lib/report.mjs";
import { scrapeWebsite } from "./lib/scraper.mjs";
import { extractProgrammatic } from "./lib/extractor.mjs";
import { extractWithLLM, verifyWithLLM, fixNightTimeErrors, rankImagesWithVision } from "./lib/llm-extractor.mjs";
import { processImages } from "./lib/image-processor.mjs";

// ─── CLI arg parsing ──────────────────────────────────────────────────────────

const args = process.argv.slice(2);
const isDryRun = args.includes("--dry-run");
const isApply = args.includes("--apply");
const isAll = args.includes("--all");
const isResume = args.includes("--resume");
const inputIndex = args.indexOf("--input");
const inputPath = inputIndex !== -1 ? args[inputIndex + 1] : null;
const applyIndex = args.indexOf("--apply");
const applyPath = applyIndex !== -1 ? args[applyIndex + 1] : null;

if (!isDryRun && !isApply) {
  console.error("Usage: node scripts/enrich-pois.mjs --dry-run [--input file.csv | --all] [--resume]");
  console.error("       node scripts/enrich-pois.mjs --apply <report.json>");
  process.exit(1);
}

if (isDryRun && !inputPath && !isAll) {
  console.error("--dry-run requires either --input <file.csv> or --all");
  process.exit(1);
}

if (isApply && !applyPath) {
  console.error("--apply requires a report JSON path");
  process.exit(1);
}

// ─── Validate env vars ───────────────────────────────────────────────────────

const credPath = process.env.GOOGLE_APPLICATION_CREDENTIALS;
if (!credPath) {
  console.error("GOOGLE_APPLICATION_CREDENTIALS env var is required");
  process.exit(1);
}

if (isDryRun) {
  if (!process.env.FIRECRAWL_API_KEY) {
    console.error("FIRECRAWL_API_KEY env var is required for scraping");
    process.exit(1);
  }
  if (!process.env.ANTHROPIC_API_KEY) {
    console.error("ANTHROPIC_API_KEY env var is required for LLM extraction");
    process.exit(1);
  }
}

// ─── Firebase init ───────────────────────────────────────────────────────────

const STORAGE_BUCKET = "click-bateva.firebasestorage.app";

initializeApp({ credential: cert(credPath), storageBucket: STORAGE_BUCKET });
const db = getFirestore();
const storage = getStorage();

// ─── CSV parsing ─────────────────────────────────────────────────────────────

function parseCsv(filePath) {
  const content = readFileSync(filePath, "utf8").trim();
  const lines = content.split("\n");
  const header = lines[0].split(",").map(h => h.trim().toLowerCase());

  // Accept both "poiId"/"website" and "id"/"link" headers
  const poiIdIdx = header.includes("poiid") ? header.indexOf("poiid") : header.indexOf("id");
  const websiteIdx = header.includes("website") ? header.indexOf("website") : header.indexOf("link");

  if (poiIdIdx === -1 || websiteIdx === -1) {
    console.error("CSV must have 'id'/'poiId' and 'link'/'website' columns");
    process.exit(1);
  }

  const entries = [];
  for (const line of lines.slice(1)) {
    if (!line.trim()) continue;
    const cols = line.split(",").map(c => c.trim());
    const poiId = cols[poiIdIdx];
    let website = cols[websiteIdx];

    // Strip protocol — scraper adds https:// itself
    website = website.replace(/^https?:\/\//, "").replace(/\/$/, "");

    if (!poiId) {
      console.warn(`  Skipping row with no POI ID (website: ${website})`);
      continue;
    }

    entries.push({ poiId, website });
  }

  return entries;
}

// ─── Load POI list ───────────────────────────────────────────────────────────

async function loadPoiList() {
  if (inputPath) {
    console.log(`Loading POIs from CSV: ${inputPath}`);
    const csvEntries = parseCsv(inputPath);
    console.log(`  Found ${csvEntries.length} POIs in CSV`);

    // Fetch existing data from Firestore for each POI
    const pois = [];
    for (const entry of csvEntries) {
      const doc = await db.collection("points_of_interest").doc(entry.poiId).get();
      if (!doc.exists) {
        console.warn(`  Warning: POI ${entry.poiId} not found in Firestore — skipping`);
        continue;
      }
      pois.push({
        id: entry.poiId,
        website: entry.website,
        data: doc.data(),
      });
    }
    return pois;
  }

  // --all mode: query all POIs with a website
  console.log("Loading all POIs with websites from Firestore...");
  const snapshot = await db.collection("points_of_interest")
    .where("website", "!=", null)
    .get();

  const pois = snapshot.docs
    .filter(doc => doc.data().website?.trim())
    .map(doc => ({
      id: doc.id,
      website: doc.data().website,
      data: doc.data(),
    }));

  console.log(`  Found ${pois.length} POIs with websites`);
  return pois;
}

// ─── Dry run mode ────────────────────────────────────────────────────────────

async function runDryRun() {
  const pois = await loadPoiList();
  const state = isResume ? loadProgress() : {
    startedAt: new Date().toISOString(),
    completedIds: [],
    failed: {},
    totalPois: pois.length,
  };

  if (!isResume) saveProgress(state);

  const reportEntries = [];
  let processed = 0;

  for (const poi of pois) {
    if (isResume && isAlreadyProcessed(state, poi.id)) {
      console.log(`  Skipping ${poi.data.name} (already processed)`);
      continue;
    }

    processed++;
    console.log(`\n[${processed}/${pois.length}] ${poi.data.name} — ${poi.website}`);

    try {
      // Stage 1: Scrape
      console.log("  Scraping...");
      const scrapeResult = await scrapeWebsite(poi.website);
      if (!scrapeResult.success) {
        console.log(`  Scrape failed: ${scrapeResult.error}`);
        markFailed(state, poi.id, scrapeResult.error);
        continue;
      }

      // Stage 2: Programmatic extraction
      console.log("  Extracting (programmatic)...");
      const programmatic = extractProgrammatic(scrapeResult.pages);

      // Stage 3: LLM extraction
      console.log("  Extracting (LLM)...");
      const llmExtracted = await extractWithLLM(scrapeResult.pages);

      // Stage 4: Verification
      console.log("  Verifying...");
      const verified = await verifyWithLLM(
        scrapeResult.pages,
        { ...programmatic, ...llmExtracted },
        programmatic,
      );

      // Post-process: fix "בלילה" misinterpretation after all LLM calls
      if (verified.openingHours && typeof verified.openingHours === "object") {
        const allMarkdown = scrapeResult.pages.map(p => p.markdown).join("\n");
        fixNightTimeErrors(verified.openingHours, allMarkdown);
      }

      // Stage 5: Image ranking via Claude Vision
      console.log("  Ranking images...");
      const candidateImages = programmatic.images || [];
      const rankedImages = await rankImagesWithVision(candidateImages, poi.data.name);

      const extracted = {
        ...verified,
        images: rankedImages, // ranked by Vision; --apply will upload
      };

      const entry = buildReportEntry(poi.id, poi.data.name, poi.website, poi.data, extracted);
      reportEntries.push(entry);

      const updateCount = Object.keys(entry.updates).length;
      console.log(`  Done: ${updateCount} fields to update`);

      markCompleted(state, poi.id);
    } catch (err) {
      console.error(`  Error: ${err.message}`);
      markFailed(state, poi.id, err.message);
    }

    // Rate limiting: 3s between POIs
    await sleep(3000);
  }

  writeReport(reportEntries, {
    startedAt: state.startedAt,
    totalPois: pois.length,
    processed,
    failed: Object.keys(state.failed).length,
  });
}

// ─── Apply mode ──────────────────────────────────────────────────────────────

async function runApply() {
  console.log(`Loading report from ${applyPath}`);
  const report = loadReport(applyPath);
  const entries = report.entries.filter(e => Object.keys(e.updates).length > 0);

  console.log(`${entries.length} POIs have updates to apply`);

  const bucket = storage.bucket();
  const batchSize = 400;

  for (let i = 0; i < entries.length; i += batchSize) {
    const batch = db.batch();
    const chunk = entries.slice(i, i + batchSize);

    for (const entry of chunk) {
      const updates = { ...entry.updates };

      // Upload images to Firebase Storage if present
      if (updates.images && updates.images.length > 0) {
        console.log(`  Uploading ${updates.images.length} images for ${entry.poiName}...`);
        const storageUrls = await processImages(
          entry.poiId,
          updates.images,
          bucket,
        );
        updates.images = storageUrls;
      }

      updates.updatedAt = Timestamp.now();
      const ref = db.collection("points_of_interest").doc(entry.poiId);
      batch.update(ref, updates);
      console.log(`  Queued update for ${entry.poiName} (${Object.keys(updates).length} fields)`);
    }

    await batch.commit();
    console.log(`  Batch ${Math.floor(i / batchSize) + 1} committed (${chunk.length} POIs)`);
  }

  console.log("\nDone! All updates applied.");
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// ─── Main ────────────────────────────────────────────────────────────────────

try {
  if (isDryRun) {
    await runDryRun();
  } else if (isApply) {
    await runApply();
  }
} catch (err) {
  console.error("\nFatal error:", err);
  process.exit(1);
}
