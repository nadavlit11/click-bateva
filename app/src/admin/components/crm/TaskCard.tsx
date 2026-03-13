import { Timestamp } from 'firebase/firestore'
import type { CrmTask } from '../../types/index.ts'
import { PRIORITY_LABELS, PRIORITY_COLORS, formatDate } from './crmUtils.ts'

interface Props {
  task: CrmTask
  onEdit: (task: CrmTask) => void
  onToggleFollow: (task: CrmTask) => void
  onToggleComplete: (task: CrmTask) => void
  onDelete?: (task: CrmTask) => void
  currentUid: string
}

export function TaskCard({
  task, onEdit, onToggleFollow, onToggleComplete, onDelete, currentUid,
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
      className="rounded-xl p-4 cursor-pointer hover:shadow-md transition-shadow"
      style={{
        borderRight: `6px solid ${color}`,
        borderTop: `1px solid ${color}30`,
        borderBottom: `1px solid ${color}30`,
        borderLeft: `1px solid ${color}30`,
        backgroundColor: `${color}12`,
      }}
      onClick={() => onEdit(task)}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 mb-1">
            <span
              className="inline-block w-3.5 h-3.5 rounded-full shrink-0 ring-2 ring-white"
              style={{ backgroundColor: color }}
            />
            <p className="font-medium text-gray-900 truncate">
              {task.title}
            </p>
            {task.completed && (
              <span className="text-xs px-2 py-0.5 rounded-full bg-gray-100 text-gray-500">
                הושלם
              </span>
            )}
            {isOverdue && !task.completed && (
              <span className="text-xs px-2 py-0.5 rounded-full bg-red-100 text-red-600">
                באיחור
              </span>
            )}
          </div>
          {task.description && (
            <p className="text-sm text-gray-500 line-clamp-2 mb-2">
              {task.description}
            </p>
          )}
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-gray-400">
            <span>{task.contactName}</span>
            <span>{formatDate(task.date)}</span>
            <span>{task.assigneeEmail}</span>
            <span className="text-gray-300">
              נוצר ע״י {task.createdByEmail}
            </span>
          </div>
        </div>
        <div className="flex flex-col items-end gap-2 shrink-0">
          <span className={`text-xs px-2 py-0.5 rounded-full ${PRIORITY_COLORS[task.priority] ?? ''}`}>
            {PRIORITY_LABELS[task.priority] ?? task.priority}
          </span>
          <button
            onClick={e => { e.stopPropagation(); onToggleComplete(task) }}
            className={`text-sm px-4 py-1.5 min-w-[4.5rem] rounded-lg font-medium transition-colors ${
              task.completed
                ? 'bg-green-600 text-white hover:bg-green-700'
                : 'bg-green-100 text-green-700 hover:bg-green-200'
            }`}
          >
            {task.completed ? '✓ הושלם' : 'סיום'}
          </button>
          <button
            onClick={e => { e.stopPropagation(); onToggleFollow(task) }}
            className={`text-sm px-4 py-1.5 min-w-[4.5rem] rounded-lg font-medium transition-colors ${
              isFollowing
                ? 'bg-blue-600 text-white hover:bg-blue-700'
                : 'bg-blue-100 text-blue-700 hover:bg-blue-200'
            }`}
          >
            {isFollowing ? 'עוקב' : 'עקוב'}
          </button>
          {onDelete && (
            <button
              onClick={e => { e.stopPropagation(); onDelete(task) }}
              className="text-sm px-4 py-1.5 min-w-[4.5rem] rounded-lg font-medium bg-red-100 text-red-700 hover:bg-red-200 transition-colors"
            >
              מחק
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
