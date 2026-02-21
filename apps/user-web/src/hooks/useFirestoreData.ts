import { useState, useEffect } from "react";
import { collection, query, where, onSnapshot } from "firebase/firestore";
import type { QuerySnapshot, DocumentData } from "firebase/firestore";
import { db } from "../lib/firebase";
import type { Category, Poi, Tag, Subcategory } from "../types";

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
      phone: d.phone || null,
      email: d.email || null,
      website: d.website || null,
      openingHours: d.openingHours ?? null,
      price: d.price ?? null,
      categoryId: d.categoryId,
      tags: d.tags ?? [],
      subcategoryIds: d.subcategoryIds ?? [],
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
      console.error("usePois:", err);
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
    }, err => console.error("useCategories:", err));
    return unsub;
  }, []);

  return categories;
}

export function useTags() {
  const [tags, setTags] = useState<Tag[]>([]);

  useEffect(() => {
    const unsub = onSnapshot(collection(db, "tags"), snap => {
      setTags(snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Tag)));
    }, err => console.error("useTags:", err));
    return unsub;
  }, []);

  return tags;
}

export function useSubcategories() {
  const [subcategories, setSubcategories] = useState<Subcategory[]>([]);

  useEffect(() => {
    const unsub = onSnapshot(collection(db, "subcategories"), snap => {
      setSubcategories(snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Subcategory)));
    }, err => console.error("useSubcategories:", err));
    return unsub;
  }, []);

  return subcategories;
}
