/**
 * Migration script: add `maps` field to all existing POIs.
 *
 * Sets maps.agents and maps.groups with active: true and price copied
 * from the existing top-level price field.
 *
 * Usage:
 *   GOOGLE_APPLICATION_CREDENTIALS=./serviceAccount.json node scripts/migrate-add-maps.mjs
 *
 * Safe to re-run — skips documents that already have a `maps` field.
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

  if (data.maps) {
    skipped++
    continue
  }

  const price = data.price || null

  batch.update(doc.ref, {
    maps: {
      agents: { price, active: true },
      groups: { price, active: true },
    },
  })

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
