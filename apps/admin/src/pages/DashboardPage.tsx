import { useEffect, useState } from 'react'
import { collection, getDocs, query, orderBy, limit } from 'firebase/firestore'
import { Link } from 'react-router-dom'
import { db } from '../lib/firebase.ts'

interface CountState {
  pois: number
  categories: number
  tags: number
  businesses: number
  clicks: number
}

interface RecentPoi {
  id: string
  name: string
  active: boolean
  categoryId: string
}

export function DashboardPage() {
  const [counts, setCounts] = useState<CountState | null>(null)
  const [recentPois, setRecentPois] = useState<RecentPoi[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    Promise.all([
      getDocs(collection(db, 'points_of_interest')),
      getDocs(collection(db, 'categories')),
      getDocs(collection(db, 'tags')),
      getDocs(collection(db, 'businesses')),
      getDocs(collection(db, 'clicks')),
      getDocs(query(collection(db, 'points_of_interest'), orderBy('createdAt', 'desc'), limit(5))),
    ]).then(([poisSnap, catsSnap, tagsSnap, bizSnap, clicksSnap, recentSnap]) => {
      setCounts({
        pois: poisSnap.size,
        categories: catsSnap.size,
        tags: tagsSnap.size,
        businesses: bizSnap.size,
        clicks: clicksSnap.size,
      })
      setRecentPois(recentSnap.docs.map(d => ({
        id: d.id,
        name: d.data().name ?? d.id,
        active: d.data().active ?? false,
        categoryId: d.data().categoryId ?? '',
      })))
      setLoading(false)
    }).catch(err => {
      console.error('DashboardPage fetch error', err)
      setLoading(false)
    })
  }, [])

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-xl font-bold text-gray-900">לוח בקרה</h1>
        <p className="text-sm text-gray-500 mt-0.5">ברוך הבא למערכת ניהול קליק בטבע.</p>
      </div>

      {/* Stats grid */}
      {loading ? (
        <div className="text-gray-400 text-sm">טוען...</div>
      ) : counts && (
        <div className="grid grid-cols-5 gap-3">
          {[
            { label: 'נקודות עניין', value: counts.pois,       href: '/pois' },
            { label: 'קטגוריות',    value: counts.categories,  href: '/categories' },
            { label: 'תגיות',       value: counts.tags,        href: '/tags' },
            { label: 'עסקים',       value: counts.businesses,  href: '/businesses' },
            { label: 'קליקים',      value: counts.clicks,      href: '/analytics' },
          ].map(s => (
            <Link
              key={s.href}
              to={s.href}
              className="bg-white rounded-xl border border-gray-200 p-4 hover:border-green-300 hover:shadow-sm transition-all group"
            >
              <p className="text-xs text-gray-500 group-hover:text-green-600 transition-colors">{s.label}</p>
              <p className="text-2xl font-bold text-gray-900 mt-1">{s.value.toLocaleString()}</p>
            </Link>
          ))}
        </div>
      )}

      {/* Quick actions */}
      <div className="bg-white rounded-xl border border-gray-200 p-5">
        <h2 className="text-sm font-semibold text-gray-700 mb-3">פעולות מהירות</h2>
        <div className="flex flex-wrap gap-2">
          {[
            { label: '+ נקודת עניין חדשה', href: '/pois' },
            { label: '+ קטגוריה חדשה',    href: '/categories' },
            { label: '+ תגית חדשה',       href: '/tags' },
            { label: '+ עסק חדש',         href: '/businesses' },
          ].map(a => (
            <Link
              key={a.href}
              to={a.href}
              className="px-3 py-1.5 text-sm bg-green-50 text-green-700 rounded-lg hover:bg-green-100 transition-colors font-medium"
            >
              {a.label}
            </Link>
          ))}
        </div>
      </div>

      {/* Recent POIs */}
      {recentPois.length > 0 && (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
            <h2 className="text-sm font-semibold text-gray-700">נקודות עניין אחרונות</h2>
            <Link to="/pois" className="text-xs text-green-600 hover:underline">הצג הכל</Link>
          </div>
          <table className="w-full text-sm">
            <tbody>
              {recentPois.map(poi => (
                <tr key={poi.id} className="border-b border-gray-50 last:border-0 hover:bg-gray-50">
                  <td className="px-5 py-3 text-gray-800 font-medium">{poi.name}</td>
                  <td className="px-5 py-3 text-right">
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                      poi.active ? 'bg-green-50 text-green-700' : 'bg-gray-100 text-gray-500'
                    }`}>
                      {poi.active ? 'פעיל' : 'לא פעיל'}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
