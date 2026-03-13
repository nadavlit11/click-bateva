import { Timestamp, doc, updateDoc, arrayUnion, arrayRemove, serverTimestamp } from 'firebase/firestore'
import { db } from '../../../lib/firebase.ts'
import { reportError } from '../../../lib/errorReporting.ts'
import type { CrmTask, TaskPriority } from '../../types/index.ts'

export const PRIORITY_LABELS: Record<TaskPriority, string> = {
  high: 'גבוהה',
  medium: 'בינונית',
  low: 'נמוכה',
}

export const PRIORITY_COLORS: Record<TaskPriority, string> = {
  high: 'bg-red-100 text-red-700',
  medium: 'bg-yellow-100 text-yellow-700',
  low: 'bg-green-100 text-green-700',
}

export function formatDate(ts: unknown): string {
  if (!ts) return ''
  if (ts instanceof Timestamp) {
    return ts.toDate().toLocaleDateString('he-IL')
  }
  return ''
}

export function formatDateTime(ts: unknown): string {
  if (!ts) return ''
  if (ts instanceof Timestamp) {
    return ts.toDate().toLocaleDateString('he-IL', {
      day: 'numeric', month: 'short', year: 'numeric',
      hour: '2-digit', minute: '2-digit',
    })
  }
  return ''
}

export async function toggleTaskComplete(
  task: CrmTask,
  source: string,
) {
  try {
    await updateDoc(doc(db, 'crm_tasks', task.id), {
      completed: !task.completed,
      updatedAt: serverTimestamp(),
    })
  } catch (err: unknown) {
    reportError(err, { source })
  }
}

export async function toggleTaskFollow(
  task: CrmTask,
  uid: string,
  source: string,
) {
  const isFollowing = task.followers?.includes(uid)
  try {
    await updateDoc(doc(db, 'crm_tasks', task.id), {
      followers: isFollowing
        ? arrayRemove(uid)
        : arrayUnion(uid),
    })
  } catch (err: unknown) {
    reportError(err, { source })
  }
}
