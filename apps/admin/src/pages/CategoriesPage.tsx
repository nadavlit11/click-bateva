import { useState, useEffect } from 'react'
import { collection, onSnapshot, deleteDoc, doc } from 'firebase/firestore'
import { db } from '../lib/firebase.ts'
import { reportError } from '../lib/errorReporting.ts'
import type { Category, Icon } from '../types/index.ts'
import { CategoryModal } from '../components/CategoryModal.tsx'
import { useUserRole } from '../hooks/useUserRole.ts'

export function CategoriesPage() {
  const role = useUserRole()
  const [categories, setCategories] = useState<Category[]>([])
  const [icons, setIcons] = useState<Icon[]>([])
  const [modalOpen, setModalOpen] = useState(false)
  const [editingCategory, setEditingCategory] = useState<Category | null>(null)

  useEffect(() => {
    const unsub1 = onSnapshot(collection(db, 'categories'), snap => {
      setCategories(snap.docs.map(d => ({ id: d.id, ...d.data() }) as Category))
    })
    const unsub2 = onSnapshot(collection(db, 'icons'), snap => {
      setIcons(snap.docs.map(d => ({ id: d.id, ...d.data() }) as Icon))
    })
    return () => { unsub1(); unsub2() }
  }, [])

  async function handleDelete(id: string) {
    if (!confirm('האם אתה בטוח שברצונך למחוק קטגוריה זו?')) return
    await deleteDoc(doc(db, 'categories', id))
  }

  function openAdd() {
    setEditingCategory(null)
    setModalOpen(true)
  }

  function openEdit(cat: Category) {
    setEditingCategory(cat)
    setModalOpen(true)
  }

  function handleClose() {
    setModalOpen(false)
    setEditingCategory(null)
  }

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-xl font-bold text-gray-900">קטגוריות</h1>
        <button
          onClick={openAdd}
          className="px-4 py-2 bg-green-600 text-white text-sm font-medium rounded-lg hover:bg-green-700 transition-colors"
        >
          + הוסף קטגוריה
        </button>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-200 bg-gray-50">
              <th className="text-right px-4 py-3 font-medium text-gray-600">צבע</th>
              <th className="text-right px-4 py-3 font-medium text-gray-600">אייקון</th>
              <th className="text-right px-4 py-3 font-medium text-gray-600">שם</th>
              <th className="px-4 py-3"></th>
            </tr>
          </thead>
          <tbody>
            {categories.length === 0 && (
              <tr>
                <td colSpan={4} className="text-center py-10 text-gray-400">
                  אין קטגוריות עדיין
                </td>
              </tr>
            )}
            {[...categories].sort((a, b) => (a.order ?? 0) - (b.order ?? 0)).map(cat => (
              <tr key={cat.id} className="border-b border-gray-100 hover:bg-gray-50">
                <td className="px-4 py-3">
                  <div
                    className="w-6 h-6 rounded-full border border-gray-200"
                    style={{ backgroundColor: cat.color }}
                  />
                </td>
                <td className="px-4 py-3">
                  {cat.iconUrl
                    ? <img src={cat.iconUrl} alt="" className="w-7 h-7 object-contain" />
                    : <span className="text-gray-300 text-xs">—</span>
                  }
                </td>
                <td className="px-4 py-3 font-medium text-gray-900">{cat.name}</td>
                <td className="px-4 py-3">
                  <div className="flex gap-2 justify-end">
                    <button
                      onClick={() => openEdit(cat)}
                      className="text-blue-600 hover:text-blue-800 text-xs font-medium"
                    >
                      עריכה
                    </button>
                    {role === 'admin' && (
                      <button
                        onClick={() => handleDelete(cat.id).catch(err => reportError(err, { source: 'CategoriesPage.delete' }))}
                        className="text-red-500 hover:text-red-700 text-xs font-medium"
                      >
                        מחיקה
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <CategoryModal
        isOpen={modalOpen}
        onClose={handleClose}
        category={editingCategory}
        onSaved={handleClose}
        icons={icons}
      />
    </div>
  )
}
