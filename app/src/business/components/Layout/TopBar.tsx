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
          <h1 className="text-xl font-bold text-green-700">{businessName}</h1>
          <p className="text-sm text-gray-500">מערכת ניהול קליק בטבע</p>
          {businessName && (
            <p className="text-base text-green-700 font-medium mt-1">
              {businessName}, ברוך הבא למפת קליק בטבע
            </p>
          )}
        </div>
        <div className="flex items-center gap-4">
          <Link to="/" className="px-4 py-2 text-sm font-medium text-blue-600 border border-blue-200 rounded-lg hover:bg-blue-50 transition-colors">
            ← המפה
          </Link>
          {termsUrl && (
            <a
              href={termsUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="px-4 py-2 text-sm font-medium text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
            >
              תנאי שימוש
            </a>
          )}
          <button
            onClick={() => setPasswordModalOpen(true)}
            className="px-4 py-2 text-sm font-medium text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
          >
            שנה סיסמה
          </button>
          <button
            onClick={() => signOut(auth).catch(err => reportError(err, { source: 'TopBar.signOut' }))}
            className="px-4 py-2 text-sm font-medium text-red-600 border border-red-200 rounded-lg hover:bg-red-50 transition-colors"
          >
            התנתקות
          </button>
        </div>
      </header>

      <ChangePasswordModal isOpen={passwordModalOpen} onClose={() => setPasswordModalOpen(false)} />
    </>
  )
}
