/**
 * Migration: Remove the legacy `tags` field from all POI documents
 * and delete the entire `tags` collection from Firestore.
 *
 * Usage:
 *   GOOGLE_APPLICATION_CREDENTIALS=./serviceAccount.json node scripts/remove-tags.mjs
 */

import { initializeApp, cert } from 'firebase-admin/app'
import { getFirestore, FieldValue } from 'firebase-admin/firestore'

const credPath = process.env.GOOGLE_APPLICATION_CREDENTIALS
if (!credPath) {
  console.error('GOOGLE_APPLICATION_CREDENTIALS env var is required')
  process.exit(1)
}

initializeApp({ credential: cert(JSON.parse((await import('fs')).readFileSync(credPath, 'utf8'))) })
const db = getFirestore()

// ─── Step 1: Remove `tags` field from all POI documents ─────────────────────

console.log('Step 1: Removing `tags` field from all POI documents...')

const poisSnap = await db.collection('points_of_interest').get()
const batchSize = 500
let updated = 0

for (let i = 0; i < poisSnap.docs.length; i += batchSize) {
  const batch = db.batch()
  const chunk = poisSnap.docs.slice(i, i + batchSize)

  for (const doc of chunk) {
    if (doc.data().tags !== undefined) {
      batch.update(doc.ref, { tags: FieldValue.delete() })
      updated++
    }
  }

  await batch.commit()
  console.log(`  ✓ Batch ${Math.floor(i / batchSize) + 1}: processed ${Math.min(i + batchSize, poisSnap.docs.length)}/${poisSnap.docs.length}`)
}

console.log(`  ${updated} POIs had \`tags\` field removed`)

// ─── Step 2: Delete all documents in the `tags` collection ──────────────────

console.log('\nStep 2: Deleting all documents in `tags` collection...')

const tagsSnap = await db.collection('tags').get()
let deleted = 0

for (let i = 0; i < tagsSnap.docs.length; i += batchSize) {
  const batch = db.batch()
  const chunk = tagsSnap.docs.slice(i, i + batchSize)

  for (const doc of chunk) {
    batch.delete(doc.ref)
    deleted++
  }

  await batch.commit()
}

console.log(`  ${deleted} tag documents deleted`)

console.log('\n✅ Migration complete!')
