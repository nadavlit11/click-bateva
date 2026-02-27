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
            numDays: data.numDays ?? 2,
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
      numDays: 2,
      isShared: false,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });
    return ref.id;
  }, [uid]);

  const addPoi = useCallback(async (poiId: string) => {
    if (!uid) return;
    let tripId = trip?.id;
    if (!tripId) {
      tripId = await createTrip();
    }
    const entry: TripPoiEntry = { poiId, addedAt: Date.now() };
    await updateDoc(doc(db, "trips", tripId), {
      pois: arrayUnion(entry),
      updatedAt: Date.now(),
    }).catch(err => reportError(err, { source: "useTrip.addPoi" }));
  }, [uid, trip, createTrip]);

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

  const setNumDays = useCallback(async (n: number) => {
    if (!trip) return;
    await updateDoc(doc(db, "trips", trip.id), { numDays: n, updatedAt: Date.now() })
      .catch(err => reportError(err, { source: "useTrip.setNumDays" }));
  }, [trip]);

  const setClientName = useCallback(async (name: string) => {
    if (!trip) return;
    await updateDoc(doc(db, "trips", trip.id), { clientName: name, updatedAt: Date.now() })
      .catch(err => reportError(err, { source: "useTrip.setClientName" }));
  }, [trip]);

  const clearTrip = useCallback(async () => {
    if (!trip) return;
    await updateDoc(doc(db, "trips", trip.id), { pois: [], updatedAt: Date.now() })
      .catch(err => reportError(err, { source: "useTrip.clearTrip" }));
  }, [trip]);

  const shareTrip = useCallback(async (): Promise<string> => {
    if (!trip) throw new Error("No active trip");
    await updateDoc(doc(db, "trips", trip.id), { isShared: true, updatedAt: Date.now() });
    return trip.id;
  }, [trip]);

  const newTrip = useCallback(async () => {
    await createTrip().catch(err => reportError(err, { source: "useTrip.newTrip" }));
  }, [createTrip]);

  return { trip, addPoi, removePoi, setNumDays, setClientName, clearTrip, shareTrip, newTrip };
}
