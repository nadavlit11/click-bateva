import { useState, useEffect, useRef } from "react";
import {
  reauthenticateWithCredential,
  updatePassword,
  EmailAuthProvider,
} from "firebase/auth";
import { auth } from "../../lib/firebase";
import { reportError } from "../../lib/errorReporting";
import {
  getStrength,
  isPasswordValid,
  PASSWORD_ERROR,
  strengthLabel,
  strengthColor,
  strengthWidth,
} from "../../lib/passwordStrength";

interface ChangePasswordModalProps {
  onClose: () => void;
}

function PasswordField({
  label,
  value,
  onChange,
  autoFocus,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  autoFocus?: boolean;
}) {
  const [show, setShow] = useState(false);
  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1">
        {label}
      </label>
      <div className="relative" style={{ direction: "ltr" }}>
        <input
          type={show ? "text" : "password"}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="w-full border border-gray-300 rounded-lg pl-3 pr-10 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-400"
          autoFocus={autoFocus}
        />
        <button
          type="button"
          onClick={() => setShow((v) => !v)}
          className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1 text-gray-400 hover:text-gray-600"
          tabIndex={-1}
        >
          {show ? (
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
  );
}

export function ChangePasswordModal({ onClose }: ChangePasswordModalProps) {
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, []);

  function handleClose() {
    if (timerRef.current) clearTimeout(timerRef.current);
    onClose();
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    if (!isPasswordValid(newPassword)) {
      setError(PASSWORD_ERROR);
      return;
    }

    if (newPassword !== confirmPassword) {
      setError("הסיסמאות אינן תואמות");
      return;
    }

    const user = auth.currentUser;
    if (!user || !user.email) {
      setError("לא נמצא משתמש מחובר");
      return;
    }

    setSaving(true);

    try {
      const credential = EmailAuthProvider.credential(
        user.email,
        currentPassword
      );
      await reauthenticateWithCredential(user, credential);
      await updatePassword(user, newPassword);
      setSuccess(true);
      timerRef.current = setTimeout(() => {
        handleClose();
      }, 2000);
    } catch (err: unknown) {
      const firebaseError = err as { code?: string };
      if (
        firebaseError.code === "auth/wrong-password" ||
        firebaseError.code === "auth/invalid-credential"
      ) {
        setError("הסיסמה הנוכחית שגויה");
      } else if (firebaseError.code === "auth/too-many-requests") {
        setError("יותר מדי ניסיונות. נסה שוב מאוחר יותר");
      } else {
        setError("שגיאה בעדכון הסיסמה. נסה שנית.");
      }
      reportError(err, { source: "ChangePasswordModal" });
    } finally {
      setSaving(false);
    }
  }

  const strength = newPassword.length > 0 ? getStrength(newPassword) : null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40" onClick={handleClose} />
      <div
        className="relative bg-white rounded-2xl shadow-xl p-6 w-full max-w-sm"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="text-lg font-bold text-gray-900 mb-4 text-center">
          שינוי סיסמה
        </h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          <PasswordField
            label="סיסמה נוכחית"
            value={currentPassword}
            onChange={setCurrentPassword}
            autoFocus
          />

          <div>
            <PasswordField
              label="סיסמה חדשה"
              value={newPassword}
              onChange={setNewPassword}
            />
            {strength && (
              <div className="mt-2">
                <div className="h-1.5 w-full bg-gray-200 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all ${strengthColor[strength]} ${strengthWidth[strength]}`}
                  />
                </div>
                <p
                  className={`text-xs mt-1 ${
                    strength === "weak"
                      ? "text-red-600"
                      : strength === "medium"
                        ? "text-yellow-600"
                        : "text-green-600"
                  }`}
                >
                  {strengthLabel[strength]}
                </p>
              </div>
            )}
          </div>

          <PasswordField
            label="אימות סיסמה חדשה"
            value={confirmPassword}
            onChange={setConfirmPassword}
          />

          {error && (
            <p className="text-sm text-red-600 text-center">{error}</p>
          )}
          {success && (
            <p className="text-sm text-green-600 text-center">
              הסיסמה עודכנה בהצלחה!
            </p>
          )}

          <div className="flex gap-3 justify-end pt-2">
            <button
              type="button"
              onClick={handleClose}
              className="px-4 py-2 text-sm text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50"
            >
              ביטול
            </button>
            <button
              type="submit"
              disabled={saving || success}
              className="px-4 py-2 text-sm text-white bg-green-600 rounded-lg hover:bg-green-700 disabled:opacity-50"
            >
              {saving ? "שומר..." : "שמירה"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
