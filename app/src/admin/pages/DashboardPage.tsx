import { useEffect, useState, useRef } from 'react'
import { collection, getDocs, query, orderBy, limit, doc, getDoc, setDoc } from 'firebase/firestore'
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage'
import { Link } from 'react-router-dom'
import { db, storage } from '../../lib/firebase.ts'
import { reportError } from '../../lib/errorReporting.ts'

const MIN_PIN = 12
const MAX_PIN = 60
const DEFAULT_PIN = 24

interface ContactInfo { phone: string; email: string }

interface CountState {
  pois: number
  categories: number
  subcategories: number
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
  const [pinSize, setPinSize] = useState(DEFAULT_PIN)
  const [pinSaving, setPinSaving] = useState(false)
  const [pinSaved, setPinSaved] = useState(false)
  const [contact, setContact] = useState<ContactInfo>({ phone: '', email: '' })
  const [contactSaving, setContactSaving] = useState(false)
  const [contactSaved, setContactSaved] = useState(false)
  const savedTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const contactTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const [userTermsUrl, setUserTermsUrl] = useState('')
  const [bizTermsUrl, setBizTermsUrl] = useState('')
  const [termsUploading, setTermsUploading] = useState<'user' | 'biz' | null>(null)
  const userTermsRef = useRef<HTMLInputElement>(null)
  const bizTermsRef = useRef<HTMLInputElement>(null)

  function clamp(v: number) { return Math.max(MIN_PIN, Math.min(MAX_PIN, v)) }

  async function handleTermsUpload(
    type: 'user' | 'biz',
    file: File,
  ) {
    setTermsUploading(type)
    try {
      const path = type === 'user'
        ? 'terms/user-terms.pdf'
        : 'terms/business-terms.pdf'
      const storageRef = ref(storage, path)
      await uploadBytes(storageRef, file)
      const url = await getDownloadURL(storageRef)
      const field = type === 'user'
        ? 'userTermsUrl'
        : 'businessTermsUrl'
      await setDoc(
        doc(db, 'settings', 'terms'),
        { [field]: url },
        { merge: true },
      )
      if (type === 'user') setUserTermsUrl(url)
      else setBizTermsUrl(url)
    } catch (err) {
      reportError(err, { source: 'DashboardPage.uploadTerms' })
    } finally {
      setTermsUploading(null)
    }
  }

  async function handleContactSave() {
    setContactSaving(true)
    try {
      await setDoc(doc(db, 'settings', 'contact'), contact)
      setContactSaved(true)
      if (contactTimerRef.current) clearTimeout(contactTimerRef.current)
      contactTimerRef.current = setTimeout(() => setContactSaved(false), 2000)
    } catch (err) {
      reportError(err, { source: 'DashboardPage.saveContact' })
    } finally {
      setContactSaving(false)
    }
  }

  async function handlePinSave() {
    setPinSaving(true)
    try {
      await setDoc(doc(db, 'settings', 'map'), { pinSize })
      setPinSaved(true)
      if (savedTimerRef.current) clearTimeout(savedTimerRef.current)
      savedTimerRef.current = setTimeout(() => setPinSaved(false), 2000)
    } catch (err) {
      reportError(err, { source: 'DashboardPage.savePinSize' })
    } finally {
      setPinSaving(false)
    }
  }

  useEffect(() => {
    getDoc(doc(db, 'settings', 'map'))
      .then(snap => { if (snap.exists()) setPinSize(snap.data().pinSize ?? DEFAULT_PIN) })
      .catch(err => reportError(err, { source: 'DashboardPage.loadPinSize' }))
    getDoc(doc(db, 'settings', 'contact'))
      .then(snap => {
        if (snap.exists()) {
          const d = snap.data()
          setContact({ phone: d.phone ?? '', email: d.email ?? '' })
        }
      })
      .catch(err => reportError(err, { source: 'DashboardPage.loadContact' }))
    getDoc(doc(db, 'settings', 'terms'))
      .then(snap => {
        if (snap.exists()) {
          const d = snap.data()
          setUserTermsUrl(d.userTermsUrl ?? '')
          setBizTermsUrl(d.businessTermsUrl ?? '')
        }
      })
      .catch(err => reportError(err, { source: 'DashboardPage.loadTerms' }))
    return () => {
      if (savedTimerRef.current) clearTimeout(savedTimerRef.current)
      if (contactTimerRef.current) clearTimeout(contactTimerRef.current)
    }
  }, [])

  useEffect(() => {
    Promise.all([
      getDocs(collection(db, 'points_of_interest')),
      getDocs(collection(db, 'categories')),
      getDocs(collection(db, 'subcategories')),
      getDocs(collection(db, 'businesses')),
      getDocs(collection(db, 'clicks')),
      getDocs(query(collection(db, 'points_of_interest'), orderBy('createdAt', 'desc'), limit(5))),
    ]).then(([poisSnap, catsSnap, subcatsSnap, bizSnap, clicksSnap, recentSnap]) => {
      setCounts({
        pois: poisSnap.size,
        categories: catsSnap.size,
        subcategories: subcatsSnap.size,
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
      reportError(err, { source: 'DashboardPage.fetch' })
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
            { label: 'נקודות עניין', value: counts.pois,       href: '/admin/pois' },
            { label: 'קטגוריות',    value: counts.categories,  href: '/admin/categories' },
            { label: 'תת-קטגוריות', value: counts.subcategories, href: '/admin/subcategories' },
            { label: 'מפרסמים',     value: counts.businesses,  href: '/admin/users' },
            { label: 'קליקים',      value: counts.clicks,      href: '/admin/analytics' },
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
            { label: '+ נקודת עניין חדשה', href: '/admin/pois' },
            { label: '+ קטגוריה חדשה',    href: '/admin/categories' },
            { label: '+ תת-קטגוריה חדשה', href: '/admin/subcategories' },
            { label: '+ מפרסם חדש',       href: '/admin/users' },
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

      {/* Pin size */}
      <div className="bg-white rounded-xl border border-gray-200 p-5">
        <h2 className="text-sm font-semibold text-gray-700 mb-3">גודל סיכות על המפה</h2>
        <div className="flex items-center gap-3">
          <button
            onClick={() => setPinSize(v => clamp(v - 1))}
            disabled={pinSize <= MIN_PIN}
            className="w-9 h-9 rounded-lg border border-gray-200 text-gray-600 text-lg font-medium hover:bg-gray-50 disabled:opacity-30 transition-colors"
          >−</button>
          <input
            type="number"
            value={pinSize}
            min={MIN_PIN}
            max={MAX_PIN}
            onChange={e => setPinSize(clamp(Number(e.target.value)))}
            className="w-16 text-center border border-gray-200 rounded-lg px-2 py-1.5 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-green-400"
            dir="ltr"
          />
          <span className="text-sm text-gray-400">px</span>
          <button
            onClick={() => setPinSize(v => clamp(v + 1))}
            disabled={pinSize >= MAX_PIN}
            className="w-9 h-9 rounded-lg border border-gray-200 text-gray-600 text-lg font-medium hover:bg-gray-50 disabled:opacity-30 transition-colors"
          >+</button>
          <button
            onClick={handlePinSave}
            disabled={pinSaving}
            className="ms-2 px-4 py-1.5 bg-green-600 hover:bg-green-700 disabled:opacity-50 text-white rounded-lg text-sm font-medium transition-colors"
          >
            {pinSaving ? 'שומר...' : pinSaved ? '✓ נשמר' : 'שמור'}
          </button>
        </div>
      </div>

      {/* Contact info */}
      <div className="bg-white rounded-xl border border-gray-200 p-5">
        <h2 className="text-sm font-semibold text-gray-700 mb-3">פרטי יצירת קשר (מוצגים למשתמשים)</h2>
        <div className="flex flex-col gap-3">
          <div className="flex items-center gap-3">
            <label className="text-sm text-gray-500 w-16 shrink-0">טלפון</label>
            <input
              type="tel"
              value={contact.phone}
              onChange={e => setContact(c => ({ ...c, phone: e.target.value }))}
              placeholder="05X-XXXXXXX"
              className="flex-1 border border-gray-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-400"
              dir="ltr"
            />
          </div>
          <div className="flex items-center gap-3">
            <label className="text-sm text-gray-500 w-16 shrink-0">אימייל</label>
            <input
              type="email"
              value={contact.email}
              onChange={e => setContact(c => ({ ...c, email: e.target.value }))}
              placeholder="email@example.com"
              className="flex-1 border border-gray-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-400"
              dir="ltr"
            />
          </div>
          <button
            onClick={handleContactSave}
            disabled={contactSaving}
            className="self-start px-4 py-1.5 bg-green-600 hover:bg-green-700 disabled:opacity-50 text-white rounded-lg text-sm font-medium transition-colors"
          >
            {contactSaving ? 'שומר...' : contactSaved ? '✓ נשמר' : 'שמור'}
          </button>
        </div>
      </div>

      {/* Terms & Conditions */}
      <div className="bg-white rounded-xl border border-gray-200 p-5">
        <h2 className="text-sm font-semibold text-gray-700 mb-3">
          תנאי שימוש (PDF)
        </h2>
        <div className="flex flex-col gap-4">
          {/* User T&C */}
          <div className="flex items-center gap-3">
            <span className="text-sm text-gray-500 w-24 shrink-0">
              משתמשים
            </span>
            {userTermsUrl ? (
              <a
                href={userTermsUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm text-green-600 hover:underline"
              >
                צפייה בקובץ
              </a>
            ) : (
              <span className="text-sm text-gray-400">לא הועלה</span>
            )}
            <input
              ref={userTermsRef}
              type="file"
              accept=".pdf"
              className="hidden"
              onChange={e => {
                const f = e.target.files?.[0]
                if (f) handleTermsUpload('user', f)
                e.target.value = ''
              }}
            />
            <button
              onClick={() => userTermsRef.current?.click()}
              disabled={termsUploading === 'user'}
              className="px-3 py-1.5 bg-green-600 hover:bg-green-700 disabled:opacity-50 text-white rounded-lg text-sm font-medium transition-colors"
            >
              {termsUploading === 'user' ? 'מעלה...' : 'העלאת קובץ'}
            </button>
          </div>
          {/* Business T&C */}
          <div className="flex items-center gap-3">
            <span className="text-sm text-gray-500 w-24 shrink-0">
              עסקים
            </span>
            {bizTermsUrl ? (
              <a
                href={bizTermsUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm text-green-600 hover:underline"
              >
                צפייה בקובץ
              </a>
            ) : (
              <span className="text-sm text-gray-400">לא הועלה</span>
            )}
            <input
              ref={bizTermsRef}
              type="file"
              accept=".pdf"
              className="hidden"
              onChange={e => {
                const f = e.target.files?.[0]
                if (f) handleTermsUpload('biz', f)
                e.target.value = ''
              }}
            />
            <button
              onClick={() => bizTermsRef.current?.click()}
              disabled={termsUploading === 'biz'}
              className="px-3 py-1.5 bg-green-600 hover:bg-green-700 disabled:opacity-50 text-white rounded-lg text-sm font-medium transition-colors"
            >
              {termsUploading === 'biz' ? 'מעלה...' : 'העלאת קובץ'}
            </button>
          </div>
        </div>
      </div>

      {/* Recent POIs */}
      {recentPois.length > 0 && (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
            <h2 className="text-sm font-semibold text-gray-700">נקודות עניין אחרונות</h2>
            <Link to="/admin/pois" className="text-xs text-green-600 hover:underline">הצג הכל</Link>
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
