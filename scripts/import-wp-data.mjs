/**
 * Import WordPress WPGMZA markers into Firestore.
 *
 * Steps:
 *   1. Delete all existing docs in: points_of_interest, categories, subcategories
 *   2. Create 9 categories matching the WordPress map
 *   3. Import all ~1025 markers as points_of_interest
 *
 * Usage:
 *   GOOGLE_APPLICATION_CREDENTIALS=./serviceAccount.json node scripts/import-wp-data.mjs
 */

import { readFileSync } from 'fs'
import { initializeApp, cert } from 'firebase-admin/app'
import { getFirestore, Timestamp } from 'firebase-admin/firestore'

const credPath = process.env.GOOGLE_APPLICATION_CREDENTIALS
if (!credPath) {
  console.error('GOOGLE_APPLICATION_CREDENTIALS env var is required')
  process.exit(1)
}

initializeApp({ credential: cert(credPath) })
const db = getFirestore()
const now = Timestamp.now()

// ─── Load WordPress data ────────────────────────────────────────────────────

const wpData = JSON.parse(readFileSync('clickbateva-data.json', 'utf8'))
console.log(`Loaded ${wpData.markers.length} markers from WordPress export\n`)

// ─── Category mapping ───────────────────────────────────────────────────────
// WordPress WPGMZA category ID → Firestore category doc

const WP_CATEGORIES = {
  '1': { id: 'accommodation', name: 'לינה',                       color: '#2196F3', iconUrl: 'https://clickbateva.co.il/wp-content/uploads/2025/11/hotel_7305801-e1763454264166.png' },
  '2': { id: 'food',          name: 'אוכל',                       color: '#FF9800', iconUrl: 'https://clickbateva.co.il/wp-content/uploads/2025/11/food-donation_8449978-e1763454240552.png' },
  '3': { id: 'offroad',       name: 'רכבי שטח ואופנים',           color: '#795548', iconUrl: 'https://clickbateva.co.il/wp-content/uploads/2025/11/military-jeep_7966599-1-e1763454327149.png' },
  '4': { id: 'attractions',   name: 'אטרקציות ופעילויות',         color: '#FB8C00', iconUrl: 'https://clickbateva.co.il/wp-content/uploads/2025/11/stage_7425055-e1763454340784.png' },
  '5': { id: 'wineries',      name: 'יקבים',                      color: '#7B1FA2', iconUrl: 'https://clickbateva.co.il/wp-content/uploads/2025/11/wine-glass_17663856-e1763454357378.png' },
  '6': { id: 'water',         name: 'מים',                        color: '#039BE5', iconUrl: 'https://clickbateva.co.il/wp-content/uploads/2025/11/swimming-pool_10513861-e1763454351777.png' },
  '7': { id: 'venues',        name: 'מתחמים ואולמות כינוסים',     color: '#546E7A', iconUrl: 'https://clickbateva.co.il/wp-content/uploads/2025/11/conference_1427881-e1763454346372.png' },
  '8': { id: 'shows',         name: 'פעילויות מופעים והרצאות',    color: '#E91E63', iconUrl: 'https://clickbateva.co.il/wp-content/uploads/2025/11/conference_1427881-e1763454346372.png' },
  '9': { id: 'hiking',        name: 'טיולי רגלי',                 color: '#43A047', iconUrl: 'https://clickbateva.co.il/wp-content/uploads/2025/11/hiking_11997709-e1763454333838.png' },
}

// Build reverse lookup: Firestore categoryId from WP categories array
function resolveCategory(marker) {
  const wpCatId = (marker.categories || [])[0] || '4' // default to attractions
  return WP_CATEGORIES[wpCatId]?.id || 'attractions'
}

// ─── HTML cleanup ───────────────────────────────────────────────────────────

function cleanDescription(html) {
  if (!html) return ''
  return html
    .replace(/<br\s*\/?>/gi, '\n')     // <br> → newline
    .replace(/<img[^>]*>/gi, '')       // remove <img> tags
    .replace(/<[^>]+>/g, '')           // strip any remaining HTML
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#039;/g, "'")
    .replace(/\n{3,}/g, '\n\n')        // collapse excessive newlines
    .trim()
}

// ─── Delete helpers ─────────────────────────────────────────────────────────

async function deleteCollection(collectionName) {
  const snapshot = await db.collection(collectionName).get()
  if (snapshot.empty) {
    console.log(`  (${collectionName} already empty)`)
    return 0
  }
  const batchSize = 400
  const docs = snapshot.docs
  for (let i = 0; i < docs.length; i += batchSize) {
    const batch = db.batch()
    docs.slice(i, i + batchSize).forEach(doc => batch.delete(doc.ref))
    await batch.commit()
  }
  console.log(`  ✓ Deleted ${docs.length} docs from ${collectionName}`)
  return docs.length
}

// ─── Step 1: Delete existing data ───────────────────────────────────────────

console.log('🗑️  Deleting existing data...')
await deleteCollection('points_of_interest')
await deleteCollection('categories')
await deleteCollection('subcategories')
console.log('')

// ─── Step 2: Create categories ──────────────────────────────────────────────

console.log('📁 Creating categories...')
for (const cat of Object.values(WP_CATEGORIES)) {
  await db.collection('categories').doc(cat.id).set({
    name: cat.name,
    color: cat.color,
    iconId: null,
    iconUrl: cat.iconUrl,
    createdAt: now,
    updatedAt: now,
  })
  console.log(`  ✓ categories/${cat.id} — ${cat.name}`)
}
console.log('')

// ─── Step 3: Import markers as POIs ─────────────────────────────────────────

console.log('📍 Importing markers...')
let imported = 0
let skipped = 0

const batchSize = 400
for (let i = 0; i < wpData.markers.length; i += batchSize) {
  const batch = db.batch()
  const chunk = wpData.markers.slice(i, i + batchSize)

  for (const marker of chunk) {
    const lat = parseFloat(marker.lat)
    const lng = parseFloat(marker.lng)
    if (isNaN(lat) || isNaN(lng)) {
      console.log(`  ⚠ Skipping "${marker.title}" — invalid coordinates`)
      skipped++
      continue
    }

    const docId = `wp-${marker.id}`
    const ref = db.collection('points_of_interest').doc(docId)

    batch.set(ref, {
      name: (marker.title || '').trim(),
      description: cleanDescription(marker.description),
      location: { lat, lng },
      mainImage: '',
      images: [],
      videos: [],
      phone: '',
      email: '',
      website: '',
      categoryId: resolveCategory(marker),
      subcategoryIds: [],
      businessId: null,
      active: true,
      openingHours: null,
      price: null,
      wpMarkerId: marker.id,   // keep WP reference for traceability
      createdAt: now,
      updatedAt: now,
    })
    imported++
  }

  await batch.commit()
  console.log(`  ✓ Batch ${Math.floor(i / batchSize) + 1}: imported ${Math.min(i + batchSize, wpData.markers.length)}/${wpData.markers.length}`)
}

console.log(`\n✅ Import complete!`)
console.log(`   ${imported} POIs imported`)
console.log(`   ${skipped} skipped`)
console.log(`   ${Object.keys(WP_CATEGORIES).length} categories created`)
