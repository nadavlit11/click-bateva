import type { Poi, Subcategory } from "../types";

export interface PoiFilter {
  selectedCategories: Set<string>;
  selectedSubcategories: Set<string>;
  subcategories: Subcategory[];
}

export function filterPois(pois: Poi[], filter: PoiFilter): Poi[] {
  const { selectedCategories, selectedSubcategories, subcategories } = filter;

  const subsByCategory = new Map<string, Map<string | null, Set<string>>>();
  for (const subId of selectedSubcategories) {
    const sub = subcategories.find(s => s.id === subId);
    if (!sub) continue;
    if (!subsByCategory.has(sub.categoryId)) subsByCategory.set(sub.categoryId, new Map());
    const groupMap = subsByCategory.get(sub.categoryId)!;
    const group = sub.group ?? null;
    if (!groupMap.has(group)) groupMap.set(group, new Set());
    groupMap.get(group)!.add(subId);
  }

  return pois.filter((poi) => {
    if (selectedCategories.size > 0 && !selectedCategories.has(poi.categoryId)) return false;

    const catGroups = subsByCategory.get(poi.categoryId);
    const matchesSubcategory =
      !catGroups ||
      Array.from(catGroups.values()).every(
        groupSet => (poi.subcategoryIds ?? []).some(s => groupSet.has(s))
      );

    return matchesSubcategory;
  });
}
