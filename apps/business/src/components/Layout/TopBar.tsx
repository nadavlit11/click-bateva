import { signOut } from 'firebase/auth'
import { auth } from '../../lib/firebase.ts'
import { reportError } from '../../lib/errorReporting.ts'
import { useBusinessContext } from '../../context/BusinessContext.tsx'

export function TopBar() {
  const { businessName } = useBusinessContext()
  return (
    <header className="bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
      <div>
        <h1 className="text-base font-bold text-green-700">{businessName}</h1>
        <p className="text-xs text-gray-500">פורטל עסקים — קליק בטבע</p>
      </div>
      <button
        onClick={() => signOut(auth).catch(err => reportError(err, { source: 'TopBar.signOut' }))}
        className="text-sm text-red-600 hover:text-red-800 transition-colors"
      >
        התנתקות
      </button>
    </header>
  )
}
