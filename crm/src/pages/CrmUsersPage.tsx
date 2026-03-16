import { useState } from 'react'
import { collection, onSnapshot, query, where, doc, updateDoc } from 'firebase/firestore'
import { httpsCallable } from 'firebase/functions'
import { db, functions } from '../lib/firebase.ts'
import { useAuthEffect } from '../hooks/useAuthSnapshot.ts'
import { reportError } from '../lib/errorReporting.ts'
import { getStrength, isPasswordValid, PASSWORD_ERROR, strengthLabel, strengthColor, strengthWidth } from '../lib/passwordStrength.ts'
import { PasswordInput } from '../components/PasswordInput'

interface ManagedUser {
  id: string
  email: string
  name?: string
  contactName?: string
  phone?: string
  blocked?: boolean
}

const createCrmUserFn = httpsCallable<
  { email: string; password: string; name: string },
  { uid: string }
>(functions, 'createCrmUser')

const deleteCrmUserFn = httpsCallable<
  { uid: string },
  { uid: string }
>(functions, 'deleteCrmUser')

export function CrmUsersPage() {
  const [users, setUsers] = useState<ManagedUser[]>([])
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState('')
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [showAdd, setShowAdd] = useState(false)
  const [addName, setAddName] = useState('')
  const [addEmail, setAddEmail] = useState('')
  const [addPassword, setAddPassword] = useState('')
  const [addSaving, setAddSaving] = useState(false)
  const [addError, setAddError] = useState('')
  const [confirmDelete, setConfirmDelete] = useState<{ id: string; name: string } | null>(null)
  // Edit
  const [editingUser, setEditingUser] = useState<ManagedUser | null>(null)
  const [editName, setEditName] = useState('')
  const [editContact, setEditContact] = useState('')
  const [editPhone, setEditPhone] = useState('')
  const [editSaving, setEditSaving] = useState(false)

  useAuthEffect(() => {
    const q = query(
      collection(db, 'users'),
      where('role', '==', 'crm_user'),
    )
    return onSnapshot(
      q,
      snap => {
        setUsers(
          snap.docs.map(d => ({
            id: d.id, ...d.data(),
          }) as ManagedUser),
        )
        setLoading(false)
      },
      () => {
        setLoadError('שגיאה בטעינת משתמשים')
        setLoading(false)
      },
    )
  }, [])

  async function handleDelete() {
    if (!confirmDelete) return
    const { id } = confirmDelete
    setConfirmDelete(null)
    setDeletingId(id)
    try {
      await deleteCrmUserFn({ uid: id })
    } catch (err: unknown) {
      reportError(err, { source: 'CrmUsersPage.delete' })
    } finally {
      setDeletingId(null)
    }
  }

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault()
    if (!addEmail.trim()) { setAddError('אימייל הוא שדה חובה'); return }
    if (!isPasswordValid(addPassword)) { setAddError(PASSWORD_ERROR); return }
    setAddSaving(true)
    setAddError('')
    try {
      await createCrmUserFn({
        email: addEmail.trim(),
        password: addPassword,
        name: addName.trim(),
      })
      setShowAdd(false)
      setAddName('')
      setAddEmail('')
      setAddPassword('')
    } catch (err: unknown) {
      const code = (err as { code?: string }).code
      if (code === 'functions/already-exists') {
        setAddError('כתובת האימייל כבר בשימוש')
      } else {
        setAddError('שגיאה ביצירת המשתמש')
        reportError(err, { source: 'CrmUsersPage.add' })
      }
    } finally {
      setAddSaving(false)
    }
  }

  async function handleEdit(e: React.FormEvent) {
    e.preventDefault()
    if (!editingUser) return
    setEditSaving(true)
    try {
      await updateDoc(doc(db, 'users', editingUser.id), {
        name: editName.trim() || null,
        contactName: editContact.trim() || null,
        phone: editPhone.trim() || null,
      })
      setEditingUser(null)
    } catch (err: unknown) {
      reportError(err, { source: 'CrmUsersPage.edit' })
    } finally {
      setEditSaving(false)
    }
  }

  return (
    <div className="p-4 md:p-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mb-6">
        <h1 className="text-xl font-bold text-gray-900">משתמשי CRM</h1>
        <button
          onClick={() => {
            setShowAdd(true)
            setAddName('')
            setAddEmail('')
            setAddPassword('')
            setAddError('')
          }}
          className="px-4 py-2 bg-green-600 text-white text-sm font-medium rounded-lg hover:bg-green-700 transition-colors"
        >
          + הוסף משתמש CRM
        </button>
      </div>

      {loading ? (
        <div className="text-center py-10 text-gray-400">טוען...</div>
      ) : loadError ? (
        <div className="text-center py-10 text-red-500">{loadError}</div>
      ) : users.length === 0 ? (
        <div className="text-center py-10 text-gray-400">אין משתמשי CRM עדיין</div>
      ) : (
        <>
          {/* Desktop table */}
          <div className="hidden md:block bg-white rounded-xl border border-gray-200 overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200 bg-gray-50">
                  <th className="text-right px-4 py-3 font-medium text-gray-600">שם</th>
                  <th className="text-right px-4 py-3 font-medium text-gray-600">איש קשר</th>
                  <th className="text-right px-4 py-3 font-medium text-gray-600">טלפון</th>
                  <th className="text-right px-4 py-3 font-medium text-gray-600">אימייל</th>
                  <th className="text-right px-4 py-3 font-medium text-gray-600">סטטוס</th>
                  <th className="px-4 py-3" />
                </tr>
              </thead>
              <tbody>
                {users.map(user => (
                  <tr key={user.id} className="border-b border-gray-100 hover:bg-gray-50">
                    <td className="px-4 py-3 text-gray-700">{user.name ?? '—'}</td>
                    <td className="px-4 py-3 text-gray-700">{user.contactName ?? '—'}</td>
                    <td className="px-4 py-3 text-gray-600" dir="ltr">{user.phone ?? '—'}</td>
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
                        <button
                          onClick={() => {
                            setEditingUser(user)
                            setEditName(user.name ?? '')
                            setEditContact(user.contactName ?? '')
                            setEditPhone(user.phone ?? '')
                          }}
                          className="px-3 py-1 text-xs font-medium rounded-lg border border-blue-200 bg-blue-50 text-blue-700 hover:bg-blue-100 transition-colors"
                        >
                          עריכה
                        </button>
                        <button
                          onClick={() => setConfirmDelete({ id: user.id, name: user.email })}
                          disabled={deletingId === user.id}
                          className="px-3 py-1 text-xs font-medium rounded-lg border border-red-200 bg-red-50 text-red-700 hover:bg-red-100 disabled:opacity-40 transition-colors"
                        >
                          {deletingId === user.id ? '...' : 'מחק'}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile cards */}
          <div className="md:hidden space-y-3">
            {users.map(user => (
              <div key={user.id} className="bg-white rounded-xl border border-gray-200 p-4">
                <div className="flex items-start justify-between gap-2 mb-2">
                  <div className="min-w-0">
                    <p className="font-medium text-gray-900 truncate">{user.name ?? user.email}</p>
                    {user.name && (
                      <p className="text-xs text-gray-500 truncate" dir="ltr">{user.email}</p>
                    )}
                  </div>
                  {user.blocked ? (
                    <span className="shrink-0 px-2 py-0.5 text-xs font-medium rounded-full bg-red-100 text-red-700">
                      חסום
                    </span>
                  ) : (
                    <span className="shrink-0 px-2 py-0.5 text-xs font-medium rounded-full bg-green-100 text-green-700">
                      פעיל
                    </span>
                  )}
                </div>
                {user.contactName && (
                  <p className="text-sm text-gray-600 mb-1">איש קשר: {user.contactName}</p>
                )}
                {user.phone && (
                  <p className="text-sm text-gray-600 mb-2" dir="ltr">{user.phone}</p>
                )}
                <div className="flex gap-2 pt-2 border-t border-gray-100">
                  <button
                    onClick={() => {
                      setEditingUser(user)
                      setEditName(user.name ?? '')
                      setEditContact(user.contactName ?? '')
                      setEditPhone(user.phone ?? '')
                    }}
                    className="flex-1 px-3 py-1.5 text-xs font-medium rounded-lg border border-blue-200 bg-blue-50 text-blue-700 hover:bg-blue-100 transition-colors"
                  >
                    עריכה
                  </button>
                  <button
                    onClick={() => setConfirmDelete({ id: user.id, name: user.email })}
                    disabled={deletingId === user.id}
                    className="flex-1 px-3 py-1.5 text-xs font-medium rounded-lg border border-red-200 bg-red-50 text-red-700 hover:bg-red-100 disabled:opacity-40 transition-colors"
                  >
                    {deletingId === user.id ? '...' : 'מחק'}
                  </button>
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      {/* Confirm delete modal */}
      {confirmDelete && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={() => setConfirmDelete(null)}>
          <div className="bg-white rounded-2xl p-6 w-full max-w-sm" onClick={e => e.stopPropagation()}>
            <h2 className="text-lg font-bold text-gray-900 mb-2">מחיקת משתמש</h2>
            <p className="text-sm text-gray-600 mb-4">
              {`למחוק את המשתמש "${confirmDelete.name}"? פעולה זו אינה הפיכה.`}
            </p>
            <div className="flex gap-3 justify-end">
              <button onClick={() => setConfirmDelete(null)} className="px-4 py-2 text-sm text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50">
                ביטול
              </button>
              <button onClick={handleDelete} className="px-4 py-2 text-sm text-white rounded-lg bg-red-600 hover:bg-red-700">
                מחק
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add user modal */}
      {showAdd && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={() => setShowAdd(false)}>
          <div className="bg-white rounded-2xl p-6 w-full max-w-md" onClick={e => e.stopPropagation()}>
            <h2 className="text-lg font-bold text-gray-900 mb-4">הוסף משתמש CRM</h2>
            <form onSubmit={handleAdd} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">שם</label>
                <input
                  type="text"
                  value={addName}
                  onChange={e => setAddName(e.target.value)}
                  className="w-full bg-white border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-400"
                  placeholder="שם משתמש CRM"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">אימייל *</label>
                <input
                  type="email"
                  value={addEmail}
                  onChange={e => setAddEmail(e.target.value)}
                  className="w-full bg-white border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-400"
                  placeholder="user@example.com"
                  dir="ltr"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">סיסמה *</label>
                <PasswordInput
                  value={addPassword}
                  onChange={e => setAddPassword(e.target.value)}
                  className="w-full bg-white border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-400"
                  placeholder="לפחות 8 תווים"
                  dir="ltr"
                />
                {addPassword && (
                  <div className="mt-1">
                    <div className="h-1 rounded-full bg-gray-100 overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all"
                        style={{
                          width: strengthWidth[getStrength(addPassword)],
                          background: strengthColor[getStrength(addPassword)],
                        }}
                      />
                    </div>
                    <p className="text-xs mt-0.5" style={{ color: strengthColor[getStrength(addPassword)] }}>
                      {strengthLabel[getStrength(addPassword)]}
                    </p>
                  </div>
                )}
              </div>
              {addError && <p className="text-sm text-red-600">{addError}</p>}
              <div className="flex gap-3 justify-end pt-2">
                <button type="button" onClick={() => setShowAdd(false)} className="px-4 py-2 text-sm text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50">
                  ביטול
                </button>
                <button
                  type="submit"
                  disabled={addSaving}
                  className="px-4 py-2 text-sm text-white bg-green-600 rounded-lg hover:bg-green-700 disabled:opacity-50"
                >
                  {addSaving ? 'שומר...' : 'צור משתמש'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit user modal */}
      {editingUser && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={() => setEditingUser(null)}>
          <div className="bg-white rounded-2xl p-6 w-full max-w-md" onClick={e => e.stopPropagation()}>
            <h2 className="text-lg font-bold text-gray-900 mb-4">עריכת משתמש CRM</h2>
            <form onSubmit={handleEdit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">אימייל</label>
                <input
                  type="text"
                  value={editingUser.email}
                  disabled
                  className="w-full bg-gray-100 border border-gray-300 rounded-lg px-3 py-2 text-sm text-gray-500"
                  dir="ltr"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">שם</label>
                <input
                  type="text"
                  value={editName}
                  onChange={e => setEditName(e.target.value)}
                  className="w-full bg-white border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-400"
                  placeholder="שם"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">איש קשר</label>
                <input
                  type="text"
                  value={editContact}
                  onChange={e => setEditContact(e.target.value)}
                  className="w-full bg-white border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-400"
                  placeholder="שם איש קשר"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">טלפון</label>
                <input
                  type="tel"
                  value={editPhone}
                  onChange={e => setEditPhone(e.target.value)}
                  className="w-full bg-white border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-400"
                  placeholder="050-1234567"
                  dir="ltr"
                />
              </div>
              <div className="flex gap-3 justify-end pt-2">
                <button type="button" onClick={() => setEditingUser(null)} className="px-4 py-2 text-sm text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50">
                  ביטול
                </button>
                <button
                  type="submit"
                  disabled={editSaving}
                  className="px-4 py-2 text-sm text-white bg-green-600 rounded-lg hover:bg-green-700 disabled:opacity-50"
                >
                  {editSaving ? 'שומר...' : 'שמור'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
