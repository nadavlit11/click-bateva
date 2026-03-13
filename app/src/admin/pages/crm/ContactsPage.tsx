import { useState, useEffect } from 'react'
import {
  collection, onSnapshot, doc, deleteDoc, orderBy, query,
} from 'firebase/firestore'
import { useNavigate } from 'react-router-dom'
import { db } from '../../../lib/firebase.ts'
import { reportError } from '../../../lib/errorReporting.ts'
import { useAuth } from '../../../hooks/useAuth'
import { ContactModal } from '../../components/crm/ContactModal.tsx'
import { ExcelImportModal } from '../../components/crm/ExcelImportModal.tsx'
import type { CrmContact } from '../../types/index.ts'

export function ContactsPage() {
  const { role } = useAuth()
  const navigate = useNavigate()
  const [contacts, setContacts] = useState<CrmContact[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState<CrmContact | null>(null)
  const [importOpen, setImportOpen] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState<CrmContact | null>(null)
  const [deleting, setDeleting] = useState(false)

  useEffect(() => {
    const q = query(
      collection(db, 'crm_contacts'),
      orderBy('createdAt', 'desc'),
    )
    return onSnapshot(
      q,
      snap => {
        setContacts(
          snap.docs.map(d => ({
            id: d.id, ...d.data(),
          }) as CrmContact),
        )
        setLoading(false)
      },
      err => {
        reportError(err, { source: 'ContactsPage.onSnapshot' })
        setLoading(false)
      },
    )
  }, [])

  async function handleDelete() {
    if (!confirmDelete) return
    setDeleting(true)
    try {
      await deleteDoc(doc(db, 'crm_contacts', confirmDelete.id))
    } catch (err: unknown) {
      reportError(err, { source: 'ContactsPage.delete' })
    } finally {
      setDeleting(false)
      setConfirmDelete(null)
    }
  }

  const term = search.trim().toLowerCase()
  const filtered = term
    ? contacts.filter(c =>
      c.name.toLowerCase().includes(term) ||
      c.businessName.toLowerCase().includes(term) ||
      c.phone.includes(term))
    : contacts

  return (
    <div className="p-4 md:p-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
        <h1 className="text-xl font-bold text-gray-900">
          אנשי קשר
          {!loading && (
            <span className="text-sm font-normal text-gray-400 mr-2">
              ({filtered.length})
            </span>
          )}
        </h1>
        <div className="flex gap-2">
          <button
            onClick={() => setImportOpen(true)}
            className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors"
          >
            ייבוא מאקסל
          </button>
          <button
            onClick={() => { setEditing(null); setModalOpen(true) }}
            className="px-4 py-2 bg-green-600 text-white text-sm font-medium rounded-lg hover:bg-green-700 transition-colors"
          >
            + איש קשר חדש
          </button>
        </div>
      </div>

      <div className="mb-4">
        <input
          type="text"
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="חיפוש לפי שם, עסק או טלפון..."
          className="w-full sm:w-80 bg-white border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-400"
        />
      </div>

      {loading ? (
        <div className="text-center py-10 text-gray-400">
          טוען...
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-10 text-gray-400">
          {search ? 'לא נמצאו תוצאות' : 'אין אנשי קשר עדיין'}
        </div>
      ) : (
        <>
          {/* Desktop table */}
          <div className="hidden md:block bg-white rounded-xl border border-gray-200 overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200 bg-gray-50">
                  <th className="text-right px-4 py-3 font-medium text-gray-600">
                    שם
                  </th>
                  <th className="text-right px-4 py-3 font-medium text-gray-600">
                    עסק
                  </th>
                  <th className="text-right px-4 py-3 font-medium text-gray-600">
                    טלפון
                  </th>
                  <th className="text-right px-4 py-3 font-medium text-gray-600">
                    אימייל
                  </th>
                  <th className="px-4 py-3" />
                </tr>
              </thead>
              <tbody>
                {filtered.map(c => (
                  <tr
                    key={c.id}
                    className="border-b border-gray-100 hover:bg-gray-50 cursor-pointer"
                    onClick={() => navigate(`/admin/crm/contacts/${c.id}`)}
                  >
                    <td className="px-4 py-3 font-medium text-gray-900">
                      {c.name}
                    </td>
                    <td className="px-4 py-3 text-gray-700">
                      {c.businessName || '—'}
                    </td>
                    <td className="px-4 py-3 text-gray-600" dir="ltr">
                      {c.phone || '—'}
                    </td>
                    <td className="px-4 py-3 text-gray-600" dir="ltr">
                      {c.email || '—'}
                    </td>
                    <td className="px-4 py-3">
                      <div
                        className="flex gap-2 justify-end"
                        onClick={e => e.stopPropagation()}
                      >
                        <button
                          onClick={() => {
                            setEditing(c)
                            setModalOpen(true)
                          }}
                          className="px-3 py-1 text-xs font-medium rounded-lg border border-blue-200 bg-blue-50 text-blue-700 hover:bg-blue-100 transition-colors"
                        >
                          עריכה
                        </button>
                        {role === 'admin' && (
                          <button
                            onClick={() => setConfirmDelete(c)}
                            className="px-3 py-1 text-xs font-medium rounded-lg border border-red-200 bg-red-50 text-red-700 hover:bg-red-100 transition-colors"
                          >
                            מחק
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile cards */}
          <div className="md:hidden space-y-3">
            {filtered.map(c => (
              <div
                key={c.id}
                className="bg-white rounded-xl border border-gray-200 p-4 cursor-pointer active:bg-gray-50"
                onClick={() => navigate(`/admin/crm/contacts/${c.id}`)}
              >
                <div className="flex items-start justify-between">
                  <div className="min-w-0">
                    <p className="font-medium text-gray-900 truncate">
                      {c.name}
                    </p>
                    {c.businessName && (
                      <p className="text-sm text-gray-500 truncate">
                        {c.businessName}
                      </p>
                    )}
                  </div>
                  <div
                    className="flex gap-2 shrink-0 mr-2"
                    onClick={e => e.stopPropagation()}
                  >
                    <button
                      onClick={() => {
                        setEditing(c)
                        setModalOpen(true)
                      }}
                      className="px-2 py-1 text-xs font-medium rounded-lg border border-blue-200 bg-blue-50 text-blue-700"
                    >
                      עריכה
                    </button>
                    {role === 'admin' && (
                      <button
                        onClick={() => setConfirmDelete(c)}
                        className="px-2 py-1 text-xs font-medium rounded-lg border border-red-200 bg-red-50 text-red-700"
                      >
                        מחק
                      </button>
                    )}
                  </div>
                </div>
                <div className="flex gap-4 mt-2 text-sm text-gray-600">
                  {c.phone && (
                    <a
                      href={`tel:${c.phone}`}
                      dir="ltr"
                      className="text-blue-600 hover:underline"
                      onClick={e => e.stopPropagation()}
                    >
                      {c.phone}
                    </a>
                  )}
                  {c.email && (
                    <span dir="ltr" className="truncate">
                      {c.email}
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      <ContactModal
        isOpen={modalOpen}
        onClose={() => { setModalOpen(false); setEditing(null) }}
        contact={editing}
        onSaved={() => { setModalOpen(false); setEditing(null) }}
      />

      <ExcelImportModal
        isOpen={importOpen}
        onClose={() => setImportOpen(false)}
        onImported={() => setImportOpen(false)}
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
            <h2 className="text-lg font-bold text-gray-900 mb-2">
              מחיקת איש קשר
            </h2>
            <p className="text-sm text-gray-600 mb-4">
              {`למחוק את "${confirmDelete.name}"? פעולה זו אינה הפיכה.`}
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
