import { useEffect, useRef, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { doc, getDoc, updateDoc, serverTimestamp } from 'firebase/firestore'
import { ref, uploadBytesResumable, getDownloadURL } from 'firebase/storage'
import { db, storage } from '../lib/firebase.ts'
import { ImageUploader } from '../components/ImageUploader.tsx'
import type { Poi, PoiEditableFields, DayHours } from '../types/index.ts'

const DAY_KEYS = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'] as const
const DAY_NAMES_HE: Record<string, string> = {
  sunday: 'ראשון', monday: 'שני', tuesday: 'שלישי', wednesday: 'רביעי',
  thursday: 'חמישי', friday: 'שישי', saturday: 'שבת',
}

export function PoiEditPage() {
  const { poiId } = useParams<{ poiId: string }>()
  const navigate = useNavigate()
  const [poi, setPoi] = useState<Poi | null>(null)
  const [categoryName, setCategoryName] = useState('')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [uploadingMainImage, setUploadingMainImage] = useState(false)
  const mainImageRef = useRef<HTMLInputElement>(null)
  const [form, setForm] = useState<PoiEditableFields>({
    mainImage: '',
    description: '',
    images: [],
    videos: [],
    phone: '',
    email: '',
    website: '',
    kashrutCertUrl: '',
    menuUrl: '',
  })

  useEffect(() => {
    if (!poiId) return
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
          email: data.email,
          website: data.website,
          kashrutCertUrl: data.kashrutCertUrl ?? '',
          menuUrl: data.menuUrl ?? '',
        })
        if (data.categoryId) {
          getDoc(doc(db, 'categories', data.categoryId))
            .then(catSnap => { if (catSnap.exists()) setCategoryName(catSnap.data().name ?? data.categoryId) })
            .catch(() => setCategoryName(data.categoryId))
        }
        setLoading(false)
      })
      .catch(err => {
        console.error('PoiEditPage getDoc error', err)
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
      console.error('Main image upload error', err)
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
      console.error(`${field} upload error`, err)
      setError('שגיאה בהעלאת קובץ')
    }
  }

  async function handleSave() {
    if (!poiId) return
    setSaving(true)
    setError('')
    try {
      await updateDoc(doc(db, 'points_of_interest', poiId), {
        ...form,
        updatedAt: serverTimestamp(),
      })
      navigate('/')
    } catch (err) {
      console.error('PoiEditPage save error', err)
      setError('שגיאה בשמירה')
    } finally {
      setSaving(false)
    }
  }

  if (loading) return <div className="text-center py-10 text-gray-400">טוען...</div>
  if (error && !poi) return <div className="text-center py-10 text-red-500">{error}</div>

  return (
    <div className="max-w-lg mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <button onClick={() => navigate('/')} className="text-gray-500 hover:text-gray-700 text-sm">← חזרה</button>
        <h2 className="text-xl font-bold text-gray-900">{poi?.name}</h2>
      </div>

      {/* Read-only info */}
      {poi && (
        <div className="bg-gray-50 rounded-xl border border-gray-200 p-4 text-sm text-gray-600 space-y-1">
          <p><span className="font-medium text-gray-900">קטגוריה:</span> {categoryName || poi.categoryId}</p>
          <p><span className="font-medium text-gray-900">סטטוס:</span> {poi.active ? 'פעיל' : 'לא פעיל'}</p>
          {poi.openingHours && (
            <div>
              <span className="font-medium text-gray-900">שעות פתיחה:</span>
              {typeof poi.openingHours === 'string'
                ? <span className="mr-1">{poi.openingHours === 'by_appointment' ? 'בתיאום מראש' : poi.openingHours}</span>
                : (
                  <div className="mt-1 space-y-0.5">
                    {DAY_KEYS.map(day => {
                      const hours = (poi.openingHours as Record<string, DayHours | null>)[day]
                      return (
                        <div key={day} className="flex justify-between text-sm">
                          <span>{DAY_NAMES_HE[day]}</span>
                          <span dir="ltr">{hours ? `${hours.open}–${hours.close}` : 'סגור'}</span>
                        </div>
                      )
                    })}
                  </div>
                )
              }
            </div>
          )}
          {poi.price && <p><span className="font-medium text-gray-900">מחיר:</span> {poi.price}</p>}
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
          <textarea
            value={form.description}
            onChange={e => setForm(prev => ({ ...prev, description: e.target.value }))}
            rows={4}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-green-500 resize-none"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">טלפון</label>
          <input
            type="tel"
            value={form.phone}
            onChange={e => setForm(prev => ({ ...prev, phone: e.target.value }))}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-green-500"
            dir="ltr"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">אימייל</label>
          <input
            type="email"
            value={form.email}
            onChange={e => setForm(prev => ({ ...prev, email: e.target.value }))}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-green-500"
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
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-green-500"
            dir="ltr"
          />
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

        {/* Restaurant-specific: Kashrut Certificate & Menu */}
        {poi?.categoryId === 'food' && (
          <>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">תעודת כשרות</label>
              {form.kashrutCertUrl ? (
                <div className="space-y-2">
                  <img src={form.kashrutCertUrl} alt="תעודת כשרות" className="w-full max-h-48 object-cover rounded-lg border border-gray-200" />
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
                  <img src={form.menuUrl} alt="תפריט" className="w-full max-h-48 object-cover rounded-lg border border-gray-200" />
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
    </div>
  )
}
