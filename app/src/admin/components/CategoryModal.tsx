import { useState, useEffect } from 'react'
import { collection, addDoc, updateDoc, doc, serverTimestamp } from 'firebase/firestore'
import { ref, getDownloadURL } from 'firebase/storage'
import { db, storage } from '../../lib/firebase.ts'
import { reportError } from '../../lib/errorReporting.ts'
import type { Category, Icon } from '../types/index.ts'
import { IconPicker } from './IconPicker.tsx'
import { ColorPickerField } from './ColorPickerField.tsx'
import { Modal } from '../../components/Modal.tsx'

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
  borderColor: string
  hideBorder: boolean
  markerSize: string
  iconSize: string
  iconId: string
  order: number
}

const INITIAL_FORM: FormState = {
  name: '', color: '#16a34a', borderColor: '#000000', hideBorder: false,
  markerSize: '', iconSize: '', iconId: '', order: 0,
}

export function CategoryModal({ isOpen, onClose, category, onSaved, icons }: Props) {
  const [form, setForm] = useState<FormState>(INITIAL_FORM)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (category) {
      setForm({
        name: category.name,
        color: category.color,
        borderColor: category.borderColor ?? '#000000',
        hideBorder: category.hideBorder ?? false,
        markerSize: category.markerSize?.toString() ?? '',
        iconSize: category.iconSize?.toString() ?? '',
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
      let iconId: string | null = category?.iconId ?? null
      let iconUrl: string | null = category?.iconUrl ?? null

      if (form.iconId && form.iconId !== category?.iconId) {
        const selectedIcon = icons.find(i => i.id === form.iconId)
        if (selectedIcon) {
          iconId = selectedIcon.id
          iconUrl = await getDownloadURL(ref(storage, selectedIcon.path))
        }
      } else if (!form.iconId && category?.iconId) {
        iconId = null
        iconUrl = null
      }

      const sizeNum = parseInt(form.markerSize, 10)
      const iconSizeNum = parseInt(form.iconSize, 10)
      const data = {
        name: form.name.trim(),
        color: form.color,
        borderColor: form.borderColor.trim() || null,
        hideBorder: form.hideBorder ? true : null,
        markerSize: form.markerSize && !isNaN(sizeNum) ? sizeNum : null,
        iconSize: form.iconSize && !isNaN(iconSizeNum) ? iconSizeNum : null,
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

  return (
    <Modal
      open={isOpen}
      onClose={onClose}
      title={category ? 'עריכת קטגוריה' : 'הוספת קטגוריה'}
      maxWidth="md"
    >
        <form onSubmit={handleSubmit} className="px-5 py-4 space-y-4 overflow-y-auto">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">שם *</label>
            <input
              type="text"
              value={form.name}
              onChange={e => set('name', e.target.value)}
              className="w-full bg-white border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-green-500"
              placeholder="שם הקטגוריה"
              autoFocus
            />
          </div>

          <ColorPickerField label="צבע" value={form.color} onChange={v => set('color', v)} allowClear={false} />

          <ColorPickerField label="צבע מסגרת" value={form.borderColor} onChange={v => set('borderColor', v)} allowClear={false} />

          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={form.hideBorder}
              onChange={e => setForm(prev => ({ ...prev, hideBorder: e.target.checked }))}
              className="accent-green-600 w-4 h-4"
            />
            <span className="text-sm text-gray-700">הסתר מסגרת</span>
          </label>

          <div className="flex gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">גודל סמן</label>
              <input
                type="number"
                value={form.markerSize}
                onChange={e => set('markerSize', e.target.value)}
                className="w-28 bg-white border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-green-500"
                placeholder="24 (ברירת מחדל)"
                min="8"
                max="128"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">גודל אייקון (%)</label>
              <input
                type="number"
                value={form.iconSize}
                onChange={e => set('iconSize', e.target.value)}
                className="w-28 bg-white border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-green-500"
                placeholder="50%"
                min="10"
                max="100"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">אייקון</label>
            <IconPicker icons={icons} value={form.iconId} onChange={v => set('iconId', v)} />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">סדר תצוגה</label>
            <input
              type="number"
              value={form.order}
              onChange={e => setForm(prev => ({ ...prev, order: parseInt(e.target.value, 10) || 0 }))}
              className="w-full bg-white border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-green-500"
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
    </Modal>
  )
}
