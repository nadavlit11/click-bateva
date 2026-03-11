/**
 * Seeds the Firestore emulator with sample data for local development.
 * Requires the emulator to be running on localhost:8080.
 *
 * Usage:
 *   node scripts/seed-emulator.mjs
 */

import { initializeApp } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";

process.env.FIRESTORE_EMULATOR_HOST = "localhost:8080";
initializeApp({ projectId: "click-bateva" });
const db = getFirestore();

const CATEGORIES = [
  { id: "food", name: "אוכל", color: "#FF9800", iconUrl: null, order: 0 },
  { id: "attractions", name: "אטרקציות ופעילויות", color: "#FB8C00", iconUrl: null, order: 1 },
  { id: "hiking", name: "טיול רגלי", color: "#43A047", iconUrl: null, order: 2 },
  { id: "water", name: "מים מים מיים", color: "#039BE5", iconUrl: null, order: 3 },
  { id: "accommodation", name: "לינה", color: "#2196F3", iconUrl: null, order: 4 },
  { id: "workshops", name: "סדנאות", color: "#9C27B0", iconUrl: null, order: 5, locationless: true },
];

const SUBCATEGORIES = [
  { id: "kosher", categoryId: "food", group: "kashrut", name: "כשר", iconUrl: null },
  { id: "not-kosher", categoryId: "food", group: "kashrut", name: "לא כשר", iconUrl: null },
  { id: "family", categoryId: "attractions", group: "audience", name: "משפחות", iconUrl: null },
  { id: "couples", categoryId: "attractions", group: "audience", name: "זוגות", iconUrl: null },
  { id: "easy", categoryId: "hiking", group: "difficulty", name: "קל", iconUrl: null },
  { id: "moderate", categoryId: "hiking", group: "difficulty", name: "בינוני", iconUrl: null },
  { id: "pool", categoryId: "water", group: null, name: "בריכה", iconUrl: null },
  { id: "spring", categoryId: "water", group: null, name: "מעיין", iconUrl: null },
  { id: "zimmer", categoryId: "accommodation", group: null, name: "צימר", iconUrl: null },
  { id: "hotel", categoryId: "accommodation", group: null, name: "מלון", iconUrl: null },
  { id: "cooking", categoryId: "workshops", group: "type", name: "בישול", iconUrl: null },
  { id: "art", categoryId: "workshops", group: "type", name: "אומנות", iconUrl: null },
];

const MAPS_DEFAULT = { agents: { price: null, active: true }, groups: { price: null, active: true } };

const POIS = [
  {
    id: "poi-1", name: "מסעדת הגולן", description: "מסעדה עם נוף מדהים לגולן",
    location: { lat: 32.975, lng: 35.735 }, categoryId: "food", subcategoryIds: ["kosher"],
    mainImage: null, images: [], videos: [], phone: "04-1234567", whatsapp: null,
    email: null, website: null, openingHours: null, price: "₪80-120",
    kashrutCertUrl: null, menuUrl: null, facebook: null, iconUrl: null,
    businessId: null, active: true, maps: MAPS_DEFAULT, mapType: "default",
  },
  {
    id: "poi-2", name: "פיצה הכפר", description: "פיצה ביתית בכפר",
    location: { lat: 32.960, lng: 35.720 }, categoryId: "food", subcategoryIds: ["not-kosher"],
    mainImage: null, images: [], videos: [], phone: "04-2345678", whatsapp: null,
    email: null, website: null, openingHours: null, price: "₪50-80",
    kashrutCertUrl: null, menuUrl: null, facebook: null, iconUrl: null,
    businessId: null, active: true, maps: MAPS_DEFAULT, mapType: "default",
  },
  {
    id: "poi-3", name: "פארק הירדן", description: "פארק מים לכל המשפחה",
    location: { lat: 32.905, lng: 35.630 }, categoryId: "water", subcategoryIds: ["pool"],
    mainImage: null, images: [], videos: [], phone: "04-3456789", whatsapp: null,
    email: null, website: null, openingHours: null, price: "₪60",
    kashrutCertUrl: null, menuUrl: null, facebook: null, iconUrl: null,
    businessId: null, active: true, maps: MAPS_DEFAULT, mapType: "default",
  },
  {
    id: "poi-4", name: "מעיין החרמון", description: "מעיין טבעי ליד החרמון",
    location: { lat: 33.240, lng: 35.770 }, categoryId: "water", subcategoryIds: ["spring"],
    mainImage: null, images: [], videos: [], phone: null, whatsapp: null,
    email: null, website: null, openingHours: null, price: null,
    kashrutCertUrl: null, menuUrl: null, facebook: null, iconUrl: null,
    businessId: null, active: true, maps: MAPS_DEFAULT, mapType: "default",
  },
  {
    id: "poi-5", name: "טיול נחל עיון", description: "מסלול הליכה קל לאורך נחל עיון",
    location: { lat: 33.270, lng: 35.570 }, categoryId: "hiking", subcategoryIds: ["easy"],
    mainImage: null, images: [], videos: [], phone: null, whatsapp: null,
    email: null, website: null, openingHours: null, price: "₪28",
    kashrutCertUrl: null, menuUrl: null, facebook: null, iconUrl: null,
    businessId: null, active: true, maps: MAPS_DEFAULT, mapType: "default",
  },
  {
    id: "poi-6", name: "טיול הר בנטל", description: "מסלול בינוני עם נוף לסוריה",
    location: { lat: 33.130, lng: 35.795 }, categoryId: "hiking", subcategoryIds: ["moderate"],
    mainImage: null, images: [], videos: [], phone: null, whatsapp: null,
    email: null, website: null, openingHours: null, price: null,
    kashrutCertUrl: null, menuUrl: null, facebook: null, iconUrl: null,
    businessId: null, active: true, maps: MAPS_DEFAULT, mapType: "default",
  },
  {
    id: "poi-7", name: "אטרקציית הרפתקאות", description: "פארק חבלים ואתגרים",
    location: { lat: 32.990, lng: 35.750 }, categoryId: "attractions", subcategoryIds: ["family"],
    mainImage: null, images: [], videos: [], phone: "04-4567890", whatsapp: null,
    email: null, website: null, openingHours: null, price: "₪120",
    kashrutCertUrl: null, menuUrl: null, facebook: null, iconUrl: null,
    businessId: null, active: true, maps: MAPS_DEFAULT, mapType: "default",
  },
  {
    id: "poi-8", name: "ספא בגולן", description: "ספא זוגי מפנק",
    location: { lat: 32.940, lng: 35.690 }, categoryId: "attractions", subcategoryIds: ["couples"],
    mainImage: null, images: [], videos: [], phone: "04-5678901", whatsapp: null,
    email: null, website: null, openingHours: null, price: "₪350",
    kashrutCertUrl: null, menuUrl: null, facebook: null, iconUrl: null,
    businessId: null, active: true, maps: MAPS_DEFAULT, mapType: "default",
  },
  {
    id: "poi-9", name: "צימר הגליל", description: "צימר רומנטי בגליל",
    location: { lat: 32.870, lng: 35.500 }, categoryId: "accommodation", subcategoryIds: ["zimmer"],
    mainImage: null, images: [], videos: [], phone: "04-6789012", whatsapp: null,
    email: null, website: null, openingHours: null, price: "₪800/לילה",
    kashrutCertUrl: null, menuUrl: null, facebook: null, iconUrl: null,
    businessId: null, active: true, maps: MAPS_DEFAULT, mapType: "default",
  },
  {
    id: "poi-10", name: "מלון כנרת", description: "מלון על שפת הכנרת",
    location: { lat: 32.795, lng: 35.530 }, categoryId: "accommodation", subcategoryIds: ["hotel"],
    mainImage: null, images: [], videos: [], phone: "04-7890123", whatsapp: null,
    email: null, website: null, openingHours: null, price: "₪600/לילה",
    kashrutCertUrl: null, menuUrl: null, facebook: null, iconUrl: null,
    businessId: null, active: true, maps: MAPS_DEFAULT, mapType: "default",
  },
  {
    id: "poi-ws-1", name: "סדנת בישול גולני",
    description: "סדנת בישול עם **שף מקומי** — מכינים ארוחה מלאה ממרכיבים מקומיים",
    location: null, categoryId: "workshops", subcategoryIds: ["cooking"],
    mainImage: "https://images.unsplash.com/photo-1556910103-1c02745aae4d?w=600",
    images: [
      "https://images.unsplash.com/photo-1507048331197-7d4ac70811cf?w=600",
      "https://images.unsplash.com/photo-1466637574441-749b8f19452f?w=600",
    ],
    videos: ["https://www.youtube.com/watch?v=6n3pFFPSlW4"],
    phone: "04-1112233", whatsapp: "0541112233",
    email: "cook@golan.co.il", website: null,
    openingHours: null, price: "₪180",
    kashrutCertUrl: null, menuUrl: null,
    facebook: "https://facebook.com/golancooking", iconUrl: null,
    businessId: null, active: true, maps: MAPS_DEFAULT,
    mapType: "default", minPeople: "4", maxPeople: "20",
  },
  {
    id: "poi-ws-2", name: "סדנת ציור בטבע",
    description: "ציור בצבעי מים מול הנוף — מתאים לכל הגילאים",
    location: null, categoryId: "workshops", subcategoryIds: ["art"],
    mainImage: "https://images.unsplash.com/photo-1460661419201-fd4cecdf8a8b?w=600",
    images: [
      "https://images.unsplash.com/photo-1513364776144-60967b0f800f?w=600",
    ],
    videos: [],
    phone: "04-2223344", whatsapp: null,
    email: null, website: "www.art-golan.co.il",
    openingHours: "by_appointment", price: "₪120",
    kashrutCertUrl: null, menuUrl: null, facebook: null, iconUrl: null,
    businessId: null, active: true, maps: MAPS_DEFAULT,
    mapType: "default", minPeople: "2", maxPeople: "15",
  },
  {
    id: "poi-ws-3", name: "סדנת קרמיקה",
    description: "יצירת כלים מחימר — סדנה מעשית של 3 שעות עם הכנה ושריפה בכבשן",
    location: null, categoryId: "workshops", subcategoryIds: ["art"],
    mainImage: "https://images.unsplash.com/photo-1565193566173-7a0ee3dbe261?w=600",
    images: [
      "https://images.unsplash.com/photo-1558618666-fcd25c85f82e?w=600",
      "https://images.unsplash.com/photo-1612198188700-08c5e4a1a5a5?w=600",
    ],
    videos: [],
    phone: "04-3334455", whatsapp: "0543334455",
    email: null, website: null,
    openingHours: null, price: "₪200",
    kashrutCertUrl: null, menuUrl: null, facebook: null, iconUrl: null,
    businessId: null, active: true, maps: MAPS_DEFAULT,
    mapType: "default", minPeople: "2", maxPeople: "10",
  },
];

async function seed() {
  const batch = db.batch();

  for (const cat of CATEGORIES) {
    const { id, ...data } = cat;
    batch.set(db.collection("categories").doc(id), data);
  }

  for (const sub of SUBCATEGORIES) {
    const { id, ...data } = sub;
    batch.set(db.collection("subcategories").doc(id), data);
  }

  for (const poi of POIS) {
    const { id, ...data } = poi;
    batch.set(db.collection("points_of_interest").doc(id), data);
  }

  await batch.commit();
  console.log(`Seeded: ${CATEGORIES.length} categories, ${SUBCATEGORIES.length} subcategories, ${POIS.length} POIs`);
}

seed().catch(console.error);
