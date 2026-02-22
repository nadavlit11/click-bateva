import { useEffect, useState } from 'react'
import { collection, getDocs, doc, getDoc } from 'firebase/firestore'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts'
import { db } from '../lib/firebase.ts'
import { reportError } from '../lib/errorReporting.ts'

interface ClickDoc {
  poiId: string
  categoryId: string
  timestamp: { toDate: () => Date } | null
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
  color: string
}

interface DayStat {
  label: string
  count: number
}

function kpiCard(label: string, value: number) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5">
      <p className="text-sm text-gray-500">{label}</p>
      <p className="text-3xl font-bold text-green-700 mt-1">{value.toLocaleString()}</p>
    </div>
  )
}

function HorizBar({ name, count, max, color }: { name: string; count: number; max: number; color?: string }) {
  const pct = max > 0 ? Math.round((count / max) * 100) : 0
  return (
    <div className="flex items-center gap-3">
      <span className="text-sm text-gray-700 w-40 truncate text-right shrink-0">{name}</span>
      <div className="flex-1 bg-gray-100 rounded-full h-3">
        <div
          className="h-3 rounded-full transition-all"
          style={{ width: `${pct}%`, backgroundColor: color ?? '#16a34a' }}
        />
      </div>
      <span className="text-sm font-medium text-gray-600 w-8 text-left shrink-0">{count}</span>
    </div>
  )
}

export function AnalyticsPage() {
  const [total, setTotal] = useState(0)
  const [today, setToday] = useState(0)
  const [thisWeek, setThisWeek] = useState(0)
  const [timeline, setTimeline] = useState<DayStat[]>([])
  const [topPois, setTopPois] = useState<PoiStat[]>([])
  const [byCategory, setByCategory] = useState<CategoryStat[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    getDocs(collection(db, 'clicks'))
      .then(async snap => {
        const clicks = snap.docs.map(d => d.data() as ClickDoc)
        setTotal(clicks.length)

        // --- Time-based KPIs ---
        const now = new Date()
        const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate())
        const startOfWeek = new Date(startOfToday)
        startOfWeek.setDate(startOfToday.getDate() - 6)

        let todayCount = 0
        let weekCount = 0
        for (const c of clicks) {
          const d = c.timestamp?.toDate()
          if (!d) continue
          if (d >= startOfToday) todayCount++
          if (d >= startOfWeek) weekCount++
        }
        setToday(todayCount)
        setThisWeek(weekCount)

        // --- Timeline: last 14 days ---
        const dayMap: Record<string, number> = {}
        for (let i = 13; i >= 0; i--) {
          const d = new Date(startOfToday)
          d.setDate(startOfToday.getDate() - i)
          const key = `${d.getDate()}/${d.getMonth() + 1}`
          dayMap[key] = 0
        }
        for (const c of clicks) {
          const d = c.timestamp?.toDate()
          if (!d) continue
          const start14 = new Date(startOfToday)
          start14.setDate(startOfToday.getDate() - 13)
          if (d < start14) continue
          const key = `${d.getDate()}/${d.getMonth() + 1}`
          if (key in dayMap) dayMap[key]++
        }
        setTimeline(Object.entries(dayMap).map(([label, count]) => ({ label, count })))

        // --- Aggregate by POI / category ---
        const poiMap: Record<string, number> = {}
        for (const c of clicks) { poiMap[c.poiId] = (poiMap[c.poiId] ?? 0) + 1 }
        const sortedPoiEntries = Object.entries(poiMap).sort(([, a], [, b]) => b - a).slice(0, 5)

        const catMap: Record<string, number> = {}
        for (const c of clicks) { catMap[c.categoryId] = (catMap[c.categoryId] ?? 0) + 1 }
        const sortedCatEntries = Object.entries(catMap).sort(([, a], [, b]) => b - a)

        // --- Fetch names + category colors in parallel ---
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
          color: catDocs[i].data()?.color ?? '#16a34a',
        })))

        setLoading(false)
      })
      .catch(err => {
        reportError(err, { source: 'AnalyticsPage.fetch' })
        setError('שגיאה בטעינת נתוני קליקים')
        setLoading(false)
      })
  }, [])

  if (loading) return <div className="p-6 text-gray-400 text-center">טוען...</div>
  if (error) return <div className="p-6 text-red-500 text-center">{error}</div>

  return (
    <div className="p-6 space-y-6">
      <h1 className="text-xl font-bold text-gray-900">אנליטיקס</h1>

      {/* KPI Cards */}
      <div className="grid grid-cols-3 gap-4">
        {kpiCard('סה"כ קליקים', total)}
        {kpiCard('קליקים היום', today)}
        {kpiCard('קליקים השבוע', thisWeek)}
      </div>

      {total === 0 && (
        <p className="text-gray-400 text-sm">אין נתוני קליקים עדיין.</p>
      )}

      {total > 0 && (
        <>
          {/* Timeline chart */}
          <div className="bg-white rounded-xl border border-gray-200 p-5">
            <h2 className="text-sm font-semibold text-gray-700 mb-4">קליקים לפי יום (14 ימים אחרונים)</h2>
            <ResponsiveContainer width="100%" height={180}>
              <BarChart data={timeline} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="label" tick={{ fontSize: 11, fill: '#9ca3af' }} />
                <YAxis allowDecimals={false} tick={{ fontSize: 11, fill: '#9ca3af' }} />
                <Tooltip
                  contentStyle={{ fontSize: 12, borderRadius: 8, border: '1px solid #e5e7eb' }}
                  formatter={(v: number | undefined) => [v ?? 0, 'קליקים']}
                />
                <Bar dataKey="count" fill="#16a34a" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Bottom two panels */}
          <div className="grid grid-cols-2 gap-4">
            {/* Top POIs */}
            <div className="bg-white rounded-xl border border-gray-200 p-5">
              <h2 className="text-sm font-semibold text-gray-700 mb-4">5 נקודות העניין הפופולריות</h2>
              <div className="space-y-3">
                {topPois.map(s => (
                  <HorizBar key={s.poiId} name={s.name} count={s.count} max={topPois[0]?.count ?? 1} />
                ))}
              </div>
            </div>

            {/* By category */}
            <div className="bg-white rounded-xl border border-gray-200 p-5">
              <h2 className="text-sm font-semibold text-gray-700 mb-4">קליקים לפי קטגוריה</h2>
              <div className="space-y-3">
                {byCategory.map(s => (
                  <HorizBar key={s.categoryId} name={s.name} count={s.count} max={byCategory[0]?.count ?? 1} color={s.color} />
                ))}
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
