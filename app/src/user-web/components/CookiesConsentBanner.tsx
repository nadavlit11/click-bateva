import { useState } from "react";

const STORAGE_KEY = "click-bateva:cookiesConsent";

export function CookiesConsentBanner() {
  const [visible, setVisible] = useState(
    () => !localStorage.getItem(STORAGE_KEY),
  );

  if (!visible) return null;

  function handleChoice(choice: "accepted" | "rejected") {
    localStorage.setItem(STORAGE_KEY, choice);
    setVisible(false);
  }

  return (
    <div className="fixed bottom-0 inset-x-0 z-50 p-4">
      <div className="max-w-lg mx-auto bg-white rounded-2xl shadow-xl border border-gray-100 px-5 py-4">
        <p className="text-sm text-gray-600 mb-3 leading-relaxed">
          אנחנו משתמשים בעוגיות כדי לשפר את חווית הגלישה שלך.
          קרא עוד על מדיניות העוגיות שלנו.
        </p>
        <div className="flex gap-3 justify-end">
          <button
            onClick={() => handleChoice("rejected")}
            className="cursor-pointer px-4 py-2 text-sm font-medium text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
          >
            דחייה
          </button>
          <button
            onClick={() => handleChoice("accepted")}
            className="cursor-pointer px-4 py-2 text-sm font-medium text-white bg-green-600 rounded-lg hover:bg-green-700 transition-colors"
          >
            מסכים
          </button>
        </div>
      </div>
    </div>
  );
}
