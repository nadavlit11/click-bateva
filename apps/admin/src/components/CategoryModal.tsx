import { useState, useEffect } from 'react'
import { collection, addDoc, updateDoc, doc, serverTimestamp } from 'firebase/firestore'
import { ref, getDownloadURL } from 'firebase/storage'
import { db, storage } from '../lib/firebase.ts'
import { reportError } from '../lib/errorReporting.ts'
import type { Category, Icon } from '../types/index.ts'

interface Props {
  isOpen: boolean
  onClose: () => void
  category: Category | null
  onSaved: () => void
  icons: Icon[]
}

interface FormState {
  name: string
  color: string
  iconId: string
  order: number
}

const INITIAL_FORM: FormState = { name: '', color: '#16a34a', iconId: '', order: 0 }

export function CategoryModal({ isOpen, onClose, category, onSaved, icons }: Props) {
  const [form, setForm] = useState<FormState>(INITIAL_FORM)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (category) {
      setForm({
        name: category.name,
        color: category.color,
        iconId: category.iconId ?? '',
        order: category.order ?? 0,
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
      let iconId: string | null = null
      let iconUrl: string | null = null

      if (form.iconId) {
        const selectedIcon = icons.find(i => i.id === form.iconId)
        if (selectedIcon) {
          iconId = selectedIcon.id
          iconUrl = await getDownloadURL(ref(storage, selectedIcon.path))
        }
      }

      const data = {
        name: form.name.trim(),
        color: form.color,
        iconId,
        iconUrl,
        order: form.order,
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
      reportError(err, { source: 'CategoryModal.save' })
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
            <label className="block text-sm font-medium text-gray-700 mb-1">אייקון</label>
            <select
              value={form.iconId}
              onChange={e => set('iconId', e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-green-500 bg-white"
            >
              <option value="">ללא אייקון</option>
              {icons.map(icon => (
                <option key={icon.id} value={icon.id}>{icon.name}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">סדר תצוגה</label>
            <input
              type="number"
              value={form.order}
              onChange={e => setForm(prev => ({ ...prev, order: parseInt(e.target.value, 10) || 0 }))}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-green-500"
              placeholder="0"
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
