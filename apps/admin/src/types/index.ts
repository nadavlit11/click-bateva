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
  tags: string[]
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
  createdAt: unknown
  updatedAt: unknown
}
