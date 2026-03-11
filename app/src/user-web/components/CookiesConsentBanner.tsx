import { useState } from "react";

const STORAGE_KEY = "click-bateva:cookiesAccepted";

export function CookiesConsentBanner() {
  const [visible, setVisible] = useState(
    () => localStorage.getItem(STORAGE_KEY) !== "1"
  );

  if (!visible) return null;

  function handleAccept() {
    localStorage.setItem(STORAGE_KEY, "1");
    setVisible(false);
  }

  return (
    <div className="fixed bottom-0 inset-x-0 z-50 p-4">
      <div className="max-w-lg mx-auto bg-white rounded-2xl shadow-xl border border-gray-100 px-5 py-4 flex items-center gap-4">
        <p className="text-sm text-gray-600 flex-1">
          אתר זה משתמש בעוגיות (cookies) לשיפור חווית המשתמש.
          בהמשך הגלישה באתר אתה מסכים לשימוש בעוגיות.
        </p>
        <button
          onClick={handleAccept}
          className="shrink-0 px-4 py-2 bg-green-600 text-white text-sm font-medium rounded-lg hover:bg-green-700 transition-colors"
        >
          אישור
        </button>
      </div>
    </div>
  );
}
