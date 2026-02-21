import { useState, useEffect } from 'react'
import { collection, addDoc, updateDoc, doc, serverTimestamp } from 'firebase/firestore'
import { db } from '../lib/firebase.ts'
import type { Tag } from '../types/index.ts'

interface Props {
  isOpen: boolean
  onClose: () => void
  tag: Tag | null
  onSaved: () => void
}

const GROUPS = [
  { value: '',         label: 'ללא קבוצה' },
  { value: 'location', label: 'אזור' },
  { value: 'kashrut',  label: 'כשרות' },
  { value: 'price',    label: 'מחיר' },
  { value: 'audience', label: 'קהל יעד' },
]

export function TagModal({ isOpen, onClose, tag, onSaved }: Props) {
  const [name, setName] = useState('')
  const [group, setGroup] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    setName(tag?.name ?? '')
    setGroup(tag?.group ?? '')
    setError('')
  }, [tag, isOpen])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!name.trim()) { setError('שם התגית הוא שדה חובה'); return }

    setSaving(true)
    setError('')
    try {
      const data = {
        name: name.trim(),
        group: group || null,
        updatedAt: serverTimestamp(),
      }
      if (tag?.id) {
        await updateDoc(doc(db, 'tags', tag.id), data)
      } else {
        await addDoc(collection(db, 'tags'), { ...data, createdAt: serverTimestamp() })
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
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />

      <div className="relative bg-white rounded-xl shadow-2xl w-full max-w-sm mx-4">
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-200">
          <h2 className="text-base font-semibold text-gray-900">
            {tag ? 'עריכת תגית' : 'הוספת תגית'}
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
              value={name}
              onChange={e => setName(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-green-500"
              placeholder="שם התגית"
              autoFocus
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">קבוצה</label>
            <select
              value={group}
              onChange={e => setGroup(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-green-500 bg-white"
            >
              {GROUPS.map(g => (
                <option key={g.value} value={g.value}>{g.label}</option>
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
