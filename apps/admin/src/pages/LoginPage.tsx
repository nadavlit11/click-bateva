// Phase 2.2 will add real Firebase Auth sign-in logic
export function LoginPage() {
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="bg-white rounded-2xl shadow-lg p-8 w-full max-w-sm">
        <h1 className="text-xl font-bold text-gray-900 mb-1">קליק בטבע</h1>
        <p className="text-sm text-gray-500 mb-6">כניסה ללוח הניהול</p>

        <form className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">אימייל</label>
            <input
              type="email"
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-green-500"
              placeholder="admin@example.com"
              disabled
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">סיסמה</label>
            <input
              type="password"
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-green-500"
              placeholder="••••••••"
              disabled
            />
          </div>
          <button
            type="button"
            disabled
            className="w-full py-2 bg-green-600 text-white text-sm font-medium rounded-lg opacity-50 cursor-not-allowed"
          >
            כניסה (Phase 2.2)
          </button>
        </form>
      </div>
    </div>
  )
}
