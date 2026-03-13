import { Outlet } from 'react-router-dom'
import { Sidebar } from './Sidebar'

export function CrmLayout() {
  return (
    <div className="flex h-screen overflow-hidden" dir="rtl">
      <Sidebar />
      <main className="flex-1 overflow-y-auto bg-gray-50">
        <Outlet />
      </main>
    </div>
  )
}
