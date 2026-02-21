import { describe, it, expect } from "vitest";
import { filterPois } from "./filterPois";
import type { Poi, Tag } from "../types";

const POIS: Poi[] = [
  { id: "1", name: "שוק הכרמל",   categoryId: "restaurants", tags: ["family", "kosher"],  location: { lat: 32.05, lng: 34.77 }, description: "", mainImage: null, images: [], phone: null, email: null, website: null, openingHours: null, price: null },
  { id: "2", name: "פארק הירקון", categoryId: "parks",       tags: ["family", "pets"],   location: { lat: 32.10, lng: 34.80 }, description: "", mainImage: null, images: [], phone: null, email: null, website: null, openingHours: null, price: null },
  { id: "3", name: "חוף בוגרשוב", categoryId: "beaches",     tags: ["water"],             location: { lat: 32.06, lng: 34.76 }, description: "", mainImage: null, images: [], phone: null, email: null, website: null, openingHours: null, price: null },
  { id: "4", name: "מצדה",        categoryId: "sites",       tags: ["view", "free"],     location: { lat: 31.31, lng: 35.35 }, description: "", mainImage: null, images: [], phone: null, email: null, website: null, openingHours: null, price: null },
];

const noFilter = {
  selectedCategories: new Set<string>(),
  selectedTags: new Set<string>(),
  searchQuery: "",
  tags: [],
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
      ...noFilter,
      selectedCategories: new Set(["restaurants"]),
      selectedTags: new Set(["family"]),
    });
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe("1");
  });

  it("combines category + search filters", () => {
    const result = filterPois(POIS, {
      ...noFilter,
      selectedCategories: new Set(["sites"]),
      searchQuery: "מצדה",
    });
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe("4");
  });

  it("returns empty array when no POIs match combined filters", () => {
    const result = filterPois(POIS, {
      ...noFilter,
      selectedCategories: new Set(["hotels"]),
      selectedTags: new Set(["water"]),
    });
    expect(result).toHaveLength(0);
  });

  it("handles empty POI list gracefully", () => {
    expect(filterPois([], noFilter)).toHaveLength(0);
  });

  describe("AND-across-groups OR-within-group tag logic", () => {
    const TAGS: Tag[] = [
      { id: "north",  name: "צפון",           group: "location" },
      { id: "south",  name: "דרום",           group: "location" },
      { id: "kosher", name: "כשר",            group: "kashrut" },
      { id: "view",   name: "נוף מהמם",       group: null },
      { id: "free",   name: "כניסה חופשית",   group: null },
    ];

    it("OR within same group: north OR south shows POIs with either location tag", () => {
      const pois: Poi[] = [
        { ...POIS[0], tags: ["north"] },
        { ...POIS[1], tags: ["south"] },
        { ...POIS[2], tags: [] },
      ];
      const result = filterPois(pois, {
        ...noFilter,
        selectedTags: new Set(["north", "south"]),
        tags: TAGS,
      });
      expect(result).toHaveLength(2);
    });

    it("AND across groups: north AND kosher shows only POIs with both", () => {
      const pois: Poi[] = [
        { ...POIS[0], tags: ["north", "kosher"] },
        { ...POIS[1], tags: ["north"] },           // missing kashrut tag
        { ...POIS[2], tags: ["kosher"] },          // missing location tag
      ];
      const result = filterPois(pois, {
        ...noFilter,
        selectedTags: new Set(["north", "kosher"]),
        tags: TAGS,
      });
      expect(result).toHaveLength(1);
      expect(result[0].id).toBe("1");
    });

    it("null-group tags use OR logic: selecting two ungrouped tags shows POIs with either", () => {
      const pois: Poi[] = [
        { ...POIS[0], tags: ["view"] },
        { ...POIS[1], tags: ["free"] },
        { ...POIS[2], tags: [] },
      ];
      const result = filterPois(pois, {
        ...noFilter,
        selectedTags: new Set(["view", "free"]),
        tags: TAGS,
      });
      expect(result).toHaveLength(2);
    });

    it("mixed groups: location + ungrouped applies AND across them", () => {
      const pois: Poi[] = [
        { ...POIS[0], tags: ["north", "view"] },  // matches both
        { ...POIS[1], tags: ["north"] },           // missing ungrouped tag
        { ...POIS[2], tags: ["view"] },            // missing location tag
      ];
      const result = filterPois(pois, {
        ...noFilter,
        selectedTags: new Set(["north", "view"]),
        tags: TAGS,
      });
      expect(result).toHaveLength(1);
      expect(result[0].id).toBe("1");
    });
  });
});
