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

export interface Poi {
  id: string;
  name: string;
  description: string;
  location: { lat: number; lng: number };
  mainImage: string | null;
  images: string[];       // ordered image URLs; empty = show placeholder
  phone: string | null;
  email: string | null;
  website: string | null; // domain only e.g. "www.example.co.il"
  openingHours: string | null;
  price: string | null;
  categoryId: string;
  subcategoryIds: string[]; // category-scoped refinement IDs
}
