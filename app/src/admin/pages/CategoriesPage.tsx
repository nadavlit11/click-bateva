import { useState, useEffect } from 'react'
import { collection, onSnapshot, deleteDoc, doc } from 'firebase/firestore'
import { db } from '../../lib/firebase.ts'
import { reportError } from '../../lib/errorReporting.ts'
import type { Category, Icon } from '../types/index.ts'
import { CategoryModal } from '../components/CategoryModal.tsx'
import { ConfirmDialog } from '../components/ConfirmDialog.tsx'
import { useAuth } from '../../hooks/useAuth'

export function CategoriesPage() {
  const { role } = useAuth()
  const [categories, setCategories] = useState<Category[]>([])
  const [icons, setIcons] = useState<Icon[]>([])
  const [modalOpen, setModalOpen] = useState(false)
  const [editingCategory, setEditingCategory] = useState<Category | null>(null)
  const [deletingCategoryId, setDeletingCategoryId] = useState<string | null>(null)

  useEffect(() => {
    const unsub1 = onSnapshot(collection(db, 'categories'), snap => {
      setCategories(snap.docs.map(d => ({ id: d.id, ...d.data() }) as Category))
    })
    const unsub2 = onSnapshot(collection(db, 'icons'), snap => {
      setIcons(snap.docs.map(d => ({ id: d.id, ...d.data() }) as Icon))
    })
    return () => { unsub1(); unsub2() }
  }, [])

  async function handleDelete() {
    if (!deletingCategoryId) return
    await deleteDoc(doc(db, 'categories', deletingCategoryId))
    setDeletingCategoryId(null)
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
              <th className="text-right px-4 py-3 font-medium text-gray-600">סמן</th>
              <th className="text-right px-4 py-3 font-medium text-gray-600">שם</th>
              <th className="px-4 py-3"></th>
            </tr>
          </thead>
          <tbody>
            {categories.length === 0 && (
              <tr>
                <td colSpan={3} className="text-center py-10 text-gray-400">
                  אין קטגוריות עדיין
                </td>
              </tr>
            )}
            {[...categories].sort((a, b) => (a.order ?? 0) - (b.order ?? 0)).map(cat => (
              <tr key={cat.id} className="border-b border-gray-100 hover:bg-gray-50">
                <td className="px-4 py-3">
                  <div
                    style={{
                      width: 28,
                      height: 28,
                      borderRadius: '50%',
                      backgroundColor: cat.color,
                      border: `2px solid ${cat.borderColor ?? '#000000'}`,
                      boxSizing: 'border-box',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    {cat.iconUrl ? (
                      <img src={cat.iconUrl} alt="" style={{ width: cat.iconSize ?? 14, height: cat.iconSize ?? 14, objectFit: 'contain' }} onError={e => { e.currentTarget.hidden = true }} />
                    ) : (
                      <span style={{ fontSize: 12, lineHeight: 1 }}>📍</span>
                    )}
                  </div>
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
                        onClick={() => setDeletingCategoryId(cat.id)}
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

      <ConfirmDialog
        isOpen={!!deletingCategoryId}
        onClose={() => setDeletingCategoryId(null)}
        onConfirm={() => handleDelete().catch(err => reportError(err, { source: 'CategoriesPage.delete' }))}
        title="מחיקת קטגוריה"
        message="האם אתה בטוח שברצונך למחוק קטגוריה זו? פעולה זו אינה ניתנת לביטול."
      />
    </div>
  )
}
