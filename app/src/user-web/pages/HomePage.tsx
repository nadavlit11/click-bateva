import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { doc, getDoc } from "firebase/firestore";
import { db } from "../../lib/firebase";
import { useAuth } from "../../hooks/useAuth";
import { LoginModal } from "../components/LoginModal";
import { CookiesConsentBanner } from "../components/CookiesConsentBanner";

function getRedirectPath(role: string | null): string | null {
  if (role === "travel_agent") return "/map/agents";
  if (role === "business_user") return "/business";
  if (role === "admin" || role === "content_manager") return "/admin";
  return null;
}

const STATIC_MAP_URL = `https://maps.googleapis.com/maps/api/staticmap`
  + `?center=31.75,35.25&zoom=10&size=1280x900&scale=2&maptype=terrain`
  + `&style=feature:road|visibility:simplified`
  + `&style=feature:transit|visibility:off`
  + `&style=feature:poi|visibility:off`
  + `&style=feature:administrative|visibility:off`
  + `&markers=color:red|size:small|31.78,35.23|31.65,35.45|31.85,35.38`
  + `&markers=color:green|size:small|31.70,35.10|31.90,35.20|31.60,35.30`
  + `&markers=color:blue|size:small|31.80,35.40|31.72,35.35|31.68,35.18`
  + `&markers=color:orange|size:small|31.82,35.30|31.75,35.15|31.62,35.40`
  + `&key=${import.meta.env.VITE_GOOGLE_MAPS_API_KEY}`;

export default function HomePage() {
  const navigate = useNavigate();
  const { role, login } = useAuth();
  const [loginModalOpen, setLoginModalOpen] = useState(false);
  const pendingRedirect = useRef(false);
  const [termsUrl, setTermsUrl] = useState("");
  const [cookiesModalOpen, setCookiesModalOpen] = useState(false);

  useEffect(() => {
    getDoc(doc(db, "settings", "terms"))
      .then(snap => {
        if (snap.exists()) setTermsUrl(snap.data().userTermsUrl ?? "");
      })
      .catch(() => {});
  }, []);

  // Redirect after login based on role (uses ref to avoid setState-in-effect)
  useEffect(() => {
    if (!pendingRedirect.current || !role) return;
    pendingRedirect.current = false;
    const path = getRedirectPath(role);
    if (path) navigate(path, { replace: true });
  }, [role, navigate]);

  async function handleLogin(email: string, password: string) {
    await login(email, password);
    pendingRedirect.current = true;
  }

  return (
    <div
      className="min-h-dvh flex flex-col relative"
      style={{
        backgroundImage: `url(${STATIC_MAP_URL})`,
        backgroundSize: "cover",
        backgroundPosition: "center",
      }}
    >
      {/* Semi-transparent overlay for readability */}
      <div className="absolute inset-0 bg-white/40" />

      {/* Header */}
      <header className="relative z-10 flex items-center justify-between px-6 py-3 bg-white shadow-sm">
        <button
          onClick={() => setLoginModalOpen(true)}
          className="px-4 py-2 text-sm font-medium text-green-700 border border-green-300 rounded-lg hover:bg-green-50 transition-colors"
        >
          מפיקים/מפרסמים
        </button>
        <div className="flex items-center gap-3">
          <span className="text-lg font-bold text-gray-800">קליק בטבע</span>
          <img
            src="/icon-192.png"
            alt="קליק בטבע"
            className="w-11 h-11 rounded-2xl object-contain"
          />
        </div>
      </header>

      {/* Hero */}
      <main className="relative z-10 flex-1 flex flex-col items-center justify-center px-6 py-12">
        <h1 className="text-3xl sm:text-4xl font-bold text-gray-800 text-center mb-12">
          קליק בטבע - גלו את ישראל
        </h1>

        {/* Map selection buttons */}
        <div className="flex flex-col sm:flex-row gap-4 w-full max-w-lg">
          <button
            onClick={() => navigate("/map/groups")}
            className="flex-1 py-6 px-6 bg-white rounded-2xl shadow-lg border border-gray-100 hover:shadow-xl hover:border-green-200 transition-all text-center group"
          >
            <div className="text-3xl mb-3">🗺️</div>
            <span className="text-lg font-bold text-gray-800 group-hover:text-green-700 transition-colors">
              מפת משאבי אנוש וקבוצות
            </span>
          </button>
          <button
            onClick={() => navigate("/map/families")}
            className="flex-1 py-6 px-6 bg-white rounded-2xl shadow-lg border border-gray-100 hover:shadow-xl hover:border-green-200 transition-all text-center group"
          >
            <div className="text-3xl mb-3">👨‍👩‍👧‍👦</div>
            <span className="text-lg font-bold text-gray-800 group-hover:text-green-700 transition-colors">
              מפת משפחות וזוגות
            </span>
          </button>
        </div>
      </main>

      {/* Footer */}
      <footer className="relative z-10 px-6 py-4 bg-white/90 backdrop-blur-sm">
        <div className="flex items-center justify-center gap-4 text-sm text-gray-500">
          <button
            onClick={() => {
              const w = window as unknown as Record<string, unknown>;
              if (typeof w.TabNav === "object" && w.TabNav !== null) {
                const tn = w.TabNav as Record<string, unknown>;
                if (typeof tn.open === "function") {
                  (tn.open as () => void)();
                }
              }
            }}
            className="hover:text-gray-600 transition-colors"
          >
            נגישות
          </button>
          <span className="text-gray-300">|</span>
          {termsUrl && (
            <>
              <a
                href={termsUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="hover:text-gray-600 transition-colors"
              >
                תנאי שימוש
              </a>
              <span className="text-gray-300">|</span>
            </>
          )}
          <button
            onClick={() => setCookiesModalOpen(true)}
            className="hover:text-gray-600 transition-colors"
          >
            עוגיות
          </button>
        </div>
      </footer>

      {/* Login modal */}
      {loginModalOpen && (
        <LoginModal
          onLogin={handleLogin}
          onClose={() => setLoginModalOpen(false)}
        />
      )}

      {/* Cookies info modal */}
      {cookiesModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-black/40"
            onClick={() => setCookiesModalOpen(false)}
          />
          <div
            className="relative bg-white rounded-2xl shadow-xl p-6 w-full max-w-sm"
            onClick={e => e.stopPropagation()}
          >
            <h2 className="text-lg font-bold text-gray-900 mb-3 text-center">
              מדיניות עוגיות
            </h2>
            <p className="text-sm text-gray-600 leading-relaxed mb-4">
              אתר זה משתמש בעוגיות (cookies) על מנת לשפר את חווית הגלישה שלך,
              לנתח תעבורה באתר ולהתאים תוכן. העוגיות מאפשרות לנו לזכור
              את ההעדפות שלך ולספק חוויה מותאמת אישית.
            </p>
            <p className="text-sm text-gray-600 leading-relaxed mb-4">
              בהמשך השימוש באתר, אתה מסכים למדיניות העוגיות שלנו.
            </p>
            <div className="flex justify-end">
              <button
                onClick={() => setCookiesModalOpen(false)}
                className="px-4 py-2 text-sm text-white bg-green-600 rounded-lg hover:bg-green-700"
              >
                סגור
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Cookies consent banner (first visit) */}
      <CookiesConsentBanner />
    </div>
  );
}
