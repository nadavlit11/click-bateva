import { useState, useEffect, useRef } from 'react'
import { useNavigate, useSearchParams, useLocation } from 'react-router-dom'
import {
  collection,
  onSnapshot,
  deleteDoc,
  doc,
  updateDoc,
  serverTimestamp,
  getDocs,
} from 'firebase/firestore'
import { db, authReady } from '../../lib/firebase.ts'
import { reportError } from '../../lib/errorReporting.ts'
import type { Poi, Category } from '../types/index.ts'
import { useAuth } from '../../hooks/useAuth'

export function PoisPage() {
  const { role, user } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const [searchParams, setSearchParams] = useSearchParams()
  const [pois, setPois] = useState<Poi[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const searchQuery = searchParams.get('search') ?? ''
  const filterCategoryId = searchParams.get('category') ?? ''
  const mapTab = (searchParams.get('mapTab') ?? 'default') as 'default' | 'families'
  const [deleteModalId, setDeleteModalId] = useState<string | null>(null)

  // Restore scroll position once after POIs first load
  const savedScrollTop = (location.state as { poisScrollTop?: number })?.poisScrollTop
  const scrollRestoredRef = useRef(false)
  useEffect(() => {
    if (scrollRestoredRef.current || !savedScrollTop || pois.length === 0) return
    scrollRestoredRef.current = true
    const main = document.querySelector('main')
    if (main) main.scrollTop = savedScrollTop
  }, [savedScrollTop, pois.length])

  // Live POI list (excludes honeypots)
  useEffect(() => {
    let unsub: (() => void) | undefined
    let cancelled = false
    authReady.then(() => {
      if (cancelled) return
      unsub = onSnapshot(collection(db, 'points_of_interest'), snap => {
        const docs = snap.docs
          .filter(d => !d.data()._hp)
          .map(d => ({ id: d.id, ...d.data() }) as Poi)
        docs.sort((a, b) => a.name.localeCompare(b.name, 'he'))
        setPois(docs)
      })
    })
    return () => { cancelled = true; unsub?.() }
  }, [])

  // Fetch categories once on mount
  useEffect(() => {
    let cancelled = false
    authReady.then(() => {
      if (cancelled) return
      getDocs(collection(db, 'categories')).then(snap => {
        if (!cancelled) {
          setCategories(snap.docs.map(d => ({ id: d.id, ...d.data() }) as Category))
        }
      }).catch(err => reportError(err, { source: 'PoisPage.fetch' }))
    })
    return () => { cancelled = true }
  }, [])

  function categoryName(id: string) {
    return categories.find(c => c.id === id)?.name ?? id
  }

  function categoryColor(id: string) {
    return categories.find(c => c.id === id)?.color ?? '#888'
  }

  async function handleDelete(id: string) {
    await deleteDoc(doc(db, 'points_of_interest', id))
    setDeleteModalId(null)
  }

  async function toggleActive(poi: Poi) {
    await updateDoc(doc(db, 'points_of_interest', poi.id), {
      active: !poi.active,
      updatedAt: serverTimestamp(),
      updatedBy: user!.uid,
    })
  }

  function navState() {
    const main = document.querySelector('main')
    return {
      poisSearch: searchParams.toString(),
      poisScrollTop: main?.scrollTop ?? 0,
      mapTab,
    }
  }

  const filteredPois = pois.filter(poi => {
    if ((poi.mapType ?? 'default') !== mapTab) return false
    if (filterCategoryId && poi.categoryId !== filterCategoryId) return false
    if (searchQuery) {
      const q = searchQuery.toLowerCase()
      return poi.name.toLowerCase().includes(q)
    }
    return true
  })

  function setMapTab(tab: 'default' | 'families') {
    setSearchParams(prev => {
      const next = new URLSearchParams(prev)
      next.set('mapTab', tab)
      next.delete('search')
      next.delete('category')
      return next
    })
  }

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-xl font-bold text-gray-900">נקודות עניין</h1>
        <button
          onClick={() => navigate('/admin/pois/new', { state: { ...navState(), mapTab } })}
          className="px-4 py-2 bg-green-600 text-white text-sm font-medium rounded-lg hover:bg-green-700 transition-colors"
        >
          + הוסף נקודת עניין
        </button>
      </div>

      {/* Map type tabs */}
      <div className="flex gap-1 mb-4 bg-gray-100 rounded-lg p-1 w-fit">
        <button
          onClick={() => setMapTab('default')}
          className={`px-4 py-2 text-sm rounded-lg transition-colors ${
            mapTab === 'default'
              ? 'bg-white shadow font-medium text-gray-900'
              : 'text-gray-600 hover:text-gray-800'
          }`}
        >
          סוכנים / קבוצות
        </button>
        <button
          onClick={() => setMapTab('families')}
          className={`px-4 py-2 text-sm rounded-lg transition-colors ${
            mapTab === 'families'
              ? 'bg-white shadow font-medium text-gray-900'
              : 'text-gray-600 hover:text-gray-800'
          }`}
        >
          משפחות
        </button>
      </div>

      <div className="flex items-center gap-3 mb-4">
        <input
          type="text"
          value={searchQuery}
          onChange={e => setSearchParams(prev => {
            const next = new URLSearchParams(prev)
            if (e.target.value) next.set('search', e.target.value)
            else next.delete('search')
            return next
          })}
          placeholder="חיפוש לפי שם..."
          className="flex-1 px-4 py-2 text-sm bg-white border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
        />
        <select
          value={filterCategoryId}
          onChange={e => setSearchParams(prev => {
            const next = new URLSearchParams(prev)
            if (e.target.value) next.set('category', e.target.value)
            else next.delete('category')
            return next
          })}
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
                      onClick={() => navigate(`/admin/pois/${poi.id}`, { state: navState() })}
                      className="px-3 py-1 text-xs font-medium rounded-lg border border-blue-200 bg-blue-50 text-blue-700 hover:bg-blue-100 transition-colors"
                    >
                      עריכה
                    </button>
                    {role !== 'content_manager' && (
                      <button
                        onClick={() => setDeleteModalId(poi.id)}
                        className="px-3 py-1 text-xs font-medium rounded-lg border border-red-200 bg-red-50 text-red-700 hover:bg-red-100 transition-colors"
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

      {/* Delete confirmation modal */}
      {deleteModalId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/40" onClick={() => setDeleteModalId(null)} />
          <div className="relative bg-white rounded-xl shadow-xl p-6 max-w-sm w-full mx-4">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">מחיקת נקודת עניין</h3>
            <p className="text-sm text-gray-600 mb-4">האם אתה בטוח שברצונך למחוק נקודה זו?</p>
            <div className="flex gap-2 justify-end">
              <button
                onClick={() => setDeleteModalId(null)}
                className="px-4 py-2 border border-gray-300 text-gray-700 text-sm font-medium rounded-lg hover:bg-gray-50"
              >
                ביטול
              </button>
              <button
                onClick={() => handleDelete(deleteModalId).catch(err => reportError(err, { source: 'PoisPage.delete' }))}
                className="px-4 py-2 bg-red-600 text-white text-sm font-medium rounded-lg hover:bg-red-700"
              >
                מחיקה
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
