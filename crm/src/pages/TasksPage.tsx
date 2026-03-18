import { useState, useMemo } from 'react'
import {
  collection, onSnapshot, query, where, Timestamp,
} from 'firebase/firestore'
import { db } from '../lib/firebase.ts'
import { useAuthEffect } from '../hooks/useAuthSnapshot.ts'
import { reportError } from '../lib/errorReporting.ts'
import { useAuth } from '../hooks/useAuth'
import { TaskModal } from '../components/crm/TaskModal.tsx'
import { TaskCard } from '../components/crm/TaskCard.tsx'
import {
  toggleTaskFollow, toggleTaskComplete,
} from '../components/crm/crmUtils.ts'
import type { CrmTask, TaskPriority } from '../types/index.ts'

const PRIORITY_ORDER: Record<TaskPriority, number> = {
  high: 0,
  medium: 1,
  low: 2,
}

type DateRange = 'today' | 'week' | 'month' | 'last-month'

interface CrmUser {
  id: string
  email: string
  name?: string
}

function startOfDay(d: Date): Date {
  const r = new Date(d)
  r.setHours(0, 0, 0, 0)
  return r
}

function endOfDay(d: Date): Date {
  const r = new Date(d)
  r.setHours(23, 59, 59, 999)
  return r
}

function rangeStart(range: DateRange): Date {
  const now = new Date()
  switch (range) {
    case 'today':
      return startOfDay(now)
    case 'week': {
      const d = startOfDay(now)
      d.setDate(d.getDate() - d.getDay())
      return d
    }
    case 'month': {
      const d = startOfDay(now)
      d.setDate(1)
      return d
    }
    case 'last-month': {
      const d = startOfDay(now)
      d.setMonth(d.getMonth() - 1)
      d.setDate(1)
      return d
    }
  }
}

function rangeEnd(range: DateRange): Date {
  const now = new Date()
  switch (range) {
    case 'today':
      return endOfDay(now)
    case 'week': {
      const d = endOfDay(now)
      d.setDate(d.getDate() + (6 - d.getDay()))
      return d
    }
    case 'month':
      return endOfDay(now)
    case 'last-month':
      return endOfDay(now)
  }
}

function taskDate(t: CrmTask): Date | null {
  if (t.date instanceof Timestamp) return t.date.toDate()
  return null
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
  const diff = Math.round(
    (d.getTime() - today.getTime()) / 86400000,
  )
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

const RANGE_LABELS: Record<DateRange, string> = {
  'today': 'היום',
  'week': 'השבוע',
  'month': 'החודש',
  'last-month': 'חודש אחרון',
}

type Tab = 'active' | 'completed'

export function TasksPage() {
  const { user } = useAuth()
  const [tasks, setTasks] = useState<CrmTask[]>([])
  const [loading, setLoading] = useState(true)
  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState<CrmTask | null>(null)
  const [search, setSearch] = useState('')
  const [filterPriority, setFilterPriority] = useState('')
  const [tab, setTab] = useState<Tab>('active')

  // Filters
  const [selectedUid, setSelectedUid] = useState(
    user?.uid ?? '',
  )
  const [dateRange, setDateRange] = useState<DateRange>(
    'today',
  )

  // CRM users for assignee picker
  const [crmUsers, setCrmUsers] = useState<CrmUser[]>([])
  useAuthEffect(() => {
    const q = query(
      collection(db, 'users'),
      where('role', 'in', ['admin', 'crm_user']),
    )
    return onSnapshot(
      q,
      snap => {
        setCrmUsers(
          snap.docs.map(d => ({
            id: d.id,
            email: (d.data().email ?? '') as string,
            name: (d.data().name ?? undefined) as
              string | undefined,
          })),
        )
      },
      err => reportError(err, {
        source: 'TasksPage.users',
      }),
    )
  }, [])

  // Load tasks for selected user
  useAuthEffect(() => {
    const uid = selectedUid || user?.uid
    if (!uid) return
    const q = query(
      collection(db, 'crm_tasks'),
      where('assigneeUid', '==', uid),
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
  }, [selectedUid, user])

  function handleUserChange(uid: string) {
    setSelectedUid(uid)
    setDateRange(
      uid === user?.uid ? 'today' : 'last-month',
    )
    setLoading(true)
  }

  function toggleFollow(task: CrmTask) {
    if (!user) return
    toggleTaskFollow(
      task, user.uid, 'TasksPage.toggleFollow',
    )
  }

  function handleToggleComplete(task: CrmTask) {
    toggleTaskComplete(task, 'TasksPage.toggleComplete')
  }

  const term = search.trim().toLowerCase()
  const isSelf = selectedUid === user?.uid

  const { activeDays, overdueList, completedFiltered } =
    useMemo(() => {
      const rStart = rangeStart(dateRange)
      const rEnd = rangeEnd(dateRange)
      const todayStart = startOfDay(new Date())

      const active: CrmTask[] = []
      const completed: CrmTask[] = []
      const overdue: CrmTask[] = []

      for (const t of tasks) {
        if (filterPriority && t.priority !== filterPriority)
          continue
        if (
          term &&
          !(
            t.title.toLowerCase().includes(term) ||
            t.contactName.toLowerCase().includes(term) ||
            (t.contactBusinessName || '')
              .toLowerCase()
              .includes(term)
          )
        )
          continue

        const d = taskDate(t)

        if (t.completed) {
          completed.push(t)
          continue
        }

        // Always show overdue when viewing "today"
        if (
          d &&
          d < todayStart &&
          dateRange === 'today' &&
          !t.completed
        ) {
          overdue.push(t)
          continue
        }

        // Filter by date range
        if (d && (d < rStart || d > rEnd)) continue

        active.push(t)
      }

      // Group active by day
      const dayMap = new Map<string, CrmTask[]>()
      for (const t of active) {
        const key = taskDateKey(t)
        const list = dayMap.get(key)
        if (list) list.push(t)
        else dayMap.set(key, [t])
      }

      const sortByPriority = (a: CrmTask, b: CrmTask) =>
        (PRIORITY_ORDER[a.priority] ?? 2) -
        (PRIORITY_ORDER[b.priority] ?? 2)

      const days = Array.from(dayMap.entries())
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([key, list]) => {
          list.sort(sortByPriority)
          return {
            key,
            label: formatDayLabel(key),
            overdue: isOverdueKey(key),
            tasks: list,
          }
        })

      overdue.sort(sortByPriority)
      completed.sort(sortByPriority)

      return {
        activeDays: days,
        overdueList: overdue,
        completedFiltered: completed,
      }
    }, [tasks, filterPriority, term, dateRange])

  const activeCount =
    activeDays.reduce((s, d) => s + d.tasks.length, 0) +
    overdueList.length

  return (
    <div className="p-4 md:p-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
        <h1 className="text-xl font-bold text-gray-900">
          משימות
        </h1>
        <button
          onClick={() => {
            setEditing(null)
            setModalOpen(true)
          }}
          className="px-4 py-2 bg-green-600 text-white text-sm font-medium rounded-lg hover:bg-green-700 transition-colors"
        >
          + משימה חדשה
        </button>
      </div>

      {/* Filters row */}
      <div className="flex flex-wrap gap-3 mb-4">
        <select
          value={selectedUid}
          onChange={e => handleUserChange(e.target.value)}
          className="bg-white border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-400"
        >
          {crmUsers.map(u => (
            <option key={u.id} value={u.id}>
              {u.id === user?.uid
                ? `אני (${u.name || u.email})`
                : u.name || u.email}
            </option>
          ))}
        </select>
        <div className="flex gap-1">
          {(
            Object.entries(RANGE_LABELS) as [
              DateRange,
              string,
            ][]
          ).map(([key, label]) => (
            <button
              key={key}
              onClick={() => setDateRange(key)}
              className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors ${
                dateRange === key
                  ? 'bg-green-600 text-white'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              {label}
            </button>
          ))}
        </div>
        <input
          type="text"
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="חיפוש..."
          className="w-full sm:w-48 bg-white border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-400"
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

      {loading ? (
        <div className="text-center py-10 text-gray-400">
          טוען...
        </div>
      ) : tab === 'active' ? (
        activeCount === 0 ? (
          <div className="text-center py-10 text-gray-400">
            {search || filterPriority
              ? 'לא נמצאו תוצאות'
              : isSelf
                ? 'אין משימות להיום'
                : 'אין משימות'}
          </div>
        ) : (
          <div className="space-y-6">
            {overdueList.length > 0 && (
              <div>
                <h2 className="text-sm font-bold text-red-600 mb-3">
                  באיחור ({overdueList.length})
                </h2>
                <div className="space-y-2">
                  {overdueList.map(t => (
                    <TaskCard
                      key={t.id}
                      task={t}
                      currentUid={user?.uid ?? ''}
                      onEdit={task => {
                        setEditing(task)
                        setModalOpen(true)
                      }}
                      onToggleFollow={toggleFollow}
                      onToggleComplete={
                        handleToggleComplete
                      }
                    />
                  ))}
                </div>
              </div>
            )}

            {activeDays.map(day => (
              <div key={day.key}>
                <h2
                  className={`text-sm font-bold mb-3 ${
                    day.overdue
                      ? 'text-red-600'
                      : 'text-gray-700'
                  }`}
                >
                  {day.label}
                  {day.overdue && ' — באיחור'}
                  {' '}({day.tasks.length})
                </h2>
                <div className="space-y-2">
                  {day.tasks.map(t => (
                    <TaskCard
                      key={t.id}
                      task={t}
                      currentUid={user?.uid ?? ''}
                      onEdit={task => {
                        setEditing(task)
                        setModalOpen(true)
                      }}
                      onToggleFollow={toggleFollow}
                      onToggleComplete={
                        handleToggleComplete
                      }
                    />
                  ))}
                </div>
              </div>
            ))}
          </div>
        )
      ) : completedFiltered.length === 0 ? (
        <div className="text-center py-10 text-gray-400">
          {search || filterPriority
            ? 'לא נמצאו תוצאות'
            : 'אין משימות שהושלמו'}
        </div>
      ) : (
        <div className="space-y-2">
          {completedFiltered.map(t => (
            <TaskCard
              key={t.id}
              task={t}
              currentUid={user?.uid ?? ''}
              onEdit={task => {
                setEditing(task)
                setModalOpen(true)
              }}
              onToggleFollow={toggleFollow}
              onToggleComplete={handleToggleComplete}
            />
          ))}
        </div>
      )}

      <TaskModal
        isOpen={modalOpen}
        onClose={() => {
          setModalOpen(false)
          setEditing(null)
        }}
        task={editing}
        onSaved={() => {
          setModalOpen(false)
          setEditing(null)
        }}
      />
    </div>
  )
}
