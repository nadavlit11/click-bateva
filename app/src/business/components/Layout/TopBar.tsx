import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { signOut } from 'firebase/auth'
import { doc, getDoc } from 'firebase/firestore'
import { auth, db } from '../../../lib/firebase.ts'
import { reportError } from '../../../lib/errorReporting.ts'
import { useBusinessContext } from '../../context/BusinessContext.tsx'
import { ChangePasswordModal } from '../../../components/ChangePasswordModal'

export function TopBar() {
  const { businessName } = useBusinessContext()
  const [passwordModalOpen, setPasswordModalOpen] = useState(false)
  const [termsUrl, setTermsUrl] = useState('')
  const [showWelcome, setShowWelcome] = useState(true)

  useEffect(() => {
    if (!showWelcome) return
    const t = setTimeout(() => setShowWelcome(false), 5000)
    return () => clearTimeout(t)
  }, [showWelcome])

  useEffect(() => {
    getDoc(doc(db, 'settings', 'terms'))
      .then(snap => {
        if (snap.exists()) setTermsUrl(snap.data().businessTermsUrl ?? '')
      })
      .catch(err => reportError(err, { source: 'TopBar.loadTerms' }))
  }, [])

  return (
    <>
      <header className="bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
        <div>
          <h1 className="text-base font-bold text-green-700">{businessName}</h1>
          <p className="text-xs text-gray-500">מערכת ניהול קליק בטבע</p>
        </div>
        <div className="flex items-center gap-4">
          <Link to="/" className="text-sm text-blue-600 hover:text-blue-800 transition-colors">
            ← המפה
          </Link>
          {termsUrl && (
            <a
              href={termsUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm text-gray-600 hover:text-gray-800 transition-colors"
            >
              תנאי שימוש
            </a>
          )}
          <button
            onClick={() => setPasswordModalOpen(true)}
            className="text-sm text-gray-600 hover:text-gray-800 transition-colors"
          >
            שנה סיסמה
          </button>
          <button
            onClick={() => signOut(auth).catch(err => reportError(err, { source: 'TopBar.signOut' }))}
            className="text-sm text-red-600 hover:text-red-800 transition-colors"
          >
            התנתקות
          </button>
        </div>
      </header>

      {showWelcome && businessName && (
        <div
          className="bg-green-600 text-white px-6 py-3 flex items-center justify-between cursor-pointer"
          onClick={() => setShowWelcome(false)}
        >
          <span className="text-sm font-medium">{businessName} ברוך הבא למפת קליק בטבע</span>
          <span className="text-white/70 text-lg leading-none">✕</span>
        </div>
      )}

      <ChangePasswordModal isOpen={passwordModalOpen} onClose={() => setPasswordModalOpen(false)} />
    </>
  )
}
