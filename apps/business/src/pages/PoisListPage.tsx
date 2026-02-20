import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { collection, query, where, onSnapshot } from 'firebase/firestore'
import { db } from '../lib/firebase.ts'
import { useBusinessContext } from '../context/BusinessContext.tsx'
import { PoiCard } from '../components/PoiCard.tsx'
import type { Poi } from '../types/index.ts'

export function PoisListPage() {
  const { businessId } = useBusinessContext()
  const [pois, setPois] = useState<Poi[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    const q = query(
      collection(db, 'points_of_interest'),
      where('businessId', '==', businessId)
    )
    return onSnapshot(
      q,
      snap => {
        setPois(snap.docs.map(d => ({ id: d.id, ...d.data() }) as Poi))
        setLoading(false)
      },
      err => {
        console.error('PoisListPage onSnapshot error', err)
        setError('שגיאה בטעינת נקודות העניין')
        setLoading(false)
      }
    )
  }, [businessId])

  if (loading) return <div className="text-center py-10 text-gray-400">טוען...</div>
  if (error) return <div className="text-center py-10 text-red-500">{error}</div>

  return (
    <div>
      <h2 className="text-xl font-bold text-gray-900 mb-4">נקודות העניין שלי</h2>
      {pois.length === 0 ? (
        <p className="text-gray-500">אין נקודות עניין מקושרות לעסק זה.</p>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {pois.map(poi => (
            <Link key={poi.id} to={`/pois/${poi.id}`}>
              <PoiCard poi={poi} />
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
