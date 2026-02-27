interface AppHeaderProps {
  currentUserEmail?: string | null;
  onLoginClick: () => void;
  onLogout: () => void;
}

export function AppHeader({ currentUserEmail, onLoginClick, onLogout }: AppHeaderProps) {
  return (
    <div className="p-6 border-b border-gray-100">
      <div className="flex items-center gap-3">
        <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-green-400 to-green-600 flex items-center justify-center shadow-lg shrink-0">
          <svg className="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
        </div>
        <div className="flex-1 min-w-0">
          <h1 className="text-2xl font-bold text-gray-800">קליק בטבע</h1>
          <p className="text-sm text-gray-500">גלה את ישראל</p>
        </div>
      </div>

      {/* Login / logout row */}
      <div className="mt-3 flex items-center justify-end">
        {currentUserEmail ? (
          <div className="flex items-center gap-2">
            <span className="text-xs text-gray-400 truncate max-w-[140px]">{currentUserEmail}</span>
            <button
              onClick={onLogout}
              className="text-xs text-red-500 hover:text-red-700 transition-colors font-medium"
            >
              יציאה
            </button>
          </div>
        ) : (
          <button
            onClick={onLoginClick}
            className="text-xs text-green-600 hover:text-green-800 transition-colors font-medium"
          >
            כניסה לסוכנים ✈️
          </button>
        )}
      </div>
    </div>
  );
}
