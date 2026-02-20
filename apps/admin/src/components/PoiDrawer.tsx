import { useState, useEffect } from 'react'
import {
  collection,
  addDoc,
  updateDoc,
  doc,
  serverTimestamp,
} from 'firebase/firestore'
import { db } from '../lib/firebase.ts'
import type { Poi, Category, Tag } from '../types/index.ts'

interface Props {
  isOpen: boolean
  onClose: () => void
  poi: Poi | null
  categories: Category[]
  tags: Tag[]
  onSaved: () => void
}

interface FormState {
  name: string
  description: string
  lat: string
  lng: string
  mainImage: string
  images: string[]
  videos: string[]
  phone: string
  email: string
  website: string
  categoryId: string
  selectedTags: string[]
  businessId: string
  active: boolean
  openingHours: string
  price: string
}

const INITIAL_FORM: FormState = {
  name: '',
  description: '',
  lat: '0',
  lng: '0',
  mainImage: '',
  images: [],
  videos: [],
  phone: '',
  email: '',
  website: '',
  categoryId: '',
  selectedTags: [],
  businessId: '',
  active: true,
  openingHours: '',
  price: '',
}

export function PoiDrawer({ isOpen, onClose, poi, categories, tags, onSaved }: Props) {
  const [form, setForm] = useState<FormState>(INITIAL_FORM)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (poi) {
      setForm({
        name: poi.name,
        description: poi.description,
        lat: poi.location.lat.toString(),
        lng: poi.location.lng.toString(),
        mainImage: poi.mainImage,
        images: [...poi.images],
        videos: [...poi.videos],
        phone: poi.phone,
        email: poi.email,
        website: poi.website,
        categoryId: poi.categoryId,
        selectedTags: [...poi.tags],
        businessId: poi.businessId ?? '',
        active: poi.active,
        openingHours: poi.openingHours ?? '',
        price: poi.price ?? '',
      })
    } else {
      setForm(INITIAL_FORM)
    }
    setError('')
  }, [poi, isOpen])

  function set(field: keyof FormState, value: FormState[typeof field]) {
    setForm(prev => ({ ...prev, [field]: value }))
  }

  function addListItem(field: 'images' | 'videos') {
    setForm(prev => ({ ...prev, [field]: [...prev[field], ''] }))
  }

  function updateListItem(field: 'images' | 'videos', index: number, value: string) {
    setForm(prev => {
      const updated = [...prev[field]]
      updated[index] = value
      return { ...prev, [field]: updated }
    })
  }

  function removeListItem(field: 'images' | 'videos', index: number) {
    setForm(prev => ({
      ...prev,
      [field]: prev[field].filter((_, i) => i !== index),
    }))
  }

  function toggleTag(tagId: string) {
    setForm(prev => ({
      ...prev,
      selectedTags: prev.selectedTags.includes(tagId)
        ? prev.selectedTags.filter(t => t !== tagId)
        : [...prev.selectedTags, tagId],
    }))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.name.trim()) { setError('שם הנקודה הוא שדה חובה'); return }
    if (!form.categoryId) { setError('יש לבחור קטגוריה'); return }

    setSaving(true)
    setError('')
    try {
      const data = {
        name: form.name.trim(),
        description: form.description.trim(),
        location: { lat: parseFloat(form.lat) || 0, lng: parseFloat(form.lng) || 0 },
        mainImage: form.mainImage.trim(),
        images: form.images.filter(Boolean),
        videos: form.videos.filter(Boolean),
        phone: form.phone.trim(),
        email: form.email.trim(),
        website: form.website.trim(),
        categoryId: form.categoryId,
        tags: form.selectedTags,
        businessId: form.businessId.trim() || null,
        active: form.active,
        openingHours: form.openingHours.trim() || null,
        price: form.price.trim() || null,
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
                onChange={e => set('categoryId', e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-green-500 bg-white"
              >
                <option value="">בחר קטגוריה</option>
                {categories.map(cat => (
                  <option key={cat.id} value={cat.id}>{cat.name}</option>
                ))}
              </select>
            </div>

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
              <div className="flex gap-2">
                <div className="flex-1">
                  <input
                    type="number"
                    step="any"
                    value={form.lat}
                    onChange={e => set('lat', e.target.value)}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-green-500"
                    placeholder="קו רוחב"
                  />
                </div>
                <div className="flex-1">
                  <input
                    type="number"
                    step="any"
                    value={form.lng}
                    onChange={e => set('lng', e.target.value)}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-green-500"
                    placeholder="קו אורך"
                  />
                </div>
              </div>
            </div>

            {/* Main Image */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">תמונה ראשית (URL)</label>
              <input
                type="url"
                value={form.mainImage}
                onChange={e => set('mainImage', e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-green-500"
                placeholder="https://..."
              />
            </div>

            {/* Additional Images */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">תמונות נוספות</label>
              <div className="space-y-2">
                {form.images.map((url, i) => (
                  <div key={i} className="flex gap-2">
                    <input
                      type="url"
                      value={url}
                      onChange={e => updateListItem('images', i, e.target.value)}
                      className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-green-500"
                      placeholder="https://..."
                    />
                    <button
                      type="button"
                      onClick={() => removeListItem('images', i)}
                      className="text-red-500 hover:text-red-700 px-2 text-sm"
                    >
                      הסר
                    </button>
                  </div>
                ))}
                <button
                  type="button"
                  onClick={() => addListItem('images')}
                  className="text-green-600 hover:text-green-800 text-sm font-medium"
                >
                  + הוסף תמונה
                </button>
              </div>
            </div>

            {/* Videos */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">סרטונים</label>
              <div className="space-y-2">
                {form.videos.map((url, i) => (
                  <div key={i} className="flex gap-2">
                    <input
                      type="url"
                      value={url}
                      onChange={e => updateListItem('videos', i, e.target.value)}
                      className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-green-500"
                      placeholder="https://..."
                    />
                    <button
                      type="button"
                      onClick={() => removeListItem('videos', i)}
                      className="text-red-500 hover:text-red-700 px-2 text-sm"
                    >
                      הסר
                    </button>
                  </div>
                ))}
                <button
                  type="button"
                  onClick={() => addListItem('videos')}
                  className="text-green-600 hover:text-green-800 text-sm font-medium"
                >
                  + הוסף סרטון
                </button>
              </div>
            </div>

            {/* Opening Hours */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">שעות פתיחה</label>
              <textarea
                value={form.openingHours}
                onChange={e => set('openingHours', e.target.value)}
                rows={2}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-green-500 resize-none"
                placeholder={'א׳–ה׳ 09:00–17:00\nשישי 09:00–13:00\nשבת סגור'}
              />
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

            {/* Tags */}
            {tags.length > 0 && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">תגיות</label>
                <div className="grid grid-cols-2 gap-2">
                  {tags.map(tag => (
                    <label key={tag.id} className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={form.selectedTags.includes(tag.id)}
                        onChange={() => toggleTag(tag.id)}
                        className="accent-green-600"
                      />
                      <span className="text-sm text-gray-700">{tag.name}</span>
                    </label>
                  ))}
                </div>
              </div>
            )}

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
