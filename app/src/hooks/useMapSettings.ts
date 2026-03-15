import { useState, useEffect } from "react";
import { doc, onSnapshot } from "firebase/firestore";
import { db, authReady } from "../lib/firebase";

const DEFAULT_PIN_SIZE = 24;

export function useMapSettings(): number {
  const [pinSize, setPinSize] = useState(DEFAULT_PIN_SIZE);

  useEffect(() => {
    let unsub: (() => void) | undefined;
    let cancelled = false;
    authReady.then(() => {
      if (cancelled) return;
      unsub = onSnapshot(
        doc(db, "settings", "map"),
        snap => { if (snap.exists()) setPinSize(snap.data().pinSize ?? DEFAULT_PIN_SIZE); },
        () => { /* ignore errors — use default */ }
      );
    });
    return () => { cancelled = true; unsub?.(); };
  }, []);

  return pinSize;
}
