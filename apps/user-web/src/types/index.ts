export interface Category {
  id: string;
  name: string;     // Hebrew e.g. "מסעדות"
  color: string;    // hex e.g. "#FF5733" — used for marker gradient
  iconUrl: string | null;
}

export interface Subcategory {
  id: string;
  categoryId: string;    // which category this refinement belongs to
  group: string | null;  // e.g. "kashrut" | "price" | "audience" | null
  name: string;          // Hebrew e.g. "כשר", "זול"
}

export interface DayHours {
  open: string;   // "09:00"
  close: string;  // "17:00"
}

export interface Poi {
  id: string;
  name: string;
  description: string;
  location: { lat: number; lng: number };
  mainImage: string | null;
  images: string[];       // ordered image URLs; empty = show placeholder
  videos: string[];       // external video URLs (YouTube etc.)
  phone: string | null;
  email: string | null;
  website: string | null; // domain only e.g. "www.example.co.il"
  openingHours: Record<string, DayHours | null> | string | null; // structured or legacy string
  price: string | null;
  categoryId: string;
  subcategoryIds: string[]; // category-scoped refinement IDs
}
