import type { DayHours } from '../../../types/index'

export const DAY_KEYS = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'] as const
export const DAY_NAMES_HE: Record<string, string> = {
  sunday: 'ראשון', monday: 'שני', tuesday: 'שלישי', wednesday: 'רביעי',
  thursday: 'חמישי', friday: 'שישי', saturday: 'שבת',
}
export const DEFAULT_HOURS: DayHours = { open: '09:00', close: '17:00' }
export const EMPTY_HOURS = Object.fromEntries(DAY_KEYS.map(k => [k, null])) as Record<string, DayHours | null>

export interface FormState {
  name: string
  description: string
  lat: string
  lng: string
  images: string[]
  videos: string[]
  phone: string
  whatsapp: string
  website: string
  categoryId: string
  selectedSubcategoryIds: string[]
  iconId: string
  businessId: string
  active: boolean
  openingHours: Record<string, DayHours | null> | 'by_appointment'
  agentsPrice: string
  groupsPrice: string
  agentsActive: boolean
  groupsActive: boolean
  kashrutCertUrl: string
  menuUrl: string
  facebook: string
  contactName: string
  capacity: string
  minPeople: string
  maxPeople: string
  mapType: 'default' | 'families'
  familiesPrice: string
  color: string
  borderColor: string
  markerSize: string
  iconSize: string
  flicker: boolean
  hideBorder: boolean
  isHomeMap: boolean
}

export const INITIAL_FORM: FormState = {
  name: '',
  description: '',
  lat: '0',
  lng: '0',
  images: [],
  videos: [],
  phone: '',
  whatsapp: '',
  website: '',
  categoryId: '',
  selectedSubcategoryIds: [],
  iconId: '',
  businessId: '',
  active: true,
  openingHours: { ...EMPTY_HOURS },
  agentsPrice: '',
  groupsPrice: '',
  agentsActive: true,
  groupsActive: true,
  kashrutCertUrl: '',
  menuUrl: '',
  facebook: '',
  contactName: '',
  capacity: '',
  minPeople: '',
  maxPeople: '',
  mapType: 'default',
  familiesPrice: '',
  color: '',
  borderColor: '',
  markerSize: '',
  iconSize: '',
  flicker: false,
  hideBorder: false,
  isHomeMap: false,
}

export type SetField = (field: keyof FormState, value: FormState[typeof field]) => void
