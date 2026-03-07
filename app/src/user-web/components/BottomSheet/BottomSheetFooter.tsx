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
      {/* Primary actions — larger */}
      <div className="flex items-center justify-center gap-3">
        {isLoggedIn && (role === "admin" || role === "content_manager") && (
          <Link to="/admin" className="text-sm text-green-700 font-semibold hover:text-green-900">
            לוח ניהול
          </Link>
        )}
        {isLoggedIn && role === "business_user" && (
          <Link to="/business" className="text-sm text-green-700 font-semibold hover:text-green-900">
            פורטל עסקים
          </Link>
        )}
        {isLoggedIn ? (
          <>
            <WhatsAppShareButton showLabel={true} className="text-sm font-semibold" />
            <button onClick={onLogout} className="text-sm text-red-500 hover:text-red-700 font-semibold">
              התנתקות
            </button>
            <button onClick={onChangePasswordClick} className="text-sm text-gray-500 hover:text-gray-700 font-medium">
              שינוי סיסמה
            </button>
          </>
        ) : (
          <>
            <button onClick={onLoginClick} className="text-sm text-green-600 hover:text-green-800 font-semibold">
              כניסה
            </button>
            <button onClick={onRegisterClick} className="text-sm text-gray-500 hover:text-gray-700 font-medium">
              הרשמה
            </button>
            <WhatsAppShareButton showLabel={true} className="text-sm font-semibold" />
          </>
        )}
      </div>
      {/* Secondary links — smaller */}
      {(onContactClick || termsUrl) && (
        <div className="flex items-center justify-center gap-3">
          {onContactClick && (
            <button onClick={onContactClick} className="text-xs text-gray-400 hover:text-gray-600">
              צור קשר
            </button>
          )}
          {termsUrl && (
            <a href={termsUrl} target="_blank" rel="noopener noreferrer" className="text-xs text-gray-400 hover:text-gray-600">
              תנאי שימוש
            </a>
          )}
        </div>
      )}
    </div>
  );
}
