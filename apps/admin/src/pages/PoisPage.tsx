import { useState, useEffect } from 'react'
import {
  collection,
  onSnapshot,
  deleteDoc,
  doc,
  updateDoc,
  serverTimestamp,
  getDocs,
} from 'firebase/firestore'
import { db } from '../lib/firebase.ts'
import { reportError } from '../lib/errorReporting.ts'
import type { Poi, Category, Subcategory, Business } from '../types/index.ts'
import { PoiDrawer } from '../components/PoiDrawer.tsx'

export function PoisPage() {
  const [pois, setPois] = useState<Poi[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [subcategories, setSubcategories] = useState<Subcategory[]>([])
  const [businesses, setBusinesses] = useState<Business[]>([])
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [editingPoi, setEditingPoi] = useState<Poi | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [filterCategoryId, setFilterCategoryId] = useState('')

  // Live POI list
  useEffect(() => {
    return onSnapshot(collection(db, 'points_of_interest'), snap => {
      const docs = snap.docs.map(d => ({ id: d.id, ...d.data() }) as Poi)
      docs.sort((a, b) => a.name.localeCompare(b.name, 'he'))
      setPois(docs)
    })
  }, [])

  // Fetch categories, subcategories, and businesses once on mount
  useEffect(() => {
    getDocs(collection(db, 'categories')).then(snap => {
      setCategories(snap.docs.map(d => ({ id: d.id, ...d.data() }) as Category))
    }).catch(err => reportError(err, { source: 'PoisPage.fetch' }))

    getDocs(collection(db, 'subcategories')).then(snap => {
      setSubcategories(snap.docs.map(d => ({ id: d.id, ...d.data() }) as Subcategory))
    }).catch(err => reportError(err, { source: 'PoisPage.fetch' }))

    getDocs(collection(db, 'businesses')).then(snap => {
      setBusinesses(snap.docs.map(d => ({ id: d.id, ...d.data() }) as Business))
    }).catch(err => reportError(err, { source: 'PoisPage.fetch' }))
  }, [])

  function categoryName(id: string) {
    return categories.find(c => c.id === id)?.name ?? id
  }

  function categoryColor(id: string) {
    return categories.find(c => c.id === id)?.color ?? '#888'
  }

  async function handleDelete(id: string) {
    if (!confirm('האם אתה בטוח שברצונך למחוק נקודה זו?')) return
    await deleteDoc(doc(db, 'points_of_interest', id))
  }

  async function toggleActive(poi: Poi) {
    await updateDoc(doc(db, 'points_of_interest', poi.id), {
      active: !poi.active,
      updatedAt: serverTimestamp(),
    })
  }

  function openAdd() {
    setEditingPoi(null)
    setDrawerOpen(true)
  }

  function openEdit(poi: Poi) {
    setEditingPoi(poi)
    setDrawerOpen(true)
  }

  function handleClose() {
    setDrawerOpen(false)
    setEditingPoi(null)
  }

  const filteredPois = pois.filter(poi => {
    if (filterCategoryId && poi.categoryId !== filterCategoryId) return false
    if (searchQuery) {
      const q = searchQuery.toLowerCase()
      return poi.name.toLowerCase().includes(q)
    }
    return true
  })

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-xl font-bold text-gray-900">נקודות עניין</h1>
        <button
          onClick={openAdd}
          className="px-4 py-2 bg-green-600 text-white text-sm font-medium rounded-lg hover:bg-green-700 transition-colors"
        >
          + הוסף נקודת עניין
        </button>
      </div>

      <div className="flex items-center gap-3 mb-4">
        <input
          type="text"
          value={searchQuery}
          onChange={e => setSearchQuery(e.target.value)}
          placeholder="חיפוש לפי שם..."
          className="flex-1 px-4 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
        />
        <select
          value={filterCategoryId}
          onChange={e => setFilterCategoryId(e.target.value)}
          className="px-4 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 bg-white"
        >
          <option value="">כל הקטגוריות</option>
          {categories.map(cat => (
            <option key={cat.id} value={cat.id}>{cat.name}</option>
          ))}
        </select>
        <span className="text-sm text-gray-500 whitespace-nowrap">
          {filteredPois.length} נקודות
        </span>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-200 bg-gray-50">
              <th className="text-right px-4 py-3 font-medium text-gray-600">שם</th>
              <th className="text-right px-4 py-3 font-medium text-gray-600">קטגוריה</th>
              <th className="text-right px-4 py-3 font-medium text-gray-600">פעיל</th>
              <th className="px-4 py-3"></th>
            </tr>
          </thead>
          <tbody>
            {filteredPois.length === 0 && (
              <tr>
                <td colSpan={4} className="text-center py-10 text-gray-400">
                  {pois.length === 0 ? 'אין נקודות עניין עדיין' : 'לא נמצאו תוצאות'}
                </td>
              </tr>
            )}
            {filteredPois.map(poi => (
              <tr key={poi.id} className="border-b border-gray-100 hover:bg-gray-50">
                <td className="px-4 py-3 font-medium text-gray-900">{poi.name}</td>
                <td className="px-4 py-3">
                  <span
                    className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium text-white"
                    style={{ backgroundColor: categoryColor(poi.categoryId) }}
                  >
                    {categoryName(poi.categoryId)}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <input
                    type="checkbox"
                    checked={poi.active}
                    onChange={() => toggleActive(poi).catch(err => reportError(err, { source: 'PoisPage.toggleActive' }))}
                    className="accent-green-600 w-4 h-4 cursor-pointer"
                  />
                </td>
                <td className="px-4 py-3">
                  <div className="flex gap-2 justify-end">
                    <button
                      onClick={() => openEdit(poi)}
                      className="text-blue-600 hover:text-blue-800 text-xs font-medium"
                    >
                      עריכה
                    </button>
                    <button
                      onClick={() => handleDelete(poi.id).catch(err => reportError(err, { source: 'PoisPage.delete' }))}
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

      <PoiDrawer
        isOpen={drawerOpen}
        onClose={handleClose}
        poi={editingPoi}
        categories={categories}
        subcategories={subcategories}
        businesses={businesses}
        onSaved={handleClose}
      />
    </div>
  )
}
