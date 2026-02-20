import { NavLink } from 'react-router-dom'

const NAV = [
  { path: '/',            label: 'לוח בקרה',      end: true },
  { path: '/pois',        label: 'נקודות עניין',  end: false },
  { path: '/categories',  label: 'קטגוריות',      end: false },
  { path: '/tags',        label: 'תגיות',         end: false },
]

export function Sidebar() {
  return (
    <aside className="w-64 bg-white border-s border-gray-200 flex flex-col h-full shrink-0">
      <div className="p-6 border-b border-gray-200">
        <h1 className="text-lg font-bold text-green-700">קליק בטבע</h1>
        <p className="text-xs text-gray-500 mt-0.5">לוח ניהול</p>
      </div>

      <nav className="flex-1 p-3 space-y-0.5">
        {NAV.map(item => (
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
        <button className="w-full text-start px-3 py-2 text-sm text-red-600 hover:bg-red-50 rounded-lg transition-colors">
          התנתקות
        </button>
      </div>
    </aside>
  )
}
