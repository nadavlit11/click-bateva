import { useState, useEffect } from 'react'
import {
  collection, onSnapshot, addDoc, serverTimestamp,
  query, orderBy,
} from 'firebase/firestore'
import { db } from '../../lib/firebase.ts'
import { reportError } from '../../lib/errorReporting.ts'
import { useAuth } from '../../hooks/useAuth'
import { formatDateTime } from './crmUtils.ts'
import type { ActivityLogEntry } from '../../types/index.ts'

interface Props {
  taskId: string
}

export function TaskComments({ taskId }: Props) {
  const { user } = useAuth()
  const [entries, setEntries] = useState<ActivityLogEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [text, setText] = useState('')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    const q = query(
      collection(db, 'crm_tasks', taskId, 'comments'),
      orderBy('createdAt', 'desc'),
    )
    return onSnapshot(
      q,
      snap => {
        setEntries(
          snap.docs.map(d => ({
            id: d.id, ...d.data(),
          }) as ActivityLogEntry),
        )
        setLoading(false)
      },
      err => {
        reportError(err, { source: 'TaskComments.onSnapshot' })
        setLoading(false)
      },
    )
  }, [taskId])

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault()
    if (!text.trim()) return
    setSaving(true)
    try {
      await addDoc(
        collection(db, 'crm_tasks', taskId, 'comments'),
        {
          text: text.trim(),
          createdBy: user?.uid ?? '',
          createdByEmail: user?.email ?? '',
          createdAt: serverTimestamp(),
        },
      )
      setText('')
    } catch (err: unknown) {
      reportError(err, { source: 'TaskComments.add' })
    } finally {
      setSaving(false)
    }
  }

  return (
    <div>
      <form onSubmit={handleAdd} className="mb-4">
        <textarea
          value={text}
          onChange={e => setText(e.target.value)}
          placeholder="הוסף הערה..."
          rows={2}
          className="w-full bg-white border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-400 resize-none"
        />
        <button
          type="submit"
          disabled={saving || !text.trim()}
          className="mt-1 px-4 py-1.5 text-sm text-white bg-green-600 rounded-lg hover:bg-green-700 disabled:opacity-50"
        >
          {saving ? 'שומר...' : 'הוסף'}
        </button>
      </form>

      {loading ? (
        <p className="text-sm text-gray-400">טוען...</p>
      ) : entries.length === 0 ? (
        <p className="text-sm text-gray-400">אין הערות עדיין</p>
      ) : (
        <div className="space-y-3">
          {entries.map(entry => (
            <div
              key={entry.id}
              className="border-r-2 border-green-300 pr-3"
            >
              <p className="text-sm text-gray-800 whitespace-pre-wrap">
                {entry.text}
              </p>
              <p className="text-xs text-gray-400 mt-1">
                {entry.createdByEmail}
                {' — '}
                {formatDateTime(entry.createdAt)}
              </p>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
