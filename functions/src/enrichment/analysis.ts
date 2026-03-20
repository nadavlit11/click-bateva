/**
 * Enrichment feedback analysis — aggregates per-field ratings
 * by extraction source to identify failing extractors.
 *
 * Called by `analyzeEnrichmentFeedback` Cloud Function after
 * feedback count reaches threshold.
 */

import {onCall, HttpsError} from "firebase-functions/v2/https";
import {getFirestore, FieldValue} from "firebase-admin/firestore";
import * as logger from "firebase-functions/logger";
import * as Sentry from "@sentry/node";

import {ExtractionSource} from "./types";

const db = getFirestore();

// ── Types ────────────────────────────────────────────────

interface FeedbackDoc {
  poiId: string;
  website: string;
  fieldRatings: Record<string, "good" | "bad">;
  fieldProvenance: Record<string, ExtractionSource>;
  appliedFields: string[];
  skippedFields: string[];
  note: string | null;
}

interface SourceStats {
  total: number;
  bad: number;
  badRate: number;
}

interface FieldAnalysis {
  total: number;
  goodCount: number;
  badCount: number;
  badRate: number;
  bySource: Partial<Record<ExtractionSource, SourceStats>>;
}

export interface AnalysisResult {
  generatedAt: string;
  totalFeedbackCount: number;
  byField: Record<string, FieldAnalysis>;
  topIssues: Array<{
    severity: "high" | "medium" | "low";
    field: string;
    source: ExtractionSource;
    badRate: number;
    sampleCount: number;
  }>;
}

// ── Pure aggregation logic ───────────────────────────────

const BAD_RATE_HIGH = 0.15;
const BAD_RATE_MEDIUM = 0.10;
const MIN_SAMPLES = 5;

/**
 * Aggregate feedback docs into per-field analysis.
 * Pure function — no Firestore calls.
 * @param {FeedbackDoc[]} docs Feedback documents.
 * @return {AnalysisResult} Aggregated analysis.
 */
export function aggregateFeedback(
  docs: FeedbackDoc[],
): AnalysisResult {
  const fieldMap: Record<string, {
    total: number;
    good: number;
    bad: number;
    bySource: Record<string, { total: number; bad: number }>;
  }> = {};

  for (const doc of docs) {
    if (!doc.fieldRatings) continue;

    for (const [field, rating] of Object.entries(
      doc.fieldRatings,
    )) {
      if (!fieldMap[field]) {
        fieldMap[field] = {
          total: 0, good: 0, bad: 0, bySource: {},
        };
      }
      const entry = fieldMap[field];
      entry.total++;
      if (rating === "good") entry.good++;
      if (rating === "bad") entry.bad++;

      // Track by provenance source
      const source = doc.fieldProvenance?.[field];
      if (source) {
        if (!entry.bySource[source]) {
          entry.bySource[source] = {total: 0, bad: 0};
        }
        entry.bySource[source].total++;
        if (rating === "bad") {
          entry.bySource[source].bad++;
        }
      }
    }
  }

  const byField: Record<string, FieldAnalysis> = {};
  const topIssues: AnalysisResult["topIssues"] = [];

  for (const [field, data] of Object.entries(fieldMap)) {
    const badRate = data.total > 0 ?
      data.bad / data.total : 0;

    const bySource: FieldAnalysis["bySource"] = {};
    for (const [src, stats] of Object.entries(
      data.bySource,
    )) {
      const srcRate = stats.total > 0 ?
        stats.bad / stats.total : 0;
      bySource[src as ExtractionSource] = {
        total: stats.total,
        bad: stats.bad,
        badRate: Math.round(srcRate * 100) / 100,
      };

      // Flag issues above threshold
      if (stats.total >= MIN_SAMPLES && srcRate > 0) {
        let severity: "high" | "medium" | "low";
        if (srcRate >= BAD_RATE_HIGH) {
          severity = "high";
        } else if (srcRate >= BAD_RATE_MEDIUM) {
          severity = "medium";
        } else {
          severity = "low";
        }

        topIssues.push({
          severity,
          field,
          source: src as ExtractionSource,
          badRate: Math.round(srcRate * 100) / 100,
          sampleCount: stats.total,
        });
      }
    }

    byField[field] = {
      total: data.total,
      goodCount: data.good,
      badCount: data.bad,
      badRate: Math.round(badRate * 100) / 100,
      bySource,
    };
  }

  // Sort issues: high first, then by bad rate desc
  const severityOrder = {high: 0, medium: 1, low: 2};
  topIssues.sort((a, b) =>
    severityOrder[a.severity] - severityOrder[b.severity] ||
    b.badRate - a.badRate,
  );

  return {
    generatedAt: new Date().toISOString(),
    totalFeedbackCount: docs.length,
    byField,
    topIssues,
  };
}

// ── Cloud Function ───────────────────────────────────────

const FEEDBACK_THRESHOLD = 20;

/**
 * Callable Cloud Function: analyzes enrichment feedback
 * and writes aggregated results to
 * settings/enrichment_analysis. Triggered by admin after
 * feedback accumulates.
 */
export const analyzeEnrichmentFeedback = onCall(
  {
    cors: true,
    enforceAppCheck: true,
    timeoutSeconds: 30,
  },
  async (request) => {
    if (!request.auth) {
      throw new HttpsError(
        "unauthenticated", "Must be authenticated.",
      );
    }
    if (request.auth.token.role !== "admin") {
      throw new HttpsError(
        "permission-denied",
        "Only admins can run analysis.",
      );
    }

    try {
      // Check if threshold reached (or force flag)
      const force = (request.data as {force?: boolean})?.force;
      if (!force) {
        const analysisDoc = await db
          .doc("settings/enrichment_analysis").get();
        const lastCount =
          (analysisDoc.data()?.feedbackCountAtAnalysis as
            number) || 0;
        const feedbackCount = (await db
          .collection("enrichment_feedback")
          .count().get()).data().count;

        if (feedbackCount - lastCount < FEEDBACK_THRESHOLD) {
          return {
            analyzed: false,
            reason: `Only ${feedbackCount - lastCount} new ` +
              `feedback entries (threshold: ${FEEDBACK_THRESHOLD})`,
          };
        }
      }

      // Query all feedback with provenance data
      const snap = await db
        .collection("enrichment_feedback")
        .orderBy("timestamp", "desc")
        .limit(200)
        .get();

      const docs = snap.docs.map((d) => d.data() as FeedbackDoc);
      const analysis = aggregateFeedback(docs);

      // Write to settings
      await db.doc("settings/enrichment_analysis").set({
        ...analysis,
        feedbackCountAtAnalysis: snap.size,
        updatedAt: FieldValue.serverTimestamp(),
      });

      logger.info(
        `Enrichment analysis complete: ${snap.size} docs, ` +
        `${analysis.topIssues.length} issues found`,
      );

      return {analyzed: true, ...analysis};
    } catch (err: unknown) {
      const msg = err instanceof Error ?
        err.message : String(err);
      logger.error(`Analysis failed: ${msg}`);
      Sentry.captureException(err);
      throw new HttpsError(
        "internal", `Analysis failed: ${msg}`,
      );
    }
  },
);
