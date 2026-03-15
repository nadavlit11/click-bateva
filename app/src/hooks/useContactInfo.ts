import { useState, useEffect } from "react";
import { doc, getDoc } from "firebase/firestore";
import { db, authReady } from "../lib/firebase";
import { reportError } from "../lib/errorReporting";

export interface ContactInfo {
  phone: string;
  email: string;
}

export function useContactInfo(): ContactInfo | null {
  const [contact, setContact] = useState<ContactInfo | null>(null);

  useEffect(() => {
    let cancelled = false;
    authReady.then(() => {
      if (cancelled) return;
      getDoc(doc(db, "settings", "contact"))
        .then((snap) => {
          if (!cancelled && snap.exists()) {
            const d = snap.data();
            setContact({ phone: d.phone ?? "", email: d.email ?? "" });
          }
        })
        .catch((err) => reportError(err, { source: "useContactInfo" }));
    });
    return () => { cancelled = true; };
  }, []);

  return contact;
}
