import { useState, useEffect, useCallback, useRef } from "react";
import {
  collection,
  query,
  where,
  orderBy,
  limit,
  onSnapshot,
  addDoc,
  updateDoc,
  doc,
  arrayUnion,
  arrayRemove,
} from "firebase/firestore";
import { db } from "../lib/firebase";
import { reportError } from "../lib/errorReporting";
import type { TripDoc, TripPoiEntry } from "../types";

const LOCAL_STORAGE_KEY = "click-bateva-trip";

/** Shared reorder logic: move a POI to a new day + index, reassigning addedAt to preserve order. */
function reorderPoiInTrip(t: TripDoc, poiId: string, newDayNumber: number, newIndex: number): TripDoc {
  const safeDay = Math.max(1, Math.min(newDayNumber, t.numDays));
  const entry = t.pois.find(e => e.poiId === poiId);
  if (!entry) return t;

  // Remove the entry from its current position
  const rest = t.pois.filter(e => e.poiId !== poiId);

  // Get target day's entries in current order
  const targetDayEntries = rest
    .filter(e => (e.dayNumber ?? 1) === safeDay)
    .sort((a, b) => a.addedAt - b.addedAt);

  // Insert at the desired index
  const clampedIndex = Math.max(0, Math.min(newIndex, targetDayEntries.length));
  const movedEntry = { ...entry, dayNumber: safeDay };
  targetDayEntries.splice(clampedIndex, 0, movedEntry);

  // Reassign addedAt for the target day to enforce ordering
  const baseTime = Date.now();
  for (let i = 0; i < targetDayEntries.length; i++) {
    targetDayEntries[i] = { ...targetDayEntries[i], addedAt: baseTime + i };
  }

  // Rebuild pois: other days untouched + reordered target day
  const otherEntries = rest.filter(e => (e.dayNumber ?? 1) !== safeDay);
  return { ...t, pois: [...otherEntries, ...targetDayEntries], updatedAt: baseTime };
}

export interface UseTripResult {
  trip: TripDoc | null;
  addPoi: (poiId: string, dayNumber?: number) => Promise<void>;
  removePoi: (poiId: string) => Promise<void>;
  movePoi: (poiId: string, newDayNumber: number) => Promise<void>;
  reorderPoi: (poiId: string, newDayNumber: number, newIndex: number) => Promise<void>;
  addDay: () => Promise<void>;
  setClientName: (name: string) => Promise<void>;
  clearTrip: () => Promise<void>;
  shareTrip: () => Promise<string>;
  newTrip: () => Promise<void>;
}

// ── localStorage-backed trip (anonymous users) ──────────────────────────────

function readLocalTrip(): TripDoc | null {
  try {
    const raw = localStorage.getItem(LOCAL_STORAGE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function writeLocalTrip(trip: TripDoc | null) {
  if (trip) {
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(trip));
  } else {
    localStorage.removeItem(LOCAL_STORAGE_KEY);
  }
}

function useTripLocal(): UseTripResult {
  const [trip, setTrip] = useState<TripDoc | null>(() => readLocalTrip());

  const update = useCallback((updater: (prev: TripDoc) => TripDoc) => {
    setTrip(prev => {
      if (!prev) return prev;
      const next = updater(prev);
      writeLocalTrip(next);
      return next;
    });
  }, []);

  const createLocalTrip = useCallback((): TripDoc => {
    const now = Date.now();
    const newTrip: TripDoc = {
      id: "local",
      ownerId: "anonymous",
      clientName: "",
      pois: [],
      numDays: 1,
      isShared: false,
      createdAt: now,
      updatedAt: now,
    };
    setTrip(newTrip);
    writeLocalTrip(newTrip);
    return newTrip;
  }, []);

  const addPoi = useCallback(async (poiId: string, dayNumber?: number) => {
    const current = trip ?? createLocalTrip();
    const resolvedDay = dayNumber ?? current.numDays;
    const entry: TripPoiEntry = { poiId, addedAt: Date.now(), dayNumber: resolvedDay };
    const next = {
      ...current,
      pois: [...current.pois, entry],
      updatedAt: Date.now(),
    };
    setTrip(next);
    writeLocalTrip(next);
  }, [trip, createLocalTrip]);

  const removePoi = useCallback(async (poiId: string) => {
    update(t => ({
      ...t,
      pois: t.pois.filter(e => e.poiId !== poiId),
      updatedAt: Date.now(),
    }));
  }, [update]);

  const movePoi = useCallback(async (poiId: string, newDayNumber: number) => {
    update(t => {
      const safeDay = Math.max(1, Math.min(newDayNumber, t.numDays));
      return {
        ...t,
        pois: t.pois.map(e => e.poiId === poiId ? { ...e, dayNumber: safeDay } : e),
        updatedAt: Date.now(),
      };
    });
  }, [update]);

  const reorderPoi = useCallback(async (poiId: string, newDayNumber: number, newIndex: number) => {
    update(t => reorderPoiInTrip(t, poiId, newDayNumber, newIndex));
  }, [update]);

  const addDay = useCallback(async () => {
    update(t => ({ ...t, numDays: t.numDays + 1, updatedAt: Date.now() }));
  }, [update]);

  const setClientName = useCallback(async (name: string) => {
    update(t => ({ ...t, clientName: name, updatedAt: Date.now() }));
  }, [update]);

  const clearTrip = useCallback(async () => {
    update(t => ({ ...t, pois: [], numDays: 1, updatedAt: Date.now() }));
  }, [update]);

  const shareTrip = useCallback(async (): Promise<string> => {
    throw new Error("Login required to share");
  }, []);

  const newTrip = useCallback(async () => {
    createLocalTrip();
  }, [createLocalTrip]);

  return { trip, addPoi, removePoi, movePoi, reorderPoi, addDay, setClientName, clearTrip, shareTrip, newTrip };
}

// ── Firestore-backed trip (logged-in users) ─────────────────────────────────

function useTripFirestore(uid: string | null): UseTripResult {
  const [trip, setTrip] = useState<TripDoc | null>(null);

  // Migrate localStorage trip to Firestore on first mount (anon→login)
  const migrated = useRef(false);
  useEffect(() => {
    if (!uid || migrated.current) return;
    migrated.current = true;
    const localTrip = readLocalTrip();
    if (!localTrip || localTrip.pois.length === 0) return;
    const now = Date.now();
    addDoc(collection(db, "trips"), {
      ownerId: uid,
      clientName: localTrip.clientName,
      pois: localTrip.pois,
      numDays: localTrip.numDays,
      isShared: false,
      createdAt: now,
      updatedAt: now,
    }).then(() => {
      localStorage.removeItem(LOCAL_STORAGE_KEY);
    }).catch(err => reportError(err, { source: "useTrip.migrateLocal" }));
  }, [uid]);

  useEffect(() => {
    if (!uid) return;
    const q = query(
      collection(db, "trips"),
      where("ownerId", "==", uid),
      orderBy("updatedAt", "desc"),
      limit(1)
    );

    const unsub = onSnapshot(
      q,
      (snap) => {
        if (snap.empty) {
          setTrip(null);
        } else {
          const d = snap.docs[0];
          const data = d.data();
          setTrip({
            id: d.id,
            ownerId: data.ownerId,
            clientName: data.clientName ?? "",
            pois: data.pois ?? [],
            numDays: data.numDays ?? 1,
            isShared: data.isShared ?? false,
            createdAt: data.createdAt ?? 0,
            updatedAt: data.updatedAt ?? 0,
          });
        }
      },
      (err) => reportError(err, { source: "useTrip" })
    );

    return () => {
      unsub();
      setTrip(null);
    };
  }, [uid]);

  const createTrip = useCallback(async (): Promise<string> => {
    if (!uid) throw new Error("Not authenticated");
    const ref = await addDoc(collection(db, "trips"), {
      ownerId: uid,
      clientName: "",
      pois: [],
      numDays: 1,
      isShared: false,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });
    return ref.id;
  }, [uid]);

  const addPoi = useCallback(async (poiId: string, dayNumber?: number) => {
    let tripId = trip?.id;
    let resolvedDay = dayNumber ?? trip?.numDays ?? 1;
    if (!tripId) {
      tripId = await createTrip();
      resolvedDay = dayNumber ?? 1;
    }
    const entry: TripPoiEntry = { poiId, addedAt: Date.now(), dayNumber: resolvedDay };
    await updateDoc(doc(db, "trips", tripId), {
      pois: arrayUnion(entry),
      updatedAt: Date.now(),
    }).catch(err => reportError(err, { source: "useTrip.addPoi" }));
  }, [trip, createTrip]);

  const movePoi = useCallback(async (poiId: string, newDayNumber: number) => {
    if (!trip) return;
    const safeDay = Math.max(1, Math.min(newDayNumber, trip.numDays));
    const updatedPois = trip.pois.map(e =>
      e.poiId === poiId ? { ...e, dayNumber: safeDay } : e
    );
    await updateDoc(doc(db, "trips", trip.id), {
      pois: updatedPois,
      updatedAt: Date.now(),
    }).catch(err => reportError(err, { source: "useTrip.movePoi" }));
  }, [trip]);

  const reorderPoi = useCallback(async (poiId: string, newDayNumber: number, newIndex: number) => {
    if (!trip) return;
    const updated = reorderPoiInTrip(trip, poiId, newDayNumber, newIndex);
    await updateDoc(doc(db, "trips", trip.id), {
      pois: updated.pois,
      updatedAt: updated.updatedAt,
    }).catch(err => reportError(err, { source: "useTrip.reorderPoi" }));
  }, [trip]);

  const removePoi = useCallback(async (poiId: string) => {
    if (!trip) return;
    const entry = trip.pois.find(p => p.poiId === poiId);
    if (!entry) return;
    await updateDoc(doc(db, "trips", trip.id), {
      pois: arrayRemove(entry),
      updatedAt: Date.now(),
    }).catch(err => reportError(err, { source: "useTrip.removePoi" }));
  }, [trip]);

  const addDay = useCallback(async () => {
    if (!trip) return;
    await updateDoc(doc(db, "trips", trip.id), {
      numDays: trip.numDays + 1,
      updatedAt: Date.now(),
    }).catch(err => reportError(err, { source: "useTrip.addDay" }));
  }, [trip]);

  const setClientName = useCallback(async (name: string) => {
    if (!trip) return;
    await updateDoc(doc(db, "trips", trip.id), {
      clientName: name,
      updatedAt: Date.now(),
    }).catch(err => reportError(err, { source: "useTrip.setClientName" }));
  }, [trip]);

  const clearTrip = useCallback(async () => {
    if (!trip) return;
    await updateDoc(doc(db, "trips", trip.id), {
      pois: [],
      numDays: 1,
      updatedAt: Date.now(),
    }).catch(err => reportError(err, { source: "useTrip.clearTrip" }));
  }, [trip]);

  const shareTrip = useCallback(async (): Promise<string> => {
    if (!trip) throw new Error("No active trip");
    await updateDoc(doc(db, "trips", trip.id), {
      isShared: true,
      updatedAt: Date.now(),
    });
    return trip.id;
  }, [trip]);

  const newTrip = useCallback(async () => {
    if (!uid) return;
    const now = Date.now();
    const ref = await addDoc(collection(db, "trips"), {
      ownerId: uid,
      clientName: "",
      pois: [],
      numDays: 1,
      isShared: false,
      createdAt: now,
      updatedAt: now,
    }).catch(err => {
      reportError(err, { source: "useTrip.newTrip" });
      return null;
    });
    if (!ref) return;
    setTrip({
      id: ref.id,
      ownerId: uid,
      clientName: "",
      pois: [],
      numDays: 1,
      isShared: false,
      createdAt: now,
      updatedAt: now,
    });
  }, [uid]);

  return { trip, addPoi, removePoi, movePoi, reorderPoi, addDay, setClientName, clearTrip, shareTrip, newTrip };
}

// ── Main hook ───────────────────────────────────────────────────────────────

export function useTrip(uid: string | null): UseTripResult {
  // Both hooks always run (React rules), but only the active one's
  // result is returned. useTripFirestore skips its effects when uid is null.
  const firestoreResult = useTripFirestore(uid);
  const localResult = useTripLocal();

  if (uid) return firestoreResult;
  return localResult;
}
