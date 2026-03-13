import { useState, useEffect } from 'react'
import {
  collection, onSnapshot, doc, deleteDoc,
  orderBy, query,
} from 'firebase/firestore'
import { db } from '../../../lib/firebase.ts'
import { reportError } from '../../../lib/errorReporting.ts'
import { useAuth } from '../../../hooks/useAuth'
import { TaskModal } from '../../components/crm/TaskModal.tsx'
import { TaskCard } from '../../components/crm/TaskCard.tsx'
import { toggleTaskFollow, toggleTaskComplete } from '../../components/crm/crmUtils.ts'
import type { CrmTask } from '../../types/index.ts'

export function TasksPage() {
  const { user, role } = useAuth()
  const [tasks, setTasks] = useState<CrmTask[]>([])
  const [loading, setLoading] = useState(true)
  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState<CrmTask | null>(null)
  const [search, setSearch] = useState('')
  const [filterPriority, setFilterPriority] = useState('')
  const [showCompleted, setShowCompleted] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState<CrmTask | null>(null)
  const [deleting, setDeleting] = useState(false)

  useEffect(() => {
    const q = query(
      collection(db, 'crm_tasks'),
      orderBy('date', 'asc'),
    )
    return onSnapshot(
      q,
      snap => {
        setTasks(
          snap.docs.map(d => ({
            id: d.id, ...d.data(),
          }) as CrmTask),
        )
        setLoading(false)
      },
      err => {
        reportError(err, {
          source: 'TasksPage.onSnapshot',
        })
        setLoading(false)
      },
    )
  }, [])

  function toggleFollow(task: CrmTask) {
    if (!user) return
    toggleTaskFollow(task, user.uid, 'TasksPage.toggleFollow')
  }

  function handleToggleComplete(task: CrmTask) {
    toggleTaskComplete(task, 'TasksPage.toggleComplete')
  }

  async function handleDelete() {
    if (!confirmDelete) return
    setDeleting(true)
    try {
      await deleteDoc(
        doc(db, 'crm_tasks', confirmDelete.id),
      )
    } catch (err: unknown) {
      reportError(err, { source: 'TasksPage.delete' })
    } finally {
      setDeleting(false)
      setConfirmDelete(null)
    }
  }

  const term = search.trim().toLowerCase()
  const filtered = tasks.filter(t => {
    if (!showCompleted && t.completed) return false
    if (filterPriority && t.priority !== filterPriority) {
      return false
    }
    if (term) {
      return (
        t.title.toLowerCase().includes(term) ||
        t.contactName.toLowerCase().includes(term) ||
        t.assigneeEmail.toLowerCase().includes(term)
      )
    }
    return true
  })

  return (
    <div className="p-4 md:p-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
        <h1 className="text-xl font-bold text-gray-900">
          כל המשימות
          {!loading && (
            <span className="text-sm font-normal text-gray-400 mr-2">
              ({filtered.length})
            </span>
          )}
        </h1>
        <button
          onClick={() => {
            setEditing(null); setModalOpen(true)
          }}
          className="px-4 py-2 bg-green-600 text-white text-sm font-medium rounded-lg hover:bg-green-700 transition-colors"
        >
          + משימה חדשה
        </button>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3 mb-4">
        <input
          type="text"
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="חיפוש..."
          className="w-full sm:w-64 bg-white border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-400"
        />
        <select
          value={filterPriority}
          onChange={e => setFilterPriority(e.target.value)}
          className="bg-white border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-400"
        >
          <option value="">כל העדיפויות</option>
          <option value="high">גבוהה</option>
          <option value="medium">בינונית</option>
          <option value="low">נמוכה</option>
        </select>
        <label className="flex items-center gap-2 text-sm text-gray-600">
          <input
            type="checkbox"
            checked={showCompleted}
            onChange={e => setShowCompleted(e.target.checked)}
            className="rounded border-gray-300 text-green-600 focus:ring-green-500"
          />
          הצג שהושלמו
        </label>
      </div>

      {loading ? (
        <div className="text-center py-10 text-gray-400">
          טוען...
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-10 text-gray-400">
          {search || filterPriority
            ? 'לא נמצאו תוצאות'
            : 'אין משימות עדיין'}
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map(t => (
            <div key={t.id} className="relative">
              <TaskCard
                task={t}
                currentUid={user?.uid ?? ''}
                onEdit={task => {
                  setEditing(task); setModalOpen(true)
                }}
                onToggleFollow={toggleFollow}
                onToggleComplete={handleToggleComplete}
              />
              {role === 'admin' && (
                <button
                  onClick={() => setConfirmDelete(t)}
                  className="absolute top-2 left-2 px-2 py-1 text-xs font-medium rounded-lg border border-red-200 bg-red-50 text-red-700 hover:bg-red-100 transition-colors"
                >
                  מחק
                </button>
              )}
            </div>
          ))}
        </div>
      )}

      <TaskModal
        isOpen={modalOpen}
        onClose={() => {
          setModalOpen(false); setEditing(null)
        }}
        task={editing}
        onSaved={() => {
          setModalOpen(false); setEditing(null)
        }}
      />

      {confirmDelete && (
        <div
          className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4"
          onClick={() => setConfirmDelete(null)}
        >
          <div
            className="bg-white rounded-2xl p-6 w-full max-w-sm"
            onClick={e => e.stopPropagation()}
          >
            <h2 className="text-lg font-bold text-gray-900 mb-2">
              מחיקת משימה
            </h2>
            <p className="text-sm text-gray-600 mb-4">
              {`למחוק את "${confirmDelete.title}"?`}
            </p>
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => setConfirmDelete(null)}
                className="px-4 py-2 text-sm text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50"
              >
                ביטול
              </button>
              <button
                onClick={handleDelete}
                disabled={deleting}
                className="px-4 py-2 text-sm text-white rounded-lg bg-red-600 hover:bg-red-700 disabled:opacity-50"
              >
                {deleting ? 'מוחק...' : 'מחק'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
