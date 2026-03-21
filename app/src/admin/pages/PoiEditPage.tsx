import { useState, useEffect, useRef } from 'react'
import { useParams, useNavigate, useLocation } from 'react-router-dom'
import { MapPicker } from '../components/MapPicker.tsx'
import {
  collection,
  addDoc,
  updateDoc,
  doc,
  getDoc,
  getDocs,
  serverTimestamp,
} from 'firebase/firestore'
import { ref, getDownloadURL } from 'firebase/storage'
import { db, storage, authReady } from '../../lib/firebase.ts'
import { reportError } from '../../lib/errorReporting.ts'
import { EnrichModal, type ApplyFields } from '../components/EnrichModal'
import { FOOD_CATEGORY_ID } from '../../lib/constants.ts'
import { useAuth } from '../../hooks/useAuth'
import type { Poi, Category, Subcategory, Icon, Business } from '../types/index.ts'
import type { FormState } from './poi-form/types.ts'
import { INITIAL_FORM, EMPTY_HOURS } from './poi-form/types.ts'
import { MediaSection } from './poi-form/MediaSection.tsx'
import { OpeningHoursSection } from './poi-form/OpeningHoursSection.tsx'
import { ContactDetailsSection } from './poi-form/ContactDetailsSection.tsx'
import { FoodExtrasSection } from './poi-form/FoodExtrasSection.tsx'
import { DisplaySettingsSection } from './poi-form/DisplaySettingsSection.tsx'

export function PoiEditPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const location = useLocation()
  const { user } = useAuth()
  const locState = location.state as {
    poisSearch?: string
    poisScrollTop?: number
    mapTab?: 'default' | 'families'
  } | null
  const poisSearch = locState?.poisSearch
  const poisScrollTop = locState?.poisScrollTop
  const poisListPath = poisSearch ? `/admin/pois?${poisSearch}` : '/admin/pois'
  const isNew = !id

  const [form, setForm] = useState<FormState>(() => ({
    ...INITIAL_FORM,
    mapType: locState?.mapTab ?? 'default',
  }))
  const [saving, setSaving] = useState(false)
  const [loading, setLoading] = useState(!isNew)
  const [error, setError] = useState('')
  const [fieldErrors, setFieldErrors] = useState<Set<string>>(new Set())
  const formScrollRef = useRef<HTMLFormElement>(null)
  const [showDuplicateConfirm, setShowDuplicateConfirm] = useState(false)
  const [duplicating, setDuplicating] = useState(false)
  const [showEnrichModal, setShowEnrichModal] = useState(false)
  const descriptionRef = useRef<HTMLTextAreaElement>(null)
  const originalIconRef = useRef<{ iconId: string | null; iconUrl: string | null }>({ iconId: null, iconUrl: null })

  const [categories, setCategories] = useState<Category[]>([])
  const [subcategories, setSubcategories] = useState<Subcategory[]>([])
  const [icons, setIcons] = useState<Icon[]>([])
  const [businesses, setBusinesses] = useState<Business[]>([])
  const [businessSearch, setBusinessSearch] = useState('')

  // Fetch categories, subcategories, and icons once on mount
  useEffect(() => {
    let cancelled = false
    authReady.then(() => {
      if (cancelled) return
      getDocs(collection(db, 'categories')).then(snap => {
        if (!cancelled) setCategories(snap.docs.map(d => ({ id: d.id, ...d.data() }) as Category))
      }).catch(err => reportError(err, { source: 'PoiEditPage.fetch' }))

      getDocs(collection(db, 'subcategories')).then(snap => {
        if (!cancelled) setSubcategories(snap.docs.map(d => ({ id: d.id, ...d.data() }) as Subcategory))
      }).catch(err => reportError(err, { source: 'PoiEditPage.fetch' }))

      getDocs(collection(db, 'icons')).then(snap => {
        if (!cancelled) setIcons(snap.docs.map(d => ({ id: d.id, ...d.data() }) as Icon))
      }).catch(err => reportError(err, { source: 'PoiEditPage.fetch' }))

      getDocs(collection(db, 'businesses')).then(snap => {
        if (!cancelled) setBusinesses(snap.docs.map(d => ({ id: d.id, ...d.data() }) as Business))
      }).catch(err => reportError(err, { source: 'PoiEditPage.fetch' }))
    })
    return () => { cancelled = true }
  }, [])

  // Load existing POI when editing
  useEffect(() => {
    if (!id) return
    setLoading(true)
    let cancelled = false
    authReady.then(() => {
      if (cancelled) return
      return getDoc(doc(db, 'points_of_interest', id))
    }).then(snap => {
      if (cancelled || !snap) return
      if (!snap.exists()) {
        setError('נקודת עניין לא נמצאה')
        setLoading(false)
        return
      }
      const poi = { id: snap.id, ...snap.data() } as Poi
      originalIconRef.current = { iconId: poi.iconId ?? null, iconUrl: poi.iconUrl ?? null }
      setForm({
        name: poi.name ?? '',
        description: poi.description ?? '',
        lat: poi.location?.lat?.toString() ?? '0',
        lng: poi.location?.lng?.toString() ?? '0',
        images: [poi.mainImage, ...poi.images].filter(Boolean),
        videos: [...poi.videos],
        phone: poi.phone ?? '',
        whatsapp: poi.whatsapp ?? '',
        website: poi.website ?? '',
        categoryId: poi.categoryId,
        selectedSubcategoryIds: [...(poi.subcategoryIds ?? [])],
        iconId: poi.iconId ?? '',
        businessId: poi.businessId ?? '',
        active: poi.active,
        openingHours: poi.openingHours === 'by_appointment'
          ? 'by_appointment'
          : (typeof poi.openingHours === 'object' && poi.openingHours !== null)
            ? { ...EMPTY_HOURS, ...poi.openingHours }
            : { ...EMPTY_HOURS },
        agentsPrice: poi.maps?.agents?.price ?? '',
        groupsPrice: poi.maps?.groups?.price ?? '',
        agentsActive: poi.maps?.agents?.active ?? true,
        groupsActive: poi.maps?.groups?.active ?? true,
        kashrutCertUrl: poi.kashrutCertUrl ?? '',
        menuUrl: poi.menuUrl ?? '',
        facebook: poi.facebook ?? '',
        contactName: poi.contactName ?? '',
        capacity: poi.capacity ?? '',
        minPeople: poi.minPeople ?? '',
        maxPeople: poi.maxPeople ?? poi.capacity ?? '',
        mapType: poi.mapType ?? 'default',
        familiesPrice: poi.mapType === 'families' ? (poi.price ?? '') : '',
        color: poi.color ?? '',
        borderColor: poi.borderColor ?? '',
        markerSize: poi.markerSize?.toString() ?? '',
        iconSize: poi.iconSize?.toString() ?? '',
        flicker: poi.flicker ?? false,
        hideBorder: poi.hideBorder ?? false,
        isHomeMap: poi.isHomeMap ?? false,
      })
      setLoading(false)
    }).catch(err => {
      reportError(err, { source: 'PoiEditPage.load' })
      if (!cancelled) {
        setError('שגיאה בטעינת נקודת עניין')
        setLoading(false)
      }
    })
    return () => { cancelled = true }
  }, [id])

  const isLocationless = categories.find(c => c.id === form.categoryId)?.locationless === true

  function set(field: keyof FormState, value: FormState[typeof field]) {
    setForm(prev => ({ ...prev, [field]: value }))
    setFieldErrors(prev => { const next = new Set(prev); next.delete(field); return next })
  }

  async function handleDuplicateToFamilies() {
    if (!id) return
    setDuplicating(true)
    try {
      const snap = await getDoc(doc(db, 'points_of_interest', id))
      if (!snap.exists()) throw new Error('POI not found')
      const source = snap.data()

      const familiesDoc = {
        name: source.name,
        description: source.description ?? '',
        location: source.location,
        mainImage: source.mainImage ?? '',
        images: source.images ?? [],
        videos: source.videos ?? [],
        phone: source.phone ?? null,
        whatsapp: source.whatsapp ?? null,
        email: source.email ?? null,
        website: source.website ?? null,
        categoryId: source.categoryId,
        subcategoryIds: source.subcategoryIds ?? [],
        iconId: source.iconId ?? null,
        iconUrl: source.iconUrl ?? null,
        businessId: source.businessId ?? null,
        active: true,
        openingHours: source.openingHours ?? null,
        price: source.maps?.groups?.price ?? source.price ?? null,
        mapType: 'families' as const,
        linkedPoiId: id,
        kashrutCertUrl: source.kashrutCertUrl ?? null,
        menuUrl: source.menuUrl ?? null,
        facebook: source.facebook ?? null,
        contactName: source.contactName ?? null,
        capacity: source.capacity ?? null,
        color: source.color ?? null,
        borderColor: source.borderColor ?? null,
        markerSize: source.markerSize ?? null,
        flicker: source.flicker ?? null,
        hideBorder: source.hideBorder ?? null,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        createdBy: user!.uid,
      }

      const newRef = await addDoc(
        collection(db, 'points_of_interest'),
        familiesDoc,
      )
      await updateDoc(doc(db, 'points_of_interest', id), {
        linkedPoiId: newRef.id,
        updatedBy: user!.uid,
      })
      setShowDuplicateConfirm(false)
      navigate(`/admin/pois/${newRef.id}`, { state: { poisScrollTop } })
    } catch (err) {
      setError('שגיאה בשכפול הנקודה')
      reportError(err, { source: 'PoiEditPage.duplicate' })
    } finally {
      setDuplicating(false)
    }
  }

  function handleEnrichApply(fields: Partial<ApplyFields>) {
    // Images/videos: append to existing arrays
    if (fields.images) {
      set('images', [...form.images, ...fields.images])
    }
    if (fields.videos) {
      set('videos', [...form.videos, ...fields.videos])
    }
    // Scalar fields: direct replace
    if (fields.phone) set('phone', fields.phone)
    if (fields.whatsapp) set('whatsapp', fields.whatsapp)
    if (fields.facebook) set('facebook', fields.facebook)
    if (fields.description) set('description', fields.description)
    if (fields.agentsPrice) set('agentsPrice', fields.agentsPrice)
    if (fields.groupsPrice) set('groupsPrice', fields.groupsPrice)
    if (fields.openingHours) set('openingHours', fields.openingHours)
    if (fields.location) {
      set('lat', fields.location.lat.toString())
      set('lng', fields.location.lng.toString())
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const t = (v: string) => (v ?? '').trim()
    const errors = new Set<string>()
    if (!t(form.name)) errors.add('name')
    if (!form.categoryId) errors.add('categoryId')
    if (!t(form.description)) errors.add('description')

    function isInvalidPhone(value: string) {
      const stripped = (value ?? '').replace(/[\s\-()]/g, '')
      return stripped.length < 9 || !/^[\d\s\-()+ ]+$/.test(t(value))
    }
    if (t(form.phone) && isInvalidPhone(form.phone)) errors.add('phone')
    if (t(form.whatsapp) && isInvalidPhone(form.whatsapp)) errors.add('whatsapp')

    if (errors.size > 0) {
      setFieldErrors(errors)
      setError('')
      const firstField = ['name', 'categoryId', 'description', 'whatsapp'].find(f => errors.has(f))
      if (firstField) {
        requestAnimationFrame(() => {
          formScrollRef.current?.querySelector<HTMLElement>(`[data-field="${firstField}"]`)?.scrollIntoView({ behavior: 'smooth', block: 'center' })
        })
      }
      return
    }
    setFieldErrors(new Set())

    setSaving(true)
    setError('')
    try {
      let resolvedIconId: string | null = originalIconRef.current.iconId
      let resolvedIconUrl: string | null = originalIconRef.current.iconUrl

      if (form.iconId && form.iconId !== originalIconRef.current.iconId) {
        const selectedIcon = icons.find(i => i.id === form.iconId)
        if (selectedIcon) {
          resolvedIconId = selectedIcon.id
          resolvedIconUrl = await getDownloadURL(ref(storage, selectedIcon.path))
        }
      } else if (!form.iconId && originalIconRef.current.iconId) {
        resolvedIconId = null
        resolvedIconUrl = null
      }

      const allImages = form.images.filter(Boolean)
      const data = {
        name: t(form.name),
        description: t(form.description),
        location: isLocationless
          ? null
          : { lat: parseFloat(form.lat) || 0, lng: parseFloat(form.lng) || 0 },
        mainImage: allImages[0] ?? '',
        images: allImages.slice(1),
        videos: form.videos.filter(Boolean),
        phone: t(form.phone) || null,
        whatsapp: t(form.whatsapp) || null,
        email: null,
        website: t(form.website) || null,
        categoryId: form.categoryId,
        subcategoryIds: form.selectedSubcategoryIds,
        iconId: resolvedIconId,
        iconUrl: resolvedIconUrl,
        businessId: form.businessId || null,
        active: form.active,
        openingHours: form.openingHours === 'by_appointment'
          ? 'by_appointment'
          : Object.values(form.openingHours).every(v => v === null) ? null : form.openingHours,
        mapType: form.mapType,
        ...(form.mapType === 'default' ? {
          maps: {
            agents: { price: t(form.agentsPrice) || null, active: form.agentsActive },
            groups: { price: null, active: form.groupsActive },
          },
        } : {
          price: null,
        }),
        kashrutCertUrl: t(form.kashrutCertUrl) || null,
        menuUrl: t(form.menuUrl) || null,
        facebook: t(form.facebook) || null,
        contactName: t(form.contactName) || null,
        capacity: t(form.capacity) || null,
        minPeople: t(form.minPeople) || null,
        maxPeople: t(form.maxPeople) || null,
        color: t(form.color) || null,
        borderColor: t(form.borderColor) || null,
        markerSize: (() => {
          const n = parseInt(form.markerSize, 10)
          return form.markerSize && !isNaN(n) ? n : null
        })(),
        iconSize: (() => {
          const n = parseInt(form.iconSize, 10)
          return form.iconSize && !isNaN(n) ? n : null
        })(),
        flicker: form.flicker ? true : null,
        hideBorder: form.hideBorder ? true : null,
        isHomeMap: form.isHomeMap ? true : null,
        updatedAt: serverTimestamp(),
        updatedBy: user!.uid,
      }

      if (id) {
        await updateDoc(doc(db, 'points_of_interest', id), data)
      } else {
        await addDoc(collection(db, 'points_of_interest'), {
          ...data,
          createdAt: serverTimestamp(),
          createdBy: user!.uid,
        })
      }
      navigate(poisListPath, { state: { poisScrollTop } })
    } catch (err) {
      setError('שגיאה בשמירה. נסה שוב.')
      reportError(err, { source: 'PoiEditPage.save' })
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return <div className="p-6 text-center text-gray-400">טוען...</div>
  }

  return (
    <div className="p-6 max-w-2xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <button
          onClick={() => navigate(poisListPath, { state: { poisScrollTop } })}
          className="px-4 py-2 text-sm font-medium text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
        >
          → חזרה
        </button>
        <h1 className="text-xl font-bold text-gray-900 flex-1">
          {isNew ? 'הוספת נקודת עניין' : 'עריכת נקודת עניין'}
          {form.mapType === 'families' && (
            <span className="mr-2 text-sm font-medium text-purple-600 bg-purple-50 px-2 py-0.5 rounded-full">
              משפחות
            </span>
          )}
        </h1>
        {!isNew && form.website && (
          <button
            type="button"
            onClick={() => setShowEnrichModal(true)}
            className="px-3 py-1.5 text-xs font-medium text-blue-700 bg-blue-50 border border-blue-200 rounded-lg hover:bg-blue-100 transition-colors"
          >
            העשרה מהאתר
          </button>
        )}
        {!isNew && form.mapType === 'default' && (
          <button
            type="button"
            onClick={() => setShowDuplicateConfirm(true)}
            className="px-3 py-1.5 text-xs font-medium text-purple-700 bg-purple-50 border border-purple-200 rounded-lg hover:bg-purple-100 transition-colors"
          >
            שכפל למפת משפחות
          </button>
        )}
      </div>

      {/* Form */}
      <form
        onSubmit={handleSubmit}
        onKeyDown={e => { if (e.key === 'Enter' && (e.target as HTMLElement).tagName !== 'TEXTAREA') e.preventDefault() }}
        ref={formScrollRef}
      >
        <div className="space-y-4">

          {/* Name */}
          <div data-field="name">
            <label className="block text-sm font-medium text-red-600 mb-1">כותרת *</label>
            <input
              type="text"
              value={form.name}
              onChange={e => set('name', e.target.value)}
              className={`w-full border-2 rounded-lg px-3 py-2 text-sm focus:outline-none bg-green-50/30 ${fieldErrors.has('name') ? 'border-red-500 bg-red-50/30 focus:border-red-500' : 'border-green-200 focus:border-green-500'}`}
              placeholder="כותרת הנקודה"
            />
            {fieldErrors.has('name') && <p className="text-red-500 text-xs mt-1">שדה חובה</p>}
          </div>

          {/* Category */}
          <div data-field="categoryId">
            <label className="block text-sm font-medium text-red-600 mb-1">קטגוריה *</label>
            <select
              value={form.categoryId}
              onChange={e => { setForm(prev => ({ ...prev, categoryId: e.target.value, selectedSubcategoryIds: [] })); setFieldErrors(prev => { const next = new Set(prev); next.delete('categoryId'); return next }) }}
              className={`w-full border-2 rounded-lg px-3 py-2 text-sm focus:outline-none bg-green-50/30 ${fieldErrors.has('categoryId') ? 'border-red-500 bg-red-50/30 focus:border-red-500' : 'border-green-200 focus:border-green-500'}`}
            >
              <option value="">בחר קטגוריה</option>
              {categories.map(cat => (
                <option key={cat.id} value={cat.id}>{cat.name}</option>
              ))}
            </select>
            {fieldErrors.has('categoryId') && <p className="text-red-500 text-xs mt-1">יש לבחור קטגוריה</p>}
          </div>

          {/* Subcategory (scoped to selected category) */}
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
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">תת-קטגוריה</label>
                <select
                  value={form.selectedSubcategoryIds[0] ?? ''}
                  onChange={e => setForm(prev => ({ ...prev, selectedSubcategoryIds: e.target.value ? [e.target.value] : [] }))}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-green-500 bg-white"
                >
                  <option value="">— ללא תת-קטגוריה —</option>
                  {groupOrder.map(group => {
                    const groupSubs = catSubs.filter(s => (s.group ?? null) === group)
                    if (group) {
                      return (
                        <optgroup key={group} label={group}>
                          {groupSubs.map(sub => (
                            <option key={sub.id} value={sub.id}>{sub.name}</option>
                          ))}
                        </optgroup>
                      )
                    }
                    return groupSubs.map(sub => (
                      <option key={sub.id} value={sub.id}>{sub.name}</option>
                    ))
                  })}
                </select>
              </div>
            )
          })()}

          {/* Business */}
          {businesses.length > 0 && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">עסק משויך</label>
              <select
                value={form.businessId}
                onChange={e => set('businessId', e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-green-500 bg-white"
              >
                <option value="">— ללא עסק —</option>
                {(() => {
                  const showSearch = businesses.length > 10
                  const q = showSearch ? businessSearch.toLowerCase() : ''
                  return businesses
                    .filter(b => !q || b.name.toLowerCase().includes(q) || b.email.toLowerCase().includes(q))
                    .map(b => (
                      <option key={b.id} value={b.id}>{b.name}</option>
                    ))
                })()}
              </select>
              {businesses.length > 10 && (
                <input
                  type="text"
                  value={businessSearch}
                  onChange={e => setBusinessSearch(e.target.value)}
                  placeholder="סינון עסקים..."
                  className="w-full bg-white border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-green-500 mt-1"
                />
              )}
              {form.businessId && (
                <button
                  type="button"
                  onClick={() => set('businessId', '')}
                  className="mt-1 text-xs text-red-500 hover:text-red-700"
                >
                  נקה שיוך
                </button>
              )}
            </div>
          )}

          {/* Description */}
          <div data-field="description">
            <label className="block text-sm font-medium text-red-600 mb-1">תיאור *</label>
            <div className="flex gap-1 mb-1">
              <button
                type="button"
                onClick={() => {
                  const textarea = descriptionRef.current
                  if (!textarea) return
                  const start = textarea.selectionStart
                  const end = textarea.selectionEnd
                  const text = form.description
                  const before = text.slice(0, start)
                  const selected = text.slice(start, end)
                  const after = text.slice(end)
                  const newText = selected ? `${before}**${selected}**${after}` : `${before}****${after}`
                  set('description', newText)
                  requestAnimationFrame(() => {
                    textarea.focus()
                    const cursorPos = selected ? end + 4 : start + 2
                    textarea.setSelectionRange(cursorPos, cursorPos)
                  })
                }}
                className="px-2 py-0.5 text-xs font-bold border border-gray-300 rounded hover:bg-gray-100"
                title="הדגש טקסט נבחר"
              >
                B
              </button>
            </div>
            <textarea
              ref={descriptionRef}
              value={form.description}
              onChange={e => set('description', e.target.value)}
              rows={3}
              className={`w-full border-2 rounded-lg px-3 py-2 text-sm focus:outline-none resize-none bg-green-50/30 ${fieldErrors.has('description') ? 'border-red-500 bg-red-50/30 focus:border-red-500' : 'border-green-200 focus:border-green-500'}`}
              placeholder="תיאור קצר"
            />
            {fieldErrors.has('description') && <p className="text-red-500 text-xs mt-1">שדה חובה</p>}
          </div>

          {/* Location */}
          {isLocationless ? (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-sm text-blue-700">
              קטגוריה ללא מיקום קבוע — לא נדרש מיקום
            </div>
          ) : (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">מיקום</label>
              <MapPicker
                lat={form.lat}
                lng={form.lng}
                onChange={(lat, lng) => setForm(prev => ({ ...prev, lat, lng }))}
              />
            </div>
          )}

          <MediaSection
            form={form}
            setForm={setForm}
            fieldErrors={fieldErrors}
            setFieldErrors={setFieldErrors}
            setError={setError}
          />

          <OpeningHoursSection form={form} setForm={setForm} />

          {/* Price — agents only */}
          {form.mapType === 'default' && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">מחיר סוכנים</label>
              <input
                type="text"
                value={form.agentsPrice}
                onChange={e => set('agentsPrice', e.target.value)}
                className="w-full bg-white border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-green-500"
                placeholder="₪30 למבוגר, חינם לילדים"
              />
            </div>
          )}

          {/* Restaurant-specific: Kashrut Certificate & Menu */}
          {form.categoryId === FOOD_CATEGORY_ID && (
            <FoodExtrasSection
              kashrutCertUrl={form.kashrutCertUrl}
              menuUrl={form.menuUrl}
              set={set}
              setError={setError}
            />
          )}

          <ContactDetailsSection form={form} set={set} fieldErrors={fieldErrors} />

          <DisplaySettingsSection form={form} set={set} icons={icons} />

          {/* Save-time error */}
          {error && <p className="text-red-600 text-sm font-medium bg-red-50 border border-red-200 rounded-lg px-3 py-2">{error}</p>}

          {/* Save / Cancel */}
          <div className="pt-4 border-t border-gray-200 flex gap-2 justify-start">
            <button
              type="submit"
              disabled={saving}
              className="px-5 py-2 bg-green-600 text-white text-sm font-medium rounded-lg hover:bg-green-700 disabled:opacity-50 transition-colors"
            >
              {saving ? 'שומר...' : 'שמירה'}
            </button>
            <button
              type="button"
              onClick={() => navigate(poisListPath, { state: { poisScrollTop } })}
              className="px-5 py-2 border border-gray-300 text-gray-700 text-sm font-medium rounded-lg hover:bg-gray-50 transition-colors"
            >
              ביטול
            </button>
          </div>
        </div>
      </form>

      {/* Enrich from website modal */}
      <EnrichModal
        isOpen={showEnrichModal}
        onClose={() => setShowEnrichModal(false)}
        onApply={handleEnrichApply}
        website={form.website}
        poiName={form.name}
        poiId={id || ''}
        currentData={{
          phone: form.phone,
          whatsapp: form.whatsapp,
          facebook: form.facebook,
          price: form.agentsPrice,
          description: form.description,
          openingHours: form.openingHours,
          lat: form.lat,
          lng: form.lng,
        }}
      />

      {/* Duplicate to families confirmation */}
      {showDuplicateConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/40" onClick={() => setShowDuplicateConfirm(false)} />
          <div className="relative bg-white rounded-xl shadow-xl p-6 max-w-sm w-full mx-4">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">שכפול למפת משפחות</h3>
            <p className="text-sm text-gray-600 mb-4">
              ייווצר עותק עצמאי של הנקודה במפת משפחות. שינויים באחד לא ישפיעו על השני.
            </p>
            <div className="flex gap-2 justify-end">
              <button
                onClick={() => setShowDuplicateConfirm(false)}
                className="px-4 py-2 border border-gray-300 text-gray-700 text-sm font-medium rounded-lg hover:bg-gray-50"
              >
                ביטול
              </button>
              <button
                onClick={() => handleDuplicateToFamilies().catch(err => reportError(err, { source: 'PoiEditPage.duplicate' }))}
                disabled={duplicating}
                className="px-4 py-2 bg-purple-600 text-white text-sm font-medium rounded-lg hover:bg-purple-700 disabled:opacity-50"
              >
                {duplicating ? 'משכפל...' : 'שכפל'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
