export interface Category {
  id: string;
  name: string;     // Hebrew e.g. "מסעדות"
  color: string;    // hex e.g. "#FF5733" — used for marker gradient
  iconUrl: string | null;
}

export interface Tag {
  id: string;
  name: string;     // Hebrew e.g. "מתאים למשפחות"
}

export interface Poi {
  id: string;
  name: string;
  description: string;
  location: { lat: number; lng: number };
  mainImage: string | null;
  images: string[];       // ordered image URLs; empty = show placeholder
  phone: string | null;
  website: string | null; // domain only e.g. "www.example.co.il"
  categoryId: string;
  tags: string[];   // tag IDs
}
