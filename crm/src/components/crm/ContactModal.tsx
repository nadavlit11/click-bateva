import { useState, useEffect } from 'react'
import {
  collection, addDoc, updateDoc, doc, serverTimestamp,
} from 'firebase/firestore'
import { db } from '../../lib/firebase.ts'
import { reportError } from '../../lib/errorReporting.ts'
import { useAuth } from '../../hooks/useAuth'
import type { CrmContact } from '../../types/index.ts'

interface Props {
  isOpen: boolean
  onClose: () => void
  contact: CrmContact | null
  onSaved: () => void
}

interface FormState {
  name: string
  businessName: string
  nameInMap: string
  phone: string
  phone2: string
  email: string
}

const INITIAL: FormState = {
  name: '',
  businessName: '',
  nameInMap: '',
  phone: '',
  phone2: '',
  email: '',
}

export function ContactModal({
  isOpen, onClose, contact, onSaved,
}: Props) {
  const { user } = useAuth()
  const [form, setForm] = useState<FormState>(INITIAL)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (contact) {
      setForm({
        name: contact.name,
        businessName: contact.businessName,
        nameInMap: contact.nameInMap || '',
        phone: contact.phone,
        phone2: contact.phone2 || '',
        email: contact.email,
      })
    } else {
      setForm(INITIAL)
    }
    setError('')
  }, [contact, isOpen])

  function set(
    field: keyof FormState, value: string,
  ) {
    setForm(prev => ({ ...prev, [field]: value }))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.name.trim()) {
      setError('שם הוא שדה חובה')
      return
    }
    setSaving(true)
    setError('')
    try {
      const data = {
        name: form.name.trim(),
        businessName: form.businessName.trim(),
        nameInMap: (form.nameInMap || '').trim(),
        phone: form.phone.trim(),
        phone2: (form.phone2 || '').trim(),
        email: form.email.trim(),
        updatedAt: serverTimestamp(),
      }
      if (contact) {
        await updateDoc(
          doc(db, 'crm_contacts', contact.id), data,
        )
      } else {
        await addDoc(collection(db, 'crm_contacts'), {
          ...data,
          createdBy: user?.uid ?? '',
          createdByEmail: user?.email ?? '',
          createdAt: serverTimestamp(),
        })
      }
      onSaved()
    } catch (err: unknown) {
      setError('שגיאה בשמירה')
      reportError(err, {
        source: 'ContactModal.handleSubmit',
      })
    } finally {
      setSaving(false)
    }
  }

  if (!isOpen) return null

  return (
    <div
      className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-2xl p-6 w-full max-w-md max-h-[90vh] overflow-y-auto"
        onClick={e => e.stopPropagation()}
      >
        <h2 className="text-lg font-bold text-gray-900 mb-4">
          {contact ? 'עריכת איש קשר' : 'איש קשר חדש'}
        </h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              שם <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={form.name}
              onChange={e => set('name', e.target.value)}
              className="w-full bg-white border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-400"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              שם העסק
            </label>
            <input
              type="text"
              value={form.businessName}
              onChange={e => set('businessName', e.target.value)}
              className="w-full bg-white border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-400"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              שם במפה
            </label>
            <input
              type="text"
              value={form.nameInMap}
              onChange={e => set('nameInMap', e.target.value)}
              className="w-full bg-white border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-400"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              טלפון
            </label>
            <input
              type="tel"
              value={form.phone}
              onChange={e => set('phone', e.target.value)}
              className="w-full bg-white border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-400"
              dir="ltr"
              placeholder="050-1234567"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              טלפון 2
            </label>
            <input
              type="tel"
              value={form.phone2}
              onChange={e => set('phone2', e.target.value)}
              className="w-full bg-white border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-400"
              dir="ltr"
              placeholder="050-1234567"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              אימייל
            </label>
            <input
              type="email"
              value={form.email}
              onChange={e => set('email', e.target.value)}
              className="w-full bg-white border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-400"
              dir="ltr"
              placeholder="email@example.com"
            />
          </div>
          {error && (
            <p className="text-sm text-red-600">{error}</p>
          )}
          <div className="flex gap-3 justify-end pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50"
            >
              ביטול
            </button>
            <button
              type="submit"
              disabled={saving}
              className="px-4 py-2 text-sm text-white bg-green-600 rounded-lg hover:bg-green-700 disabled:opacity-50"
            >
              {saving ? 'שומר...' : 'שמור'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
