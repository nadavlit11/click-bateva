import { useState, useEffect } from 'react'
import { collection, onSnapshot, query, where } from 'firebase/firestore'
import { httpsCallable } from 'firebase/functions'
import { db, functions } from '../lib/firebase.ts'
import { reportError } from '../lib/errorReporting.ts'

interface ContentManager {
  id: string
  email: string
  blocked?: boolean
}

const deleteContentManagerFn = httpsCallable<{ uid: string }, { uid: string }>(functions, 'deleteContentManager')
const blockContentManagerFn = httpsCallable<{ uid: string }, { uid: string }>(functions, 'blockContentManager')

export function UsersPage() {
  const [users, setUsers] = useState<ContentManager[]>([])
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState('')
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [blockingId, setBlockingId] = useState<string | null>(null)

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

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-xl font-bold text-gray-900">מנהלי תוכן</h1>
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
    </div>
  )
}
