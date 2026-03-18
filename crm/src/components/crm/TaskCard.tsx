import { Timestamp } from 'firebase/firestore'
import { Link } from 'react-router-dom'
import type { CrmTask } from '../../types/index.ts'
import { PRIORITY_LABELS, PRIORITY_COLORS, formatDate } from './crmUtils.ts'

interface Props {
  task: CrmTask
  onEdit: (task: CrmTask) => void
  onToggleFollow: (task: CrmTask) => void
  onToggleComplete: (task: CrmTask) => void
  currentUid: string
}

export function TaskCard({
  task, onEdit, onToggleFollow, onToggleComplete, currentUid,
}: Props) {
  const isFollowing = task.followers?.includes(currentUid)
  const isOverdue =
    task.date instanceof Timestamp &&
    task.date.toDate() < new Date(
      new Date().setHours(0, 0, 0, 0),
    )
  const color = task.color || '#d1d5db'

  return (
    <div
      className="flex items-center gap-3 rounded-lg px-3 py-2 cursor-pointer hover:shadow-md transition-shadow"
      style={{
        borderRight: `5px solid ${color}`,
        borderTop: `1px solid ${color}40`,
        borderBottom: `1px solid ${color}40`,
        borderLeft: `1px solid ${color}40`,
        backgroundColor: `${color}25`,
      }}
      onClick={() => onEdit(task)}
    >
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
      <button
        onClick={e => { e.stopPropagation(); onToggleComplete(task) }}
        className={`text-xs px-3 py-1 rounded-lg font-medium transition-colors shrink-0 ${
          task.completed
            ? 'bg-green-600 text-white hover:bg-green-700'
            : 'bg-green-100 text-green-700 hover:bg-green-200'
        }`}
      >
        {task.completed ? '✓' : 'סיום'}
      </button>
      <button
        onClick={e => { e.stopPropagation(); onToggleFollow(task) }}
        className={`text-xs px-3 py-1 rounded-lg font-medium transition-colors shrink-0 ${
          isFollowing
            ? 'bg-blue-600 text-white hover:bg-blue-700'
            : 'bg-blue-100 text-blue-700 hover:bg-blue-200'
        }`}
      >
        {isFollowing ? 'עוקב' : 'עקוב'}
      </button>
    </div>
  )
}
