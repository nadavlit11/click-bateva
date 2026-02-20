import type { Category, Tag, Poi } from "../types";

export const CATEGORY_EMOJI: Record<string, string> = {
  restaurants: "🍽️",
  hotels:      "🏨",
  parks:       "🌲",
  sites:       "🏛️",
  beaches:     "🏖️",
  trails:      "🥾",
};

export const DEFAULT_CATEGORIES: Category[] = [
  { id: "restaurants", name: "מסעדות",  color: "#ff9800", iconUrl: null },
  { id: "hotels",      name: "מלונות",  color: "#2196f3", iconUrl: null },
  { id: "parks",       name: "פארקים",  color: "#4caf50", iconUrl: null },
  { id: "sites",       name: "אתרים",   color: "#ffc107", iconUrl: null },
  { id: "beaches",     name: "חופים",   color: "#9c27b0", iconUrl: null },
  { id: "trails",      name: "מסלולים", color: "#009688", iconUrl: null },
];

export const DEFAULT_TAGS: Tag[] = [
  { id: "family",     name: "מתאים למשפחות" },
  { id: "accessible", name: "נגיש לנכים" },
  { id: "free",       name: "חינם" },
  { id: "open_now",   name: "פתוח עכשיו" },
  { id: "parking",    name: "חניה" },
  { id: "kosher",     name: "כשר" },
  { id: "vegan",      name: "טבעוני" },
  { id: "pets",       name: "בעלי חיים" },
  { id: "water",      name: "מים" },
  { id: "view",       name: "נוף" },
];

export const MOCK_POIS: Poi[] = [
  { id: "1",  name: "שוק הכרמל",        location: { lat: 32.0542, lng: 34.7749 }, categoryId: "restaurants", tags: ["family", "kosher"],  mainImage: null, images: ["https://picsum.photos/seed/carmel1/600/400", "https://picsum.photos/seed/carmel2/600/400", "https://picsum.photos/seed/carmel3/600/400"], phone: "03-123-4567", website: "www.shuk-hacarmel.co.il",  description: "שוק ירקות ופירות עממי בתל אביב, עשיר בריחות, צבעים וטעמים של המטבח הישראלי." },
  { id: "2",  name: "מלון דן תל אביב", location: { lat: 32.0853, lng: 34.7681 }, categoryId: "hotels",      tags: ["parking"],           mainImage: null, images: ["https://picsum.photos/seed/hotel1/600/400", "https://picsum.photos/seed/hotel2/600/400"], phone: "03-520-2525", website: "www.danhotels.co.il",       description: "מלון יוקרה מוביל בלב תל אביב עם נוף לים התיכון ושירות אישי מעולה." },
  { id: "3",  name: "פארק הירקון",      location: { lat: 32.1023, lng: 34.8048 }, categoryId: "parks",       tags: ["family", "pets"],    mainImage: null, images: ["https://picsum.photos/seed/park1/600/400", "https://picsum.photos/seed/park2/600/400", "https://picsum.photos/seed/park3/600/400"], phone: "03-642-2828", website: "www.park-hayarkon.org.il", description: "פארק עירוני גדול לאורך נהר הירקון — מקום מנוחה ופנאי לכל תושבי העיר." },
  { id: "4",  name: "הכותל המערבי",     location: { lat: 31.7767, lng: 35.2345 }, categoryId: "sites",       tags: ["free"],              mainImage: null, images: [], phone: "02-627-1333", website: "www.thekotel.org",          description: "שרידי חומת הר הבית, המקום הקדוש ביותר ליהדות. מוקד עלייה לרגל מכל רחבי העולם." },
  { id: "5",  name: "חוף בוגרשוב",     location: { lat: 32.0618, lng: 34.7629 }, categoryId: "beaches",     tags: ["family", "water"],   mainImage: null, images: ["https://picsum.photos/seed/beach1/600/400", "https://picsum.photos/seed/beach2/600/400", "https://picsum.photos/seed/beach3/600/400"], phone: "03-724-0340", website: null,                        description: "חוף ים פופולרי בתל אביב עם חול לבן רחב ומתקני בידור לכל הגילאים." },
  { id: "6",  name: "נחל עמוד",         location: { lat: 32.9064, lng: 35.4667 }, categoryId: "trails",      tags: ["view", "water"],     mainImage: null, images: [], phone: null,          website: "www.parks.org.il",          description: "מסלול הליכה ציורי בגליל עם מפלים זורמים ומעיינות קרים לאורך כל השביל." },
  { id: "7",  name: "מסעדת אברהם",      location: { lat: 31.7783, lng: 35.2257 }, categoryId: "restaurants", tags: ["kosher", "vegan"],   mainImage: null, images: [], phone: "04-855-2222", website: null,                        description: "מסעדה מפורסמת המגישה מאכלים ים תיכוניים — אווירה חמה ומוזיקה חיה בסוף שבוע." },
  { id: "8",  name: "יערות הכרמל",      location: { lat: 32.7178, lng: 34.9894 }, categoryId: "parks",       tags: ["family", "view"],    mainImage: null, images: [], phone: "04-822-8983", website: "www.parks.org.il",          description: "יערות הכרמל בצפון ישראל מציעים שבילי הליכה, מצפורים ומוקדי טבע עשירים." },
  { id: "9",  name: "מלון קיסריה",      location: { lat: 32.4977, lng: 34.9040 }, categoryId: "hotels",      tags: ["view", "parking"],   mainImage: null, images: [], phone: "04-900-0000", website: "www.caesarhotels.co.il",    description: "מלון בוטיק אלגנטי על חוף הים עם ספא מפנק ונוף מרהיב לים התיכון." },
  { id: "10", name: "מצדה",             location: { lat: 31.3156, lng: 35.3535 }, categoryId: "sites",       tags: ["view", "free"],      mainImage: null, images: [], phone: "08-658-4207", website: "www.parks.org.il",          description: "מבצר יהודי עתיק על ראש סלע מעל ים המלח — אתר מורשת עולמי עם נוף דרמטי." },
  { id: "11", name: "חוף אכזיב",        location: { lat: 33.0426, lng: 35.1018 }, categoryId: "beaches",     tags: ["water", "family"],   mainImage: null, images: [], phone: null,          website: null,                        description: "חוף שקט וציורי בגליל המערבי עם מים צלולים ושמורת טבע ייחודית בסביבה." },
  { id: "12", name: "גן לאומי עין גדי", location: { lat: 31.4619, lng: 35.3878 }, categoryId: "parks",       tags: ["view", "water"],     mainImage: null, images: [], phone: "08-658-4285", website: "www.parks.org.il",          description: "שמורת טבע ירוקה בלב המדבר ליד ים המלח, עם מפלים, בריכות ועדרי יעלים." },
  { id: "13", name: "מסעדת הנמל חיפה", location: { lat: 32.8186, lng: 34.9997 }, categoryId: "restaurants", tags: ["view", "kosher"],    mainImage: null, images: [], phone: "04-991-0088", website: "www.namal-haifa.co.il",     description: "מסעדת דגים ופירות ים על נמל חיפה — חוויה קולינרית עם נוף מרהיב לים." },
  { id: "14", name: "חוף כינרת",        location: { lat: 32.8425, lng: 35.5617 }, categoryId: "beaches",     tags: ["water", "family"],   mainImage: null, images: [], phone: null,          website: null,                        description: "חוף נעים לאגם הכינרת עם מים שקטים ומתאים לרחצה ופנאי משפחתי." },
];
