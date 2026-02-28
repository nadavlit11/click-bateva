import { useState, useEffect } from "react";
import { doc, onSnapshot } from "firebase/firestore";
import { db } from "../lib/firebase";

const DEFAULT_PIN_SIZE = 24;

export function useMapSettings(): number {
  const [pinSize, setPinSize] = useState(DEFAULT_PIN_SIZE);

  useEffect(() => {
    const unsub = onSnapshot(
      doc(db, "settings", "map"),
      snap => { if (snap.exists()) setPinSize(snap.data().pinSize ?? DEFAULT_PIN_SIZE); },
      () => { /* ignore errors — use default */ }
    );
    return unsub;
  }, []);

  return pinSize;
}
