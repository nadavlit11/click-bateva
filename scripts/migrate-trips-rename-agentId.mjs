/**
 * Migration script: rename `agentId` → `ownerId` in all trip documents.
 *
 * For each trip doc that has `agentId` but not `ownerId`:
 *   - Sets `ownerId` = old `agentId` value
 *   - Deletes the `agentId` field
 *
 * Safe to re-run — skips documents that already have `ownerId`.
 *
 * Usage:
 *   GOOGLE_APPLICATION_CREDENTIALS=./serviceAccount.json node scripts/migrate-trips-rename-agentId.mjs
 */

import { initializeApp, cert } from "firebase-admin/app";
import { getFirestore, FieldValue } from "firebase-admin/firestore";

const credPath = process.env.GOOGLE_APPLICATION_CREDENTIALS;
if (!credPath) {
  console.error("GOOGLE_APPLICATION_CREDENTIALS env var is required");
  process.exit(1);
}

initializeApp({ credential: cert(credPath) });
const db = getFirestore();

const BATCH_SIZE = 500;
const snapshot = await db.collection("trips").get();

console.log(`Found ${snapshot.size} trip documents`);

let migrated = 0;
let skipped = 0;
let batch = db.batch();
let batchCount = 0;

for (const tripDoc of snapshot.docs) {
  const data = tripDoc.data();

  if (data.ownerId !== undefined) {
    skipped++;
    continue;
  }

  if (data.agentId === undefined) {
    skipped++;
    continue;
  }

  batch.update(tripDoc.ref, {
    ownerId: data.agentId,
    agentId: FieldValue.delete(),
  });

  migrated++;
  batchCount++;

  if (batchCount >= BATCH_SIZE) {
    await batch.commit();
    console.log(`  Committed batch of ${batchCount}`);
    batch = db.batch();
    batchCount = 0;
  }
}

if (batchCount > 0) {
  await batch.commit();
}

console.log(`Done. Migrated: ${migrated}, Skipped: ${skipped}`);
