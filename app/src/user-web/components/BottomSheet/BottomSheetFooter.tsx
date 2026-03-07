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
    <div className="shrink-0 border-t border-gray-100 px-4 py-2 flex flex-wrap items-center gap-x-3 gap-y-1 justify-center">
      {isLoggedIn && (role === "admin" || role === "content_manager") && (
        <Link to="/admin" className="text-xs text-green-700 font-medium hover:text-green-900">
          לוח ניהול
        </Link>
      )}
      {isLoggedIn && role === "business_user" && (
        <Link to="/business" className="text-xs text-green-700 font-medium hover:text-green-900">
          פורטל עסקים
        </Link>
      )}
      {isLoggedIn ? (
        <>
          <WhatsAppShareButton showLabel={true} className="text-xs font-medium" />
          <button onClick={onLogout} className="text-xs text-red-500 hover:text-red-700 font-medium">
            התנתקות
          </button>
          <button onClick={onChangePasswordClick} className="text-xs text-gray-400 hover:text-gray-600">
            שינוי סיסמה
          </button>
        </>
      ) : (
        <>
          <button onClick={onLoginClick} className="text-xs text-green-600 hover:text-green-800 font-medium">
            כניסה
          </button>
          <button onClick={onRegisterClick} className="text-xs text-gray-500 hover:text-gray-700">
            הרשמה
          </button>
          <WhatsAppShareButton showLabel={false} />
        </>
      )}
      {onContactClick && (
        <button onClick={onContactClick} className="text-xs text-blue-600 hover:text-blue-800 font-medium">
          צור קשר
        </button>
      )}
      {termsUrl && (
        <a href={termsUrl} target="_blank" rel="noopener noreferrer" className="text-xs text-gray-400 hover:text-gray-600">
          תנאי שימוש
        </a>
      )}
    </div>
  );
}
