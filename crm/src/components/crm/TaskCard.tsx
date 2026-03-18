import { Timestamp } from 'firebase/firestore'
import { Link, useNavigate } from 'react-router-dom'
import type { CrmTask } from '../../types/index.ts'
import {
  PRIORITY_LABELS, PRIORITY_COLORS, formatDate,
} from './crmUtils.ts'

interface Props {
  task: CrmTask
}

export function TaskCard({ task }: Props) {
  const navigate = useNavigate()
  const isOverdue =
    task.date instanceof Timestamp &&
    task.date.toDate() < new Date(
      new Date().setHours(0, 0, 0, 0),
    )
  const color = task.color || '#d1d5db'

  return (
    <div
      className="rounded-lg px-3 py-2 cursor-pointer hover:shadow-md transition-shadow"
      style={{
        borderRight: `5px solid ${color}`,
        borderTop: `1px solid ${color}40`,
        borderBottom: `1px solid ${color}40`,
        borderLeft: `1px solid ${color}40`,
        backgroundColor: `${color}25`,
      }}
      onClick={() => navigate(`/tasks/${task.id}`)}
    >
      {/* Desktop: single row */}
      <div className="hidden md:flex items-center gap-3">
        <span
          className="inline-block w-2.5 h-2.5 rounded-full shrink-0"
          style={{ backgroundColor: color }}
        />
        <span className="text-xs text-gray-500 shrink-0 w-20">
          {formatDate(task.date)}
        </span>
        <Link
          to={`/contacts/${task.contactId}`}
          onClick={e => e.stopPropagation()}
          className="text-sm font-medium text-blue-700 hover:underline truncate shrink-0 max-w-[10rem]"
        >
          {task.contactBusinessName || task.contactName || '—'}
        </Link>
        <span
          className="text-xs text-gray-500 truncate shrink-0 max-w-[7rem]"
          dir="ltr"
        >
          {task.contactPhone || '—'}
        </span>
        <p className="text-sm text-gray-900 truncate flex-1 min-w-0">
          {task.title}
        </p>
        {task.completed && (
          <span className="text-xs px-1.5 py-0.5 rounded-full bg-gray-100 text-gray-500 shrink-0">
            הושלם
          </span>
        )}
        {isOverdue && !task.completed && (
          <span className="text-xs px-1.5 py-0.5 rounded-full bg-red-100 text-red-600 shrink-0">
            באיחור
          </span>
        )}
        <span className={`text-xs px-1.5 py-0.5 rounded-full shrink-0 ${PRIORITY_COLORS[task.priority] ?? ''}`}>
          {PRIORITY_LABELS[task.priority] ?? task.priority}
        </span>
      </div>

      {/* Mobile: two lines */}
      <div className="md:hidden">
        <div className="flex items-center gap-2 mb-1">
          <span
            className="inline-block w-2.5 h-2.5 rounded-full shrink-0"
            style={{ backgroundColor: color }}
          />
          <p className="text-sm font-medium text-gray-900 truncate flex-1 min-w-0">
            {task.title}
          </p>
          {task.completed && (
            <span className="text-xs px-1.5 py-0.5 rounded-full bg-gray-100 text-gray-500 shrink-0">
              הושלם
            </span>
          )}
          {isOverdue && !task.completed && (
            <span className="text-xs px-1.5 py-0.5 rounded-full bg-red-100 text-red-600 shrink-0">
              באיחור
            </span>
          )}
          <span className={`text-xs px-1.5 py-0.5 rounded-full shrink-0 ${PRIORITY_COLORS[task.priority] ?? ''}`}>
            {PRIORITY_LABELS[task.priority] ?? task.priority}
          </span>
        </div>
        <div className="flex items-center gap-3 text-xs text-gray-500">
          <span>{formatDate(task.date)}</span>
          <Link
            to={`/contacts/${task.contactId}`}
            onClick={e => e.stopPropagation()}
            className="font-medium text-blue-700 hover:underline truncate"
          >
            {task.contactBusinessName || task.contactName || '—'}
          </Link>
          <span dir="ltr">{task.contactPhone || ''}</span>
        </div>
      </div>
    </div>
  )
}
