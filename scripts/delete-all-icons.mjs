/**
 * Delete all icons from Firestore + Storage, and null out icon references
 * in categories, subcategories, and points_of_interest.
 *
 * Usage:
 *   GOOGLE_APPLICATION_CREDENTIALS=./serviceAccount.json node scripts/delete-all-icons.mjs
 */

import { initializeApp, cert } from 'firebase-admin/app'
import { getFirestore } from 'firebase-admin/firestore'
import { getStorage } from 'firebase-admin/storage'

const credPath = process.env.GOOGLE_APPLICATION_CREDENTIALS
if (!credPath) {
  console.error('GOOGLE_APPLICATION_CREDENTIALS env var is required')
  process.exit(1)
}

initializeApp({
  credential: cert(JSON.parse((await import('fs')).readFileSync(credPath, 'utf8'))),
  storageBucket: 'click-bateva.firebasestorage.app',
})
const db = getFirestore()
const bucket = getStorage().bucket()

const batchSize = 500

// ─── Step 1: Delete all icon files from Storage ─────────────────────────────

console.log('Step 1: Deleting icon files from Storage...')

const [files] = await bucket.getFiles({ prefix: 'icons/' })
let filesDeleted = 0

for (const file of files) {
  await file.delete()
  filesDeleted++
}

console.log(`  ${filesDeleted} files deleted from Storage`)

// ─── Step 2: Delete all documents in the `icons` collection ─────────────────

console.log('\nStep 2: Deleting all documents in `icons` collection...')

const iconsSnap = await db.collection('icons').get()
let docsDeleted = 0

for (let i = 0; i < iconsSnap.docs.length; i += batchSize) {
  const batch = db.batch()
  const chunk = iconsSnap.docs.slice(i, i + batchSize)

  for (const doc of chunk) {
    batch.delete(doc.ref)
    docsDeleted++
  }

  await batch.commit()
}

console.log(`  ${docsDeleted} icon documents deleted`)

// ─── Step 3: Null out iconId/iconUrl in referencing collections ─────────────

const collections = ['categories', 'subcategories', 'points_of_interest']

for (const collName of collections) {
  console.log(`\nStep 3: Clearing icon references in \`${collName}\`...`)

  const snap = await db.collection(collName).get()
  let updated = 0

  for (let i = 0; i < snap.docs.length; i += batchSize) {
    const batch = db.batch()
    const chunk = snap.docs.slice(i, i + batchSize)

    for (const doc of chunk) {
      const data = doc.data()
      if (data.iconId != null || data.iconUrl != null) {
        batch.update(doc.ref, { iconId: null, iconUrl: null })
        updated++
      }
    }

    await batch.commit()
  }

  console.log(`  ${updated} ${collName} documents updated`)
}

console.log('\n✅ All icons deleted and references cleaned up!')
