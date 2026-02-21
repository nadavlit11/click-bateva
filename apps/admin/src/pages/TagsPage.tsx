import { useState, useEffect } from 'react'
import { collection, onSnapshot, deleteDoc, doc } from 'firebase/firestore'
import { db } from '../lib/firebase.ts'
import type { Tag } from '../types/index.ts'
import { TagModal } from '../components/TagModal.tsx'
import { GROUP_LABELS } from '../constants/tagGroups.ts'

export function TagsPage() {
  const [tags, setTags] = useState<Tag[]>([])
  const [modalOpen, setModalOpen] = useState(false)
  const [editingTag, setEditingTag] = useState<Tag | null>(null)

  useEffect(() => {
    return onSnapshot(collection(db, 'tags'), snap => {
      setTags(snap.docs.map(d => ({ id: d.id, ...d.data() }) as Tag))
    })
  }, [])

  async function handleDelete(id: string) {
    if (!confirm('האם אתה בטוח שברצונך למחוק תגית זו?')) return
    await deleteDoc(doc(db, 'tags', id))
  }

  function openAdd() {
    setEditingTag(null)
    setModalOpen(true)
  }

  function openEdit(tag: Tag) {
    setEditingTag(tag)
    setModalOpen(true)
  }

  function handleClose() {
    setModalOpen(false)
    setEditingTag(null)
  }

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-xl font-bold text-gray-900">תגיות</h1>
        <button
          onClick={openAdd}
          className="px-4 py-2 bg-green-600 text-white text-sm font-medium rounded-lg hover:bg-green-700 transition-colors"
        >
          + הוסף תגית
        </button>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-200 bg-gray-50">
              <th className="text-right px-4 py-3 font-medium text-gray-600">שם</th>
              <th className="text-right px-4 py-3 font-medium text-gray-600">קבוצה</th>
              <th className="px-4 py-3"></th>
            </tr>
          </thead>
          <tbody>
            {tags.length === 0 && (
              <tr>
                <td colSpan={3} className="text-center py-10 text-gray-400">
                  אין תגיות עדיין
                </td>
              </tr>
            )}
            {tags.map(tag => (
              <tr key={tag.id} className="border-b border-gray-100 hover:bg-gray-50">
                <td className="px-4 py-3 font-medium text-gray-900">{tag.name}</td>
                <td className="px-4 py-3">
                  {tag.group ? (
                    <span className="inline-block px-2 py-0.5 rounded-full bg-green-50 text-green-700 text-xs font-medium border border-green-200">
                      {GROUP_LABELS[tag.group] ?? tag.group}
                    </span>
                  ) : (
                    <span className="text-gray-400 text-xs">כללי</span>
                  )}
                </td>
                <td className="px-4 py-3">
                  <div className="flex gap-2 justify-end">
                    <button
                      onClick={() => openEdit(tag)}
                      className="text-blue-600 hover:text-blue-800 text-xs font-medium"
                    >
                      עריכה
                    </button>
                    <button
                      onClick={() => handleDelete(tag.id).catch(console.error)}
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

      <TagModal
        isOpen={modalOpen}
        onClose={handleClose}
        tag={editingTag}
        onSaved={handleClose}
      />
    </div>
  )
}
