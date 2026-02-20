import { describe, it, expect } from "vitest";
import { filterPois } from "./filterPois";
import type { Poi } from "../types";

const POIS: Poi[] = [
  { id: "1", name: "שוק הכרמל",   categoryId: "restaurants", tags: ["family", "kosher"],  location: { lat: 32.05, lng: 34.77 }, description: "", mainImage: null, images: [], phone: null, website: null },
  { id: "2", name: "פארק הירקון", categoryId: "parks",       tags: ["family", "pets"],   location: { lat: 32.10, lng: 34.80 }, description: "", mainImage: null, images: [], phone: null, website: null },
  { id: "3", name: "חוף בוגרשוב", categoryId: "beaches",     tags: ["water"],             location: { lat: 32.06, lng: 34.76 }, description: "", mainImage: null, images: [], phone: null, website: null },
  { id: "4", name: "מצדה",        categoryId: "sites",       tags: ["view", "free"],     location: { lat: 31.31, lng: 35.35 }, description: "", mainImage: null, images: [], phone: null, website: null },
];

const noFilter = {
  selectedCategories: new Set<string>(),
  selectedTags: new Set<string>(),
  searchQuery: "",
};

describe("filterPois", () => {
  it("returns all POIs when no filters are active", () => {
    expect(filterPois(POIS, noFilter)).toHaveLength(4);
  });

  it("filters by a single category", () => {
    const result = filterPois(POIS, {
      ...noFilter,
      selectedCategories: new Set(["parks"]),
    });
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe("2");
  });

  it("filters by multiple categories (OR logic)", () => {
    const result = filterPois(POIS, {
      ...noFilter,
      selectedCategories: new Set(["parks", "beaches"]),
    });
    expect(result).toHaveLength(2);
  });

  it("filters by a single tag", () => {
    const result = filterPois(POIS, {
      ...noFilter,
      selectedTags: new Set(["family"]),
    });
    expect(result).toHaveLength(2); // שוק הכרמל + פארק הירקון
  });

  it("filters by tag with OR logic across POI tags", () => {
    const result = filterPois(POIS, {
      ...noFilter,
      selectedTags: new Set(["view"]),
    });
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe("4");
  });

  it("filters by search query (substring match)", () => {
    const result = filterPois(POIS, { ...noFilter, searchQuery: "חוף" });
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe("3");
  });

  it("search returns nothing for no match", () => {
    const result = filterPois(POIS, { ...noFilter, searchQuery: "לונדון" });
    expect(result).toHaveLength(0);
  });

  it("combines category + tag filters (AND between filter types)", () => {
    // restaurants that also have the 'family' tag
    const result = filterPois(POIS, {
      selectedCategories: new Set(["restaurants"]),
      selectedTags: new Set(["family"]),
      searchQuery: "",
    });
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe("1");
  });

  it("combines category + search filters", () => {
    const result = filterPois(POIS, {
      selectedCategories: new Set(["sites"]),
      selectedTags: new Set(),
      searchQuery: "מצדה",
    });
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe("4");
  });

  it("returns empty array when no POIs match combined filters", () => {
    const result = filterPois(POIS, {
      selectedCategories: new Set(["hotels"]),
      selectedTags: new Set(["water"]),
      searchQuery: "",
    });
    expect(result).toHaveLength(0);
  });

  it("handles empty POI list gracefully", () => {
    expect(filterPois([], noFilter)).toHaveLength(0);
  });
});
