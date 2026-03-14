import { useState } from 'react'
import { Outlet } from 'react-router-dom'
import { Sidebar } from './Sidebar'

export function CrmLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(false)

  return (
    <div className="flex h-screen overflow-hidden" dir="rtl">
      <Sidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      <main className="flex-1 overflow-y-auto bg-gray-50">
        {/* Mobile hamburger */}
        <button
          onClick={() => setSidebarOpen(true)}
          className="md:hidden fixed top-3 right-3 z-30 bg-white border border-gray-200 rounded-lg p-2 shadow-sm"
          aria-label="תפריט"
        >
          <svg className="w-5 h-5 text-gray-700" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
          </svg>
        </button>
        <Outlet />
      </main>
    </div>
  )
}
