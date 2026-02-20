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
  categoryId: string;
  tags: string[];   // tag IDs
}
