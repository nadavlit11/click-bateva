interface AppHeaderProps {
  isLoggedIn: boolean;
  userEmail?: string | null;
  onLoginClick: () => void;
  onRegisterClick: () => void;
  onLogout: () => void;
}

export function AppHeader({ isLoggedIn, userEmail, onLoginClick, onRegisterClick, onLogout }: AppHeaderProps) {
  return (
    <div className="p-6 border-b border-gray-100">
      <div className="flex items-center gap-3">
        <img src="/icon-192.png" alt="קליק בטבע" className="w-12 h-12 rounded-2xl object-contain shrink-0" />
        <div>
          <h1 className="text-2xl font-bold text-gray-800">קליק בטבע</h1>
          <p className="text-sm text-gray-500">גלה את ישראל</p>
        </div>
      </div>

      {/* Login / logout row */}
      <div className="mt-3 flex items-center justify-end">
        {isLoggedIn ? (
          <div className="flex items-center gap-2">
            {userEmail && <span className="text-xs text-gray-400 truncate max-w-[140px]">{userEmail}</span>}
            <button
              onClick={onLogout}
              className="text-xs text-red-500 hover:text-red-700 transition-colors font-medium"
            >
              יציאה
            </button>
          </div>
        ) : (
          <div className="flex items-center gap-2">
            <button
              onClick={onLoginClick}
              className="text-xs text-green-600 hover:text-green-800 transition-colors font-medium"
            >
              כניסה לסוכנים ✈️
            </button>
            <button
              onClick={onRegisterClick}
              className="text-xs text-gray-500 hover:text-gray-700 transition-colors font-medium"
            >
              הרשמה
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
