import { useState, useEffect } from 'react'
import { collection, onSnapshot, query, where } from 'firebase/firestore'
import { httpsCallable } from 'firebase/functions'
import { db, functions } from '../lib/firebase.ts'
import { reportError } from '../lib/errorReporting.ts'

interface TravelAgent {
  id: string
  email: string
  displayName: string
}

interface CreateTravelAgentData {
  email: string
  password: string
  displayName: string
}

const createTravelAgentFn = httpsCallable<CreateTravelAgentData, { uid: string }>(functions, 'createTravelAgent')
const deleteTravelAgentFn = httpsCallable<{ uid: string }, { uid: string }>(functions, 'deleteTravelAgent')

export function TravelAgentsPage() {
  const [agents, setAgents] = useState<TravelAgent[]>([])
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState('')
  const [modalOpen, setModalOpen] = useState(false)
  const [deletingId, setDeletingId] = useState<string | null>(null)

  useEffect(() => {
    const q = query(collection(db, 'users'), where('role', '==', 'travel_agent'))
    return onSnapshot(
      q,
      snap => {
        setAgents(snap.docs.map(d => ({ id: d.id, ...d.data() }) as TravelAgent))
        setLoading(false)
      },
      () => {
        setLoadError('שגיאה בטעינת סוכני הטיולים')
        setLoading(false)
      }
    )
  }, [])

  async function handleDelete(agent: TravelAgent) {
    if (!window.confirm(`למחוק את הסוכן "${agent.displayName}"? פעולה זו אינה הפיכה.`)) return
    setDeletingId(agent.id)
    try {
      await deleteTravelAgentFn({ uid: agent.id })
    } catch (err: unknown) {
      alert('שגיאה במחיקת הסוכן')
      reportError(err, { source: 'TravelAgentsPage.delete' })
    } finally {
      setDeletingId(null)
    }
  }

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-xl font-bold text-gray-900">סוכני טיולים</h1>
        <button
          onClick={() => setModalOpen(true)}
          className="px-4 py-2 bg-green-600 text-white text-sm font-medium rounded-lg hover:bg-green-700 transition-colors"
        >
          + הוסף סוכן
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
                <th className="text-right px-4 py-3 font-medium text-gray-600">שם</th>
                <th className="text-right px-4 py-3 font-medium text-gray-600">אימייל</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody>
              {agents.length === 0 && (
                <tr>
                  <td colSpan={3} className="text-center py-10 text-gray-400">
                    אין סוכני טיולים עדיין
                  </td>
                </tr>
              )}
              {agents.map(agent => (
                <tr key={agent.id} className="border-b border-gray-100 hover:bg-gray-50">
                  <td className="px-4 py-3 font-medium text-gray-900">{agent.displayName}</td>
                  <td className="px-4 py-3 text-gray-600">{agent.email}</td>
                  <td className="px-4 py-3 text-left">
                    <button
                      onClick={() => handleDelete(agent)}
                      disabled={deletingId === agent.id}
                      className="text-xs text-gray-400 hover:text-red-600 disabled:opacity-40"
                    >
                      {deletingId === agent.id ? '...' : 'מחק'}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {modalOpen && (
        <CreateAgentModal
          onClose={() => setModalOpen(false)}
        />
      )}
    </div>
  )
}

function CreateAgentModal({ onClose }: { onClose: () => void }) {
  const [email, setEmail] = useState('')
  const [displayName, setDisplayName] = useState('')
  const [password, setPassword] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setSaving(true)
    try {
      await createTravelAgentFn({ email: email.trim(), password, displayName: displayName.trim() })
      onClose()
    } catch (err: unknown) {
      const msg = (err as { message?: string }).message ?? ''
      setError(msg.includes('already-exists') ? 'אימייל כבר קיים במערכת' : 'שגיאה ביצירת הסוכן')
      reportError(err, { source: 'TravelAgentsPage.create' })
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={onClose}>
      <div className="bg-white rounded-xl shadow-xl p-6 w-full max-w-sm" onClick={e => e.stopPropagation()}>
        <h2 className="text-lg font-bold text-gray-900 mb-4">הוספת סוכן טיולים</h2>
        <form onSubmit={handleSubmit} className="space-y-3">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">שם מלא</label>
            <input
              type="text"
              value={displayName}
              onChange={e => setDisplayName(e.target.value)}
              required
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
              placeholder="ישראל ישראלי"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">אימייל</label>
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              required
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
              placeholder="agent@example.com"
              dir="ltr"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">סיסמה</label>
            <input
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              required
              minLength={6}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
              placeholder="לפחות 6 תווים"
              dir="ltr"
            />
          </div>
          {error && <p className="text-sm text-red-600">{error}</p>}
          <div className="flex gap-2 pt-1">
            <button
              type="submit"
              disabled={saving}
              className="flex-1 py-2 bg-green-600 text-white text-sm font-medium rounded-lg hover:bg-green-700 disabled:opacity-50"
            >
              {saving ? 'שומר...' : 'הוסף סוכן'}
            </button>
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2 border border-gray-300 text-sm font-medium rounded-lg hover:bg-gray-50"
            >
              ביטול
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
