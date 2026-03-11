import { Outlet } from 'react-router-dom'
import { TopBar } from './TopBar.tsx'

export function AppLayout() {
  return (
    <div className="h-dvh bg-gray-50 flex flex-col overflow-y-auto">
      <TopBar />
      <main className="flex-1 p-6">
        <Outlet />
      </main>
    </div>
  )
}
