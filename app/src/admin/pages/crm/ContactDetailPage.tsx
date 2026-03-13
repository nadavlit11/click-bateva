import { useState, useEffect } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import {
  doc, onSnapshot, updateDoc, deleteDoc, getDocs,
  serverTimestamp, collection, query, where, orderBy,
  writeBatch,
} from 'firebase/firestore'
import { db } from '../../../lib/firebase.ts'
import { reportError } from '../../../lib/errorReporting.ts'
import { useAuth } from '../../../hooks/useAuth'
import { ActivityTimeline } from '../../components/crm/ActivityTimeline.tsx'
import {
  PRIORITY_LABELS, PRIORITY_COLORS, formatDate,
} from '../../components/crm/crmUtils.ts'
import type { CrmContact, CrmTask } from '../../types/index.ts'

export function ContactDetailPage() {
  const { id } = useParams<{ id: string }>()
  const { role } = useAuth()
  const navigate = useNavigate()
  const [contact, setContact] = useState<CrmContact | null>(null)
  const [loading, setLoading] = useState(true)
  const [tasks, setTasks] = useState<CrmTask[]>([])

  // Editable fields
  const [editing, setEditing] = useState(false)
  const [form, setForm] = useState({
    name: '', businessName: '', phone: '', email: '',
  })
  const [saving, setSaving] = useState(false)

  // Delete
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [deleting, setDeleting] = useState(false)

  useEffect(() => {
    if (!id) return
    return onSnapshot(
      doc(db, 'crm_contacts', id),
      snap => {
        if (!snap.exists()) {
          setContact(null)
          setLoading(false)
          return
        }
        const data = {
          id: snap.id, ...snap.data(),
        } as CrmContact
        setContact(data)
        setForm({
          name: data.name,
          businessName: data.businessName,
          phone: data.phone,
          email: data.email,
        })
        setLoading(false)
      },
      err => {
        reportError(err, {
          source: 'ContactDetailPage.contact',
        })
        setLoading(false)
      },
    )
  }, [id])

  // Load linked tasks
  useEffect(() => {
    if (!id) return
    const q = query(
      collection(db, 'crm_tasks'),
      where('contactId', '==', id),
      orderBy('createdAt', 'desc'),
    )
    return onSnapshot(
      q,
      snap => {
        setTasks(
          snap.docs.map(d => ({
            id: d.id, ...d.data(),
          }) as CrmTask),
        )
      },
      err => {
        reportError(err, {
          source: 'ContactDetailPage.tasks',
        })
      },
    )
  }, [id])

  async function handleSave() {
    if (!id || !form.name.trim()) return
    setSaving(true)
    try {
      await updateDoc(doc(db, 'crm_contacts', id), {
        name: form.name.trim(),
        businessName: form.businessName.trim(),
        phone: form.phone.trim(),
        email: form.email.trim(),
        updatedAt: serverTimestamp(),
      })
      setEditing(false)
    } catch (err: unknown) {
      reportError(err, {
        source: 'ContactDetailPage.save',
      })
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete() {
    if (!id) return
    setDeleting(true)
    try {
      // Delete activity_log subcollection first (Firestore doesn't cascade)
      const logSnap = await getDocs(
        collection(db, 'crm_contacts', id, 'activity_log'),
      )
      if (logSnap.size > 0) {
        const batch = writeBatch(db)
        logSnap.docs.forEach(d => batch.delete(d.ref))
        await batch.commit()
      }
      await deleteDoc(doc(db, 'crm_contacts', id))
      navigate('/admin/crm/contacts')
    } catch (err: unknown) {
      reportError(err, {
        source: 'ContactDetailPage.delete',
      })
      setDeleting(false)
      setConfirmDelete(false)
    }
  }

  if (loading) {
    return (
      <div className="p-6 text-center text-gray-400">
        טוען...
      </div>
    )
  }

  if (!contact) {
    return (
      <div className="p-6 text-center">
        <p className="text-gray-500 mb-4">איש הקשר לא נמצא</p>
        <Link
          to="/admin/crm/contacts"
          className="text-blue-600 hover:underline text-sm"
        >
          חזרה לרשימה
        </Link>
      </div>
    )
  }

  return (
    <div className="p-4 md:p-6">
      <div className="flex items-center gap-3 mb-6">
        <Link
          to="/admin/crm/contacts"
          className="text-sm text-blue-600 hover:underline"
        >
          אנשי קשר
        </Link>
        <span className="text-gray-400">/</span>
        <span className="text-sm text-gray-700">
          {contact.name}
        </span>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left: Contact info */}
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-bold text-gray-900">
              פרטי איש קשר
            </h2>
            <div className="flex gap-2">
              {editing ? (
                <>
                  <button
                    onClick={() => {
                      setEditing(false)
                      setForm({
                        name: contact.name,
                        businessName: contact.businessName,
                        phone: contact.phone,
                        email: contact.email,
                      })
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

          <div className="space-y-3">
            {editing ? (
              <>
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">
                    שם
                  </label>
                  <input
                    type="text"
                    value={form.name}
                    onChange={e => setForm(p => ({
                      ...p, name: e.target.value,
                    }))}
                    className="w-full bg-white border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-400"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">
                    עסק
                  </label>
                  <input
                    type="text"
                    value={form.businessName}
                    onChange={e => setForm(p => ({
                      ...p, businessName: e.target.value,
                    }))}
                    className="w-full bg-white border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-400"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">
                    טלפון
                  </label>
                  <input
                    type="tel"
                    value={form.phone}
                    onChange={e => setForm(p => ({
                      ...p, phone: e.target.value,
                    }))}
                    className="w-full bg-white border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-400"
                    dir="ltr"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">
                    אימייל
                  </label>
                  <input
                    type="email"
                    value={form.email}
                    onChange={e => setForm(p => ({
                      ...p, email: e.target.value,
                    }))}
                    className="w-full bg-white border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-400"
                    dir="ltr"
                  />
                </div>
              </>
            ) : (
              <>
                <Field label="שם" value={contact.name} />
                <Field
                  label="עסק"
                  value={contact.businessName || '—'}
                />
                <Field
                  label="טלפון"
                  value={contact.phone || '—'}
                  dir="ltr"
                  href={contact.phone ? `tel:${contact.phone}` : undefined}
                />
                <Field
                  label="אימייל"
                  value={contact.email || '—'}
                  dir="ltr"
                  href={contact.email ? `mailto:${contact.email}` : undefined}
                />
              </>
            )}
          </div>

          {/* Linked tasks */}
          {tasks.length > 0 && (
            <div className="mt-6 pt-4 border-t border-gray-100">
              <h3 className="text-sm font-bold text-gray-700 mb-3">
                משימות ({tasks.length})
              </h3>
              <div className="space-y-2">
                {tasks.map(t => (
                  <div
                    key={t.id}
                    className="flex items-center gap-2 p-2 rounded-lg border border-gray-100 bg-gray-50"
                  >
                    <div
                      className="w-2 h-2 rounded-full shrink-0"
                      style={{ backgroundColor: t.color || '#6b7280' }}
                    />
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-gray-800 truncate">
                        {t.title}
                      </p>
                      <p className="text-xs text-gray-400">
                        {formatDate(t.date)}
                        {' — '}
                        {t.assigneeEmail}
                      </p>
                    </div>
                    <span className={`text-xs px-2 py-0.5 rounded-full ${PRIORITY_COLORS[t.priority] ?? ''}`}>
                      {PRIORITY_LABELS[t.priority] ?? t.priority}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Right: Activity timeline */}
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          {id && <ActivityTimeline contactId={id} />}
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
              מחיקת איש קשר
            </h2>
            <p className="text-sm text-gray-600 mb-4">
              {`למחוק את "${contact.name}"? כל יומן הפעילות ימחק גם.`}
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
  label, value, dir, href,
}: {
  label: string
  value: string
  dir?: string
  href?: string
}) {
  return (
    <div>
      <p className="text-xs font-medium text-gray-500">{label}</p>
      {href ? (
        <a
          href={href}
          dir={dir}
          className="text-sm text-blue-600 hover:underline"
        >
          {value}
        </a>
      ) : (
        <p className="text-sm text-gray-900" dir={dir}>
          {value}
        </p>
      )}
    </div>
  )
}
