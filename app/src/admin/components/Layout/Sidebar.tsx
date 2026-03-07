import { useState } from 'react'
import { NavLink, Link } from 'react-router-dom'
import { signOut } from 'firebase/auth'
import { auth } from '../../../lib/firebase.ts'
import { reportError } from '../../../lib/errorReporting.ts'
import { useAuth } from '../../../hooks/useAuth.ts'
import { ChangePasswordModal } from '../../../components/ChangePasswordModal'

const NAV = [
  { path: '/admin',              label: 'לוח בקרה',      end: true,  adminOnly: false },
  { path: '/admin/pois',         label: 'נקודות עניין',  end: false, adminOnly: false },
  { path: '/admin/categories',   label: 'קטגוריות',      end: false, adminOnly: false },
  { path: '/admin/subcategories', label: 'תת-קטגוריות',  end: false, adminOnly: false },
  { path: '/admin/icons',        label: 'אייקונים',      end: false, adminOnly: false },
  { path: '/admin/users',        label: 'משתמשים',       end: false, adminOnly: true },
  { path: '/admin/analytics',    label: 'אנליטיקס',      end: true,  adminOnly: true },
]

export function Sidebar() {
  const { role, user } = useAuth()
  const [passwordModalOpen, setPasswordModalOpen] = useState(false)
  const email = user?.email ?? null

  return (
    <aside className="w-64 bg-white border-s border-gray-200 flex flex-col h-full shrink-0">
      <div className="p-6 border-b border-gray-200">
        <h1 className="text-lg font-bold text-green-700">קליק בטבע</h1>
        <p className="text-xs text-gray-500 mt-0.5">לוח ניהול</p>
      </div>

      <nav className="flex-1 p-3 space-y-0.5">
        {NAV.filter(item => !item.adminOnly || role === 'admin').map(item => (
          <NavLink
            key={item.path}
            to={item.path}
            end={item.end}
            className={({ isActive }) =>
              `block px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                isActive
                  ? 'bg-green-50 text-green-700'
                  : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
              }`
            }
          >
            {item.label}
          </NavLink>
        ))}
      </nav>

      <div className="p-3 border-t border-gray-200">
        <Link
          to="/"
          className="block w-full text-start px-3 py-2 text-sm text-blue-600 hover:bg-blue-50 rounded-lg transition-colors mb-1"
        >
          ← המפה
        </Link>
        {email && (
          <div className="px-3 py-2 mb-1">
            <p className="text-xs text-gray-400 truncate">{email}</p>
          </div>
        )}
        <button
          onClick={() => setPasswordModalOpen(true)}
          className="w-full text-start px-3 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
        >
          שנה סיסמה
        </button>
        <button
          onClick={() => { signOut(auth).catch(err => reportError(err, { source: 'Sidebar.signOut' })) }}
          className="w-full text-start px-3 py-2 text-sm text-red-600 hover:bg-red-50 rounded-lg transition-colors"
        >
          התנתקות
        </button>
      </div>

      <ChangePasswordModal isOpen={passwordModalOpen} onClose={() => setPasswordModalOpen(false)} />
    </aside>
  )
}
