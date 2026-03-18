import { useState } from 'react'
import {
  collection, onSnapshot, addDoc, updateDoc, deleteDoc,
  doc, serverTimestamp, query, orderBy,
} from 'firebase/firestore'
import { db } from '../../lib/firebase.ts'
import { useAuthEffect } from '../../hooks/useAuthSnapshot.ts'
import { reportError } from '../../lib/errorReporting.ts'
import { useAuth } from '../../hooks/useAuth'
import { formatDateTime } from './crmUtils.ts'
import type { ActivityLogEntry } from '../../types/index.ts'

interface Props {
  contactId: string
}

export function ContactNotes({ contactId }: Props) {
  const { user } = useAuth()
  const [entries, setEntries] = useState<ActivityLogEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [text, setText] = useState('')
  const [saving, setSaving] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editText, setEditText] = useState('')
  const [editSaving, setEditSaving] = useState(false)
  const [confirmDeleteId, setConfirmDeleteId] = useState<
    string | null
  >(null)
  const [deleting, setDeleting] = useState(false)

  useAuthEffect(() => {
    const q = query(
      collection(
        db, 'crm_contacts', contactId, 'activity_log',
      ),
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
        reportError(err, {
          source: 'ContactNotes.onSnapshot',
        })
        setLoading(false)
      },
    )
  }, [contactId])

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault()
    if (!text.trim()) return
    setSaving(true)
    try {
      await addDoc(
        collection(
          db, 'crm_contacts', contactId, 'activity_log',
        ),
        {
          text: text.trim(),
          createdBy: user?.uid ?? '',
          createdByEmail: user?.email ?? '',
          createdAt: serverTimestamp(),
        },
      )
      setText('')
    } catch (err: unknown) {
      reportError(err, { source: 'ContactNotes.add' })
    } finally {
      setSaving(false)
    }
  }

  function startEdit(entry: ActivityLogEntry) {
    setEditingId(entry.id)
    setEditText(entry.text)
  }

  function cancelEdit() {
    setEditingId(null)
    setEditText('')
  }

  async function handleEdit(entryId: string) {
    if (!editText.trim()) return
    setEditSaving(true)
    try {
      await updateDoc(
        doc(
          db, 'crm_contacts', contactId,
          'activity_log', entryId,
        ),
        {
          text: editText.trim(),
          updatedAt: serverTimestamp(),
        },
      )
      cancelEdit()
    } catch (err: unknown) {
      reportError(err, { source: 'ContactNotes.edit' })
    } finally {
      setEditSaving(false)
    }
  }

  async function handleDelete(entryId: string) {
    setDeleting(true)
    try {
      await deleteDoc(
        doc(
          db, 'crm_contacts', contactId,
          'activity_log', entryId,
        ),
      )
    } catch (err: unknown) {
      reportError(err, { source: 'ContactNotes.delete' })
    } finally {
      setDeleting(false)
      setConfirmDeleteId(null)
    }
  }

  return (
    <div>
      <h3 className="text-sm font-bold text-gray-700 mb-3">
        הערות
      </h3>

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
        <p className="text-sm text-gray-400">
          אין הערות עדיין
        </p>
      ) : (
        <div className="space-y-3">
          {entries.map(entry => (
            <div
              key={entry.id}
              className="border-r-2 border-green-300 pr-3 group"
            >
              {editingId === entry.id ? (
                <div>
                  <textarea
                    value={editText}
                    onChange={e => setEditText(e.target.value)}
                    rows={2}
                    className="w-full bg-white border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-400 resize-none"
                  />
                  <div className="flex gap-2 mt-1">
                    <button
                      onClick={() => handleEdit(entry.id)}
                      disabled={
                        editSaving || !editText.trim()
                      }
                      className="px-3 py-1 text-xs text-white bg-green-600 rounded-lg hover:bg-green-700 disabled:opacity-50"
                    >
                      {editSaving ? 'שומר...' : 'שמור'}
                    </button>
                    <button
                      onClick={cancelEdit}
                      className="px-3 py-1 text-xs text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50"
                    >
                      ביטול
                    </button>
                  </div>
                </div>
              ) : (
                <>
                  <p className="text-sm text-gray-800 whitespace-pre-wrap">
                    {entry.text}
                  </p>
                  <div className="flex items-center gap-2 mt-1">
                    <p className="text-xs text-gray-400">
                      {entry.createdByEmail}
                      {' — '}
                      {formatDateTime(entry.createdAt)}
                    </p>
                    <div className="opacity-0 group-hover:opacity-100 flex gap-1 transition-opacity">
                      <button
                        onClick={() => startEdit(entry)}
                        className="text-xs text-blue-600 hover:underline"
                      >
                        עריכה
                      </button>
                      <button
                        onClick={() =>
                          setConfirmDeleteId(entry.id)
                        }
                        className="text-xs text-red-600 hover:underline"
                      >
                        מחק
                      </button>
                    </div>
                  </div>
                </>
              )}

              {confirmDeleteId === entry.id && (
                <div className="mt-2 p-2 bg-red-50 rounded-lg border border-red-200">
                  <p className="text-xs text-red-700 mb-2">
                    למחוק הערה זו?
                  </p>
                  <div className="flex gap-2">
                    <button
                      onClick={() =>
                        handleDelete(entry.id)
                      }
                      disabled={deleting}
                      className="px-3 py-1 text-xs text-white bg-red-600 rounded-lg hover:bg-red-700 disabled:opacity-50"
                    >
                      {deleting ? 'מוחק...' : 'מחק'}
                    </button>
                    <button
                      onClick={() =>
                        setConfirmDeleteId(null)
                      }
                      className="px-3 py-1 text-xs text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50"
                    >
                      ביטול
                    </button>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
