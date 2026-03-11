import { useState } from "react";
import { httpsCallable } from "firebase/functions";
import { functions } from "../../lib/firebase";

const sendRegistrationRequest = httpsCallable(
  functions,
  "sendRegistrationRequest",
);

interface AuthModalProps {
  onLogin: (email: string, password: string) => Promise<void>;
  onClose: () => void;
  initialTab?: "login" | "register";
}

type Tab = "login" | "register";
type RequestType = "business" | "agent";

export function AuthModal({
  onLogin,
  onClose,
  initialTab = "login",
}: AuthModalProps) {
  const [tab, setTab] = useState<Tab>(initialTab);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div
        className="relative bg-white rounded-2xl shadow-xl p-6 w-full max-w-sm"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Tab toggle — underline style */}
        <div className="flex border-b border-gray-200 mb-5">
          <button
            type="button"
            onClick={() => setTab("login")}
            className={`cursor-pointer flex-1 pb-2.5 text-sm font-semibold transition-colors ${
              tab === "login"
                ? "text-green-700 border-b-2 border-green-600"
                : "text-gray-400 hover:text-gray-600"
            }`}
          >
            התחברות
          </button>
          <button
            type="button"
            onClick={() => setTab("register")}
            className={`cursor-pointer flex-1 pb-2.5 text-sm font-semibold transition-colors ${
              tab === "register"
                ? "text-green-700 border-b-2 border-green-600"
                : "text-gray-400 hover:text-gray-600"
            }`}
          >
            הרשמה
          </button>
        </div>

        {tab === "login" ? (
          <LoginForm onLogin={onLogin} onClose={onClose} />
        ) : (
          <RegisterForm onClose={onClose} />
        )}
      </div>
    </div>
  );
}

/* ── Login tab ──────────────────────────────────────────────── */

function LoginForm({
  onLogin,
  onClose,
}: {
  onLogin: (email: string, password: string) => Promise<void>;
  onClose: () => void;
}) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!email.trim() || !password) return;
    setLoading(true);
    setError("");
    try {
      await onLogin(email.trim(), password);
      onClose();
    } catch {
      setError("שם משתמש או סיסמה שגויים");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          אימייל
        </label>
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-400"
          placeholder="email@example.com"
          dir="ltr"
          autoFocus
        />
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          סיסמה
        </label>
        <div className="relative" style={{ direction: "ltr" }}>
          <input
            type={showPassword ? "text" : "password"}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full border border-gray-300 rounded-lg pl-3 pr-10 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-400"
            placeholder="סיסמה"
          />
          <button
            type="button"
            onClick={() => setShowPassword((v) => !v)}
            className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1 text-gray-400 hover:text-gray-600"
            tabIndex={-1}
          >
            {showPassword ? (
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5">
                <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94" />
                <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19" />
                <line x1="1" y1="1" x2="23" y2="23" />
              </svg>
            ) : (
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5">
                <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                <circle cx="12" cy="12" r="3" />
              </svg>
            )}
          </button>
        </div>
      </div>
      {error && (
        <p className="text-sm text-red-600 text-center">{error}</p>
      )}
      <div className="flex gap-3 justify-end pt-2">
        <button
          type="button"
          onClick={onClose}
          className="cursor-pointer px-4 py-2 text-sm text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50"
        >
          ביטול
        </button>
        <button
          type="submit"
          disabled={loading}
          className="cursor-pointer px-4 py-2 text-sm text-white bg-green-600 rounded-lg hover:bg-green-700 disabled:opacity-50"
        >
          {loading ? "מתחבר..." : "כניסה"}
        </button>
      </div>
    </form>
  );
}

/* ── Register tab ───────────────────────────────────────────── */

function RegisterForm({ onClose }: { onClose: () => void }) {
  const [companyName, setCompanyName] = useState("");
  const [contactName, setContactName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [type, setType] = useState<RequestType>("business");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [phoneError, setPhoneError] = useState("");
  const [consent, setConsent] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [success, setSuccess] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitted(true);
    const missingFields =
      !companyName.trim() || !contactName.trim() || !phone.trim();
    const digits = phone.replace(/[-\s]/g, "");
    const phoneValid = phone.trim() && /^0\d{8,9}$/.test(digits);
    setPhoneError(
      phone.trim() && !phoneValid ? "מספר טלפון לא תקין" : "",
    );
    if (missingFields || !phoneValid || !consent) return;
    setLoading(true);
    setError("");
    try {
      await sendRegistrationRequest({
        companyName: companyName.trim(),
        contactName: contactName.trim(),
        phone: phone.trim(),
        type,
        ...(email.trim() && { email: email.trim() }),
      });
      setSuccess(true);
    } catch {
      setError("שליחת הבקשה נכשלה, נסו שוב מאוחר יותר");
    } finally {
      setLoading(false);
    }
  }

  if (success) {
    return (
      <div className="text-center py-4">
        <div className="text-4xl mb-3">✓</div>
        <h2 className="text-lg font-bold text-gray-900 mb-2">
          הבקשה נשלחה בהצלחה
        </h2>
        <p className="text-sm text-gray-500 mb-4">
          ניצור איתך קשר בהקדם
        </p>
        <button
          onClick={onClose}
          className="cursor-pointer px-6 py-2 text-sm text-white bg-green-600 rounded-lg hover:bg-green-700"
        >
          סגירה
        </button>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {/* Type toggle — small pill */}
      <div className="flex gap-2 justify-center">
        <button
          type="button"
          onClick={() => setType("business")}
          className={`cursor-pointer px-4 py-1.5 text-xs font-medium rounded-full transition-colors ${
            type === "business"
              ? "bg-green-50 text-green-700 ring-1 ring-green-300"
              : "bg-gray-100 text-gray-500 hover:bg-gray-150"
          }`}
        >
          מפרסם
        </button>
        <button
          type="button"
          onClick={() => setType("agent")}
          className={`cursor-pointer px-4 py-1.5 text-xs font-medium rounded-full transition-colors ${
            type === "agent"
              ? "bg-green-50 text-green-700 ring-1 ring-green-300"
              : "bg-gray-100 text-gray-500 hover:bg-gray-150"
          }`}
        >
          מפיק
        </button>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          שם חברה
        </label>
        <input
          type="text"
          value={companyName}
          onChange={(e) => setCompanyName(e.target.value)}
          className={`w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-400 ${
            submitted && !companyName.trim()
              ? "border-red-500"
              : "border-gray-300"
          }`}
          autoFocus
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          שם איש קשר
        </label>
        <input
          type="text"
          value={contactName}
          onChange={(e) => setContactName(e.target.value)}
          className={`w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-400 ${
            submitted && !contactName.trim()
              ? "border-red-500"
              : "border-gray-300"
          }`}
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          טלפון
        </label>
        <input
          type="tel"
          value={phone}
          onChange={(e) => setPhone(e.target.value.replace(/[^\d-]/g, ""))}
          className={`w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-400 ${
            submitted && (!phone.trim() || phoneError)
              ? "border-red-500"
              : "border-gray-300"
          }`}
          dir="ltr"
        />
        {phoneError && (
          <p className="text-xs text-red-600 mt-1">{phoneError}</p>
        )}
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          אימייל
        </label>
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-400"
          dir="ltr"
        />
      </div>

      {/* Consent checkbox */}
      <label
        className={`flex items-start gap-2 rounded-lg p-2.5 border cursor-pointer ${
          submitted && !consent
            ? "border-red-400 bg-red-50"
            : "border-gray-200 bg-gray-50"
        }`}
      >
        <input
          type="checkbox"
          checked={consent}
          onChange={(e) => setConsent(e.target.checked)}
          className="mt-0.5 accent-green-600 shrink-0"
        />
        <span className="text-xs text-gray-600 leading-relaxed">
          בסימון תיבה זו, אתה מסכים שקליק בטבע תיצור איתך קשר.
          תוכל לבטל את הרשמתך בכל עת.
          <br />
          קליק בטבע תנהל את המידע שלך בהתאם למדיניות
          הפרטיות שלה.
        </span>
      </label>

      {error && (
        <p className="text-sm text-red-600 text-center">{error}</p>
      )}

      <div className="flex gap-3 justify-end pt-2">
        <button
          type="button"
          onClick={onClose}
          className="cursor-pointer px-4 py-2 text-sm text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50"
        >
          ביטול
        </button>
        <button
          type="submit"
          disabled={loading}
          className="cursor-pointer px-4 py-2 text-sm text-white bg-green-600 rounded-lg hover:bg-green-700 disabled:opacity-50"
        >
          {loading ? "שולח..." : "שליחה"}
        </button>
      </div>
    </form>
  );
}
