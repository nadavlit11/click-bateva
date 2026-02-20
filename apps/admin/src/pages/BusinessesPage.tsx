import { useState, useEffect } from 'react'
import { collection, onSnapshot, query, orderBy } from 'firebase/firestore'
import { db } from '../lib/firebase.ts'
import type { Business } from '../types/index.ts'
import { BusinessModal } from '../components/BusinessModal.tsx'

export function BusinessesPage() {
  const [businesses, setBusinesses] = useState<Business[]>([])
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState('')
  const [modalOpen, setModalOpen] = useState(false)

  useEffect(() => {
    const q = query(collection(db, 'businesses'), orderBy('createdAt', 'desc'))
    return onSnapshot(
      q,
      snap => {
        setBusinesses(snap.docs.map(d => ({ id: d.id, ...d.data() }) as Business))
        setLoading(false)
      },
      () => {
        setLoadError('שגיאה בטעינת העסקים')
        setLoading(false)
      }
    )
  }, [])

  function openAdd() {
    setModalOpen(true)
  }

  function handleClose() {
    setModalOpen(false)
  }

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-xl font-bold text-gray-900">עסקים</h1>
        <button
          onClick={openAdd}
          className="px-4 py-2 bg-green-600 text-white text-sm font-medium rounded-lg hover:bg-green-700 transition-colors"
        >
          + הוסף עסק
        </button>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        {loading ? (
          <div className="text-center py-10 text-gray-400">טוען...</div>
        ) : loadError ? (
          <div className="text-center py-10 text-red-500">{loadError}</div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-200 bg-gray-50">
                <th className="text-right px-4 py-3 font-medium text-gray-600">שם העסק</th>
                <th className="text-right px-4 py-3 font-medium text-gray-600">אימייל</th>
              </tr>
            </thead>
            <tbody>
              {businesses.length === 0 && (
                <tr>
                  <td colSpan={2} className="text-center py-10 text-gray-400">
                    אין עסקים עדיין
                  </td>
                </tr>
              )}
              {businesses.map(business => (
                <tr key={business.id} className="border-b border-gray-100 hover:bg-gray-50">
                  <td className="px-4 py-3 font-medium text-gray-900">{business.name}</td>
                  <td className="px-4 py-3 text-gray-600">{business.email}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <BusinessModal
        isOpen={modalOpen}
        onClose={handleClose}
        onSaved={handleClose}
      />
    </div>
  )
}
