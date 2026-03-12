import { useEffect, useCallback, useMemo, useRef, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { doc, getDoc, updateDoc, serverTimestamp } from 'firebase/firestore'
import { ref, uploadBytesResumable, getDownloadURL } from 'firebase/storage'
import { db, storage } from '../../lib/firebase.ts'
import { reportError } from '../../lib/errorReporting.ts'
import { FOOD_CATEGORY_ID } from '../../lib/constants.ts'
import { ImageUploader } from '../components/ImageUploader.tsx'
import { PoiDetailPanel } from '../../user-web/components/MapView/PoiDetailPanel.tsx'
import type { Poi, PoiEditableFields, DayHours } from '../types/index.ts'
import type { Poi as SharedPoi, Category } from '../../types/index.ts'
import {
  DAY_KEYS, DAY_NAMES_HE, DEFAULT_HOURS, EMPTY_HOURS,
} from '../../admin/pages/poi-form/types.ts'

function VideoUrlInput({ onAdd }: { onAdd: (url: string) => void }) {
  const [value, setValue] = useState('')
  function add() {
    const trimmed = value.trim()
    if (!trimmed) return
    onAdd(trimmed)
    setValue('')
  }
  return (
    <div className="flex gap-2">
      <input
        type="url"
        value={value}
        onChange={e => setValue(e.target.value)}
        onBlur={add}
        onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); add() } }}
        placeholder="https://youtube.com/..."
        className="flex-1 bg-white border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-green-500"
        dir="ltr"
      />
      <button
        type="button"
        onClick={add}
        className="px-3 py-2 text-sm font-medium text-green-600 border border-green-300 rounded-lg hover:bg-green-50 transition-colors"
      >
        הוסף
      </button>
    </div>
  )
}

export function PoiEditPage() {
  const { poiId } = useParams<{ poiId: string }>()
  const navigate = useNavigate()
  const [poi, setPoi] = useState<Poi | null>(null)
  const [category, setCategory] = useState<Category | null>(null)
  const [showMobilePreview, setShowMobilePreview] = useState(false)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [uploadingMainImage, setUploadingMainImage] = useState(false)
  const mainImageRef = useRef<HTMLInputElement>(null)
  const descriptionRef = useRef<HTMLTextAreaElement>(null)
  const [form, setForm] = useState<PoiEditableFields>({
    mainImage: '',
    description: '',
    images: [],
    videos: [],
    phone: '',
    whatsapp: '',
    website: '',
    kashrutCertUrl: '',
    menuUrl: '',
    facebook: '',
    openingHours: null,
    price: '',
    minPeople: '',
    maxPeople: '',
  })

  useEffect(() => {
    if (!poiId) return
    setShowMobilePreview(false)
    getDoc(doc(db, 'points_of_interest', poiId))
      .then(snap => {
        if (!snap.exists()) { setError('נקודת עניין לא נמצאה'); setLoading(false); return }
        const data = snap.data() as Poi
        setPoi({ ...data, id: snap.id })
        setForm({
          mainImage: data.mainImage ?? '',
          description: data.description,
          images: data.images,
          videos: data.videos,
          phone: data.phone,
          whatsapp: data.whatsapp ?? '',
          website: data.website,
          kashrutCertUrl: data.kashrutCertUrl ?? '',
          menuUrl: data.menuUrl ?? '',
          facebook: data.facebook ?? '',
          openingHours: data.openingHours === 'by_appointment'
            ? 'by_appointment'
            : (typeof data.openingHours === 'object' && data.openingHours !== null)
              ? { ...EMPTY_HOURS, ...data.openingHours }
              : null,
          price: data.price ?? '',
          minPeople: data.minPeople ?? '',
          maxPeople: data.maxPeople ?? '',
        })
        if (data.categoryId) {
          getDoc(doc(db, 'categories', data.categoryId))
            .then(catSnap => {
              if (catSnap.exists()) {
                const d = catSnap.data()
                setCategory({
                  id: catSnap.id,
                  name: d.name ?? data.categoryId,
                  color: d.color ?? '#4caf50',
                  borderColor: d.borderColor ?? null,
                  markerSize: d.markerSize ?? null,
                  iconSize: d.iconSize ?? null,
                  iconUrl: d.iconUrl ?? null,
                  order: d.order ?? 0,
                })
              }
            })
            .catch(err => reportError(err, { source: 'PoiEditPage.loadCategory' }))
        }
        setLoading(false)
      })
      .catch(err => {
        reportError(err, { source: 'PoiEditPage.load' })
        setError('שגיאה בטעינת נקודת העניין')
        setLoading(false)
      })
  }, [poiId])

  async function handleMainImageSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file || !poiId) return
    setUploadingMainImage(true)
    setError('')
    try {
      const ext = file.name.split('.').pop() ?? 'jpg'
      const storageRef = ref(storage, `poi-media/${poiId}-main-${Date.now()}.${ext}`)
      await uploadBytesResumable(storageRef, file)
      const url = await getDownloadURL(storageRef)
      setForm(prev => ({ ...prev, mainImage: url }))
    } catch (err) {
      reportError(err, { source: 'PoiEditPage.mainImageUpload' })
      setError('שגיאה בהעלאת תמונה ראשית')
    } finally {
      setUploadingMainImage(false)
      e.target.value = ''
    }
  }

  async function handleFileUpload(file: File, field: 'kashrutCertUrl' | 'menuUrl') {
    if (!poiId) return
    setError('')
    try {
      const ext = file.name.split('.').pop() ?? 'jpg'
      const storageRef = ref(storage, `poi-media/${poiId}-${field}-${Date.now()}.${ext}`)
      await uploadBytesResumable(storageRef, file)
      const url = await getDownloadURL(storageRef)
      setForm(prev => ({ ...prev, [field]: url }))
    } catch (err) {
      reportError(err, { source: `PoiEditPage.${field}Upload` })
      setError('שגיאה בהעלאת קובץ')
    }
  }

  const insertBold = useCallback(() => {
    const ta = descriptionRef.current
    if (!ta) return
    const start = ta.selectionStart
    const end = ta.selectionEnd
    const text = form.description
    const selected = text.slice(start, end)
    const updated = text.slice(0, start) + '**' + selected + '**' + text.slice(end)
    setForm(prev => ({ ...prev, description: updated }))
    requestAnimationFrame(() => {
      ta.focus()
      ta.selectionStart = start + 2
      ta.selectionEnd = end + 2
    })
  }, [form.description])

  const previewPoi: SharedPoi | null = useMemo(() => {
    if (!poi) return null
    return {
      id: poi.id,
      name: poi.name,
      description: form.description,
      location: poi.location ?? null,
      mainImage: form.mainImage || null,
      images: form.images,
      videos: form.videos,
      phone: form.phone || null,
      whatsapp: form.whatsapp || null,
      email: null,
      website: form.website || null,
      openingHours: form.openingHours,
      price: form.price || null,
      kashrutCertUrl: form.kashrutCertUrl || null,
      menuUrl: form.menuUrl || null,
      facebook: form.facebook || null,
      categoryId: poi.categoryId,
      subcategoryIds: [],
      iconUrl: null,
      iconId: null,
      businessId: poi.businessId,
      capacity: null,
      minPeople: form.minPeople || null,
      maxPeople: form.maxPeople || null,
      color: null,
      borderColor: null,
      markerSize: null,
      iconSize: null,
      flicker: null,
    }
  }, [poi, form])

  async function handleSave() {
    if (!poiId) return
    setSaving(true)
    setError('')
    try {
      const normalizedHours = form.openingHours === 'by_appointment'
        ? 'by_appointment'
        : form.openingHours && typeof form.openingHours === 'object'
          ? (Object.values(form.openingHours).every(v => v === null) ? null : form.openingHours)
          : null
      await updateDoc(doc(db, 'points_of_interest', poiId), {
        ...form,
        openingHours: normalizedHours,
        price: form.price.trim() || null,
        minPeople: form.minPeople.trim() || null,
        maxPeople: form.maxPeople.trim() || null,
        updatedAt: serverTimestamp(),
      })
      navigate('/business/')
    } catch (err) {
      reportError(err, { source: 'PoiEditPage.save' })
      setError('שגיאה בשמירה')
    } finally {
      setSaving(false)
    }
  }

  if (loading) return <div className="text-center py-10 text-gray-400">טוען...</div>
  if (error && !poi) return <div className="text-center py-10 text-red-500">{error}</div>

  return (
    <div className="max-w-5xl mx-auto">
      <div className="flex items-center gap-3 mb-6">
        <button
          onClick={() => navigate('/business/')}
          className="px-4 py-2 text-sm font-medium text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
        >
          ← חזרה
        </button>
        <h2 className="text-xl font-bold text-gray-900">{poi?.name}</h2>
      </div>

      <div className="flex flex-col md:flex-row gap-6">
      {/* ── Form column ── */}
      <div className="flex-1 max-w-lg space-y-6">

      {/* Read-only info */}
      {poi && (
        <div className="bg-gray-50 rounded-xl border border-gray-200 p-4 text-sm text-gray-600 space-y-1">
          <p><span className="font-medium text-gray-900">קטגוריה:</span> {category?.name ?? poi.categoryId}</p>
          <p><span className="font-medium text-gray-900">סטטוס:</span> {poi.active ? 'פעיל' : 'לא פעיל'}</p>
        </div>
      )}

      {/* Editable fields */}
      <div className="space-y-4">
        {/* Main Image */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">תמונה ראשית</label>
          <input
            ref={mainImageRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={handleMainImageSelect}
          />
          {form.mainImage ? (
            <div className="space-y-2">
              <img
                src={form.mainImage}
                alt="תמונה ראשית"
                className="w-full max-h-48 object-cover rounded-lg border border-gray-200"
                loading="lazy"
                decoding="async"
              />
              <div className="flex gap-3">
                <button
                  type="button"
                  disabled={uploadingMainImage}
                  onClick={() => mainImageRef.current?.click()}
                  className="text-blue-600 hover:text-blue-800 text-sm font-medium disabled:opacity-50"
                >
                  {uploadingMainImage ? 'מעלה...' : 'שנה תמונה'}
                </button>
                <button
                  type="button"
                  onClick={() => setForm(prev => ({ ...prev, mainImage: '' }))}
                  className="text-red-500 hover:text-red-700 text-sm font-medium"
                >
                  הסר
                </button>
              </div>
            </div>
          ) : (
            <button
              type="button"
              disabled={uploadingMainImage}
              onClick={() => mainImageRef.current?.click()}
              className="px-3 py-2 border border-gray-300 rounded-lg text-sm text-gray-600 hover:bg-gray-50 disabled:opacity-50 transition-colors"
            >
              {uploadingMainImage ? 'מעלה...' : 'בחר תמונה ראשית'}
            </button>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">תיאור</label>
          <div className="flex gap-1 mb-1">
            <button
              type="button"
              onClick={insertBold}
              className="px-2 py-1 text-xs font-bold border border-gray-300 rounded hover:bg-gray-100 transition-colors"
              title="הדגשה (Bold)"
            >
              B
            </button>
          </div>
          <textarea
            ref={descriptionRef}
            value={form.description}
            onChange={e => setForm(prev => ({ ...prev, description: e.target.value }))}
            rows={4}
            className="w-full bg-white border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-green-500 resize-none"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">טלפון</label>
          <input
            type="tel"
            value={form.phone}
            onChange={e => setForm(prev => ({ ...prev, phone: e.target.value }))}
            className="w-full bg-white border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-green-500"
            dir="ltr"
          />
        </div>
        {/* WhatsApp */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">וואטסאפ</label>
          <input
            type="tel"
            value={form.whatsapp}
            onChange={e => setForm(prev => ({ ...prev, whatsapp: e.target.value }))}
            className="w-full bg-white border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-green-500"
            placeholder="050-000-0000"
            dir="ltr"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">אתר אינטרנט</label>
          <input
            type="text"
            value={form.website}
            onChange={e => setForm(prev => ({ ...prev, website: e.target.value }))}
            placeholder="example.com"
            className="w-full bg-white border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-green-500"
            dir="ltr"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">פייסבוק</label>
          <input
            type="url"
            value={form.facebook}
            onChange={e => setForm(prev => ({ ...prev, facebook: e.target.value }))}
            placeholder="https://facebook.com/businesspage"
            className="w-full bg-white border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-green-500"
            dir="ltr"
          />
        </div>

        {/* Opening Hours */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">שעות פתיחה</label>
          <div className="flex gap-4 mb-2">
            <label className="flex items-center gap-1.5 cursor-pointer">
              <input
                type="radio"
                name="hoursMode"
                checked={form.openingHours !== null && form.openingHours !== 'by_appointment'}
                onChange={() => setForm(prev => ({
                  ...prev,
                  openingHours: { ...EMPTY_HOURS },
                }))}
                className="accent-green-600"
              />
              <span className="text-sm text-gray-700">שעות פתיחה קבועות</span>
            </label>
            <label className="flex items-center gap-1.5 cursor-pointer">
              <input
                type="radio"
                name="hoursMode"
                checked={form.openingHours === 'by_appointment'}
                onChange={() => setForm(prev => ({
                  ...prev,
                  openingHours: 'by_appointment',
                }))}
                className="accent-green-600"
              />
              <span className="text-sm text-gray-700">בתיאום מראש</span>
            </label>
            <label className="flex items-center gap-1.5 cursor-pointer">
              <input
                type="radio"
                name="hoursMode"
                checked={form.openingHours === null}
                onChange={() => setForm(prev => ({
                  ...prev,
                  openingHours: null,
                }))}
                className="accent-green-600"
              />
              <span className="text-sm text-gray-700">ללא</span>
            </label>
          </div>
          {form.openingHours !== null && form.openingHours !== 'by_appointment' && (
            <div className="space-y-2">
              {DAY_KEYS.map(day => {
                const hrs = (form.openingHours as Record<string, DayHours | null>)[day]
                const isOpen = hrs !== null
                return (
                  <div key={day} className="flex items-center gap-2">
                    <span className="text-sm text-gray-700 w-14 shrink-0">{DAY_NAMES_HE[day]}</span>
                    <label className="flex items-center gap-1 cursor-pointer shrink-0">
                      <input
                        type="checkbox"
                        checked={isOpen}
                        onChange={() => setForm(prev => ({
                          ...prev,
                          openingHours: {
                            ...(prev.openingHours as Record<string, DayHours | null>),
                            [day]: isOpen ? null : { ...DEFAULT_HOURS },
                          },
                        }))}
                        className="accent-green-600"
                      />
                      <span className="text-xs text-gray-500">{isOpen ? 'פתוח' : 'סגור'}</span>
                    </label>
                    {isOpen && (
                      <div className="flex items-center gap-1 flex-1" dir="ltr">
                        <input
                          type="time"
                          value={hrs.open}
                          onChange={e => setForm(prev => ({
                            ...prev,
                            openingHours: {
                              ...(prev.openingHours as Record<string, DayHours | null>),
                              [day]: {
                                ...(prev.openingHours as Record<string, DayHours | null>)[day]!,
                                open: e.target.value,
                              },
                            },
                          }))}
                          className="border border-gray-300 rounded px-2 py-1 text-sm"
                        />
                        <span className="text-gray-400">-</span>
                        <input
                          type="time"
                          value={hrs.close}
                          onChange={e => setForm(prev => ({
                            ...prev,
                            openingHours: {
                              ...(prev.openingHours as Record<string, DayHours | null>),
                              [day]: {
                                ...(prev.openingHours as Record<string, DayHours | null>)[day]!,
                                close: e.target.value,
                              },
                            },
                          }))}
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
          <p className="text-xs text-amber-600 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2 mb-1">
            יש לציין אם המחיר כולל מע״מ או לא
          </p>
          <textarea
            value={form.price}
            onChange={e => setForm(prev => ({ ...prev, price: e.target.value }))}
            rows={2}
            className="w-full bg-white border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-green-500 resize-none"
          />
        </div>

        {/* People count */}
        <div className="flex gap-4">
          <div className="flex-1">
            <label className="block text-sm font-medium text-gray-700 mb-1">מינימום משתתפים</label>
            <input
              type="number"
              value={form.minPeople}
              onChange={e => setForm(prev => ({ ...prev, minPeople: e.target.value }))}
              className="w-full bg-white border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-green-500"
              min="0"
            />
          </div>
          <div className="flex-1">
            <label className="block text-sm font-medium text-gray-700 mb-1">מקסימום משתתפים</label>
            <input
              type="number"
              value={form.maxPeople}
              onChange={e => setForm(prev => ({ ...prev, maxPeople: e.target.value }))}
              className="w-full bg-white border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-green-500"
              min="0"
            />
          </div>
        </div>

        {/* Extra Images */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">תמונות נוספות</label>
          <ImageUploader
            poiId={poiId!}
            images={form.images}
            onChange={images => setForm(prev => ({ ...prev, images }))}
          />
        </div>

        {/* Videos */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">סרטונים</label>
          {form.videos.map((url, i) => (
            <div key={i} className="flex items-center gap-2 mb-2">
              <input
                type="text"
                value={url}
                readOnly
                className="flex-1 bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-500 truncate"
                dir="ltr"
              />
              <button
                type="button"
                onClick={() => setForm(prev => ({
                  ...prev,
                  videos: prev.videos.filter((_, j) => j !== i),
                }))}
                className="text-red-500 hover:text-red-700 text-sm font-medium shrink-0"
              >
                הסר
              </button>
            </div>
          ))}
          <VideoUrlInput onAdd={url => setForm(prev => ({
            ...prev,
            videos: [...prev.videos, url],
          }))} />
        </div>

        {/* Restaurant-specific: Kashrut Certificate & Menu — Firestore doc ID for "מסעדות וארוחות" */}
        {poi?.categoryId === FOOD_CATEGORY_ID && (
          <>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">תעודת כשרות</label>
              {form.kashrutCertUrl ? (
                <div className="space-y-2">
                  <img src={form.kashrutCertUrl} alt="תעודת כשרות" className="w-full max-h-48 object-cover rounded-lg border border-gray-200" loading="lazy" decoding="async" />
                  <div className="flex gap-3">
                    <label className="text-blue-600 hover:text-blue-800 text-sm font-medium cursor-pointer">
                      שנה
                      <input type="file" accept="image/*" className="hidden" onChange={e => {
                        const file = e.target.files?.[0]; if (!file) return
                        handleFileUpload(file, 'kashrutCertUrl'); e.target.value = ''
                      }} />
                    </label>
                    <button type="button" onClick={() => setForm(prev => ({ ...prev, kashrutCertUrl: '' }))} className="text-red-500 hover:text-red-700 text-sm font-medium">הסר</button>
                  </div>
                </div>
              ) : (
                <label className="inline-block px-3 py-2 border border-gray-300 rounded-lg text-sm text-gray-600 hover:bg-gray-50 cursor-pointer transition-colors">
                  בחר תמונה
                  <input type="file" accept="image/*" className="hidden" onChange={e => {
                    const file = e.target.files?.[0]; if (!file) return
                    handleFileUpload(file, 'kashrutCertUrl'); e.target.value = ''
                  }} />
                </label>
              )}
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">תפריט</label>
              {form.menuUrl ? (
                <div className="space-y-2">
                  <img src={form.menuUrl} alt="תפריט" className="w-full max-h-48 object-cover rounded-lg border border-gray-200" loading="lazy" decoding="async" />
                  <div className="flex gap-3">
                    <label className="text-blue-600 hover:text-blue-800 text-sm font-medium cursor-pointer">
                      שנה
                      <input type="file" accept="image/*" className="hidden" onChange={e => {
                        const file = e.target.files?.[0]; if (!file) return
                        handleFileUpload(file, 'menuUrl'); e.target.value = ''
                      }} />
                    </label>
                    <button type="button" onClick={() => setForm(prev => ({ ...prev, menuUrl: '' }))} className="text-red-500 hover:text-red-700 text-sm font-medium">הסר</button>
                  </div>
                </div>
              ) : (
                <label className="inline-block px-3 py-2 border border-gray-300 rounded-lg text-sm text-gray-600 hover:bg-gray-50 cursor-pointer transition-colors">
                  בחר תמונה
                  <input type="file" accept="image/*" className="hidden" onChange={e => {
                    const file = e.target.files?.[0]; if (!file) return
                    handleFileUpload(file, 'menuUrl'); e.target.value = ''
                  }} />
                </label>
              )}
            </div>
          </>
        )}
      </div>

      {error && <p className="text-red-600 text-sm">{error}</p>}

      <button
        onClick={handleSave}
        disabled={saving}
        className="w-full py-2.5 bg-green-600 text-white text-sm font-medium rounded-lg hover:bg-green-700 disabled:opacity-50 transition-colors"
      >
        {saving ? 'שומר...' : 'שמור שינויים'}
      </button>
      </div>{/* end form column */}

      {/* ── Desktop preview column ── */}
      {previewPoi && (
        <div className="hidden md:block w-[320px] shrink-0">
          <div className="sticky top-6">
            <p className="text-sm font-medium text-gray-500 mb-2">תצוגה מקדימה</p>
            <PoiDetailPanel
              poi={previewPoi}
              category={category ?? undefined}
              onClose={() => {}}
              preview
            />
          </div>
        </div>
      )}
      </div>{/* end flex row */}

      {/* ── Mobile preview toggle ── */}
      {previewPoi && (
        <>
          <button
            onClick={() => setShowMobilePreview(true)}
            className="md:hidden fixed bottom-6 left-6 z-20 px-4 py-2.5 bg-white text-gray-700 text-sm font-medium rounded-full shadow-lg border border-gray-200 hover:bg-gray-50 transition-colors"
          >
            👁 תצוגה מקדימה
          </button>
          {showMobilePreview && (
            <div
              className="md:hidden fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4"
              onClick={() => setShowMobilePreview(false)}
            >
              <div className="w-[300px] max-h-[80vh]" onClick={e => e.stopPropagation()}>
                <button
                  onClick={() => setShowMobilePreview(false)}
                  className="mb-2 w-full py-1.5 bg-white text-gray-600 text-sm font-medium rounded-lg shadow"
                >
                  סגור תצוגה מקדימה
                </button>
                <PoiDetailPanel
                  poi={previewPoi}
                  category={category ?? undefined}
                  onClose={() => setShowMobilePreview(false)}
                  preview
                />
              </div>
            </div>
          )}
        </>
      )}
    </div>
  )
}
