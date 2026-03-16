import {initializeApp, getApps} from "firebase-admin/app";
import {getFirestore, FieldValue, Timestamp} from "firebase-admin/firestore";
import {onDocumentWritten} from "firebase-functions/v2/firestore";
import * as logger from "firebase-functions/logger";

if (getApps().length === 0) {
  initializeApp();
}

const db = getFirestore();

/**
 * Serialize a Firestore value for comparison.
 * Handles Timestamps and GeoPoints that JSON.stringify misses.
 * @param {unknown} val - The value to serialize.
 * @return {string} A string representation for equality checks.
 */
function serialize(val: unknown): string {
  if (val instanceof Timestamp) {
    return `__ts:${val.toMillis()}`;
  }
  if (val && typeof val === "object" && "latitude" in val) {
    const gp = val as Record<string, number>;
    return `__geo:${gp.latitude},${gp.longitude}`;
  }
  return JSON.stringify(val);
}

/**
 * Firestore trigger: logs every create, update, and delete
 * on `points_of_interest` to the `audit_log` collection.
 *
 * - Create: stores userId (createdBy) + full doc snapshot.
 * - Update: stores userId (updatedBy) + per-field diff.
 * - Delete: stores full doc snapshot (userId unavailable in
 *   triggers, but only admins can delete).
 */
export const auditPoiChanges = onDocumentWritten(
  "points_of_interest/{poiId}",
  async (event) => {
    const before = event.data?.before?.data();
    const after = event.data?.after?.data();
    const poiId = event.params.poiId;

    let action: "create" | "update" | "delete";
    let userId: string | null = null;
    let changes: Record<string, {old: unknown; new: unknown}> | null =
      null;
    let snapshot: Record<string, unknown> | null = null;

    if (!before && after) {
      action = "create";
      userId = after.createdBy ?? null;
      snapshot = after;
    } else if (before && after) {
      action = "update";
      userId = after.updatedBy ?? null;
      changes = {};
      const allKeys = new Set([
        ...Object.keys(before),
        ...Object.keys(after),
      ]);
      for (const key of allKeys) {
        if (serialize(before[key]) !== serialize(after[key])) {
          changes[key] = {old: before[key], new: after[key]};
        }
      }
    } else if (before && !after) {
      action = "delete";
      snapshot = before;
    } else {
      return;
    }

    await db.collection("audit_log").add({
      collection: "points_of_interest",
      documentId: poiId,
      action,
      userId,
      changes,
      snapshot,
      timestamp: FieldValue.serverTimestamp(),
    });

    logger.info("Audit log entry created", {poiId, action, userId});
  }
);
