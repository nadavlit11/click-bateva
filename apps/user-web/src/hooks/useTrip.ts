import { useState, useEffect, useCallback } from "react";
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

export function useTrip(uid: string | null) {
  const [trip, setTrip] = useState<TripDoc | null>(null);

  useEffect(() => {
    if (!uid) return;

    const q = query(
      collection(db, "trips"),
      where("agentId", "==", uid),
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
            agentId: data.agentId,
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
      agentId: uid,
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
    if (!uid) return;
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
  }, [uid, trip, createTrip]);

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

  const removePoi = useCallback(async (poiId: string) => {
    if (!trip) return;
    // Find the exact entry to remove (arrayRemove requires exact object match)
    const entry = trip.pois.find(p => p.poiId === poiId);
    if (!entry) return;
    await updateDoc(doc(db, "trips", trip.id), {
      pois: arrayRemove(entry),
      updatedAt: Date.now(),
    }).catch(err => reportError(err, { source: "useTrip.removePoi" }));
  }, [trip]);

  const addDay = useCallback(async () => {
    if (!trip) return;
    await updateDoc(doc(db, "trips", trip.id), { numDays: trip.numDays + 1, updatedAt: Date.now() })
      .catch(err => reportError(err, { source: "useTrip.addDay" }));
  }, [trip]);

  const setClientName = useCallback(async (name: string) => {
    if (!trip) return;
    await updateDoc(doc(db, "trips", trip.id), { clientName: name, updatedAt: Date.now() })
      .catch(err => reportError(err, { source: "useTrip.setClientName" }));
  }, [trip]);

  const clearTrip = useCallback(async () => {
    if (!trip) return;
    await updateDoc(doc(db, "trips", trip.id), { pois: [], numDays: 1, updatedAt: Date.now() })
      .catch(err => reportError(err, { source: "useTrip.clearTrip" }));
  }, [trip]);

  const shareTrip = useCallback(async (): Promise<string> => {
    if (!trip) throw new Error("No active trip");
    await updateDoc(doc(db, "trips", trip.id), { isShared: true, updatedAt: Date.now() });
    return trip.id;
  }, [trip]);

  const newTrip = useCallback(async () => {
    if (!uid) return;
    const now = Date.now();
    const ref = await addDoc(collection(db, "trips"), {
      agentId: uid,
      clientName: "",
      pois: [],
      numDays: 1,
      isShared: false,
      createdAt: now,
      updatedAt: now,
    }).catch(err => { reportError(err, { source: "useTrip.newTrip" }); return null; });
    if (!ref) return;
    // Optimistically update state immediately so subsequent addPoi
    // uses the new trip (don't wait for the onSnapshot round-trip)
    setTrip({ id: ref.id, agentId: uid, clientName: "", pois: [], numDays: 1, isShared: false, createdAt: now, updatedAt: now });
  }, [uid]);

  return { trip, addPoi, removePoi, movePoi, addDay, setClientName, clearTrip, shareTrip, newTrip };
}
