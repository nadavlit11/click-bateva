import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { doc, getDoc, updateDoc, serverTimestamp } from 'firebase/firestore'
import { db } from '../lib/firebase.ts'
import { ImageUploader } from '../components/ImageUploader.tsx'
import type { Poi, PoiEditableFields } from '../types/index.ts'

export function PoiEditPage() {
  const { poiId } = useParams<{ poiId: string }>()
  const navigate = useNavigate()
  const [poi, setPoi] = useState<Poi | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [form, setForm] = useState<PoiEditableFields>({
    description: '',
    images: [],
    videos: [],
    phone: '',
    email: '',
    website: '',
  })

  useEffect(() => {
    if (!poiId) return
    getDoc(doc(db, 'points_of_interest', poiId))
      .then(snap => {
        if (!snap.exists()) { setError('נקודת עניין לא נמצאה'); setLoading(false); return }
        const data = snap.data() as Poi
        setPoi({ ...data, id: snap.id })
        setForm({
          description: data.description,
          images: data.images,
          videos: data.videos,
          phone: data.phone,
          email: data.email,
          website: data.website,
        })
        setLoading(false)
      })
      .catch(err => {
        console.error('PoiEditPage getDoc error', err)
        setError('שגיאה בטעינת נקודת העניין')
        setLoading(false)
      })
  }, [poiId])

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
          <p><span className="font-medium text-gray-900">קטגוריה:</span> {poi.categoryId}</p>
          <p><span className="font-medium text-gray-900">סטטוס:</span> {poi.active ? 'פעיל' : 'לא פעיל'}</p>
          {poi.openingHours && <p><span className="font-medium text-gray-900">שעות פתיחה:</span> {poi.openingHours}</p>}
          {poi.price && <p><span className="font-medium text-gray-900">מחיר:</span> {poi.price}</p>}
        </div>
      )}

      {/* Editable fields */}
      <div className="space-y-4">
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

        {/* Image uploader */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">תמונות</label>
          <ImageUploader
            poiId={poiId!}
            images={form.images}
            onChange={images => setForm(prev => ({ ...prev, images }))}
          />
        </div>
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
