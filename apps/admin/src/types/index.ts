export interface Poi {
  id: string
  name: string
  description: string
  location: { lat: number; lng: number }
  mainImage: string
  images: string[]
  videos: string[]
  phone: string
  email: string
  website: string
  categoryId: string
  tags: string[]           // location tag IDs only
  subcategoryIds: string[] // category-scoped refinement IDs
  businessId: string | null
  active: boolean
  openingHours: string | null
  price: string | null
  createdAt: unknown
  updatedAt: unknown
}

export interface Category {
  id: string
  name: string
  color: string
  iconId: string | null
  iconUrl: string | null
  createdAt: unknown
  updatedAt: unknown
}

export interface Tag {
  id: string
  name: string
  group: string | null   // "location" | null
  parentId: string | null
  createdAt: unknown
  updatedAt: unknown
}

export interface Subcategory {
  id: string
  categoryId: string
  group: string | null   // e.g. "kashrut" | "price" | "audience" | null
  name: string
  createdAt: unknown
  updatedAt: unknown
}

export interface Icon {
  id: string
  name: string
  path: string   // Storage path, e.g. 'icons/{uuid}.png'
  createdAt: unknown
}

export interface Business {
  id: string
  name: string
  email: string
  ownerUid: string
  associatedUserIds: string[]   // UIDs allowed to edit this business's POIs
  createdAt: unknown
  updatedAt: unknown
}
