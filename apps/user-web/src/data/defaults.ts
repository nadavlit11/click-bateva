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
  { id: "1",  name: "שוק הכרמל",         location: { lat: 32.0542, lng: 34.7749 }, categoryId: "restaurants", tags: ["family", "kosher"], description: "", mainImage: null },
  { id: "2",  name: "מלון דן תל אביב",   location: { lat: 32.0853, lng: 34.7681 }, categoryId: "hotels",      tags: ["parking"],          description: "", mainImage: null },
  { id: "3",  name: "פארק הירקון",        location: { lat: 32.1023, lng: 34.8048 }, categoryId: "parks",       tags: ["family", "pets"],   description: "", mainImage: null },
  { id: "4",  name: "הכותל המערבי",       location: { lat: 31.7767, lng: 35.2345 }, categoryId: "sites",       tags: ["free"],             description: "", mainImage: null },
  { id: "5",  name: "חוף בוגרשוב",       location: { lat: 32.0618, lng: 34.7629 }, categoryId: "beaches",     tags: ["family", "water"],  description: "", mainImage: null },
  { id: "6",  name: "נחל עמוד",           location: { lat: 32.9064, lng: 35.4667 }, categoryId: "trails",      tags: ["view", "water"],    description: "", mainImage: null },
  { id: "7",  name: "מסעדת אברהם",        location: { lat: 31.7783, lng: 35.2257 }, categoryId: "restaurants", tags: ["kosher", "vegan"],  description: "", mainImage: null },
  { id: "8",  name: "יערות הכרמל",        location: { lat: 32.7178, lng: 34.9894 }, categoryId: "parks",       tags: ["family", "view"],   description: "", mainImage: null },
  { id: "9",  name: "מלון קיסריה",        location: { lat: 32.4977, lng: 34.9040 }, categoryId: "hotels",      tags: ["view", "parking"],  description: "", mainImage: null },
  { id: "10", name: "מצדה",               location: { lat: 31.3156, lng: 35.3535 }, categoryId: "sites",       tags: ["view", "free"],     description: "", mainImage: null },
  { id: "11", name: "חוף אכזיב",          location: { lat: 33.0426, lng: 35.1018 }, categoryId: "beaches",     tags: ["water", "family"],  description: "", mainImage: null },
  { id: "12", name: "גן לאומי עין גדי",   location: { lat: 31.4619, lng: 35.3878 }, categoryId: "parks",       tags: ["view", "water"],    description: "", mainImage: null },
  { id: "13", name: "מסעדת הנמל חיפה",   location: { lat: 32.8186, lng: 34.9997 }, categoryId: "restaurants", tags: ["view", "kosher"],   description: "", mainImage: null },
  { id: "14", name: "חוף כינרת",          location: { lat: 32.8425, lng: 35.5617 }, categoryId: "beaches",     tags: ["water", "family"],  description: "", mainImage: null },
];
