import { useState, useMemo } from 'react'
import {
  collection, onSnapshot, doc, deleteDoc,
  orderBy, query, Timestamp,
} from 'firebase/firestore'
import { db } from '../lib/firebase.ts'
import { useAuthEffect } from '../hooks/useAuthSnapshot.ts'
import { reportError } from '../lib/errorReporting.ts'
import { useAuth } from '../hooks/useAuth'
import { TaskModal } from '../components/crm/TaskModal.tsx'
import { TaskCard } from '../components/crm/TaskCard.tsx'
import { toggleTaskFollow, toggleTaskComplete } from '../components/crm/crmUtils.ts'
import type { CrmTask, TaskPriority } from '../types/index.ts'

const PRIORITY_ORDER: Record<TaskPriority, number> = {
  high: 0,
  medium: 1,
  low: 2,
}

function taskDateKey(t: CrmTask): string {
  if (t.date instanceof Timestamp) {
    const d = t.date.toDate()
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
  }
  return 'no-date'
}

function formatDayLabel(key: string): string {
  if (key === 'no-date') return 'ללא תאריך'
  const d = new Date(key + 'T00:00:00')
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const diff = Math.round((d.getTime() - today.getTime()) / 86400000)
  if (diff === 0) return 'היום'
  if (diff === -1) return 'אתמול'
  if (diff === 1) return 'מחר'
  return d.toLocaleDateString('he-IL', {
    weekday: 'short', day: 'numeric', month: 'short',
  })
}

function isOverdueKey(key: string): boolean {
  if (key === 'no-date') return false
  const d = new Date(key + 'T00:00:00')
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  return d < today
}

type Tab = 'active' | 'completed'

export function TasksPage() {
  const { user, role } = useAuth()
  const [tasks, setTasks] = useState<CrmTask[]>([])
  const [loading, setLoading] = useState(true)
  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState<CrmTask | null>(null)
  const [search, setSearch] = useState('')
  const [filterPriority, setFilterPriority] = useState('')
  const [tab, setTab] = useState<Tab>('active')
  const [confirmDelete, setConfirmDelete] = useState<CrmTask | null>(null)
  const [deleting, setDeleting] = useState(false)

  useAuthEffect(() => {
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

  const { activeDays, completedFiltered } = useMemo(() => {
    const active: CrmTask[] = []
    const completed: CrmTask[] = []

    for (const t of tasks) {
      if (filterPriority && t.priority !== filterPriority) continue
      if (term && !(
        t.title.toLowerCase().includes(term) ||
        t.contactName.toLowerCase().includes(term) ||
        t.assigneeEmail.toLowerCase().includes(term)
      )) continue

      if (t.completed) {
        completed.push(t)
      } else {
        active.push(t)
      }
    }

    // Group active tasks by day, sorted by priority within each day
    const dayMap = new Map<string, CrmTask[]>()
    for (const t of active) {
      const key = taskDateKey(t)
      const list = dayMap.get(key)
      if (list) list.push(t)
      else dayMap.set(key, [t])
    }

    const sortByPriority = (a: CrmTask, b: CrmTask) =>
      (PRIORITY_ORDER[a.priority] ?? 2) - (PRIORITY_ORDER[b.priority] ?? 2)

    const days = Array.from(dayMap.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([key, list]) => {
        list.sort(sortByPriority)
        return { key, label: formatDayLabel(key), overdue: isOverdueKey(key), tasks: list }
      })

    completed.sort(sortByPriority)

    return { activeDays: days, completedFiltered: completed }
  }, [tasks, filterPriority, term])

  const activeCount = activeDays.reduce((s, d) => s + d.tasks.length, 0)

  return (
    <div className="p-4 md:p-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
        <h1 className="text-xl font-bold text-gray-900">כל המשימות</h1>
        <button
          onClick={() => { setEditing(null); setModalOpen(true) }}
          className="px-4 py-2 bg-green-600 text-white text-sm font-medium rounded-lg hover:bg-green-700 transition-colors"
        >
          + משימה חדשה
        </button>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-4 border-b border-gray-200">
        <button
          onClick={() => setTab('active')}
          className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
            tab === 'active'
              ? 'border-green-600 text-green-700'
              : 'border-transparent text-gray-500 hover:text-gray-700'
          }`}
        >
          פעילות ({activeCount})
        </button>
        <button
          onClick={() => setTab('completed')}
          className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
            tab === 'completed'
              ? 'border-green-600 text-green-700'
              : 'border-transparent text-gray-500 hover:text-gray-700'
          }`}
        >
          הושלמו ({completedFiltered.length})
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
      </div>

      {loading ? (
        <div className="text-center py-10 text-gray-400">טוען...</div>
      ) : tab === 'active' ? (
        activeCount === 0 ? (
          <div className="text-center py-10 text-gray-400">
            {search || filterPriority ? 'לא נמצאו תוצאות' : 'אין משימות פעילות'}
          </div>
        ) : (
          <div className="space-y-6">
            {activeDays.map(day => (
              <div key={day.key}>
                <h2 className={`text-sm font-bold mb-3 ${
                  day.overdue ? 'text-red-600' : 'text-gray-700'
                }`}>
                  {day.label}
                  {day.overdue && ' — באיחור'}
                  {' '}({day.tasks.length})
                </h2>
                <div className="space-y-3">
                  {day.tasks.map(t => (
                    <TaskCard
                      key={t.id}
                      task={t}
                      currentUid={user?.uid ?? ''}
                      onEdit={task => { setEditing(task); setModalOpen(true) }}
                      onToggleFollow={toggleFollow}
                      onToggleComplete={handleToggleComplete}
                      onDelete={role === 'admin' ? task => setConfirmDelete(task) : undefined}
                    />
                  ))}
                </div>
              </div>
            ))}
          </div>
        )
      ) : (
        completedFiltered.length === 0 ? (
          <div className="text-center py-10 text-gray-400">
            {search || filterPriority ? 'לא נמצאו תוצאות' : 'אין משימות שהושלמו'}
          </div>
        ) : (
          <div className="space-y-3">
            {completedFiltered.map(t => (
              <TaskCard
                key={t.id}
                task={t}
                currentUid={user?.uid ?? ''}
                onEdit={task => { setEditing(task); setModalOpen(true) }}
                onToggleFollow={toggleFollow}
                onToggleComplete={handleToggleComplete}
                onDelete={role === 'admin' ? task => setConfirmDelete(task) : undefined}
              />
            ))}
          </div>
        )
      )}

      <TaskModal
        isOpen={modalOpen}
        onClose={() => { setModalOpen(false); setEditing(null) }}
        task={editing}
        onSaved={() => { setModalOpen(false); setEditing(null) }}
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
            <h2 className="text-lg font-bold text-gray-900 mb-2">מחיקת משימה</h2>
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
