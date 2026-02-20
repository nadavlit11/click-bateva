import { useEffect, useState } from 'react'
import { collection, getDocs, doc, getDoc } from 'firebase/firestore'
import { db } from '../lib/firebase.ts'

interface ClickDoc {
  poiId: string
  categoryId: string
}

interface PoiStat {
  poiId: string
  name: string
  count: number
}

interface CategoryStat {
  categoryId: string
  name: string
  count: number
}

export function AnalyticsPage() {
  const [total, setTotal] = useState(0)
  const [topPois, setTopPois] = useState<PoiStat[]>([])
  const [byCategory, setByCategory] = useState<CategoryStat[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    getDocs(collection(db, 'clicks'))
      .then(async snap => {
        const clicks = snap.docs.map(d => d.data() as ClickDoc)
        setTotal(clicks.length)

        // Aggregate by POI
        const poiMap: Record<string, number> = {}
        for (const c of clicks) { poiMap[c.poiId] = (poiMap[c.poiId] ?? 0) + 1 }
        const sortedPoiEntries = Object.entries(poiMap)
          .sort(([, a], [, b]) => b - a)
          .slice(0, 5)

        // Aggregate by category
        const catMap: Record<string, number> = {}
        for (const c of clicks) { catMap[c.categoryId] = (catMap[c.categoryId] ?? 0) + 1 }
        const sortedCatEntries = Object.entries(catMap)
          .sort(([, a], [, b]) => b - a)

        // Fetch names in parallel
        const [poiDocs, catDocs] = await Promise.all([
          Promise.all(sortedPoiEntries.map(([id]) => getDoc(doc(db, 'points_of_interest', id)))),
          Promise.all(sortedCatEntries.map(([id]) => getDoc(doc(db, 'categories', id)))),
        ])

        setTopPois(sortedPoiEntries.map(([poiId, count], i) => ({
          poiId,
          count,
          name: poiDocs[i].data()?.name ?? poiId,
        })))

        setByCategory(sortedCatEntries.map(([categoryId, count], i) => ({
          categoryId,
          count,
          name: catDocs[i].data()?.name ?? categoryId,
        })))

        setLoading(false)
      })
      .catch(err => {
        console.error('AnalyticsPage fetch error', err)
        setError('שגיאה בטעינת נתוני קליקים')
        setLoading(false)
      })
  }, [])

  if (loading) return <div className="p-6 text-gray-400 text-center">טוען...</div>
  if (error) return <div className="p-6 text-red-500 text-center">{error}</div>

  return (
    <div className="p-6 space-y-8">
      <h1 className="text-xl font-bold text-gray-900">אנליטיקס</h1>

      {/* Total */}
      <div className="bg-white rounded-xl border border-gray-200 p-5 inline-block">
        <p className="text-sm text-gray-500">סה"כ קליקים</p>
        <p className="text-4xl font-bold text-green-700 mt-1">{total}</p>
      </div>

      {total === 0 && (
        <p className="text-gray-400 text-sm">אין נתוני קליקים עדיין.</p>
      )}

      {total > 0 && (
        <>
          {/* Top POIs */}
          <section>
            <h2 className="text-base font-semibold text-gray-700 mb-3">5 נקודות העניין הפופולריות ביותר</h2>
            <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-200 bg-gray-50">
                    <th className="text-right px-4 py-3 font-medium text-gray-600">נקודת עניין</th>
                    <th className="text-right px-4 py-3 font-medium text-gray-600">קליקים</th>
                  </tr>
                </thead>
                <tbody>
                  {topPois.map(s => (
                    <tr key={s.poiId} className="border-b border-gray-100 hover:bg-gray-50">
                      <td className="px-4 py-3 text-gray-800">{s.name}</td>
                      <td className="px-4 py-3 text-gray-700 font-medium">{s.count}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          {/* By category */}
          <section>
            <h2 className="text-base font-semibold text-gray-700 mb-3">קליקים לפי קטגוריה</h2>
            <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-200 bg-gray-50">
                    <th className="text-right px-4 py-3 font-medium text-gray-600">קטגוריה</th>
                    <th className="text-right px-4 py-3 font-medium text-gray-600">קליקים</th>
                  </tr>
                </thead>
                <tbody>
                  {byCategory.map(s => (
                    <tr key={s.categoryId} className="border-b border-gray-100 hover:bg-gray-50">
                      <td className="px-4 py-3 text-gray-800">{s.name}</td>
                      <td className="px-4 py-3 text-gray-700 font-medium">{s.count}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        </>
      )}
    </div>
  )
}
