/**
 * Import Google My Maps KMZ data into Firestore.
 *
 * Steps:
 *   1. Delete all existing docs in: points_of_interest, categories, subcategories
 *   2. Create 9 categories from KML folder names
 *   3. Import ~1170 placemarks as points_of_interest
 *
 * Prerequisites:
 *   unzip "מפת מפת מפיקים בקליק.kmz" -d /tmp/kmz-extract
 *
 * Usage:
 *   GOOGLE_APPLICATION_CREDENTIALS=./serviceAccount.json node scripts/import-kmz-data.mjs
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

// ─── Category config ─────────────────────────────────────────────────────────
// folderName → { color, order }  (iconUrl/iconId left null — set via admin)

const CATEGORY_CONFIG = {
  'לינה':                   { color: '#2196F3', order: 0 },
  'אוכל':                   { color: '#FF9800', order: 1 },
  'רכבי שטח ואופנים':       { color: '#795548', order: 2 },
  'אטרקציות ופעילויות':     { color: '#FB8C00', order: 3 },
  'יקבים':                  { color: '#7B1FA2', order: 4 },
  'מים מים מיים':           { color: '#039BE5', order: 5 },
  'מתחמים ואולמות כינוס':   { color: '#546E7A', order: 6 },
  'טיול רגלי':              { color: '#43A047', order: 7 },
  'סדנאות':                 { color: '#FF6F00', order: 8 },
}

// ─── KML parsing ─────────────────────────────────────────────────────────────

const kml = readFileSync('/tmp/kmz-extract/doc.kml', 'utf8')

function parseFolders(kmlText) {
  const folders = []
  const folderRegex = /<Folder>([\s\S]*?)<\/Folder>/g
  let match

  while ((match = folderRegex.exec(kmlText)) !== null) {
    const content = match[1]
    const nameMatch = content.match(/<name>([^<]+)<\/name>/)
    if (!nameMatch) continue

    const folderName = nameMatch[1].trim()

    // Skip empty/unnamed folders
    if (folderName === 'שכבה ללא שם') continue
    if (!CATEGORY_CONFIG[folderName]) {
      console.warn(`⚠ Unknown folder "${folderName}" — skipping`)
      continue
    }

    const placemarks = []
    const pmRegex = /<Placemark>([\s\S]*?)<\/Placemark>/g
    let pmMatch

    while ((pmMatch = pmRegex.exec(content)) !== null) {
      const pm = pmMatch[1]

      const pmName = pm.match(/<name>([^<]+)<\/name>/)?.[1]?.trim() || ''

      // Description can be plain text or CDATA-wrapped HTML
      let description = ''
      const cdataMatch = pm.match(/<description><!\[CDATA\[([\s\S]*?)\]\]><\/description>/)
      const plainMatch = pm.match(/<description>([^<]*)<\/description>/)
      if (cdataMatch) {
        description = cleanDescription(cdataMatch[1])
      } else if (plainMatch) {
        description = cleanDescription(plainMatch[1])
      }

      // Coordinates: KML format is lng,lat,elevation
      const coordMatch = pm.match(/<coordinates>\s*([\d.,-]+)\s*<\/coordinates>/)
      if (!coordMatch) continue

      const parts = coordMatch[1].split(',')
      const lng = parseFloat(parts[0])
      const lat = parseFloat(parts[1])
      if (isNaN(lat) || isNaN(lng)) continue

      // Extract phone number from description
      const phone = extractPhone(description)

      const isMobile = phone && phone.startsWith('05')
      placemarks.push({ name: pmName, description, lat, lng, phone, whatsapp: isMobile ? phone : null })
    }

    folders.push({ name: folderName, placemarks })
  }

  return folders
}

// ─── HTML cleanup ────────────────────────────────────────────────────────────

function cleanDescription(html) {
  if (!html) return ''
  return html
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<img[^>]*>/gi, '')
    .replace(/<a[^>]*>([^<]*)<\/a>/gi, '$1')
    .replace(/<[^>]+>/g, '')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#039;/g, "'")
    .replace(/\n{3,}/g, '\n\n')
    .trim()
}

// ─── Phone extraction ────────────────────────────────────────────────────────

function extractPhone(text) {
  if (!text) return null
  // Israeli mobile: 05X-XXXXXXX or 05XXXXXXXX
  const mobileMatch = text.match(/0[5][0-9]-?\d{7}/)
  if (mobileMatch) return mobileMatch[0]
  // Israeli landline: 0X-XXXXXXX
  const landlineMatch = text.match(/0[2-9]-?\d{7}/)
  if (landlineMatch) return landlineMatch[0]
  return null
}

// ─── Delete helper ───────────────────────────────────────────────────────────

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
  console.log(`  Deleted ${docs.length} docs from ${collectionName}`)
  return docs.length
}

// ─── Parse KML ───────────────────────────────────────────────────────────────

console.log('Parsing KML...')
const folders = parseFolders(kml)
const totalPois = folders.reduce((sum, f) => sum + f.placemarks.length, 0)
console.log(`Found ${folders.length} categories, ${totalPois} POIs\n`)

for (const f of folders) {
  console.log(`  ${f.name}: ${f.placemarks.length} POIs`)
}
console.log('')

// ─── Step 1: Delete existing data ────────────────────────────────────────────

console.log('Deleting existing data...')
await deleteCollection('points_of_interest')
await deleteCollection('categories')
await deleteCollection('subcategories')
console.log('')

// ─── Step 2: Create categories ───────────────────────────────────────────────

console.log('Creating categories...')
const folderToCategoryId = new Map()

for (const folder of folders) {
  const config = CATEGORY_CONFIG[folder.name]
  const ref = await db.collection('categories').add({
    name: folder.name,
    color: config.color,
    iconId: null,
    iconUrl: null,
    order: config.order,
    createdAt: now,
    updatedAt: now,
  })
  folderToCategoryId.set(folder.name, ref.id)
  console.log(`  categories/${ref.id} — ${folder.name}`)
}
console.log('')

// ─── Step 3: Import POIs ─────────────────────────────────────────────────────

console.log('Importing POIs...')
let imported = 0
let skipped = 0

const batchSize = 400
const allPois = folders.flatMap(f =>
  f.placemarks.map(p => ({ ...p, categoryId: folderToCategoryId.get(f.name) }))
)

for (let i = 0; i < allPois.length; i += batchSize) {
  const batch = db.batch()
  const chunk = allPois.slice(i, i + batchSize)

  for (const poi of chunk) {
    if (!poi.categoryId) {
      console.log(`  Skipping "${poi.name}" — no category`)
      skipped++
      continue
    }

    const ref = db.collection('points_of_interest').doc()
    batch.set(ref, {
      name: poi.name,
      description: poi.description,
      location: { lat: poi.lat, lng: poi.lng },
      mainImage: null,
      images: [],
      videos: [],
      phone: poi.phone,
      whatsapp: poi.whatsapp,
      email: null,
      website: null,
      categoryId: poi.categoryId,
      subcategoryIds: [],
      iconId: null,
      iconUrl: null,
      businessId: null,
      active: true,
      openingHours: null,
      price: null,
      kashrutCertUrl: null,
      menuUrl: null,
      facebook: null,
      createdAt: now,
      updatedAt: now,
    })
    imported++
  }

  await batch.commit()
  console.log(`  Batch ${Math.floor(i / batchSize) + 1}: ${Math.min(i + batchSize, allPois.length)}/${allPois.length}`)
}

console.log(`\nImport complete!`)
console.log(`  ${imported} POIs imported`)
console.log(`  ${skipped} skipped`)
console.log(`  ${folders.length} categories created`)
