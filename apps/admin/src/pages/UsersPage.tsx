import { useState, useEffect } from 'react'
import { collection, onSnapshot, query, where } from 'firebase/firestore'
import { httpsCallable } from 'firebase/functions'
import { db, functions } from '../lib/firebase.ts'
import { reportError } from '../lib/errorReporting.ts'
import { getStrength, isPasswordValid, PASSWORD_ERROR, strengthLabel, strengthColor, strengthWidth } from '../lib/passwordStrength.ts'

interface ContentManager {
  id: string
  email: string
  blocked?: boolean
}

const deleteContentManagerFn = httpsCallable<{ uid: string }, { uid: string }>(functions, 'deleteContentManager')
const blockContentManagerFn = httpsCallable<{ uid: string }, { uid: string }>(functions, 'blockContentManager')
const createContentManagerFn = httpsCallable<{ email: string; password: string }, { uid: string }>(functions, 'createContentManager')

export function UsersPage() {
  const [users, setUsers] = useState<ContentManager[]>([])
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState('')
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [blockingId, setBlockingId] = useState<string | null>(null)
  const [showAdd, setShowAdd] = useState(false)
  const [addEmail, setAddEmail] = useState('')
  const [addPassword, setAddPassword] = useState('')
  const [addSaving, setAddSaving] = useState(false)
  const [addError, setAddError] = useState('')

  useEffect(() => {
    const q = query(collection(db, 'users'), where('role', '==', 'content_manager'))
    return onSnapshot(
      q,
      snap => {
        setUsers(snap.docs.map(d => ({ id: d.id, ...d.data() }) as ContentManager))
        setLoading(false)
      },
      () => {
        setLoadError('שגיאה בטעינת מנהלי התוכן')
        setLoading(false)
      }
    )
  }, [])

  async function handleDelete(user: ContentManager) {
    if (!window.confirm(`למחוק את המשתמש "${user.email}"? פעולה זו אינה הפיכה.`)) return
    setDeletingId(user.id)
    try {
      await deleteContentManagerFn({ uid: user.id })
    } catch (err: unknown) {
      alert('שגיאה במחיקת המשתמש')
      reportError(err, { source: 'UsersPage.delete' })
    } finally {
      setDeletingId(null)
    }
  }

  async function handleBlock(user: ContentManager) {
    if (!window.confirm(`לחסום את המשתמש "${user.email}"?`)) return
    setBlockingId(user.id)
    try {
      await blockContentManagerFn({ uid: user.id })
    } catch (err: unknown) {
      alert('שגיאה בחסימת המשתמש')
      reportError(err, { source: 'UsersPage.block' })
    } finally {
      setBlockingId(null)
    }
  }

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault()
    if (!addEmail.trim()) { setAddError('אימייל הוא שדה חובה'); return }
    if (!isPasswordValid(addPassword)) { setAddError(PASSWORD_ERROR); return }
    setAddSaving(true)
    setAddError('')
    try {
      await createContentManagerFn({ email: addEmail.trim(), password: addPassword })
      setShowAdd(false)
      setAddEmail('')
      setAddPassword('')
    } catch (err: unknown) {
      const code = (err as { code?: string }).code
      if (code === 'already-exists') {
        setAddError('כתובת האימייל כבר בשימוש')
      } else {
        setAddError('שגיאה ביצירת המשתמש')
        reportError(err, { source: 'UsersPage.add' })
      }
    } finally {
      setAddSaving(false)
    }
  }

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-xl font-bold text-gray-900">מנהלי תוכן</h1>
        <button
          onClick={() => { setShowAdd(true); setAddEmail(''); setAddPassword(''); setAddError('') }}
          className="px-4 py-2 bg-green-600 text-white text-sm font-medium rounded-lg hover:bg-green-700 transition-colors"
        >
          + הוסף מנהל תוכן
        </button>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        {loading ? (
          <div className="text-center py-10 text-gray-400">טוען...</div>
        ) : loadError ? (
          <div className="text-center py-10 text-red-500">{loadError}</div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-200 bg-gray-50">
                <th className="text-right px-4 py-3 font-medium text-gray-600">אימייל</th>
                <th className="text-right px-4 py-3 font-medium text-gray-600">סטטוס</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody>
              {users.length === 0 && (
                <tr>
                  <td colSpan={3} className="text-center py-10 text-gray-400">
                    אין מנהלי תוכן עדיין
                  </td>
                </tr>
              )}
              {users.map(user => (
                <tr key={user.id} className="border-b border-gray-100 hover:bg-gray-50">
                  <td className="px-4 py-3 font-medium text-gray-900">{user.email}</td>
                  <td className="px-4 py-3">
                    {user.blocked ? (
                      <span className="inline-block px-2 py-0.5 text-xs font-medium rounded-full bg-red-100 text-red-700">
                        חסום
                      </span>
                    ) : (
                      <span className="inline-block px-2 py-0.5 text-xs font-medium rounded-full bg-green-100 text-green-700">
                        פעיל
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-left">
                    <div className="flex gap-2 justify-end">
                      {!user.blocked && (
                        <button
                          onClick={() => handleBlock(user)}
                          disabled={blockingId === user.id}
                          className="text-xs text-gray-400 hover:text-orange-600 disabled:opacity-40"
                        >
                          {blockingId === user.id ? '...' : 'חסום'}
                        </button>
                      )}
                      <button
                        onClick={() => handleDelete(user)}
                        disabled={deletingId === user.id}
                        className="text-xs text-gray-400 hover:text-red-600 disabled:opacity-40"
                      >
                        {deletingId === user.id ? '...' : 'מחק'}
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {showAdd && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={() => setShowAdd(false)}>
          <div className="bg-white rounded-2xl p-6 w-full max-w-md" onClick={e => e.stopPropagation()}>
            <h2 className="text-lg font-bold text-gray-900 mb-4">הוסף מנהל תוכן</h2>
            <form onSubmit={handleAdd} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">אימייל *</label>
                <input
                  type="email"
                  value={addEmail}
                  onChange={e => setAddEmail(e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-400"
                  placeholder="user@example.com"
                  dir="ltr"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">סיסמה *</label>
                <input
                  type="password"
                  value={addPassword}
                  onChange={e => setAddPassword(e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-400"
                  placeholder="לפחות 8 תווים"
                  dir="ltr"
                />
                {addPassword && (
                  <div className="mt-1">
                    <div className="h-1 rounded-full bg-gray-100 overflow-hidden">
                      <div className="h-full rounded-full transition-all" style={{ width: strengthWidth(getStrength(addPassword)), background: strengthColor(getStrength(addPassword)) }} />
                    </div>
                    <p className="text-xs mt-0.5" style={{ color: strengthColor(getStrength(addPassword)) }}>{strengthLabel(getStrength(addPassword))}</p>
                  </div>
                )}
              </div>
              {addError && <p className="text-sm text-red-600">{addError}</p>}
              <div className="flex gap-3 justify-end pt-2">
                <button type="button" onClick={() => setShowAdd(false)} className="px-4 py-2 text-sm text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50">
                  ביטול
                </button>
                <button type="submit" disabled={addSaving} className="px-4 py-2 text-sm text-white bg-green-600 rounded-lg hover:bg-green-700 disabled:opacity-50">
                  {addSaving ? 'שומר...' : 'צור משתמש'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
