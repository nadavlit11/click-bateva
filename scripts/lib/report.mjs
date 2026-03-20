/**
 * Report generation for the enrichment pipeline.
 *
 * Produces a JSON report (machine-readable) and a markdown summary (human-readable)
 * for review before applying changes to Firestore.
 */

import { readFileSync, writeFileSync } from "fs";

const REPORT_PATH = new URL("../output/enrichment-report.json", import.meta.url).pathname;
const SUMMARY_PATH = new URL("../output/enrichment-summary.md", import.meta.url).pathname;

/**
 * Build a report entry for one POI.
 * @param {string} poiId
 * @param {string} poiName
 * @param {string} website
 * @param {object} existingData - current Firestore field values
 * @param {object} extracted - all extracted data (before fill-only-empty filter)
 * @returns {object} report entry
 */
export function buildReportEntry(poiId, poiName, website, existingData, extracted) {
  const updates = {};
  const skipped = {};

  for (const [field, value] of Object.entries(extracted)) {
    if (value === null || value === undefined) continue;
    if (Array.isArray(value) && value.length === 0) continue;

    const existing = existingData[field];
    const isEmpty = existing === null || existing === undefined ||
      (Array.isArray(existing) && existing.length === 0) ||
      existing === "";

    if (isEmpty) {
      updates[field] = value;
    } else {
      skipped[field] = { extracted: value, existing };
    }
  }

  return { poiId, poiName, website, updates, skipped };
}

/**
 * Write the full report to disk.
 * @param {object[]} entries - array of report entries from buildReportEntry
 * @param {object} meta - run metadata (startedAt, totalPois, etc.)
 */
export function writeReport(entries, meta) {
  const report = { meta, entries };
  writeFileSync(REPORT_PATH, JSON.stringify(report, null, 2));
  console.log(`\nReport written to ${REPORT_PATH}`);

  // Generate markdown summary
  const lines = [
    "# POI Enrichment Report",
    "",
    `**Date:** ${meta.startedAt}`,
    `**Total POIs processed:** ${entries.length}`,
    `**POIs with updates:** ${entries.filter(e => Object.keys(e.updates).length > 0).length}`,
    `**POIs with no new data:** ${entries.filter(e => Object.keys(e.updates).length === 0).length}`,
    "",
    "---",
    "",
  ];

  for (const entry of entries) {
    const updateCount = Object.keys(entry.updates).length;
    const skipCount = Object.keys(entry.skipped).length;
    const icon = updateCount > 0 ? "+" : "-";

    lines.push(`## ${icon} ${entry.poiName} (${entry.poiId})`);
    lines.push(`**Website:** ${entry.website}`);
    lines.push("");

    if (updateCount > 0) {
      lines.push("**Will update:**");
      for (const [field, value] of Object.entries(entry.updates)) {
        const display = Array.isArray(value) ? `[${value.length} items]` : String(value).slice(0, 80);
        lines.push(`- \`${field}\`: ${display}`);
      }
      lines.push("");
    }

    if (skipCount > 0) {
      lines.push("**Skipped (field already populated):**");
      for (const field of Object.keys(entry.skipped)) {
        lines.push(`- \`${field}\``);
      }
      lines.push("");
    }

    if (updateCount === 0) {
      lines.push("_No new data to add._");
      lines.push("");
    }

    lines.push("---");
    lines.push("");
  }

  writeFileSync(SUMMARY_PATH, lines.join("\n"));
  console.log(`Summary written to ${SUMMARY_PATH}`);
}

/**
 * Load a previously saved report for the --apply phase.
 */
export function loadReport(path) {
  return JSON.parse(readFileSync(path, "utf8"));
}
