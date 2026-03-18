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
  { path: '/tasks',     label: 'משימות',         end: false },
  { path: '/contacts',  label: 'אנשי קשר',      end: false },
  { path: '/users',     label: 'משתמשי CRM',    end: false, adminOnly: true },
]

interface SidebarProps {
  open: boolean
  onClose: () => void
}

export function Sidebar({ open, onClose }: SidebarProps) {
  const { role, user } = useAuth()
  const [passwordModalOpen, setPasswordModalOpen] = useState(false)
  const email = user?.email ?? null
  const visibleNav = NAV.filter(item =>
    !item.adminOnly || role === 'admin',
  )

  const sidebarContent = (
    <>
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
            onClick={() => onClose()}
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
    </>
  )

  return (
    <>
      {/* Desktop sidebar — always visible */}
      <aside className="hidden md:flex w-64 bg-white border-s border-gray-200 flex-col h-full shrink-0">
        {sidebarContent}
      </aside>

      {/* Mobile sidebar — overlay */}
      {open && (
        <div className="md:hidden fixed inset-0 z-40 flex">
          {/* Backdrop */}
          <div className="fixed inset-0 bg-black/40" onClick={onClose} />
          {/* Sidebar panel */}
          <aside className="relative z-50 w-64 bg-white flex flex-col h-full shadow-xl">
            {/* Close button */}
            <button
              onClick={onClose}
              className="absolute top-4 right-4 text-gray-400 hover:text-gray-600"
              aria-label="סגור"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
            {sidebarContent}
          </aside>
        </div>
      )}
    </>
  )
}
