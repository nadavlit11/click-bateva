import { useState, useEffect } from 'react'
import { httpsCallable } from 'firebase/functions'
import { updateDoc, doc, getDoc, serverTimestamp } from 'firebase/firestore'
import { db, functions } from '../../lib/firebase.ts'
import { reportError } from '../../lib/errorReporting.ts'
import { getStrength, isPasswordValid, PASSWORD_ERROR, strengthLabel, strengthColor, strengthWidth } from '../../lib/passwordStrength.ts'
import { PasswordInput } from '../../components/PasswordInput'
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
      return 'שגיאה ביצירת המפרסם. נסה שנית.'
  }
}

export function BusinessModal({ isOpen, onClose, onSaved, business }: Props) {
  const [name, setName] = useState('')
  const [contactName, setContactName] = useState('')
  const [phone, setPhone] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [termsUrl, setTermsUrl] = useState('')
  const [termsAccepted, setTermsAccepted] = useState(false)

  const isEdit = business !== null

  useEffect(() => {
    getDoc(doc(db, 'settings', 'terms'))
      .then(snap => {
        if (snap.exists()) setTermsUrl(snap.data().businessTermsUrl ?? '')
      })
      .catch(err => reportError(err, { source: 'BusinessModal.loadTerms' }))
  }, [])

  useEffect(() => {
    if (isOpen) {
      setName(business?.name ?? '')
      setContactName(business?.contactName ?? '')
      setPhone(business?.phone ?? '')
      setEmail(business?.email ?? '')
      setPassword('')
      setError('')
      setTermsAccepted(false)
    }
  }, [isOpen, business])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()

    if (!name.trim()) { setError('שם המפרסם הוא שדה חובה'); return }
    if (!isEdit) {
      if (!email.trim()) { setError('אימייל הוא שדה חובה'); return }
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) { setError('כתובת אימייל לא תקינה'); return }
      if (!isPasswordValid(password)) { setError(PASSWORD_ERROR); return }
    }

    setSaving(true)
    setError('')

    try {
      if (isEdit) {
        await updateDoc(doc(db, 'businesses', business.id), {
          name: name.trim(),
          contactName: contactName.trim() || null,
          phone: phone.trim() || null,
          updatedAt: serverTimestamp(),
        })
        alert('המפרסם עודכן בהצלחה')
        onSaved()
      } else {
        const createBusinessUser = httpsCallable<CreateBusinessUserData, CreateBusinessUserResult>(
          functions,
          'createBusinessUser'
        )
        await createBusinessUser({ name: name.trim(), email: email.trim(), password })
        alert('המפרסם נוצר בהצלחה')
        onSaved()
      }
    } catch (err: unknown) {
      if (isEdit) {
        setError('שגיאה בעדכון המפרסם. נסה שנית.')
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
        if (strippedCode !== 'already-exists' && authCode !== 'auth/email-already-in-use') {
          reportError(err, { source: 'BusinessModal.create' })
        }
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

      <div className="relative bg-white rounded-xl shadow-2xl w-full max-w-sm mx-4 max-h-[90vh] flex flex-col">
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-200">
          <h2 className="text-base font-semibold text-gray-900">{isEdit ? 'עריכת מפרסם' : 'הוספת מפרסם'}</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl leading-none">
            ✕
          </button>
        </div>

        <form onSubmit={handleSubmit} className="px-5 py-4 space-y-4 overflow-y-auto">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">שם המפרסם *</label>
            <input
              type="text"
              value={name}
              onChange={e => setName(e.target.value)}
              className="w-full bg-white border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-green-500"
              placeholder="שם המפרסם"
              autoFocus
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">שם איש קשר</label>
            <input
              type="text"
              value={contactName}
              onChange={e => setContactName(e.target.value)}
              className="w-full bg-white border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-green-500"
              placeholder="שם איש קשר"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">טלפון</label>
            <input
              type="tel"
              value={phone}
              onChange={e => setPhone(e.target.value)}
              className="w-full bg-white border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-green-500"
              placeholder="050-1234567"
              dir="ltr"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">אימייל *</label>
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              className="w-full bg-white border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-green-500 disabled:bg-gray-100 disabled:text-gray-500"
              placeholder="email@example.com"
              dir="ltr"
              disabled={isEdit}
            />
            {isEdit && (
              <p className="text-xs text-gray-400 mt-1">לא ניתן לשנות אימייל לאחר יצירה</p>
            )}
          </div>

          {!isEdit && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">סיסמה *</label>
              <PasswordInput
                value={password}
                onChange={e => setPassword(e.target.value)}
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

          {!isEdit && termsUrl && (
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={termsAccepted}
                onChange={e => setTermsAccepted(e.target.checked)}
                className="accent-green-600 w-4 h-4"
              />
              <span className="text-sm text-gray-700">
                אני מאשר את{" "}
                <a href={termsUrl} target="_blank" rel="noopener noreferrer" className="text-blue-600 underline">
                  תנאי השימוש
                </a>
              </span>
            </label>
          )}

          {error && <p className="text-red-600 text-sm">{error}</p>}

          <div className="flex gap-2 pt-1">
            <button
              type="submit"
              disabled={saving || (!isEdit && !!termsUrl && !termsAccepted)}
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
