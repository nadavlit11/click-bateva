import { useState, useEffect, useMemo } from 'react'
import {
  collection, onSnapshot, query, where, Timestamp,
} from 'firebase/firestore'
import { db } from '../lib/firebase.ts'
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

function startOfToday(): Date {
  const d = new Date()
  d.setHours(0, 0, 0, 0)
  return d
}

function endOfToday(): Date {
  const d = new Date()
  d.setHours(23, 59, 59, 999)
  return d
}

function taskDate(t: CrmTask): Date | null {
  if (t.date instanceof Timestamp) return t.date.toDate()
  return null
}

export function MyTasksPage() {
  const { user } = useAuth()
  const [tasks, setTasks] = useState<CrmTask[]>([])
  const [loading, setLoading] = useState(true)
  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState<CrmTask | null>(null)

  useEffect(() => {
    if (!user) return
    // Query all tasks assigned to current user (including completed)
    const q = query(
      collection(db, 'crm_tasks'),
      where('assigneeUid', '==', user.uid),
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
          source: 'MyTasksPage.onSnapshot',
        })
        setLoading(false)
      },
    )
  }, [user])

  // Split into overdue, today, and done — sorted by priority
  const { overdue, today, done } = useMemo(() => {
    const todayStart = startOfToday()
    const todayEnd = endOfToday()

    const overdueList: CrmTask[] = []
    const todayList: CrmTask[] = []
    const doneList: CrmTask[] = []

    for (const t of tasks) {
      const d = taskDate(t)
      if (!d || d > todayEnd) continue

      if (t.completed) {
        doneList.push(t)
      } else if (d < todayStart) {
        overdueList.push(t)
      } else {
        todayList.push(t)
      }
    }

    const sortByPriority = (a: CrmTask, b: CrmTask) =>
      (PRIORITY_ORDER[a.priority] ?? 2) -
      (PRIORITY_ORDER[b.priority] ?? 2)

    overdueList.sort(sortByPriority)
    todayList.sort(sortByPriority)

    return { overdue: overdueList, today: todayList, done: doneList }
  }, [tasks])

  function toggleFollow(task: CrmTask) {
    if (!user) return
    toggleTaskFollow(task, user.uid, 'MyTasksPage.toggleFollow')
  }

  function handleToggleComplete(task: CrmTask) {
    toggleTaskComplete(task, 'MyTasksPage.toggleComplete')
  }

  const activeTotal = overdue.length + today.length

  return (
    <div className="p-4 md:p-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6">
        <h1 className="text-xl font-bold text-gray-900">
          המשימות שלי להיום
          {!loading && (
            <span className="text-sm font-normal text-gray-400 mr-2">
              ({activeTotal})
            </span>
          )}
        </h1>
        <button
          onClick={() => { setEditing(null); setModalOpen(true) }}
          className="px-4 py-2 bg-green-600 text-white text-sm font-medium rounded-lg hover:bg-green-700 transition-colors"
        >
          + משימה חדשה
        </button>
      </div>

      {loading ? (
        <div className="text-center py-10 text-gray-400">טוען...</div>
      ) : activeTotal === 0 && done.length === 0 ? (
        <div className="text-center py-10 text-gray-400">אין משימות להיום</div>
      ) : (
        <>
          {overdue.length > 0 && (
            <div className="mb-6">
              <h2 className="text-sm font-bold text-red-600 mb-3">
                באיחור ({overdue.length})
              </h2>
              <div className="space-y-3">
                {overdue.map(t => (
                  <TaskCard
                    key={t.id}
                    task={t}
                    currentUid={user?.uid ?? ''}
                    onEdit={task => { setEditing(task); setModalOpen(true) }}
                    onToggleFollow={toggleFollow}
                    onToggleComplete={handleToggleComplete}
                  />
                ))}
              </div>
            </div>
          )}

          {today.length > 0 && (
            <div className="mb-6">
              <h2 className="text-sm font-bold text-gray-700 mb-3">
                היום ({today.length})
              </h2>
              <div className="space-y-3">
                {today.map(t => (
                  <TaskCard
                    key={t.id}
                    task={t}
                    currentUid={user?.uid ?? ''}
                    onEdit={task => { setEditing(task); setModalOpen(true) }}
                    onToggleFollow={toggleFollow}
                    onToggleComplete={handleToggleComplete}
                  />
                ))}
              </div>
            </div>
          )}

          {done.length > 0 && (
            <div className="opacity-60">
              <h2 className="text-sm font-bold text-gray-400 mb-3">
                הושלם ({done.length})
              </h2>
              <div className="space-y-3">
                {done.map(t => (
                  <TaskCard
                    key={t.id}
                    task={t}
                    currentUid={user?.uid ?? ''}
                    onEdit={task => { setEditing(task); setModalOpen(true) }}
                    onToggleFollow={toggleFollow}
                    onToggleComplete={handleToggleComplete}
                  />
                ))}
              </div>
            </div>
          )}
        </>
      )}

      <TaskModal
        isOpen={modalOpen}
        onClose={() => { setModalOpen(false); setEditing(null) }}
        task={editing}
        onSaved={() => { setModalOpen(false); setEditing(null) }}
      />
    </div>
  )
}
