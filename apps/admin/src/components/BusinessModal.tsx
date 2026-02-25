import { useState, useEffect } from 'react'
import { httpsCallable } from 'firebase/functions'
import { updateDoc, doc, serverTimestamp } from 'firebase/firestore'
import { db, functions } from '../lib/firebase.ts'
import { reportError } from '../lib/errorReporting.ts'
import { getStrength, isPasswordValid, PASSWORD_ERROR, strengthLabel, strengthColor, strengthWidth } from '../lib/passwordStrength.ts'
import type { Business } from '../types/index.ts'

interface Props {
  isOpen: boolean
  onClose: () => void
  onSaved: () => void
  business: Business | null
}

interface CreateBusinessUserData {
  name: string
  email: string
  password: string
}

interface CreateBusinessUserResult {
  uid: string
}

function mapError(code: string): string {
  switch (code) {
    case 'auth/email-already-in-use':
      return 'כתובת האימייל כבר בשימוש'
    case 'auth/weak-password':
      return PASSWORD_ERROR
    default:
      return 'שגיאה ביצירת העסק. נסה שנית.'
  }
}

export function BusinessModal({ isOpen, onClose, onSaved, business }: Props) {
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const isEdit = business !== null

  useEffect(() => {
    if (isOpen) {
      setName(business?.name ?? '')
      setEmail(business?.email ?? '')
      setPassword('')
      setError('')
    }
  }, [isOpen, business])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()

    if (!name.trim()) { setError('שם העסק הוא שדה חובה'); return }
    if (!email.trim()) { setError('האימייל הוא שדה חובה'); return }
    if (!isEdit && !isPasswordValid(password)) { setError(PASSWORD_ERROR); return }

    setSaving(true)
    setError('')

    try {
      if (isEdit) {
        await updateDoc(doc(db, 'businesses', business.id), {
          name: name.trim(),
          email: email.trim(),
          updatedAt: serverTimestamp(),
        })
        await updateDoc(doc(db, 'users', business.id), {
          email: email.trim(),
          updatedAt: serverTimestamp(),
        })
        alert('העסק עודכן בהצלחה')
        onSaved()
      } else {
        const createBusinessUser = httpsCallable<CreateBusinessUserData, CreateBusinessUserResult>(
          functions,
          'createBusinessUser'
        )
        await createBusinessUser({ name: name.trim(), email: email.trim(), password })
        alert('העסק נוצר בהצלחה')
        onSaved()
      }
    } catch (err: unknown) {
      if (isEdit) {
        setError('שגיאה בעדכון העסק. נסה שנית.')
        reportError(err, { source: 'BusinessModal.edit' })
      } else {
        const firebaseError = err as { code?: string; message?: string }
        const code = firebaseError.code ?? ''
        // Cloud Functions wrap the error code under functions/... prefix; strip it
        const strippedCode = code.replace(/^functions\//, '')
        // The actual auth error code may be in the message
        const message = firebaseError.message ?? ''
        const authCodeMatch = message.match(/\(([^)]+)\)/)
        const authCode = authCodeMatch ? authCodeMatch[1] : strippedCode
        setError(mapError(authCode))
        reportError(err, { source: 'BusinessModal.create' })
      }
    } finally {
      setSaving(false)
    }
  }

  if (!isOpen) return null

  const strength = !isEdit && password.length > 0 ? getStrength(password) : null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />

      <div className="relative bg-white rounded-xl shadow-2xl w-full max-w-sm mx-4">
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-200">
          <h2 className="text-base font-semibold text-gray-900">{isEdit ? 'עריכת עסק' : 'הוספת עסק'}</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl leading-none">
            ✕
          </button>
        </div>

        <form onSubmit={handleSubmit} className="px-5 py-4 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">שם העסק *</label>
            <input
              type="text"
              value={name}
              onChange={e => setName(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-green-500"
              placeholder="שם העסק"
              autoFocus
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">אימייל *</label>
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-green-500"
              placeholder="example@email.com"
              dir="ltr"
            />
          </div>

          {!isEdit && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">סיסמה *</label>
              <input
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-green-500"
                placeholder="לפחות 8 תווים, אות ומספר"
                dir="ltr"
              />
              {strength && (
                <div className="mt-2">
                  <div className="h-1.5 w-full bg-gray-200 rounded-full overflow-hidden">
                    <div className={`h-full rounded-full transition-all ${strengthColor[strength]} ${strengthWidth[strength]}`} />
                  </div>
                  <p className={`text-xs mt-1 ${strength === 'weak' ? 'text-red-600' : strength === 'medium' ? 'text-yellow-600' : 'text-green-600'}`}>
                    {strengthLabel[strength]}
                  </p>
                </div>
              )}
            </div>
          )}

          {error && <p className="text-red-600 text-sm">{error}</p>}

          <div className="flex gap-2 pt-1">
            <button
              type="submit"
              disabled={saving}
              className="px-5 py-2 bg-green-600 text-white text-sm font-medium rounded-lg hover:bg-green-700 disabled:opacity-50 transition-colors"
            >
              {saving ? (isEdit ? 'שומר...' : 'יוצר...') : (isEdit ? 'שמירה' : 'יצירה')}
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
