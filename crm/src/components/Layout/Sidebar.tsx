import { useState } from 'react'
import { NavLink } from 'react-router-dom'
import { signOut } from 'firebase/auth'
import { auth } from '../../lib/firebase.ts'
import { reportError } from '../../lib/errorReporting.ts'
import { useAuth } from '../../hooks/useAuth'
import { ChangePasswordModal } from '../ChangePasswordModal'

interface NavItem {
  path: string
  label: string
  end: boolean
  adminOnly?: boolean
}

const NAV: NavItem[] = [
  { path: '/my-tasks',  label: 'המשימות שלי',   end: false },
  { path: '/contacts',  label: 'אנשי קשר',      end: false },
  { path: '/tasks',     label: 'כל המשימות',    end: false },
  { path: '/users',     label: 'משתמשי CRM',    end: false, adminOnly: true },
]

export function Sidebar() {
  const { role, user } = useAuth()
  const [passwordModalOpen, setPasswordModalOpen] = useState(false)
  const email = user?.email ?? null

  const visibleNav = NAV.filter(item =>
    !item.adminOnly || role === 'admin',
  )

  return (
    <aside className="w-64 bg-white border-s border-gray-200 flex flex-col h-full shrink-0">
      <div className="p-6 border-b border-gray-200">
        <h1 className="text-lg font-bold text-green-700">קליק בטבע</h1>
        <p className="text-xs text-gray-500 mt-0.5">CRM</p>
        {email && (
          <p className="text-sm text-green-700 font-medium mt-2">שלום, {email}</p>
        )}
      </div>

      <nav className="flex-1 p-3 space-y-0.5">
        {visibleNav.map(item => (
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

        {role === 'admin' && (
          <a
            href="https://click-bateva.web.app/admin"
            className="block px-3 py-2 rounded-lg text-sm font-medium text-blue-600 hover:bg-blue-50 transition-colors"
            target="_blank"
            rel="noopener noreferrer"
          >
            לוח ניהול ←
          </a>
        )}
      </nav>

      <div className="p-3 border-t border-gray-200">
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
