import { useState, useEffect } from 'react'
import { collection, addDoc, updateDoc, doc, serverTimestamp } from 'firebase/firestore'
import { ref, getDownloadURL } from 'firebase/storage'
import { db, storage } from '../lib/firebase.ts'
import { reportError } from '../lib/errorReporting.ts'
import type { Subcategory, Category, Icon } from '../types/index.ts'

interface Props {
  isOpen: boolean
  onClose: () => void
  subcategory: Subcategory | null
  categories: Category[]
  existingGroups: string[]
  icons: Icon[]
  onSaved: () => void
}

export function SubcategoryModal({ isOpen, onClose, subcategory, categories, existingGroups, icons, onSaved }: Props) {
  const [name, setName] = useState('')
  const [categoryId, setCategoryId] = useState('')
  const [group, setGroup] = useState('')
  const [iconId, setIconId] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    setName(subcategory?.name ?? '')
    setCategoryId(subcategory?.categoryId ?? '')
    setGroup(subcategory?.group ?? '')
    setIconId(subcategory?.iconId ?? '')
    setError('')
  }, [subcategory, isOpen])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!name.trim()) { setError('שם הוא שדה חובה'); return }
    if (!categoryId)  { setError('יש לבחור קטגוריה'); return }

    setSaving(true)
    setError('')
    try {
      let resolvedIconId: string | null = null
      let resolvedIconUrl: string | null = null

      if (iconId) {
        const selectedIcon = icons.find(i => i.id === iconId)
        if (selectedIcon) {
          resolvedIconId = selectedIcon.id
          resolvedIconUrl = await getDownloadURL(ref(storage, selectedIcon.path))
        }
      }

      const data = {
        name: name.trim(),
        categoryId,
        group: group || null,
        iconId: resolvedIconId,
        iconUrl: resolvedIconUrl,
        updatedAt: serverTimestamp(),
      }
      if (subcategory?.id) {
        await updateDoc(doc(db, 'subcategories', subcategory.id), data)
      } else {
        await addDoc(collection(db, 'subcategories'), { ...data, createdAt: serverTimestamp() })
      }
      onSaved()
    } catch (err) {
      setError('שגיאה בשמירה. נסה שוב.')
      reportError(err, { source: 'SubcategoryModal.save' })
    } finally {
      setSaving(false)
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />

      <div className="relative bg-white rounded-xl shadow-2xl w-full max-w-sm mx-4">
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-200">
          <h2 className="text-base font-semibold text-gray-900">
            {subcategory ? 'עריכת תת-קטגוריה' : 'הוספת תת-קטגוריה'}
          </h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl leading-none">
            ✕
          </button>
        </div>

        <form onSubmit={handleSubmit} className="px-5 py-4 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">קטגוריה *</label>
            <select
              value={categoryId}
              onChange={e => setCategoryId(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-green-500 bg-white"
            >
              <option value="">בחר קטגוריה</option>
              {categories.map(cat => (
                <option key={cat.id} value={cat.id}>{cat.name}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">קבוצה</label>
            <input
              type="text"
              list="group-suggestions"
              value={group}
              onChange={e => setGroup(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-green-500"
              placeholder="למשל: סוג, מחיר, קהל יעד"
            />
            <datalist id="group-suggestions">
              {existingGroups.map(g => (
                <option key={g} value={g} />
              ))}
            </datalist>
            <p className="text-xs text-gray-400 mt-1">בחר מהרשימה או הקלד שם קבוצה חדשה. השאר ריק לללא קבוצה.</p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">שם *</label>
            <input
              type="text"
              value={name}
              onChange={e => setName(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-green-500"
              placeholder="שם התת-קטגוריה"
              autoFocus
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">אייקון</label>
            <select
              value={iconId}
              onChange={e => setIconId(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-green-500 bg-white"
            >
              <option value="">ללא אייקון</option>
              {icons.map(icon => (
                <option key={icon.id} value={icon.id}>{icon.name}</option>
              ))}
            </select>
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
