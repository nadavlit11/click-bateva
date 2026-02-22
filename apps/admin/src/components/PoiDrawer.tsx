import { useState, useEffect, useRef } from 'react'
import { MapPicker } from './MapPicker.tsx'
import {
  collection,
  addDoc,
  updateDoc,
  doc,
  serverTimestamp,
} from 'firebase/firestore'
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage'
import { db, storage } from '../lib/firebase.ts'
import type { Poi, Category, Subcategory, Business, DayHours } from '../types/index.ts'

const DAY_KEYS = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'] as const
const DAY_NAMES_HE: Record<string, string> = {
  sunday: 'ראשון', monday: 'שני', tuesday: 'שלישי', wednesday: 'רביעי',
  thursday: 'חמישי', friday: 'שישי', saturday: 'שבת',
}
const DEFAULT_HOURS: DayHours = { open: '09:00', close: '17:00' }
const EMPTY_HOURS = Object.fromEntries(DAY_KEYS.map(k => [k, null])) as Record<string, DayHours | null>

interface Props {
  isOpen: boolean
  onClose: () => void
  poi: Poi | null
  categories: Category[]
  subcategories: Subcategory[]
  businesses: Business[]
  onSaved: () => void
}

interface FormState {
  name: string
  description: string
  lat: string
  lng: string
  images: string[]
  videos: string[]
  phone: string
  email: string
  website: string
  categoryId: string
  selectedSubcategoryIds: string[]
  businessId: string
  active: boolean
  openingHours: Record<string, DayHours | null> | 'by_appointment'
  price: string
  kashrutCertUrl: string
  menuUrl: string
}

const INITIAL_FORM: FormState = {
  name: '',
  description: '',
  lat: '0',
  lng: '0',
  images: [],
  videos: [],
  phone: '',
  email: '',
  website: '',
  categoryId: '',
  selectedSubcategoryIds: [],
  businessId: '',
  active: true,
  openingHours: { ...EMPTY_HOURS },
  price: '',
  kashrutCertUrl: '',
  menuUrl: '',
}

export function PoiDrawer({ isOpen, onClose, poi, categories, subcategories, businesses, onSaved }: Props) {
  const [form, setForm] = useState<FormState>(INITIAL_FORM)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [uploadingImages, setUploadingImages] = useState(false)
  const [videoInput, setVideoInput] = useState('')
  const [businessSearch, setBusinessSearch] = useState('')

  const imagesRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (poi) {
      setForm({
        name: poi.name,
        description: poi.description,
        lat: poi.location.lat.toString(),
        lng: poi.location.lng.toString(),
        images: [poi.mainImage, ...poi.images].filter(Boolean),
        videos: [...poi.videos],
        phone: poi.phone,
        email: poi.email,
        website: poi.website,
        categoryId: poi.categoryId,
        selectedSubcategoryIds: [...(poi.subcategoryIds ?? [])],
        businessId: poi.businessId ?? '',
        active: poi.active,
        openingHours: poi.openingHours === 'by_appointment'
          ? 'by_appointment'
          : (typeof poi.openingHours === 'object' && poi.openingHours !== null)
            ? { ...EMPTY_HOURS, ...poi.openingHours }
            : { ...EMPTY_HOURS },
        price: poi.price ?? '',
        kashrutCertUrl: poi.kashrutCertUrl ?? '',
        menuUrl: poi.menuUrl ?? '',
      })
    } else {
      setForm(INITIAL_FORM)
    }
    setError('')
    setBusinessSearch('')
    setVideoInput('')
  }, [poi, isOpen])

  function set(field: keyof FormState, value: FormState[typeof field]) {
    setForm(prev => ({ ...prev, [field]: value }))
  }

  async function uploadFile(file: File): Promise<string> {
    const ext = file.name.split('.').pop() ?? ''
    const path = `poi-media/${crypto.randomUUID()}.${ext}`
    const storageRef = ref(storage, path)
    await uploadBytes(storageRef, file)
    return getDownloadURL(storageRef)
  }

  async function handleImagesSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? [])
    if (files.length === 0) return
    setUploadingImages(true)
    try {
      const urls = await Promise.all(files.map(f => uploadFile(f)))
      setForm(prev => ({ ...prev, images: [...prev.images, ...urls] }))
    } catch (err) {
      setError('שגיאה בהעלאת תמונות')
      console.error(err)
    } finally {
      setUploadingImages(false)
      e.target.value = ''
    }
  }

  function addVideoLink() {
    const url = videoInput.trim()
    if (!url) return
    setForm(prev => ({ ...prev, videos: [...prev.videos, url] }))
    setVideoInput('')
  }

  function removeImage(index: number) {
    setForm(prev => ({ ...prev, images: prev.images.filter((_, i) => i !== index) }))
  }

  function removeVideo(index: number) {
    setForm(prev => ({ ...prev, videos: prev.videos.filter((_, i) => i !== index) }))
  }

  function toggleSubcategory(subId: string) {
    setForm(prev => ({
      ...prev,
      selectedSubcategoryIds: prev.selectedSubcategoryIds.includes(subId)
        ? prev.selectedSubcategoryIds.filter(s => s !== subId)
        : [...prev.selectedSubcategoryIds, subId],
    }))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.name.trim()) { setError('שם הנקודה הוא שדה חובה'); return }
    if (!form.categoryId) { setError('יש לבחור קטגוריה'); return }

    setSaving(true)
    setError('')
    try {
      const allImages = form.images.filter(Boolean)
      const data = {
        name: form.name.trim(),
        description: form.description.trim(),
        location: { lat: parseFloat(form.lat) || 0, lng: parseFloat(form.lng) || 0 },
        mainImage: allImages[0] ?? '',
        images: allImages.slice(1),
        videos: form.videos.filter(Boolean),
        phone: form.phone.trim(),
        email: form.email.trim(),
        website: form.website.trim(),
        categoryId: form.categoryId,
        subcategoryIds: form.selectedSubcategoryIds,
        businessId: form.businessId.trim() || null,
        active: form.active,
        openingHours: form.openingHours === 'by_appointment'
          ? 'by_appointment'
          : Object.values(form.openingHours).every(v => v === null) ? null : form.openingHours,
        price: form.price.trim() || null,
        kashrutCertUrl: form.kashrutCertUrl.trim() || null,
        menuUrl: form.menuUrl.trim() || null,
        updatedAt: serverTimestamp(),
      }

      if (poi?.id) {
        await updateDoc(doc(db, 'points_of_interest', poi.id), data)
      } else {
        await addDoc(collection(db, 'points_of_interest'), {
          ...data,
          createdAt: serverTimestamp(),
        })
      }
      onSaved()
    } catch (err) {
      setError('שגיאה בשמירה. נסה שוב.')
      console.error(err)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className={`fixed inset-0 z-50 ${isOpen ? 'visible' : 'invisible'}`}>
      {/* Backdrop */}
      <div
        className={`absolute inset-0 bg-black/40 transition-opacity duration-300 ${isOpen ? 'opacity-100' : 'opacity-0'}`}
        onClick={onClose}
      />

      {/* Drawer panel */}
      <div
        className={`absolute top-0 right-0 h-full w-[500px] bg-white shadow-2xl flex flex-col transition-transform duration-300 ${isOpen ? 'translate-x-0' : 'translate-x-full'}`}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-200">
          <h2 className="text-base font-semibold text-gray-900">
            {poi ? 'עריכת נקודת עניין' : 'הוספת נקודת עניין'}
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 text-xl leading-none"
          >
            ✕
          </button>
        </div>

        {/* Scrollable form */}
        <form onSubmit={handleSubmit} className="flex flex-col flex-1 min-h-0">
          <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">

            {/* Name */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">שם *</label>
              <input
                type="text"
                value={form.name}
                onChange={e => set('name', e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-green-500"
                placeholder="שם הנקודה"
              />
            </div>

            {/* Category */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">קטגוריה *</label>
              <select
                value={form.categoryId}
                onChange={e => setForm(prev => ({ ...prev, categoryId: e.target.value, selectedSubcategoryIds: [] }))}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-green-500 bg-white"
              >
                <option value="">בחר קטגוריה</option>
                {categories.map(cat => (
                  <option key={cat.id} value={cat.id}>{cat.name}</option>
                ))}
              </select>
            </div>

            {/* Business */}
            {businesses.length > 0 && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">עסק משויך</label>
                <input
                  type="text"
                  value={businessSearch}
                  onChange={e => setBusinessSearch(e.target.value)}
                  placeholder="חיפוש עסק..."
                  className="w-full border border-gray-300 rounded-t-lg px-3 py-2 text-sm focus:outline-none focus:border-green-500 border-b-0"
                />
                <select
                  value={form.businessId}
                  onChange={e => set('businessId', e.target.value)}
                  size={4}
                  className="w-full border border-gray-300 rounded-b-lg px-3 py-1 text-sm focus:outline-none focus:border-green-500 bg-white"
                >
                  <option value="">— ללא עסק —</option>
                  {businesses
                    .filter(b => { const q = businessSearch.toLowerCase(); return b.name.toLowerCase().includes(q) || b.email.toLowerCase().includes(q) })
                    .map(b => (
                      <option key={b.id} value={b.id}>{b.name}</option>
                    ))
                  }
                </select>
                {form.businessId && (
                  <button
                    type="button"
                    onClick={() => set('businessId', '')}
                    className="mt-1 text-xs text-gray-400 hover:text-gray-600 underline"
                  >
                    נקה שיוך
                  </button>
                )}
              </div>
            )}

            {/* Description */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">תיאור</label>
              <textarea
                value={form.description}
                onChange={e => set('description', e.target.value)}
                rows={3}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-green-500 resize-none"
                placeholder="תיאור קצר"
              />
            </div>

            {/* Location */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">מיקום</label>
              <MapPicker
                lat={form.lat}
                lng={form.lng}
                onChange={(lat, lng) => setForm(prev => ({ ...prev, lat, lng }))}
              />
            </div>

            {/* Images */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">תמונות</label>
              <input
                ref={imagesRef}
                type="file"
                accept="image/*"
                multiple
                className="hidden"
                onChange={handleImagesSelect}
              />
              {form.images.length > 0 && (
                <div className="space-y-2 mb-2">
                  {/* First image displayed larger as the main image */}
                  <div className="relative">
                    <img
                      src={form.images[0]}
                      alt="תמונה ראשית"
                      className="w-full max-h-40 object-cover rounded-lg border-2 border-green-400"
                    />
                    <span className="absolute bottom-1 left-1 bg-green-600 text-white text-[10px] px-1.5 py-0.5 rounded">ראשית</span>
                    <button
                      type="button"
                      onClick={() => removeImage(0)}
                      className="absolute top-1 right-1 bg-white rounded-full w-5 h-5 flex items-center justify-center text-red-500 hover:text-red-700 text-xs shadow"
                    >
                      ✕
                    </button>
                  </div>
                  {/* Remaining images in grid */}
                  {form.images.length > 1 && (
                    <div className="grid grid-cols-3 gap-2">
                      {form.images.slice(1).map((url, i) => (
                        <div key={i} className="relative">
                          <img
                            src={url}
                            alt={`תמונה ${i + 2}`}
                            className="w-full h-20 object-cover rounded-lg border border-gray-200"
                          />
                          <button
                            type="button"
                            onClick={() => removeImage(i + 1)}
                            className="absolute top-1 right-1 bg-white rounded-full w-5 h-5 flex items-center justify-center text-red-500 hover:text-red-700 text-xs shadow"
                          >
                            ✕
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
              <button
                type="button"
                disabled={uploadingImages}
                onClick={() => imagesRef.current?.click()}
                className="text-green-600 hover:text-green-800 text-sm font-medium disabled:opacity-50"
              >
                {uploadingImages ? 'מעלה...' : '+ הוסף תמונות'}
              </button>
            </div>

            {/* Videos (links) */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">סרטונים (קישורים)</label>
              {form.videos.length > 0 && (
                <div className="space-y-1 mb-2">
                  {form.videos.map((url, i) => (
                    <div key={i} className="flex items-center justify-between gap-2 px-3 py-2 bg-gray-50 rounded-lg border border-gray-200">
                      <a href={url} target="_blank" rel="noopener noreferrer" className="text-sm text-blue-600 hover:text-blue-800 truncate">{url}</a>
                      <button
                        type="button"
                        onClick={() => removeVideo(i)}
                        className="text-red-500 hover:text-red-700 text-sm font-medium shrink-0"
                      >
                        הסר
                      </button>
                    </div>
                  ))}
                </div>
              )}
              <div className="flex gap-2">
                <input
                  type="url"
                  value={videoInput}
                  onChange={e => setVideoInput(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addVideoLink() } }}
                  placeholder="https://www.youtube.com/watch?v=..."
                  className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-green-500"
                />
                <button
                  type="button"
                  onClick={addVideoLink}
                  className="px-3 py-2 text-green-600 hover:text-green-800 text-sm font-medium"
                >
                  + הוסף
                </button>
              </div>
            </div>

            {/* Opening Hours */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">שעות פתיחה</label>
              <div className="flex gap-4 mb-2">
                <label className="flex items-center gap-1.5 cursor-pointer">
                  <input
                    type="radio"
                    name="hoursMode"
                    checked={form.openingHours !== 'by_appointment'}
                    onChange={() => setForm(prev => ({ ...prev, openingHours: { ...EMPTY_HOURS } }))}
                    className="accent-green-600"
                  />
                  <span className="text-sm text-gray-700">שעות קבועות</span>
                </label>
                <label className="flex items-center gap-1.5 cursor-pointer">
                  <input
                    type="radio"
                    name="hoursMode"
                    checked={form.openingHours === 'by_appointment'}
                    onChange={() => setForm(prev => ({ ...prev, openingHours: 'by_appointment' }))}
                    className="accent-green-600"
                  />
                  <span className="text-sm text-gray-700">בתיאום מראש</span>
                </label>
              </div>
              {form.openingHours !== 'by_appointment' && (
                <div className="space-y-2">
                  {DAY_KEYS.map(day => {
                    const hours = (form.openingHours as Record<string, DayHours | null>)[day]
                    const isOpen = hours !== null
                    return (
                      <div key={day} className="flex items-center gap-2">
                        <span className="text-sm text-gray-700 w-14 shrink-0">{DAY_NAMES_HE[day]}</span>
                        <label className="flex items-center gap-1 cursor-pointer shrink-0">
                          <input
                            type="checkbox"
                            checked={isOpen}
                            onChange={() =>
                              setForm(prev => ({
                                ...prev,
                                openingHours: { ...(prev.openingHours as Record<string, DayHours | null>), [day]: isOpen ? null : { ...DEFAULT_HOURS } },
                              }))
                            }
                            className="accent-green-600"
                          />
                          <span className="text-xs text-gray-500">{isOpen ? 'פתוח' : 'סגור'}</span>
                        </label>
                        {isOpen && (
                          <div className="flex items-center gap-1 flex-1" dir="ltr">
                            <input
                              type="time"
                              value={hours.open}
                              onChange={e =>
                                setForm(prev => ({
                                  ...prev,
                                  openingHours: { ...(prev.openingHours as Record<string, DayHours | null>), [day]: { ...(prev.openingHours as Record<string, DayHours | null>)[day]!, open: e.target.value } },
                                }))
                              }
                              className="border border-gray-300 rounded px-2 py-1 text-sm"
                            />
                            <span className="text-gray-400">–</span>
                            <input
                              type="time"
                              value={hours.close}
                              onChange={e =>
                                setForm(prev => ({
                                  ...prev,
                                  openingHours: { ...(prev.openingHours as Record<string, DayHours | null>), [day]: { ...(prev.openingHours as Record<string, DayHours | null>)[day]!, close: e.target.value } },
                                }))
                              }
                              className="border border-gray-300 rounded px-2 py-1 text-sm"
                            />
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>
              )}
            </div>

            {/* Price */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">מחיר</label>
              <input
                type="text"
                value={form.price}
                onChange={e => set('price', e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-green-500"
                placeholder="₪30 למבוגר, חינם לילדים"
              />
            </div>

            {/* Restaurant-specific: Kashrut Certificate & Menu */}
            {form.categoryId === 'restaurants' && (
              <>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">תעודת כשרות</label>
                  {form.kashrutCertUrl ? (
                    <div className="space-y-2">
                      <img src={form.kashrutCertUrl} alt="תעודת כשרות" className="w-full max-h-40 object-cover rounded-lg border border-gray-200" />
                      <div className="flex gap-3">
                        <label className="text-blue-600 hover:text-blue-800 text-sm font-medium cursor-pointer">
                          שנה
                          <input type="file" accept="image/*" className="hidden" onChange={async e => {
                            const file = e.target.files?.[0]; if (!file) return
                            try { const url = await uploadFile(file); set('kashrutCertUrl', url) } catch { setError('שגיאה בהעלאת תעודת כשרות') }
                            e.target.value = ''
                          }} />
                        </label>
                        <button type="button" onClick={() => set('kashrutCertUrl', '')} className="text-red-500 hover:text-red-700 text-sm font-medium">הסר</button>
                      </div>
                    </div>
                  ) : (
                    <label className="inline-block px-3 py-2 border border-gray-300 rounded-lg text-sm text-gray-600 hover:bg-gray-50 cursor-pointer transition-colors">
                      בחר תמונה
                      <input type="file" accept="image/*" className="hidden" onChange={async e => {
                        const file = e.target.files?.[0]; if (!file) return
                        try { const url = await uploadFile(file); set('kashrutCertUrl', url) } catch { setError('שגיאה בהעלאת תעודת כשרות') }
                        e.target.value = ''
                      }} />
                    </label>
                  )}
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">תפריט</label>
                  {form.menuUrl ? (
                    <div className="space-y-2">
                      <img src={form.menuUrl} alt="תפריט" className="w-full max-h-40 object-cover rounded-lg border border-gray-200" />
                      <div className="flex gap-3">
                        <label className="text-blue-600 hover:text-blue-800 text-sm font-medium cursor-pointer">
                          שנה
                          <input type="file" accept="image/*" className="hidden" onChange={async e => {
                            const file = e.target.files?.[0]; if (!file) return
                            try { const url = await uploadFile(file); set('menuUrl', url) } catch { setError('שגיאה בהעלאת תפריט') }
                            e.target.value = ''
                          }} />
                        </label>
                        <button type="button" onClick={() => set('menuUrl', '')} className="text-red-500 hover:text-red-700 text-sm font-medium">הסר</button>
                      </div>
                    </div>
                  ) : (
                    <label className="inline-block px-3 py-2 border border-gray-300 rounded-lg text-sm text-gray-600 hover:bg-gray-50 cursor-pointer transition-colors">
                      בחר תמונה
                      <input type="file" accept="image/*" className="hidden" onChange={async e => {
                        const file = e.target.files?.[0]; if (!file) return
                        try { const url = await uploadFile(file); set('menuUrl', url) } catch { setError('שגיאה בהעלאת תפריט') }
                        e.target.value = ''
                      }} />
                    </label>
                  )}
                </div>
              </>
            )}

            {/* Phone */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">טלפון</label>
              <input
                type="tel"
                value={form.phone}
                onChange={e => set('phone', e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-green-500"
                placeholder="03-000-0000"
              />
            </div>

            {/* Email */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">אימייל</label>
              <input
                type="email"
                value={form.email}
                onChange={e => set('email', e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-green-500"
                placeholder="info@example.co.il"
              />
            </div>

            {/* Website */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">אתר</label>
              <input
                type="url"
                value={form.website}
                onChange={e => set('website', e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-green-500"
                placeholder="https://www.example.co.il"
              />
            </div>

            {/* Subcategories (scoped to selected category) */}
            {form.categoryId && (() => {
              const catSubs = subcategories.filter(s => s.categoryId === form.categoryId)
              if (catSubs.length === 0) return null
              const groupOrder: Array<string | null> = []
              const seen = new Set<string | null>()
              for (const s of catSubs) {
                const g = s.group ?? null
                if (!seen.has(g)) { seen.add(g); groupOrder.push(g) }
              }
              return (
                <div className="space-y-3">
                  <label className="block text-sm font-medium text-gray-700">תת-קטגוריות</label>
                  {groupOrder.map(group => {
                    const groupSubs = catSubs.filter(s => (s.group ?? null) === group)
                    return (
                      <div key={group ?? '__null__'}>
                        {group && (
                          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-1.5">
                            {group}
                          </p>
                        )}
                        <div className="grid grid-cols-2 gap-2">
                          {groupSubs.map(sub => (
                            <label key={sub.id} className="flex items-center gap-2 cursor-pointer">
                              <input type="checkbox" checked={form.selectedSubcategoryIds.includes(sub.id)} onChange={() => toggleSubcategory(sub.id)} className="accent-green-600" />
                              <span className="text-sm text-gray-700">{sub.name}</span>
                            </label>
                          ))}
                        </div>
                      </div>
                    )
                  })}
                </div>
              )
            })()}

            {/* Active */}
            <div>
              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={form.active}
                  onChange={e => set('active', e.target.checked)}
                  className="accent-green-600 w-4 h-4"
                />
                <span className="text-sm font-medium text-gray-700">נקודה פעילה</span>
              </label>
            </div>

            {error && <p className="text-red-600 text-sm">{error}</p>}
          </div>

          {/* Footer */}
          <div className="px-5 py-4 border-t border-gray-200 flex gap-2 justify-start">
            <button
              type="submit"
              disabled={saving}
              className="px-5 py-2 bg-green-600 text-white text-sm font-medium rounded-lg hover:bg-green-700 disabled:opacity-50 transition-colors"
            >
              {saving ? 'שומר...' : 'שמירה'}
            </button>
            <button
              type="button"
              onClick={onClose}
              className="px-5 py-2 border border-gray-300 text-gray-700 text-sm font-medium rounded-lg hover:bg-gray-50 transition-colors"
            >
              ביטול
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
