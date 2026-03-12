import { Link } from "react-router-dom";
import { WhatsAppShareButton } from "../WhatsAppShareButton";

interface BottomSheetFooterProps {
  role?: string | null;
  isLoggedIn: boolean;
  onLoginClick: () => void;
  onRegisterClick: () => void;
  onLogout: () => void;
  onChangePasswordClick: () => void;
  onContactClick?: () => void;
  termsUrl?: string;
}

export function BottomSheetFooter({
  role,
  isLoggedIn,
  onLoginClick,
  onRegisterClick,
  onLogout,
  onChangePasswordClick,
  onContactClick,
  termsUrl,
}: BottomSheetFooterProps) {
  return (
    <div className="shrink-0 border-t border-gray-100 px-4 py-2 flex flex-col gap-1">
      {/* Dashboard links */}
      {isLoggedIn && (role === "admin" || role === "content_manager") && (
        <div className="flex items-center justify-center">
          <Link to="/admin" className="text-sm text-green-700 font-semibold hover:text-green-900">
            לוח ניהול
          </Link>
        </div>
      )}
      {isLoggedIn && role === "business_user" && (
        <div className="flex items-center justify-center">
          <Link to="/business" className="text-sm text-green-700 font-semibold hover:text-green-900">
            ניהול הנקודות שלי
          </Link>
        </div>
      )}

      {/* Share + Contact row */}
      <div className="flex items-center justify-center gap-3">
        <WhatsAppShareButton showLabel={true} className="text-sm font-semibold" />
        {onContactClick && (
          <button onClick={onContactClick} className="text-sm text-blue-600 hover:text-blue-800 font-medium">
            צור קשר
          </button>
        )}
      </div>

      {/* Auth row */}
      <div className="flex items-center justify-center gap-3">
        {isLoggedIn ? (
          <>
            <button onClick={onLogout} className="text-sm text-red-500 hover:text-red-700 font-semibold">
              התנתקות
            </button>
            <button onClick={onChangePasswordClick} className="text-sm text-gray-500 hover:text-gray-700 font-medium">
              שינוי סיסמה
            </button>
          </>
        ) : (
          <>
            <button onClick={onLoginClick} className="text-sm text-gray-500 font-semibold px-3 py-1 rounded-lg bg-gray-100 hover:bg-gray-200 transition-colors">
              כניסה
            </button>
            <button onClick={onRegisterClick} className="text-sm text-gray-500 font-medium px-3 py-1 rounded-lg bg-gray-100 hover:bg-gray-200 transition-colors">
              הרשמה
            </button>
          </>
        )}
      </div>

      {/* Terms link */}
      {termsUrl && (
        <div className="flex items-center justify-center">
          <a href={termsUrl} target="_blank" rel="noopener noreferrer" className="text-xs text-gray-400 hover:text-gray-600">
            תנאי שימוש
          </a>
        </div>
      )}
    </div>
  );
}
