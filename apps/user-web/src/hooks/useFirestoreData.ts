import { useState, useEffect } from "react";
import { collection, query, where, onSnapshot } from "firebase/firestore";
import type { QuerySnapshot, DocumentData } from "firebase/firestore";
import { db } from "../lib/firebase";
import { reportError } from "../lib/errorReporting";
import type { Category, Poi, Subcategory } from "../types";

function snapshotToPois(snap: QuerySnapshot<DocumentData>): Poi[] {
  return snap.docs.map(doc => {
    const d = doc.data();
    return {
      id: doc.id,
      name: d.name,
      description: d.description ?? "",
      location: d.location,
      mainImage: d.mainImage || null,
      images: d.images ?? [],
      videos: d.videos ?? [],
      phone: d.phone || null,
      whatsapp: d.whatsapp || null,
      email: d.email || null,
      website: d.website || null,
      openingHours: d.openingHours ?? null,
      price: d.price ?? null,
      kashrutCertUrl: d.kashrutCertUrl || null,
      menuUrl: d.menuUrl || null,
      facebook: d.facebook || null,
      categoryId: d.categoryId,
      subcategoryIds: d.subcategoryIds ?? [],
      iconUrl: d.iconUrl || null,
    };
  });
}

export function usePois() {
  const [pois, setPois] = useState<Poi[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const q = query(collection(db, "points_of_interest"), where("active", "==", true));
    const unsub = onSnapshot(q, snap => {
      setPois(snapshotToPois(snap));
      setLoading(false);
    }, err => {
      reportError(err, { source: 'usePois' });
      setLoading(false);
    });
    return unsub;
  }, []);

  return { pois, loading };
}

export function useCategories() {
  const [categories, setCategories] = useState<Category[]>([]);

  useEffect(() => {
    const unsub = onSnapshot(collection(db, "categories"), snap => {
      setCategories(snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Category)));
    }, err => reportError(err, { source: 'useCategories' }));
    return unsub;
  }, []);

  return categories;
}

export function useSubcategories() {
  const [subcategories, setSubcategories] = useState<Subcategory[]>([]);

  useEffect(() => {
    const unsub = onSnapshot(collection(db, "subcategories"), snap => {
      setSubcategories(snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Subcategory)));
    }, err => reportError(err, { source: 'useSubcategories' }));
    return unsub;
  }, []);

  return subcategories;
}
