import type { Poi, Subcategory } from "../types";

export interface PoiFilter {
  selectedCategories: Set<string>;
  selectedSubcategories: Set<string>;  // category-scoped refinement IDs
  searchQuery: string;
  subcategories: Subcategory[];        // for categoryId + group lookup
}

export function filterPois(pois: Poi[], filter: PoiFilter): Poi[] {
  const { selectedCategories, selectedSubcategories, searchQuery, subcategories } = filter;

  // Build: category → group → selected subcategory IDs
  // AND-across-subcategory-groups, OR-within-group, scoped per category
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
    const hasSearch = searchQuery !== "";
    const matchesSearch = hasSearch && poi.name.includes(searchQuery);

    // Category gate: if categories are selected, POI must be in one of them.
    // If none selected, only search-matching POIs pass through.
    const matchesCategory =
      selectedCategories.size === 0
        ? matchesSearch
        : selectedCategories.has(poi.categoryId);
    if (!matchesCategory) return false;

    // Search filter (when active and categories are selected)
    if (hasSearch && !matchesSearch) return false;

    // Subcategories: AND-across-groups, OR-within-group — scoped to this POI's category
    const catGroups = subsByCategory.get(poi.categoryId);
    const matchesSubcategory =
      !catGroups ||
      Array.from(catGroups.values()).every(
        groupSet => (poi.subcategoryIds ?? []).some(s => groupSet.has(s))
      );

    return matchesSubcategory;
  });
}
