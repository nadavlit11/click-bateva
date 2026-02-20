import { useState, useEffect } from 'react'
import { collection, addDoc, updateDoc, doc, serverTimestamp } from 'firebase/firestore'
import { db } from '../lib/firebase.ts'
import type { Category } from '../types/index.ts'

interface Props {
  isOpen: boolean
  onClose: () => void
  category: Category | null
  onSaved: () => void
}

interface FormState {
  name: string
  color: string
  iconUrl: string
}

const INITIAL_FORM: FormState = { name: '', color: '#16a34a', iconUrl: '' }

export function CategoryModal({ isOpen, onClose, category, onSaved }: Props) {
  const [form, setForm] = useState<FormState>(INITIAL_FORM)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (category) {
      setForm({
        name: category.name,
        color: category.color,
        iconUrl: category.iconUrl ?? '',
      })
    } else {
      setForm(INITIAL_FORM)
    }
    setError('')
  }, [category, isOpen])

  function set(field: keyof FormState, value: string) {
    setForm(prev => ({ ...prev, [field]: value }))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.name.trim()) { setError('שם הקטגוריה הוא שדה חובה'); return }

    setSaving(true)
    setError('')
    try {
      const data = {
        name: form.name.trim(),
        color: form.color,
        iconId: null,
        iconUrl: form.iconUrl.trim() || null,
        updatedAt: serverTimestamp(),
      }

      if (category?.id) {
        await updateDoc(doc(db, 'categories', category.id), data)
      } else {
        await addDoc(collection(db, 'categories'), { ...data, createdAt: serverTimestamp() })
      }
      onSaved()
    } catch (err) {
      setError('שגיאה בשמירה. נסה שוב.')
      console.error(err)
    } finally {
      setSaving(false)
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />

      {/* Modal */}
      <div className="relative bg-white rounded-xl shadow-2xl w-full max-w-md mx-4">
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-200">
          <h2 className="text-base font-semibold text-gray-900">
            {category ? 'עריכת קטגוריה' : 'הוספת קטגוריה'}
          </h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl leading-none">
            ✕
          </button>
        </div>

        <form onSubmit={handleSubmit} className="px-5 py-4 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">שם *</label>
            <input
              type="text"
              value={form.name}
              onChange={e => set('name', e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-green-500"
              placeholder="שם הקטגוריה"
              autoFocus
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">צבע</label>
            <div className="flex items-center gap-3">
              <input
                type="color"
                value={form.color}
                onChange={e => set('color', e.target.value)}
                className="w-10 h-10 rounded-lg border border-gray-300 cursor-pointer p-0.5"
              />
              <input
                type="text"
                value={form.color}
                onChange={e => set('color', e.target.value)}
                className="w-32 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-green-500 font-mono"
                placeholder="#16a34a"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">כתובת אייקון (URL)</label>
            <input
              type="url"
              value={form.iconUrl}
              onChange={e => set('iconUrl', e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-green-500"
              placeholder="https://..."
            />
          </div>

          {error && <p className="text-red-600 text-sm">{error}</p>}

          <div className="flex gap-2 pt-1">
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
