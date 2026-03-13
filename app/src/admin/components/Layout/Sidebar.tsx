import { useState } from 'react'
import { NavLink, Link, useLocation } from 'react-router-dom'
import { signOut } from 'firebase/auth'
import { auth } from '../../../lib/firebase.ts'
import { reportError } from '../../../lib/errorReporting.ts'
import { useAuth } from '../../../hooks/useAuth'
import { ChangePasswordModal } from '../../../components/ChangePasswordModal'

interface NavItem {
  path: string
  label: string
  end: boolean
  roles?: string[]  // undefined = visible to all admin-section roles
}

const CONTENT_ROLES = ['admin', 'content_manager']
const CRM_ROLES = ['admin', 'crm_user']

const NAV: NavItem[] = [
  { path: '/admin',               label: 'לוח בקרה',      end: true,  roles: CONTENT_ROLES },
  { path: '/admin/pois',          label: 'נקודות עניין',  end: false, roles: CONTENT_ROLES },
  { path: '/admin/categories',    label: 'קטגוריות',      end: false, roles: CONTENT_ROLES },
  { path: '/admin/subcategories', label: 'תת-קטגוריות',   end: false, roles: CONTENT_ROLES },
  { path: '/admin/icons',         label: 'אייקונים',      end: false, roles: CONTENT_ROLES },
  { path: '/admin/users',         label: 'משתמשים',       end: false, roles: ['admin'] },
  { path: '/admin/analytics',     label: 'אנליטיקס',      end: true,  roles: ['admin'] },
]

const CRM_SUB_NAV: NavItem[] = [
  { path: '/admin/crm/my-tasks',  label: 'המשימות שלי',   end: false, roles: CRM_ROLES },
  { path: '/admin/crm/contacts',  label: 'אנשי קשר',      end: false, roles: CRM_ROLES },
  { path: '/admin/crm/tasks',     label: 'כל המשימות',    end: false, roles: CRM_ROLES },
]

function NavItemLink({ item }: { item: NavItem }) {
  return (
    <NavLink
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
  )
}

export function Sidebar() {
  const { role, user } = useAuth()
  const location = useLocation()
  const [passwordModalOpen, setPasswordModalOpen] = useState(false)
  const email = user?.email ?? null

  const isCrmRoute = location.pathname.startsWith('/admin/crm')
  const [crmOpen, setCrmOpen] = useState(isCrmRoute)

  const showCrm = role && CRM_ROLES.includes(role)

  const visibleNav = NAV.filter(item =>
    !item.roles || (role && item.roles.includes(role))
  )

  const visibleCrmNav = CRM_SUB_NAV.filter(item =>
    !item.roles || (role && item.roles.includes(role))
  )

  return (
    <aside className="w-64 bg-white border-s border-gray-200 flex flex-col h-full shrink-0">
      <div className="p-6 border-b border-gray-200">
        <h1 className="text-lg font-bold text-green-700">קליק בטבע</h1>
        <p className="text-xs text-gray-500 mt-0.5">לוח ניהול</p>
        {email && (
          <p className="text-sm text-green-700 font-medium mt-2">שלום, {email}</p>
        )}
      </div>

      <nav className="flex-1 p-3 space-y-0.5">
        {visibleNav.map(item => (
          <NavItemLink key={item.path} item={item} />
        ))}

        {showCrm && (
          <div>
            <div className="flex items-center">
              <NavLink
                to="/admin/crm/my-tasks"
                className={
                  `flex-1 block px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                    isCrmRoute
                      ? 'bg-green-50 text-green-700'
                      : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
                  }`
                }
              >
                CRM
              </NavLink>
              <button
                onClick={() => setCrmOpen(!crmOpen)}
                className="p-1.5 text-gray-400 hover:text-gray-600 rounded transition-colors"
              >
                <span className={`inline-block transition-transform ${crmOpen ? 'rotate-90' : ''}`}>
                  ◂
                </span>
              </button>
            </div>

            {crmOpen && (
              <div className="me-3 space-y-0.5 mt-0.5">
                {visibleCrmNav.map(item => (
                  <NavItemLink key={item.path} item={item} />
                ))}
              </div>
            )}
          </div>
        )}
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
