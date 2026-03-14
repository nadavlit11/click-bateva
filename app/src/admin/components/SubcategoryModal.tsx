import { useState, useEffect } from 'react'
import { collection, addDoc, updateDoc, doc, serverTimestamp } from 'firebase/firestore'
import { ref, getDownloadURL } from 'firebase/storage'
import { db, storage } from '../../lib/firebase.ts'
import { reportError } from '../../lib/errorReporting.ts'
import type { Subcategory, Category, Icon } from '../types/index.ts'
import { IconPicker } from './IconPicker.tsx'
import { ColorPickerField } from './ColorPickerField.tsx'
import { Modal } from '../../components/Modal.tsx'

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
  const [color, setColor] = useState('')
  const [borderColor, setBorderColor] = useState('')
  const [markerSize, setMarkerSize] = useState('')
  const [iconSize, setIconSize] = useState('')
  const [hideBorder, setHideBorder] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    setName(subcategory?.name ?? '')
    setCategoryId(subcategory?.categoryId ?? '')
    setGroup(subcategory?.group ?? '')
    setIconId(subcategory?.iconId ?? '')
    setColor(subcategory?.color ?? '')
    setBorderColor(subcategory?.borderColor ?? '')
    setMarkerSize(subcategory?.markerSize?.toString() ?? '')
    setIconSize(subcategory?.iconSize?.toString() ?? '')
    setHideBorder(subcategory?.hideBorder ?? false)
    setError('')
  }, [subcategory, isOpen])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!name.trim()) { setError('שם הוא שדה חובה'); return }
    if (!categoryId)  { setError('יש לבחור קטגוריה'); return }

    setSaving(true)
    setError('')
    try {
      let resolvedIconId: string | null = subcategory?.iconId ?? null
      let resolvedIconUrl: string | null = subcategory?.iconUrl ?? null

      if (iconId && iconId !== subcategory?.iconId) {
        const selectedIcon = icons.find(i => i.id === iconId)
        if (selectedIcon) {
          resolvedIconId = selectedIcon.id
          resolvedIconUrl = await getDownloadURL(ref(storage, selectedIcon.path))
        }
      } else if (!iconId && subcategory?.iconId) {
        resolvedIconId = null
        resolvedIconUrl = null
      }

      const sizeNum = parseInt(markerSize, 10)
      const iconSizeNum = parseInt(iconSize, 10)
      const data = {
        name: name.trim(),
        categoryId,
        group: group || null,
        color: color.trim() || null,
        borderColor: borderColor.trim() || null,
        markerSize: markerSize && !isNaN(sizeNum) ? sizeNum : null,
        iconSize: iconSize && !isNaN(iconSizeNum) ? iconSizeNum : null,
        hideBorder: hideBorder ? true : null,
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

  return (
    <Modal
      open={isOpen}
      onClose={onClose}
      title={subcategory ? 'עריכת תת-קטגוריה' : 'הוספת תת-קטגוריה'}
    >
        <form onSubmit={handleSubmit} className="px-5 py-4 space-y-4 overflow-y-auto">
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
              className="w-full bg-white border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-green-500"
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
              className="w-full bg-white border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-green-500"
              placeholder="שם התת-קטגוריה"
              autoFocus
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">אייקון</label>
            <IconPicker icons={icons} value={iconId} onChange={setIconId} />
          </div>

          <p className="text-xs text-gray-400 mt-2 mb-1">עקיפות תצוגה (אופציונלי — עוקף הגדרות קטגוריה)</p>

          <ColorPickerField label="צבע" value={color} onChange={setColor} />
          <ColorPickerField label="צבע מסגרת" value={borderColor} onChange={setBorderColor} />

          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={hideBorder}
              onChange={e => setHideBorder(e.target.checked)}
              className="accent-green-600 w-4 h-4"
            />
            <span className="text-sm text-gray-700">הסתר מסגרת</span>
          </label>

          <div className="flex gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">גודל סמן</label>
              <input
                type="number"
                value={markerSize}
                onChange={e => setMarkerSize(e.target.value)}
                className="w-28 bg-white border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-green-500"
                placeholder="ברירת מחדל"
                min="8"
                max="128"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">גודל אייקון (%)</label>
              <input
                type="number"
                value={iconSize}
                onChange={e => setIconSize(e.target.value)}
                className="w-28 bg-white border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-green-500"
                placeholder="50%"
                min="10"
                max="100"
              />
            </div>
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
    </Modal>
  )
}
