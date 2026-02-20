import { Outlet } from 'react-router-dom'
import { Sidebar } from './Sidebar.tsx'

export function AppLayout() {
  return (
    <div className="flex h-screen bg-gray-50">
      {/* Sidebar is first child → renders on the RIGHT in RTL */}
      <Sidebar />
      <main className="flex-1 overflow-y-auto">
        <Outlet />
      </main>
    </div>
  )
}
