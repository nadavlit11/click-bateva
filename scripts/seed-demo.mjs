/**
 * Seed script: populate production Firestore with demo data.
 *
 * Creates:
 *   - 6 categories (מסעדות, בתי מלון, טיולים, חופים, פארקים, אטרקציות)
 *   - Location tags with parent/child hierarchy (צפון → גולן/גליל/כרמל, etc.)
 *   - Subcategories per category (kashrut/price/audience for restaurants, etc.)
 *   - 1 fully-detailed showcase POI with every field populated
 *
 * Usage:
 *   GOOGLE_APPLICATION_CREDENTIALS=./serviceAccount.json node scripts/seed-demo.mjs
 *
 * Get a service account key from:
 *   Firebase Console → Project Settings → Service accounts → Generate new private key
 *
 * Run this once. Re-running is safe — existing docs are overwritten via set().
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
const now = Timestamp.now()

// ─── helpers ────────────────────────────────────────────────────────────────

async function upsert(collection, id, data) {
  await db.collection(collection).doc(id).set({ ...data, createdAt: now, updatedAt: now }, { merge: true })
  console.log(`  ✓ ${collection}/${id}`)
}

// ─── categories ─────────────────────────────────────────────────────────────
console.log('\n📁 Categories')

await upsert('categories', 'restaurants', { name: 'מסעדות',   color: '#E53935', iconId: null, iconUrl: null })
await upsert('categories', 'hotels',      { name: 'בתי מלון', color: '#8E24AA', iconId: null, iconUrl: null })
await upsert('categories', 'hiking',      { name: 'טיולים',   color: '#43A047', iconId: null, iconUrl: null })
await upsert('categories', 'beaches',     { name: 'חופים',    color: '#039BE5', iconId: null, iconUrl: null })
await upsert('categories', 'parks',       { name: 'פארקים',   color: '#00897B', iconId: null, iconUrl: null })
await upsert('categories', 'attractions', { name: 'אטרקציות', color: '#FB8C00', iconId: null, iconUrl: null })

// ─── location tags ───────────────────────────────────────────────────────────
console.log('\n🏷️  Tags (location)')

// parents
await upsert('tags', 'loc-north',     { name: 'צפון',    group: 'location', parentId: null })
await upsert('tags', 'loc-center',    { name: 'מרכז',    group: 'location', parentId: null })
await upsert('tags', 'loc-south',     { name: 'דרום',    group: 'location', parentId: null })
await upsert('tags', 'loc-jerusalem', { name: 'ירושלים', group: 'location', parentId: null })
await upsert('tags', 'loc-deadsea',  { name: 'ים המלח', group: 'location', parentId: null })
await upsert('tags', 'loc-eilat',    { name: 'אילת',    group: 'location', parentId: null })

// north children
await upsert('tags', 'loc-golan',  { name: 'גולן',   group: 'location', parentId: 'loc-north' })
await upsert('tags', 'loc-galil',  { name: 'גליל',   group: 'location', parentId: 'loc-north' })
await upsert('tags', 'loc-carmel', { name: 'כרמל',   group: 'location', parentId: 'loc-north' })
await upsert('tags', 'loc-gilboa', { name: 'גלבוע',  group: 'location', parentId: 'loc-north' })

// center children
await upsert('tags', 'loc-gushdan', { name: 'גוש דן', group: 'location', parentId: 'loc-center' })
await upsert('tags', 'loc-sharon',  { name: 'שרון',   group: 'location', parentId: 'loc-center' })
await upsert('tags', 'loc-shfela',  { name: 'שפלה',   group: 'location', parentId: 'loc-center' })

// south children
await upsert('tags', 'loc-negev',  { name: 'נגב',   group: 'location', parentId: 'loc-south' })
await upsert('tags', 'loc-arava',  { name: 'ערבה',  group: 'location', parentId: 'loc-south' })

// ─── subcategories ───────────────────────────────────────────────────────────
console.log('\n🗂️  Subcategories')

// restaurants
await upsert('subcategories', 'rest-kosher',   { categoryId: 'restaurants', group: 'kashrut',  name: 'כשר' })
await upsert('subcategories', 'rest-dairy',    { categoryId: 'restaurants', group: 'kashrut',  name: 'חלבי' })
await upsert('subcategories', 'rest-meat',     { categoryId: 'restaurants', group: 'kashrut',  name: 'בשרי' })
await upsert('subcategories', 'rest-vegan',    { categoryId: 'restaurants', group: 'kashrut',  name: 'טבעוני' })
await upsert('subcategories', 'rest-cheap',    { categoryId: 'restaurants', group: 'price',    name: 'זול' })
await upsert('subcategories', 'rest-mid',      { categoryId: 'restaurants', group: 'price',    name: 'בינוני' })
await upsert('subcategories', 'rest-pricey',   { categoryId: 'restaurants', group: 'price',    name: 'יקר' })
await upsert('subcategories', 'rest-families', { categoryId: 'restaurants', group: 'audience', name: 'משפחות' })
await upsert('subcategories', 'rest-couples',  { categoryId: 'restaurants', group: 'audience', name: 'זוגות' })
await upsert('subcategories', 'rest-groups',   { categoryId: 'restaurants', group: 'audience', name: 'קבוצות' })

// hotels
await upsert('subcategories', 'hotel-boutique', { categoryId: 'hotels', group: 'type',     name: 'בוטיק' })
await upsert('subcategories', 'hotel-kibbutz',  { categoryId: 'hotels', group: 'type',     name: 'קיבוץ' })
await upsert('subcategories', 'hotel-zimmer',   { categoryId: 'hotels', group: 'type',     name: 'צימר' })
await upsert('subcategories', 'hotel-resort',   { categoryId: 'hotels', group: 'type',     name: 'ריזורט' })
await upsert('subcategories', 'hotel-families', { categoryId: 'hotels', group: 'audience', name: 'משפחות' })
await upsert('subcategories', 'hotel-couples',  { categoryId: 'hotels', group: 'audience', name: 'זוגות' })
await upsert('subcategories', 'hotel-pool',     { categoryId: 'hotels', group: 'amenities', name: 'בריכה' })
await upsert('subcategories', 'hotel-spa',      { categoryId: 'hotels', group: 'amenities', name: 'ספא' })

// hiking
await upsert('subcategories', 'hike-easy',   { categoryId: 'hiking', group: 'difficulty', name: 'קל' })
await upsert('subcategories', 'hike-medium', { categoryId: 'hiking', group: 'difficulty', name: 'בינוני' })
await upsert('subcategories', 'hike-hard',   { categoryId: 'hiking', group: 'difficulty', name: 'קשה' })
await upsert('subcategories', 'hike-loop',   { categoryId: 'hiking', group: 'type',       name: 'מסלול מעגלי' })
await upsert('subcategories', 'hike-linear', { categoryId: 'hiking', group: 'type',       name: 'מסלול לינארי' })
await upsert('subcategories', 'hike-water',  { categoryId: 'hiking', group: 'type',       name: 'מסלול מים' })

// beaches
await upsert('subcategories', 'beach-swim',  { categoryId: 'beaches', group: 'type', name: 'שחייה' })
await upsert('subcategories', 'beach-surf',  { categoryId: 'beaches', group: 'type', name: 'גלישה' })
await upsert('subcategories', 'beach-acc',   { categoryId: 'beaches', group: 'type', name: 'נגיש' })
await upsert('subcategories', 'beach-dog',   { categoryId: 'beaches', group: 'type', name: 'כלבים' })

// parks
await upsert('subcategories', 'park-nature', { categoryId: 'parks', group: 'type',  name: 'טבע' })
await upsert('subcategories', 'park-urban',  { categoryId: 'parks', group: 'type',  name: 'עירוני' })
await upsert('subcategories', 'park-free',   { categoryId: 'parks', group: 'price', name: 'כניסה חופשית' })
await upsert('subcategories', 'park-paid',   { categoryId: 'parks', group: 'price', name: 'בתשלום' })

// attractions
await upsert('subcategories', 'attr-museum',  { categoryId: 'attractions', group: 'type',    name: 'מוזיאון' })
await upsert('subcategories', 'attr-history', { categoryId: 'attractions', group: 'type',    name: 'היסטורי' })
await upsert('subcategories', 'attr-free',    { categoryId: 'attractions', group: 'price',   name: 'חינם' })
await upsert('subcategories', 'attr-kids',    { categoryId: 'attractions', group: 'audience', name: 'ילדים' })

// ─── showcase POI ────────────────────────────────────────────────────────────
console.log('\n📍 Showcase POI')

await upsert('points_of_interest', 'demo-manta-ray', {
  name: 'מסעדת מנטה ריי',
  description: `מסעדת מנטה ריי היא אחד מהמקומות הייחודיים והמיוחדים ביותר לאכול בישראל. הממוקמת על הגג הפנורמי של מלון בוטיק ביפו העתיקה, מציעה המסעדה נוף מרהיב לים התיכון ולשקיעה הנפלאה מעבר לאופק.

השף אורי אבן, בוגר בית הספר לבישול "לה קורדון בלו" בפריז עם ניסיון של מעל עשרים שנה במטבחים של מישלן בצרפת ובספרד, מציג תפריט עשיר ויצירתי המשלב בין מסורת המטבח היהודי-ספרדי הקלאסי לבין טכניקות בישול מודרניות.

המנות המומלצות כוללות את הסרדינים הצלויים עם רוטב צ'רמולה ולימון כבוש, הסביצ'ה דייגים טרי עם מיץ כבשן ועשבי תיבול מהגינה, וטרטר הדגים עם אבוקדו ובצל ירוק. לקינוח, אל תפספסו את הקנפה הביתית עם גלידת פיסטוק.

הבר המרשים מציע רשימת יינות מיוחדת הכוללת יקבים ישראלים נבחרים, עם דגש מיוחד על יקבי הכרמל ורמות הגולן. הסומלייה המקצועי ישמח לעזור בהתאמת יין מושלם לסעודה.

המסעדה מקבלת אורחים לארוחת צהריים ולארוחת ערב, ומתאימה במיוחד לאירועים רומנטיים, חגיגות יום הולדת ואירועים עסקיים. מומלץ להזמין מקום מראש, במיוחד בסופי שבוע.

כשרות: המסעדה מחזיקה תעודת כשרות מהדרין מטעם הרבנות האזורית ומפוקחת על ידי משגיח כשרות קבוע.`,
  location: { lat: 32.0549, lng: 34.7519 },
  mainImage: null,
  images: [],
  phone: '03-123-4567',
  email: 'info@mantaray.co.il',
  website: 'https://mantaray.co.il',
  openingHours: 'ראשון-חמישי: 12:00-23:30 | שישי: 12:00-15:00 | שבת: 20:00-23:30',
  price: 'ממוצע לסועד: 180-250 ₪',
  categoryId: 'restaurants',
  tags: ['loc-center', 'loc-gushdan'],
  subcategoryIds: ['rest-kosher', 'rest-meat', 'rest-pricey', 'rest-couples'],
  businessId: null,
  active: true,
})

console.log('\n✅ Seed complete!')
console.log('   Deploy user-web to see the demo toggle in production.')
