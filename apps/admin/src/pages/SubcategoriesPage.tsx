import { useState, useEffect } from 'react'
import { collection, onSnapshot, deleteDoc, doc } from 'firebase/firestore'
import { db } from '../lib/firebase.ts'
import { reportError } from '../lib/errorReporting.ts'
import type { Subcategory, Category } from '../types/index.ts'
import { SubcategoryModal } from '../components/SubcategoryModal.tsx'

export function SubcategoriesPage() {
  const [subcategories, setSubcategories] = useState<Subcategory[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [modalOpen, setModalOpen] = useState(false)
  const [editingSub, setEditingSub] = useState<Subcategory | null>(null)

  useEffect(() => {
    const unsub1 = onSnapshot(collection(db, 'subcategories'), snap => {
      setSubcategories(snap.docs.map(d => ({ id: d.id, ...d.data() }) as Subcategory))
    })
    const unsub2 = onSnapshot(collection(db, 'categories'), snap => {
      setCategories(snap.docs.map(d => ({ id: d.id, ...d.data() }) as Category))
    })
    return () => { unsub1(); unsub2() }
  }, [])

  async function handleDelete(id: string) {
    if (!confirm('האם אתה בטוח שברצונך למחוק תת-קטגוריה זו?')) return
    await deleteDoc(doc(db, 'subcategories', id))
  }

  function openAdd() {
    setEditingSub(null)
    setModalOpen(true)
  }

  function openEdit(sub: Subcategory) {
    setEditingSub(sub)
    setModalOpen(true)
  }

  function handleClose() {
    setModalOpen(false)
    setEditingSub(null)
  }

  // Group subcategories by categoryId, ordered by category list
  const catById = Object.fromEntries(categories.map(c => [c.id, c]))
  const grouped = categories
    .map(cat => ({
      cat,
      subs: subcategories.filter(s => s.categoryId === cat.id),
    }))
    .filter(g => g.subs.length > 0)

  // Subcategories for categories not yet loaded
  const unknownCatSubs = subcategories.filter(s => !catById[s.categoryId])

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-xl font-bold text-gray-900">תת-קטגוריות</h1>
        <button
          onClick={openAdd}
          className="px-4 py-2 bg-green-600 text-white text-sm font-medium rounded-lg hover:bg-green-700 transition-colors"
        >
          + הוסף תת-קטגוריה
        </button>
      </div>

      <div className="space-y-6">
        {grouped.map(({ cat, subs }) => (
          <div key={cat.id} className="bg-white rounded-xl border border-gray-200 overflow-hidden">
            <div className="px-4 py-3 bg-gray-50 border-b border-gray-200 flex items-center gap-2">
              <div className="w-3 h-3 rounded-full" style={{ backgroundColor: cat.color }} />
              <span className="text-sm font-semibold text-gray-700">{cat.name}</span>
              <span className="text-xs text-gray-400">({subs.length})</span>
            </div>
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100">
                  <th className="text-right px-4 py-2 font-medium text-gray-500 text-xs">שם</th>
                  <th className="text-right px-4 py-2 font-medium text-gray-500 text-xs">קבוצה</th>
                  <th className="px-4 py-2"></th>
                </tr>
              </thead>
              <tbody>
                {subs.map(sub => (
                  <tr key={sub.id} className="border-b border-gray-50 hover:bg-gray-50">
                    <td className="px-4 py-2.5 font-medium text-gray-900">{sub.name}</td>
                    <td className="px-4 py-2.5">
                      {sub.group ? (
                        <span className="inline-block px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 text-xs font-medium border border-blue-200">
                          {sub.group}
                        </span>
                      ) : (
                        <span className="text-gray-400 text-xs">כללי</span>
                      )}
                    </td>
                    <td className="px-4 py-2.5">
                      <div className="flex gap-2 justify-end">
                        <button
                          onClick={() => openEdit(sub)}
                          className="text-blue-600 hover:text-blue-800 text-xs font-medium"
                        >
                          עריכה
                        </button>
                        <button
                          onClick={() => handleDelete(sub.id).catch(err => reportError(err, { source: 'SubcategoriesPage.delete' }))}
                          className="text-red-500 hover:text-red-700 text-xs font-medium"
                        >
                          מחיקה
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ))}

        {unknownCatSubs.length > 0 && (
          <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
            <div className="px-4 py-3 bg-gray-50 border-b border-gray-200">
              <span className="text-sm font-semibold text-gray-500">קטגוריה לא ידועה</span>
            </div>
            <table className="w-full text-sm">
              <tbody>
                {unknownCatSubs.map(sub => (
                  <tr key={sub.id} className="border-b border-gray-50 hover:bg-gray-50">
                    <td className="px-4 py-2.5 font-medium text-gray-900">{sub.name}</td>
                    <td className="px-4 py-2.5 text-gray-400 text-xs">{sub.categoryId}</td>
                    <td className="px-4 py-2.5">
                      <div className="flex gap-2 justify-end">
                        <button
                          onClick={() => openEdit(sub)}
                          className="text-blue-600 hover:text-blue-800 text-xs font-medium"
                        >
                          עריכה
                        </button>
                        <button
                          onClick={() => handleDelete(sub.id).catch(err => reportError(err, { source: 'SubcategoriesPage.delete' }))}
                          className="text-red-500 hover:text-red-700 text-xs font-medium"
                        >
                          מחיקה
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {grouped.length === 0 && unknownCatSubs.length === 0 && (
          <div className="bg-white rounded-xl border border-gray-200 py-12 text-center text-gray-400">
            אין תת-קטגוריות עדיין
          </div>
        )}
      </div>

      <SubcategoryModal
        isOpen={modalOpen}
        onClose={handleClose}
        subcategory={editingSub}
        categories={categories}
        existingGroups={[...new Set(subcategories.map(s => s.group).filter((g): g is string => !!g))]}
        onSaved={handleClose}
      />
    </div>
  )
}
