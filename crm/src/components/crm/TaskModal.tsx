import { useState, useEffect } from 'react'
import {
  collection, addDoc, updateDoc, doc, serverTimestamp,
  onSnapshot, query, where, Timestamp,
} from 'firebase/firestore'
import { db } from '../../lib/firebase.ts'
import { reportError } from '../../lib/errorReporting.ts'
import { useAuth } from '../../hooks/useAuth'
import { useAuthEffect } from '../../hooks/useAuthSnapshot.ts'
import { TaskComments } from './TaskComments'
import type {
  CrmTask, CrmContact, TaskPriority,
} from '../../types/index.ts'

const TASK_COLORS = [
  '#2563eb', // vivid blue
  '#16a34a', // vivid green
  '#eab308', // vivid yellow
  '#dc2626', // vivid red
  '#9333ea', // vivid purple
  '#db2777', // vivid pink
  '#0d9488', // vivid teal
  '#ea580c', // vivid orange
  '#4f46e5', // vivid indigo
  '#0ea5e9', // vivid sky
]

interface Props {
  isOpen: boolean
  onClose: () => void
  task: CrmTask | null
  onSaved: () => void
  preselectedContactId?: string
  preselectedContactName?: string
}

interface FormState {
  title: string
  description: string
  date: string
  color: string
  priority: TaskPriority
  assigneeUid: string
  assigneeEmail: string
  contactId: string
  contactName: string
  contactBusinessName: string
  contactPhone: string
  completed: boolean
}

const INITIAL: FormState = {
  title: '',
  description: '',
  date: new Date().toISOString().slice(0, 10),
  color: '#3b82f6',
  priority: 'medium',
  assigneeUid: '',
  assigneeEmail: '',
  contactId: '',
  contactName: '',
  contactBusinessName: '',
  contactPhone: '',
  completed: false,
}

interface CrmUser {
  id: string
  email: string
  name?: string
}

export function TaskModal({
  isOpen, onClose, task, onSaved,
  preselectedContactId, preselectedContactName,
}: Props) {
  const { user } = useAuth()
  const [form, setForm] = useState<FormState>(INITIAL)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  // Load CRM users for assignee picker
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
        source: 'TaskModal.users',
      }),
    )
  }, [])

  // Load contacts for contact picker
  const [contacts, setContacts] = useState<CrmContact[]>([])
  const [contactSearch, setContactSearch] = useState('')
  useAuthEffect(() => {
    return onSnapshot(
      collection(db, 'crm_contacts'),
      snap => {
        setContacts(
          snap.docs.map(d => ({
            id: d.id, ...d.data(),
          }) as CrmContact),
        )
      },
      err => reportError(err, {
        source: 'TaskModal.contacts',
      }),
    )
  }, [])

  useEffect(() => {
    if (task) {
      const taskDate =
        task.date instanceof Timestamp
          ? task.date.toDate().toISOString().slice(0, 10)
          : INITIAL.date
      setForm({
        title: task.title,
        description: task.description,
        date: taskDate,
        color: task.color,
        priority: task.priority,
        assigneeUid: task.assigneeUid,
        assigneeEmail: task.assigneeEmail,
        contactId: task.contactId,
        contactName: task.contactName,
        contactBusinessName: task.contactBusinessName || '',
        contactPhone: task.contactPhone || '',
        completed: task.completed,
      })
    } else {
      setForm({
        ...INITIAL,
        assigneeUid: user?.uid ?? '',
        assigneeEmail: user?.email ?? '',
        contactId: preselectedContactId ?? '',
        contactName: preselectedContactName ?? '',
        contactBusinessName: '',
        contactPhone: '',
      })
    }
    setError('')
    setContactSearch('')
  }, [task, isOpen, user, preselectedContactId, preselectedContactName])

  function set(
    field: keyof FormState,
    value: string | boolean,
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

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.title.trim()) {
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
      const data = {
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
      }

      if (task) {
        await updateDoc(doc(db, 'crm_tasks', task.id), data)
      } else {
        await addDoc(collection(db, 'crm_tasks'), {
          ...data,
          followers: [],
          createdBy: user?.uid ?? '',
          createdByEmail: user?.email ?? '',
          createdAt: serverTimestamp(),
        })
      }
      onSaved()
    } catch (err: unknown) {
      setError('שגיאה בשמירה')
      reportError(err, {
        source: 'TaskModal.handleSubmit',
      })
    } finally {
      setSaving(false)
    }
  }

  if (!isOpen) return null

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
    <div
      className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-2xl p-6 w-full max-w-lg max-h-[90vh] overflow-y-auto"
        onClick={e => e.stopPropagation()}
      >
        <h2 className="text-lg font-bold text-gray-900 mb-4">
          {task ? 'עריכת משימה' : 'משימה חדשה'}
        </h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Contact picker */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              איש קשר <span className="text-red-500">*</span>
            </label>
            {form.contactId ? (
              <div className="flex items-center gap-2">
                <span className="text-sm text-gray-800 bg-gray-100 px-3 py-1.5 rounded-lg flex-1">
                  {form.contactName}
                </span>
                {!task && (
                  <button
                    type="button"
                    onClick={() => set('contactId', '')}
                    className="text-xs text-red-500 hover:underline"
                  >
                    שנה
                  </button>
                )}
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
                        type="button"
                        onClick={() => selectContact(c)}
                        className="w-full text-right px-3 py-2 text-sm hover:bg-gray-50 border-b border-gray-50"
                      >
                        <span className="font-medium">
                          {c.name}
                        </span>
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

          {/* Title */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              כותרת <span className="text-red-500">*</span>
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
            <label className="block text-sm font-medium text-gray-700 mb-1">
              תיאור
            </label>
            <textarea
              value={form.description}
              onChange={e => set('description', e.target.value)}
              rows={3}
              className="w-full bg-white border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-400 resize-none"
            />
          </div>

          {/* Date + Priority + Color row */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
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
              <label className="block text-sm font-medium text-gray-700 mb-1">
                עדיפות
              </label>
              <select
                value={form.priority}
                onChange={e => set(
                  'priority', e.target.value,
                )}
                className="w-full bg-white border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-400"
              >
                <option value="high">גבוהה</option>
                <option value="medium">בינונית</option>
                <option value="low">נמוכה</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                צבע
              </label>
              <div className="flex flex-wrap gap-2">
                {TASK_COLORS.map(c => (
                  <button
                    key={c}
                    type="button"
                    onClick={() => set('color', c)}
                    className={`w-8 h-8 rounded-full border-2 transition-transform ${
                      form.color === c ? 'border-gray-800 scale-110' : 'border-transparent'
                    }`}
                    style={{ backgroundColor: c }}
                  />
                ))}
              </div>
            </div>
          </div>

          {/* Assignee */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              אחראי <span className="text-red-500">*</span>
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
                  {u.name ? `${u.name} (${u.email})` : u.email}
                </option>
              ))}
            </select>
          </div>

          {/* Completed toggle (edit only) */}
          {task && (
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={form.completed}
                onChange={e => set(
                  'completed', e.target.checked,
                )}
                className="rounded border-gray-300 text-green-600 focus:ring-green-500"
              />
              <span className="text-sm text-gray-700">
                סמן כהושלם
              </span>
            </label>
          )}

          {error && (
            <p className="text-sm text-red-600">{error}</p>
          )}

          <div className="flex gap-3 justify-end pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50"
            >
              ביטול
            </button>
            <button
              type="submit"
              disabled={saving}
              className="px-4 py-2 text-sm text-white bg-green-600 rounded-lg hover:bg-green-700 disabled:opacity-50"
            >
              {saving ? 'שומר...' : 'שמור'}
            </button>
          </div>
        </form>

        {task && (
          <div className="border-t border-gray-200 mt-5 pt-5">
            <h3 className="text-sm font-bold text-gray-700 mb-3">שיחה</h3>
            <TaskComments taskId={task.id} />
          </div>
        )}
      </div>
    </div>
  )
}
