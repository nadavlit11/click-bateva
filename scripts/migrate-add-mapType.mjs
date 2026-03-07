/**
 * Migration script: add `mapType: 'default'` to all existing POIs.
 *
 * Usage:
 *   GOOGLE_APPLICATION_CREDENTIALS=./serviceAccount.json node scripts/migrate-add-mapType.mjs
 *
 * Safe to re-run -- skips documents that already have a `mapType` field.
 */

import { initializeApp, cert } from 'firebase-admin/app'
import { getFirestore } from 'firebase-admin/firestore'

const credPath = process.env.GOOGLE_APPLICATION_CREDENTIALS
if (!credPath) {
  console.error('GOOGLE_APPLICATION_CREDENTIALS env var is required')
  process.exit(1)
}

initializeApp({ credential: cert(credPath) })
const db = getFirestore()

const BATCH_SIZE = 500
const collectionRef = db.collection('points_of_interest')
const snapshot = await collectionRef.get()

console.log(`Found ${snapshot.size} POIs`)

let updated = 0
let skipped = 0
let batch = db.batch()
let batchCount = 0

for (const doc of snapshot.docs) {
  const data = doc.data()

  if (data.mapType) {
    skipped++
    continue
  }

  batch.update(doc.ref, { mapType: 'default' })

  updated++
  batchCount++

  if (batchCount >= BATCH_SIZE) {
    await batch.commit()
    console.log(`  Committed batch of ${batchCount} updates (${updated} total)`)
    batch = db.batch()
    batchCount = 0
  }
}

if (batchCount > 0) {
  await batch.commit()
  console.log(`  Committed final batch of ${batchCount} updates`)
}

console.log(`\nDone. Updated: ${updated}, Skipped (already migrated): ${skipped}`)
