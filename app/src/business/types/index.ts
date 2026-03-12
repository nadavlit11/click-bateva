import type { DayHours } from '../../types/index'
export type { DayHours }

// Full POI shape as stored in Firestore
export interface Poi {
  id: string
  name: string
  description: string
  location: { lat: number; lng: number }
  mainImage: string         // '' means no image
  images: string[]          // ordered URLs
  videos: string[]          // video URLs
  phone: string             // '' means no phone
  whatsapp: string          // '' means no whatsapp
  email: string
  website: string           // '' means no website (domain only)
  categoryId: string
  businessId: string | null
  active: boolean
  openingHours: Record<string, DayHours | null> | string | null
  price: string | null
  kashrutCertUrl: string    // '' means no certificate
  menuUrl: string           // '' means no menu
  facebook: string          // '' means no facebook
  minPeople: string | null
  maxPeople: string | null
  capacity: string | null
  createdAt: unknown        // Firestore serverTimestamp
  updatedAt: unknown
}

// The subset of Poi fields that a business user may edit.
// Used to type the edit form state and the Firestore updateDoc payload.
export interface PoiEditableFields {
  mainImage: string         // '' means no main image
  description: string
  images: string[]          // ordered URLs after upload
  videos: string[]          // video URLs
  phone: string
  whatsapp: string          // '' means no whatsapp
  website: string
  kashrutCertUrl: string    // '' means no certificate
  menuUrl: string           // '' means no menu
  facebook: string          // '' means no facebook
  openingHours: Record<string, { open: string; close: string } | null> | 'by_appointment' | null
  price: string
  minPeople: string
  maxPeople: string
}

// Business record from the `businesses` Firestore collection
export interface Business {
  id: string
  name: string
  ownerUid: string
  associatedUserIds: string[]   // UIDs allowed to edit this business's POIs
  createdAt: unknown
  updatedAt: unknown
}

// Value stored in BusinessContext after successful auth
export interface BusinessContextValue {
  businessId: string
  businessName: string
}
