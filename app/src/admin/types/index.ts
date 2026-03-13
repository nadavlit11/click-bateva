import type { DayHours } from '../../types/index'
export type { DayHours }

export interface MapOverrides {
  price: string | null
  active: boolean
}

export interface Poi {
  id: string
  name: string
  description: string
  location: { lat: number; lng: number } | null
  mainImage: string
  images: string[]
  videos: string[]
  phone: string
  whatsapp: string
  email: string
  website: string
  categoryId: string
  subcategoryIds: string[] // category-scoped refinement IDs
  iconId: string | null
  iconUrl: string | null
  businessId: string | null
  businessPlaceId: string | null
  businessName: string | null
  active: boolean
  openingHours: Record<string, DayHours | null> | 'by_appointment' | null
  price: string | null
  mapType: 'default' | 'families'
  linkedPoiId: string | null
  maps: {
    agents: MapOverrides
    groups: MapOverrides
  }
  kashrutCertUrl: string
  menuUrl: string
  facebook: string
  contactName: string
  capacity: string
  minPeople: string
  maxPeople: string
  color: string | null
  borderColor: string | null
  markerSize: number | null
  iconSize: number | null
  flicker: boolean | null
  hideBorder: boolean | null
  isHomeMap: boolean | null
  createdAt: unknown
  updatedAt: unknown
}

export interface Category {
  id: string
  name: string
  color: string
  borderColor: string | null
  markerSize: number | null
  iconSize: number | null
  hideBorder: boolean | null
  iconId: string | null
  iconUrl: string | null
  order: number
  locationless?: boolean
  createdAt: unknown
  updatedAt: unknown
}

export interface Subcategory {
  id: string
  categoryId: string
  group: string | null   // e.g. "kashrut" | "price" | "audience" | null
  name: string
  color: string | null
  borderColor: string | null
  markerSize: number | null
  iconSize: number | null
  hideBorder: boolean | null
  iconId: string | null
  iconUrl: string | null
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
  contactName?: string
  phone?: string
  ownerUid: string
  associatedUserIds: string[]   // UIDs allowed to edit this business's POIs
  createdAt: unknown
  updatedAt: unknown
}

// ─── CRM types ─────────────────────────────────────────────────────

export type TaskPriority = 'high' | 'medium' | 'low'

export interface CrmContact {
  id: string
  name: string
  businessName: string
  phone: string
  email: string
  createdBy: string
  createdByEmail: string
  createdAt: unknown
  updatedAt: unknown
}

export interface ActivityLogEntry {
  id: string
  text: string
  createdBy: string
  createdByEmail: string
  createdAt: unknown
}

export interface CrmTask {
  id: string
  contactId: string
  contactName: string
  title: string
  description: string
  date: unknown
  color: string
  priority: TaskPriority
  assigneeUid: string
  assigneeEmail: string
  followers: string[]
  createdBy: string
  createdByEmail: string
  completed: boolean
  createdAt: unknown
  updatedAt: unknown
}
