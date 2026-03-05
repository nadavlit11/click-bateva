// Registration modal — sends request email via Cloud Function
import { useState } from "react";
import { httpsCallable } from "firebase/functions";
import { functions } from "../lib/firebase";

const sendRegistrationRequest = httpsCallable(functions, "sendRegistrationRequest");

interface RegisterModalProps {
  onClose: () => void;
}

type RequestType = "business" | "agent";

export function RegisterModal({ onClose }: RegisterModalProps) {
  const [companyName, setCompanyName] = useState("");
  const [contactName, setContactName] = useState("");
  const [phone, setPhone] = useState("");
  const [type, setType] = useState<RequestType>("business");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [phoneError, setPhoneError] = useState("");
  const [success, setSuccess] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!companyName.trim() || !contactName.trim() || !phone.trim()) return;
    const digits = phone.replace(/[-\s]/g, "");
    if (!/^0\d{8,9}$/.test(digits)) {
      setPhoneError("מספר טלפון לא תקין");
      return;
    }
    setPhoneError("");
    setLoading(true);
    setError("");
    try {
      await sendRegistrationRequest({ companyName: companyName.trim(), contactName: contactName.trim(), phone: phone.trim(), type });
      setSuccess(true);
    } catch {
      setError("שליחת הבקשה נכשלה, נסו שוב מאוחר יותר");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div
        className="relative bg-white rounded-2xl shadow-xl p-6 w-full max-w-sm"
        onClick={(e) => e.stopPropagation()}
      >
        {success ? (
          <div className="text-center py-4">
            <div className="text-4xl mb-3">✓</div>
            <h2 className="text-lg font-bold text-gray-900 mb-2">הבקשה נשלחה בהצלחה</h2>
            <p className="text-sm text-gray-500 mb-4">ניצור איתך קשר בהקדם</p>
            <button
              onClick={onClose}
              className="px-6 py-2 text-sm text-white bg-green-600 rounded-lg hover:bg-green-700"
            >
              סגירה
            </button>
          </div>
        ) : (
          <>
            <h2 className="text-lg font-bold text-gray-900 mb-4 text-center">הרשמה</h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Type toggle */}
              <div className="flex rounded-lg border border-gray-300 overflow-hidden">
                <button
                  type="button"
                  onClick={() => setType("business")}
                  className={`flex-1 py-2 text-sm font-medium transition-colors ${
                    type === "business"
                      ? "bg-green-600 text-white"
                      : "bg-white text-gray-600 hover:bg-gray-50"
                  }`}
                >
                  מפרסם
                </button>
                <button
                  type="button"
                  onClick={() => setType("agent")}
                  className={`flex-1 py-2 text-sm font-medium transition-colors ${
                    type === "agent"
                      ? "bg-green-600 text-white"
                      : "bg-white text-gray-600 hover:bg-gray-50"
                  }`}
                >
                  מפיק
                </button>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">שם חברה</label>
                <input
                  type="text"
                  value={companyName}
                  onChange={(e) => setCompanyName(e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-400"
                  autoFocus
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">שם איש קשר</label>
                <input
                  type="text"
                  value={contactName}
                  onChange={(e) => setContactName(e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-400"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">טלפון</label>
                <input
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-400"
                  dir="ltr"
                />
                {phoneError && (
                  <p className="text-xs text-red-600 mt-1">{phoneError}</p>
                )}
              </div>

              {error && <p className="text-sm text-red-600 text-center">{error}</p>}

              <div className="flex gap-3 justify-end pt-2">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2 text-sm text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50"
                >
                  ביטול
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="px-4 py-2 text-sm text-white bg-green-600 rounded-lg hover:bg-green-700 disabled:opacity-50"
                >
                  {loading ? "שולח..." : "שליחה"}
                </button>
              </div>
            </form>
          </>
        )}
      </div>
    </div>
  );
}
