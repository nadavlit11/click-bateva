import { useState, useEffect, useRef } from 'react'
import { reauthenticateWithCredential, updatePassword, EmailAuthProvider } from 'firebase/auth'
import { auth } from '../lib/firebase.ts'
import { reportError } from '../lib/errorReporting.ts'
import { getStrength, isPasswordValid, PASSWORD_ERROR, strengthLabel, strengthColor, strengthWidth } from '../lib/passwordStrength.ts'

interface Props {
  isOpen: boolean
  onClose: () => void
}

export function ChangePasswordModal({ isOpen, onClose }: Props) {
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current)
    }
  }, [])

  function reset() {
    setCurrentPassword('')
    setNewPassword('')
    setConfirmPassword('')
    setError('')
    setSuccess(false)
    setSaving(false)
  }

  function handleClose() {
    if (timerRef.current) clearTimeout(timerRef.current)
    reset()
    onClose()
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')

    if (!isPasswordValid(newPassword)) {
      setError(PASSWORD_ERROR)
      return
    }

    if (newPassword !== confirmPassword) {
      setError('הסיסמאות אינן תואמות')
      return
    }

    const user = auth.currentUser
    if (!user || !user.email) {
      setError('לא נמצא משתמש מחובר')
      return
    }

    setSaving(true)

    try {
      const credential = EmailAuthProvider.credential(user.email, currentPassword)
      await reauthenticateWithCredential(user, credential)
      await updatePassword(user, newPassword)
      setSuccess(true)
      timerRef.current = setTimeout(() => {
        handleClose()
      }, 2000)
    } catch (err: unknown) {
      const firebaseError = err as { code?: string }
      if (firebaseError.code === 'auth/wrong-password' || firebaseError.code === 'auth/invalid-credential') {
        setError('הסיסמה הנוכחית שגויה')
      } else if (firebaseError.code === 'auth/too-many-requests') {
        setError('יותר מדי ניסיונות. נסה שוב מאוחר יותר')
      } else {
        setError('שגיאה בעדכון הסיסמה. נסה שנית.')
      }
      reportError(err, { source: 'ChangePasswordModal' })
    } finally {
      setSaving(false)
    }
  }

  if (!isOpen) return null

  const strength = newPassword.length > 0 ? getStrength(newPassword) : null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/40" onClick={handleClose} />

      <div className="relative bg-white rounded-xl shadow-2xl w-full max-w-sm mx-4">
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-200">
          <h2 className="text-base font-semibold text-gray-900">שינוי סיסמה</h2>
          <button onClick={handleClose} className="text-gray-400 hover:text-gray-600 text-xl leading-none">
            ✕
          </button>
        </div>

        <form onSubmit={handleSubmit} className="px-5 py-4 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">סיסמה נוכחית</label>
            <input
              type="password"
              value={currentPassword}
              onChange={e => setCurrentPassword(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-green-500"
              dir="ltr"
              autoFocus
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">סיסמה חדשה</label>
            <input
              type="password"
              value={newPassword}
              onChange={e => setNewPassword(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-green-500"
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

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">אימות סיסמה חדשה</label>
            <input
              type="password"
              value={confirmPassword}
              onChange={e => setConfirmPassword(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-green-500"
              dir="ltr"
            />
          </div>

          {error && <p className="text-red-600 text-sm">{error}</p>}
          {success && <p className="text-green-600 text-sm">הסיסמה עודכנה בהצלחה!</p>}

          <div className="flex gap-2 pt-1">
            <button
              type="submit"
              disabled={saving || success}
              className="px-5 py-2 bg-green-600 text-white text-sm font-medium rounded-lg hover:bg-green-700 disabled:opacity-50 transition-colors"
            >
              {saving ? 'שומר...' : 'שמירה'}
            </button>
            <button
              type="button"
              onClick={handleClose}
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
