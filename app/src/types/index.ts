export interface Category {
  id: string;
  name: string;     // Hebrew e.g. "מסעדות"
  color: string;    // hex e.g. "#FF5733" — used for marker gradient
  borderColor: string | null;  // hex — ring color around marker icon
  markerSize: number | null;   // default marker size for this category
  iconSize: number | null;     // icon size inside marker (px)
  hideBorder?: boolean;        // hide marker border ring
  iconUrl: string | null;
  order: number;
  locationless?: boolean;
}

export interface Subcategory {
  id: string;
  categoryId: string;    // which category this refinement belongs to
  group: string | null;  // e.g. "kashrut" | "price" | "audience" | null
  name: string;          // Hebrew e.g. "כשר", "זול"
  color: string | null;        // override category color
  borderColor: string | null;  // override category borderColor
  markerSize: number | null;   // override category markerSize
  iconSize: number | null;     // override category iconSize
  hideBorder?: boolean;        // override category hideBorder
  iconUrl: string | null;
}

export interface DayHours {
  open: string;   // "09:00"
  close: string;  // "17:00"
}

export interface TripPoiEntry {
  poiId: string;
  addedAt: number;   // ms timestamp for ordering within a day
  dayNumber: number; // 1-indexed day this POI belongs to
}

export interface TripDoc {
  id: string;          // Firestore document ID
  ownerId: string;
  clientName: string;
  pois: TripPoiEntry[];
  numDays: number;
  isShared: boolean;
  createdAt: number;
  updatedAt: number;
}

export interface Poi {
  id: string;
  name: string;
  description: string;
  location: { lat: number; lng: number } | null;
  mainImage: string | null;
  images: string[];       // ordered image URLs; empty = show placeholder
  videos: string[];       // external video URLs (YouTube etc.)
  phone: string | null;
  whatsapp: string | null;
  email: string | null;
  website: string | null; // domain only e.g. "www.example.co.il"
  openingHours: Record<string, DayHours | null> | string | null; // structured or legacy string
  price: string | null;
  kashrutCertUrl: string | null;
  menuUrl: string | null;
  facebook: string | null;
  categoryId: string;
  subcategoryIds: string[]; // category-scoped refinement IDs
  iconUrl: string | null;
  iconId: string | null;
  businessId: string | null;
  capacity: string | null;
  minPeople: string | null;
  maxPeople: string | null;
  color: string | null;        // override subcategory/category color
  borderColor: string | null;  // override subcategory/category borderColor
  markerSize: number | null;   // override subcategory/category markerSize
  iconSize: number | null;     // override subcategory/category iconSize
  flicker: boolean | null;     // animate-pulse on marker
  hideBorder?: boolean;        // hide marker border ring
  isHomeMap?: boolean;         // show on map when no category selected
}
