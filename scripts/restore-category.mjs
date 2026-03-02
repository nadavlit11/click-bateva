/**
 * Restore the deleted "רכבי שטח ואופנים" category.
 *
 * Finds the old category ID from an orphaned POI ("אזימוט"),
 * then recreates the category document with that same ID.
 *
 * Usage:
 *   GOOGLE_APPLICATION_CREDENTIALS=./serviceAccount.json node scripts/restore-category.mjs
 */

import { initializeApp, cert } from 'firebase-admin/app'
import { getFirestore, Timestamp } from 'firebase-admin/firestore'

const credPath = process.env.GOOGLE_APPLICATION_CREDENTIALS
if (!credPath) {
  console.error('GOOGLE_APPLICATION_CREDENTIALS env var is required')
  process.exit(1)
}

initializeApp({ credential: cert(credPath) })
const db = getFirestore()

// Step 1: Find orphaned POIs whose category no longer exists
const categoriesSnap = await db.collection('categories').get()
const existingCategoryIds = new Set(categoriesSnap.docs.map(d => d.id))

const poisSnap = await db.collection('points_of_interest').get()
let categoryId = null

for (const doc of poisSnap.docs) {
  const catId = doc.data().categoryId
  if (catId && !existingCategoryIds.has(catId)) {
    categoryId = catId
    console.log(`Found orphaned POI "${doc.data().name}" with missing categoryId: ${catId}`)
    break
  }
}

if (!categoryId) {
  console.error('No orphaned POIs found — category may already be restored')
  process.exit(1)
}

// Step 2: Check if category already exists (idempotent)
const existing = await db.collection('categories').doc(categoryId).get()
if (existing.exists) {
  console.log('Category already exists — nothing to do.')
  process.exit(0)
}

// Step 3: Recreate the category with the same ID
const now = Timestamp.now()
await db.collection('categories').doc(categoryId).set({
  name: 'רכבי שטח ואופנים',
  color: '#795548',
  order: 2,
  iconId: null,
  iconUrl: null,
  createdAt: now,
  updatedAt: now,
})

console.log(`Restored category "רכבי שטח ואופנים" at categories/${categoryId}`)
