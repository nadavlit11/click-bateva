import { useState, useEffect } from 'react'
import { collection, onSnapshot, query, where } from 'firebase/firestore'
import { httpsCallable } from 'firebase/functions'
import { db, functions } from '../lib/firebase.ts'
import { reportError } from '../lib/errorReporting.ts'
import { getStrength, isPasswordValid, PASSWORD_ERROR, strengthLabel, strengthColor, strengthWidth } from '../lib/passwordStrength.ts'
import { PasswordInput } from '../components/PasswordInput.tsx'

interface ManagedUser {
  id: string
  email: string
  blocked?: boolean
}

type UserTab = 'content_manager' | 'travel_agent'

const deleteContentManagerFn = httpsCallable<{ uid: string }, { uid: string }>(functions, 'deleteContentManager')
const blockContentManagerFn = httpsCallable<{ uid: string }, { uid: string }>(functions, 'blockContentManager')
const createContentManagerFn = httpsCallable<{ email: string; password: string }, { uid: string }>(functions, 'createContentManager')
const createTravelAgentFn = httpsCallable<{ email: string; password: string }, { uid: string }>(functions, 'createTravelAgent')
const deleteTravelAgentFn = httpsCallable<{ uid: string }, { uid: string }>(functions, 'deleteTravelAgent')

const TAB_CONFIG: Record<UserTab, { label: string; addLabel: string; addTitle: string; emptyLabel: string; role: string }> = {
  content_manager: {
    label: 'מנהלי תוכן',
    addLabel: '+ הוסף מנהל תוכן',
    addTitle: 'הוסף מנהל תוכן',
    emptyLabel: 'אין מנהלי תוכן עדיין',
    role: 'content_manager',
  },
  travel_agent: {
    label: 'סוכני נסיעות',
    addLabel: '+ הוסף סוכן נסיעות',
    addTitle: 'הוסף סוכן נסיעות',
    emptyLabel: 'אין סוכני נסיעות עדיין',
    role: 'travel_agent',
  },
}

export function UsersPage() {
  const [activeTab, setActiveTab] = useState<UserTab>('content_manager')
  const [users, setUsers] = useState<ManagedUser[]>([])
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState('')
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [blockingId, setBlockingId] = useState<string | null>(null)
  const [showAdd, setShowAdd] = useState(false)
  const [addEmail, setAddEmail] = useState('')
  const [addPassword, setAddPassword] = useState('')
  const [addSaving, setAddSaving] = useState(false)
  const [addError, setAddError] = useState('')
  const [confirmModal, setConfirmModal] = useState<{ user: ManagedUser; action: 'delete' | 'block' } | null>(null)

  const config = TAB_CONFIG[activeTab]

  useEffect(() => {
    setLoading(true)
    setLoadError('')
    const q = query(collection(db, 'users'), where('role', '==', config.role))
    return onSnapshot(
      q,
      snap => {
        setUsers(snap.docs.map(d => ({ id: d.id, ...d.data() }) as ManagedUser))
        setLoading(false)
      },
      () => {
        setLoadError('שגיאה בטעינת משתמשים')
        setLoading(false)
      }
    )
  }, [config.role])

  async function executeConfirm() {
    if (!confirmModal) return
    const { user, action } = confirmModal
    setConfirmModal(null)
    if (action === 'delete') {
      setDeletingId(user.id)
      try {
        if (activeTab === 'content_manager') {
          await deleteContentManagerFn({ uid: user.id })
        } else {
          await deleteTravelAgentFn({ uid: user.id })
        }
      } catch (err: unknown) {
        reportError(err, { source: 'UsersPage.delete' })
      } finally {
        setDeletingId(null)
      }
    } else {
      setBlockingId(user.id)
      try {
        await blockContentManagerFn({ uid: user.id })
      } catch (err: unknown) {
        reportError(err, { source: 'UsersPage.block' })
      } finally {
        setBlockingId(null)
      }
    }
  }

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault()
    if (!addEmail.trim()) { setAddError('אימייל הוא שדה חובה'); return }
    if (!isPasswordValid(addPassword)) { setAddError(PASSWORD_ERROR); return }
    setAddSaving(true)
    setAddError('')
    try {
      if (activeTab === 'content_manager') {
        await createContentManagerFn({ email: addEmail.trim(), password: addPassword })
      } else {
        await createTravelAgentFn({ email: addEmail.trim(), password: addPassword })
      }
      setShowAdd(false)
      setAddEmail('')
      setAddPassword('')
    } catch (err: unknown) {
      const code = (err as { code?: string }).code
      if (code === 'functions/already-exists') {
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
        <h1 className="text-xl font-bold text-gray-900">ניהול משתמשים</h1>
        <button
          onClick={() => { setShowAdd(true); setAddEmail(''); setAddPassword(''); setAddError('') }}
          className="px-4 py-2 bg-green-600 text-white text-sm font-medium rounded-lg hover:bg-green-700 transition-colors"
        >
          {config.addLabel}
        </button>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-4 border-b border-gray-200">
        {(Object.entries(TAB_CONFIG) as [UserTab, typeof config][]).map(([key, tab]) => (
          <button
            key={key}
            onClick={() => setActiveTab(key)}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
              activeTab === key
                ? 'border-green-600 text-green-700'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            {tab.label}
          </button>
        ))}
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
                    {config.emptyLabel}
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
                      {activeTab === 'content_manager' && !user.blocked && (
                        <button
                          onClick={() => setConfirmModal({ user, action: 'block' })}
                          disabled={blockingId === user.id}
                          className="text-xs text-gray-400 hover:text-orange-600 disabled:opacity-40"
                        >
                          {blockingId === user.id ? '...' : 'חסום'}
                        </button>
                      )}
                      <button
                        onClick={() => setConfirmModal({ user, action: 'delete' })}
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

      {confirmModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={() => setConfirmModal(null)}>
          <div className="bg-white rounded-2xl p-6 w-full max-w-sm" onClick={e => e.stopPropagation()}>
            <h2 className="text-lg font-bold text-gray-900 mb-2">
              {confirmModal.action === 'delete' ? 'מחיקת משתמש' : 'חסימת משתמש'}
            </h2>
            <p className="text-sm text-gray-600 mb-4">
              {confirmModal.action === 'delete'
                ? `למחוק את המשתמש "${confirmModal.user.email}"? פעולה זו אינה הפיכה.`
                : `לחסום את המשתמש "${confirmModal.user.email}"?`}
            </p>
            <div className="flex gap-3 justify-end">
              <button onClick={() => setConfirmModal(null)} className="px-4 py-2 text-sm text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50">
                ביטול
              </button>
              <button
                onClick={executeConfirm}
                className={`px-4 py-2 text-sm text-white rounded-lg ${
                  confirmModal.action === 'delete' ? 'bg-red-600 hover:bg-red-700' : 'bg-orange-500 hover:bg-orange-600'
                }`}
              >
                {confirmModal.action === 'delete' ? 'מחק' : 'חסום'}
              </button>
            </div>
          </div>
        </div>
      )}

      {showAdd && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={() => setShowAdd(false)}>
          <div className="bg-white rounded-2xl p-6 w-full max-w-md" onClick={e => e.stopPropagation()}>
            <h2 className="text-lg font-bold text-gray-900 mb-4">{config.addTitle}</h2>
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
                <PasswordInput
                  value={addPassword}
                  onChange={e => setAddPassword(e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-400"
                  placeholder="לפחות 8 תווים"
                  dir="ltr"
                />
                {addPassword && (
                  <div className="mt-1">
                    <div className="h-1 rounded-full bg-gray-100 overflow-hidden">
                      <div className="h-full rounded-full transition-all" style={{ width: strengthWidth[getStrength(addPassword)], background: strengthColor[getStrength(addPassword)] }} />
                    </div>
                    <p className="text-xs mt-0.5" style={{ color: strengthColor[getStrength(addPassword)] }}>{strengthLabel[getStrength(addPassword)]}</p>
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
