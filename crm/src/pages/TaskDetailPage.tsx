import { useState } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import {
  doc, onSnapshot, updateDoc, deleteDoc,
  collection, serverTimestamp, Timestamp,
  query, where,
} from 'firebase/firestore'
import { db } from '../lib/firebase.ts'
import { useAuthEffect } from '../hooks/useAuthSnapshot.ts'
import { reportError } from '../lib/errorReporting.ts'
import { useAuth } from '../hooks/useAuth'
import { TaskComments } from '../components/crm/TaskComments'
import {
  toggleTaskFollow, toggleTaskComplete,
} from '../components/crm/crmUtils.ts'
import type {
  CrmTask, CrmContact, TaskPriority,
} from '../types/index.ts'

const TASK_COLORS = [
  '#2563eb', '#16a34a', '#eab308', '#dc2626',
  '#9333ea', '#db2777', '#0d9488', '#ea580c',
  '#4f46e5', '#0ea5e9',
]

interface CrmUser {
  id: string
  email: string
  name?: string
}

export function TaskDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { user, role } = useAuth()
  const [task, setTask] = useState<CrmTask | null>(null)
  const [loading, setLoading] = useState(true)

  // Edit form
  const [editing, setEditing] = useState(false)
  const [form, setForm] = useState({
    title: '', description: '', date: '',
    color: '#2563eb', priority: 'medium' as TaskPriority,
    assigneeUid: '', assigneeEmail: '',
    contactId: '', contactName: '',
    contactBusinessName: '', contactPhone: '',
    completed: false,
  })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  // Delete
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [deleting, setDeleting] = useState(false)

  // Pickers
  const [crmUsers, setCrmUsers] = useState<CrmUser[]>([])
  const [contacts, setContacts] = useState<CrmContact[]>([])
  const [contactSearch, setContactSearch] = useState('')

  useAuthEffect(() => {
    if (!id) return
    return onSnapshot(
      doc(db, 'crm_tasks', id),
      snap => {
        if (!snap.exists()) {
          setTask(null)
          setLoading(false)
          return
        }
        const data = {
          id: snap.id, ...snap.data(),
        } as CrmTask
        setTask(data)
        populateForm(data)
        setLoading(false)
      },
      err => {
        reportError(err, {
          source: 'TaskDetailPage.task',
        })
        setLoading(false)
      },
    )
  }, [id])

  useAuthEffect(() => {
    const q = query(
      collection(db, 'users'),
      where('role', 'in', ['admin', 'crm_user']),
    )
    return onSnapshot(q, snap => {
      setCrmUsers(snap.docs.map(d => ({
        id: d.id,
        email: (d.data().email ?? '') as string,
        name: (d.data().name ?? undefined) as
          string | undefined,
      })))
    }, err => reportError(err, {
      source: 'TaskDetailPage.users',
    }))
  }, [])

  useAuthEffect(() => {
    return onSnapshot(
      collection(db, 'crm_contacts'),
      snap => {
        setContacts(snap.docs.map(d => ({
          id: d.id, ...d.data(),
        }) as CrmContact))
      },
      err => reportError(err, {
        source: 'TaskDetailPage.contacts',
      }),
    )
  }, [])

  function populateForm(t: CrmTask) {
    const taskDate = t.date instanceof Timestamp
      ? t.date.toDate().toISOString().slice(0, 10)
      : new Date().toISOString().slice(0, 10)
    setForm({
      title: t.title,
      description: t.description,
      date: taskDate,
      color: t.color,
      priority: t.priority,
      assigneeUid: t.assigneeUid,
      assigneeEmail: t.assigneeEmail,
      contactId: t.contactId,
      contactName: t.contactName,
      contactBusinessName: t.contactBusinessName || '',
      contactPhone: t.contactPhone || '',
      completed: t.completed,
    })
  }

  function set(
    field: string, value: string | boolean,
  ) {
    setForm(prev => ({ ...prev, [field]: value }))
  }

  function selectAssignee(u: CrmUser) {
    setForm(prev => ({
      ...prev,
      assigneeUid: u.id,
      assigneeEmail: u.email,
    }))
  }

  function selectContact(c: CrmContact) {
    setForm(prev => ({
      ...prev,
      contactId: c.id,
      contactName: c.name,
      contactBusinessName: c.businessName || '',
      contactPhone: c.phone || '',
    }))
    setContactSearch('')
  }

  async function handleSave() {
    if (!id || !form.title.trim()) {
      setError('כותרת היא שדה חובה')
      return
    }
    if (!form.contactId) {
      setError('יש לבחור איש קשר')
      return
    }
    if (!form.assigneeUid) {
      setError('יש לבחור אחראי')
      return
    }
    setSaving(true)
    setError('')
    try {
      await updateDoc(doc(db, 'crm_tasks', id), {
        title: form.title.trim(),
        description: form.description.trim(),
        date: Timestamp.fromDate(new Date(form.date)),
        color: form.color,
        priority: form.priority,
        assigneeUid: form.assigneeUid,
        assigneeEmail: form.assigneeEmail,
        contactId: form.contactId,
        contactName: form.contactName,
        contactBusinessName: form.contactBusinessName,
        contactPhone: form.contactPhone,
        completed: form.completed,
        updatedAt: serverTimestamp(),
      })
      setEditing(false)
    } catch (err: unknown) {
      setError('שגיאה בשמירה')
      reportError(err, {
        source: 'TaskDetailPage.save',
      })
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete() {
    if (!id) return
    setDeleting(true)
    try {
      await deleteDoc(doc(db, 'crm_tasks', id))
      navigate('/tasks')
    } catch (err: unknown) {
      reportError(err, {
        source: 'TaskDetailPage.delete',
      })
      setDeleting(false)
      setConfirmDelete(false)
    }
  }

  function handleToggleComplete() {
    if (!task) return
    toggleTaskComplete(task, 'TaskDetailPage')
  }

  function handleToggleFollow() {
    if (!task || !user) return
    toggleTaskFollow(task, user.uid, 'TaskDetailPage')
  }

  if (loading) {
    return (
      <div className="p-6 text-center text-gray-400">
        טוען...
      </div>
    )
  }

  if (!task) {
    return (
      <div className="p-6 text-center">
        <p className="text-gray-500 mb-4">
          המשימה לא נמצאה
        </p>
        <Link
          to="/tasks"
          className="text-blue-600 hover:underline text-sm"
        >
          חזרה למשימות
        </Link>
      </div>
    )
  }

  const isFollowing = task.followers?.includes(
    user?.uid ?? '',
  )
  const color = task.color || '#d1d5db'

  const filteredContacts = contactSearch.trim()
    ? contacts.filter(c =>
      c.name.toLowerCase().includes(
        contactSearch.toLowerCase(),
      ) ||
      c.businessName.toLowerCase().includes(
        contactSearch.toLowerCase(),
      ))
    : []

  return (
    <div className="p-4 md:p-6">
      <div className="flex items-center gap-3 mb-6">
        <Link
          to="/tasks"
          className="text-sm text-blue-600 hover:underline"
        >
          משימות
        </Link>
        <span className="text-gray-400">/</span>
        <span className="text-sm text-gray-700 truncate">
          {task.title}
        </span>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left: Task info */}
        <div
          className="bg-white rounded-xl border-2 p-5"
          style={{ borderColor: `${color}60` }}
        >
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-bold text-gray-900">
              פרטי משימה
            </h2>
            <div className="flex gap-2">
              {editing ? (
                <>
                  <button
                    onClick={() => {
                      setEditing(false)
                      populateForm(task)
                      setError('')
                    }}
                    className="px-3 py-1.5 text-xs font-medium rounded-lg border border-gray-300 text-gray-600 hover:bg-gray-50"
                  >
                    ביטול
                  </button>
                  <button
                    onClick={handleSave}
                    disabled={saving}
                    className="px-3 py-1.5 text-xs font-medium rounded-lg bg-green-600 text-white hover:bg-green-700 disabled:opacity-50"
                  >
                    {saving ? 'שומר...' : 'שמור'}
                  </button>
                </>
              ) : (
                <>
                  <button
                    onClick={() => setEditing(true)}
                    className="px-3 py-1.5 text-xs font-medium rounded-lg border border-blue-200 bg-blue-50 text-blue-700 hover:bg-blue-100"
                  >
                    עריכה
                  </button>
                  {role === 'admin' && (
                    <button
                      onClick={() => setConfirmDelete(true)}
                      className="px-3 py-1.5 text-xs font-medium rounded-lg border border-red-200 bg-red-50 text-red-700 hover:bg-red-100"
                    >
                      מחק
                    </button>
                  )}
                </>
              )}
            </div>
          </div>

          {/* Action buttons */}
          <div className="flex gap-2 mb-4">
            <button
              onClick={handleToggleComplete}
              className={`text-sm px-4 py-1.5 rounded-lg font-medium transition-colors ${
                task.completed
                  ? 'bg-green-600 text-white hover:bg-green-700'
                  : 'bg-green-100 text-green-700 hover:bg-green-200'
              }`}
            >
              {task.completed ? '✓ הושלם' : 'סיום'}
            </button>
            <button
              onClick={handleToggleFollow}
              className={`text-sm px-4 py-1.5 rounded-lg font-medium transition-colors ${
                isFollowing
                  ? 'bg-blue-600 text-white hover:bg-blue-700'
                  : 'bg-blue-100 text-blue-700 hover:bg-blue-200'
              }`}
            >
              {isFollowing ? 'עוקב' : 'עקוב'}
            </button>
          </div>

          {editing ? (
            <div className="space-y-3">
              {/* Title */}
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">
                  כותרת
                </label>
                <input
                  type="text"
                  value={form.title}
                  onChange={e => set('title', e.target.value)}
                  className="w-full bg-white border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-400"
                />
              </div>
              {/* Description */}
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">
                  תיאור
                </label>
                <textarea
                  value={form.description}
                  onChange={e => set('description', e.target.value)}
                  rows={3}
                  className="w-full bg-white border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-400 resize-none"
                />
              </div>
              {/* Contact picker */}
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">
                  איש קשר
                </label>
                {form.contactId ? (
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-gray-800 bg-gray-100 px-3 py-1.5 rounded-lg flex-1">
                      {form.contactName}
                    </span>
                    <button
                      onClick={() => set('contactId', '')}
                      className="text-xs text-red-500 hover:underline"
                    >
                      שנה
                    </button>
                  </div>
                ) : (
                  <div className="relative">
                    <input
                      type="text"
                      value={contactSearch}
                      onChange={e => setContactSearch(e.target.value)}
                      placeholder="חפש איש קשר..."
                      className="w-full bg-white border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-400"
                    />
                    {filteredContacts.length > 0 && (
                      <div className="absolute z-10 top-full mt-1 w-full bg-white border border-gray-200 rounded-lg shadow-lg max-h-40 overflow-y-auto">
                        {filteredContacts.slice(0, 20).map(c => (
                          <button
                            key={c.id}
                            onClick={() => selectContact(c)}
                            className="w-full text-right px-3 py-2 text-sm hover:bg-gray-50 border-b border-gray-50"
                          >
                            <span className="font-medium">{c.name}</span>
                            {c.businessName && (
                              <span className="text-gray-400 mr-2">
                                ({c.businessName})
                              </span>
                            )}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
              {/* Date + Priority */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">
                    תאריך
                  </label>
                  <input
                    type="date"
                    value={form.date}
                    onChange={e => set('date', e.target.value)}
                    className="w-full bg-white border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-400"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">
                    עדיפות
                  </label>
                  <select
                    value={form.priority}
                    onChange={e => set('priority', e.target.value)}
                    className="w-full bg-white border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-400"
                  >
                    <option value="high">גבוהה</option>
                    <option value="medium">בינונית</option>
                    <option value="low">נמוכה</option>
                  </select>
                </div>
              </div>
              {/* Assignee */}
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">
                  אחראי
                </label>
                <select
                  value={form.assigneeUid}
                  onChange={e => {
                    const u = crmUsers.find(
                      x => x.id === e.target.value,
                    )
                    if (u) selectAssignee(u)
                  }}
                  className="w-full bg-white border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-400"
                >
                  <option value="">בחר אחראי</option>
                  {crmUsers.map(u => (
                    <option key={u.id} value={u.id}>
                      {u.name
                        ? `${u.name} (${u.email})`
                        : u.email}
                    </option>
                  ))}
                </select>
              </div>
              {/* Color */}
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">
                  צבע
                </label>
                <div className="flex flex-wrap gap-2">
                  {TASK_COLORS.map(c => (
                    <button
                      key={c}
                      onClick={() => set('color', c)}
                      className={`w-8 h-8 rounded-full border-2 transition-transform ${
                        form.color === c
                          ? 'border-gray-800 scale-110'
                          : 'border-transparent'
                      }`}
                      style={{ backgroundColor: c }}
                    />
                  ))}
                </div>
              </div>
              {/* Completed */}
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={form.completed}
                  onChange={e => set('completed', e.target.checked)}
                  className="rounded border-gray-300 text-green-600 focus:ring-green-500"
                />
                <span className="text-sm text-gray-700">
                  סמן כהושלם
                </span>
              </label>
              {error && (
                <p className="text-sm text-red-600">{error}</p>
              )}
            </div>
          ) : (
            <div className="space-y-3">
              <Field label="כותרת" value={task.title} />
              <Field
                label="תיאור"
                value={task.description || '—'}
              />
              <div>
                <p className="text-xs font-medium text-gray-500">
                  איש קשר
                </p>
                <Link
                  to={`/contacts/${task.contactId}`}
                  className="text-sm text-blue-600 hover:underline"
                >
                  {task.contactName}
                  {task.contactBusinessName && (
                    <span className="text-gray-400 mr-1">
                      ({task.contactBusinessName})
                    </span>
                  )}
                </Link>
              </div>
              <Field
                label="תאריך"
                value={task.date instanceof Timestamp
                  ? task.date.toDate().toLocaleDateString('he-IL')
                  : '—'}
              />
              <Field
                label="עדיפות"
                value={
                  task.priority === 'high' ? 'גבוהה'
                    : task.priority === 'medium' ? 'בינונית'
                      : 'נמוכה'
                }
              />
              <Field
                label="אחראי"
                value={task.assigneeEmail}
              />
              <div>
                <p className="text-xs font-medium text-gray-500">
                  צבע
                </p>
                <span
                  className="inline-block w-6 h-6 rounded-full mt-1"
                  style={{ backgroundColor: color }}
                />
              </div>
            </div>
          )}
        </div>

        {/* Right: Comments */}
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <h3 className="text-sm font-bold text-gray-700 mb-3">
            שיחה
          </h3>
          {id && <TaskComments taskId={id} />}
        </div>
      </div>

      {/* Delete confirm */}
      {confirmDelete && (
        <div
          className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4"
          onClick={() => setConfirmDelete(false)}
        >
          <div
            className="bg-white rounded-2xl p-6 w-full max-w-sm"
            onClick={e => e.stopPropagation()}
          >
            <h2 className="text-lg font-bold text-gray-900 mb-2">
              מחיקת משימה
            </h2>
            <p className="text-sm text-gray-600 mb-4">
              {`למחוק את "${task.title}"?`}
            </p>
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => setConfirmDelete(false)}
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

function Field({
  label, value,
}: {
  label: string
  value: string
}) {
  return (
    <div>
      <p className="text-xs font-medium text-gray-500">
        {label}
      </p>
      <p className="text-sm text-gray-900">{value}</p>
    </div>
  )
}
