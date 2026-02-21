import { describe, it, expect } from "vitest";
import { filterPois } from "./filterPois";
import type { Poi, Subcategory } from "../types";

const mkPoi = (overrides: Partial<Poi> & Pick<Poi, "id" | "categoryId">): Poi => ({
  name: "test",
  description: "",
  location: { lat: 32.0, lng: 34.8 },
  mainImage: null,
  images: [],
  phone: null,
  email: null,
  website: null,
  openingHours: null,
  price: null,
  tags: [],
  subcategoryIds: [],
  ...overrides,
});

const POIS: Poi[] = [
  mkPoi({ id: "1", name: "שוק הכרמל",   categoryId: "restaurants", tags: ["north"] }),
  mkPoi({ id: "2", name: "פארק הירקון", categoryId: "parks",       tags: ["center"] }),
  mkPoi({ id: "3", name: "חוף בוגרשוב", categoryId: "beaches",     tags: ["center"] }),
  mkPoi({ id: "4", name: "מצדה",        categoryId: "sites",       tags: ["south"] }),
];

const noFilter = {
  selectedCategories: new Set<string>(),
  selectedTags: new Set<string>(),
  selectedSubcategories: new Set<string>(),
  searchQuery: "",
  subcategories: [] as Subcategory[],
};

describe("filterPois", () => {
  it("returns all POIs when no filters are active", () => {
    expect(filterPois(POIS, noFilter)).toHaveLength(4);
  });

  it("filters by a single category", () => {
    const result = filterPois(POIS, { ...noFilter, selectedCategories: new Set(["parks"]) });
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

  it("filters by location tag (OR logic)", () => {
    const result = filterPois(POIS, { ...noFilter, selectedTags: new Set(["center"]) });
    expect(result).toHaveLength(2); // פארק הירקון + חוף בוגרשוב
  });

  it("multiple location tags use OR logic", () => {
    const result = filterPois(POIS, { ...noFilter, selectedTags: new Set(["north", "south"]) });
    expect(result).toHaveLength(2); // שוק הכרמל + מצדה
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

  it("combines category + location tag filters (AND between filter types)", () => {
    const result = filterPois(POIS, {
      ...noFilter,
      selectedCategories: new Set(["restaurants"]),
      selectedTags: new Set(["north"]),
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

  it("returns empty array when no POIs match", () => {
    const result = filterPois(POIS, {
      ...noFilter,
      selectedCategories: new Set(["hotels"]),
    });
    expect(result).toHaveLength(0);
  });

  it("handles empty POI list gracefully", () => {
    expect(filterPois([], noFilter)).toHaveLength(0);
  });

  describe("subcategory filter — per-category scoping", () => {
    const kosherSub: Subcategory = { id: "kosher", categoryId: "restaurants", group: "kashrut", name: "כשר" };
    const couplesSub: Subcategory = { id: "couples", categoryId: "hotels", group: "audience", name: "זוגות" };
    const cheapSub: Subcategory = { id: "cheap", categoryId: "restaurants", group: "price", name: "זול" };

    const hike    = mkPoi({ id: "hike",    categoryId: "hikes" });
    const kosherRest = mkPoi({ id: "krest", categoryId: "restaurants", subcategoryIds: ["kosher"] });
    const normalRest = mkPoi({ id: "nrest", categoryId: "restaurants", subcategoryIds: [] });
    const couplesHotel = mkPoi({ id: "chotel", categoryId: "hotels", subcategoryIds: ["couples"] });
    const familyHotel  = mkPoi({ id: "fhotel", categoryId: "hotels", subcategoryIds: [] });

    it("hike passes through kosher restaurant filter untouched", () => {
      const result = filterPois([hike, kosherRest, normalRest], {
        ...noFilter,
        selectedSubcategories: new Set(["kosher"]),
        subcategories: [kosherSub],
      });
      expect(result).toHaveLength(2); // hike + kosher restaurant
      expect(result.map(p => p.id)).toContain("hike");
      expect(result.map(p => p.id)).toContain("krest");
    });

    it("non-matching restaurant is filtered out", () => {
      const result = filterPois([hike, kosherRest, normalRest], {
        ...noFilter,
        selectedSubcategories: new Set(["kosher"]),
        subcategories: [kosherSub],
      });
      expect(result.map(p => p.id)).not.toContain("nrest");
    });

    it("multi-category trip: hikes + kosher restaurants + couples hotels", () => {
      const pois = [hike, kosherRest, normalRest, couplesHotel, familyHotel];
      const result = filterPois(pois, {
        ...noFilter,
        selectedSubcategories: new Set(["kosher", "couples"]),
        subcategories: [kosherSub, couplesSub],
      });
      // hike passes, kosher restaurant passes, couples hotel passes
      // normal restaurant filtered out, family hotel filtered out
      expect(result).toHaveLength(3);
      expect(result.map(p => p.id)).toEqual(expect.arrayContaining(["hike", "krest", "chotel"]));
    });

    it("AND-across-subcategory-groups within a category", () => {
      const cheapKosher = mkPoi({ id: "ck", categoryId: "restaurants", subcategoryIds: ["kosher", "cheap"] });
      const kosherOnly  = mkPoi({ id: "ko", categoryId: "restaurants", subcategoryIds: ["kosher"] });
      const cheapOnly   = mkPoi({ id: "co", categoryId: "restaurants", subcategoryIds: ["cheap"] });

      const result = filterPois([cheapKosher, kosherOnly, cheapOnly], {
        ...noFilter,
        selectedSubcategories: new Set(["kosher", "cheap"]),
        subcategories: [kosherSub, cheapSub],
      });
      // Must have BOTH kosher AND cheap (AND across groups)
      expect(result).toHaveLength(1);
      expect(result[0].id).toBe("ck");
    });

    it("OR-within-subcategory-group: two options in same group", () => {
      const mediumSub: Subcategory = { id: "medium", categoryId: "restaurants", group: "price", name: "בינוני" };
      const cheapRest  = mkPoi({ id: "cr", categoryId: "restaurants", subcategoryIds: ["cheap"] });
      const mediumRest = mkPoi({ id: "mr", categoryId: "restaurants", subcategoryIds: ["medium"] });
      const expRest    = mkPoi({ id: "er", categoryId: "restaurants", subcategoryIds: [] });

      const result = filterPois([cheapRest, mediumRest, expRest], {
        ...noFilter,
        selectedSubcategories: new Set(["cheap", "medium"]),
        subcategories: [cheapSub, mediumSub],
      });
      // cheap OR medium within same "price" group
      expect(result).toHaveLength(2);
      expect(result.map(p => p.id)).toEqual(expect.arrayContaining(["cr", "mr"]));
    });

    it("no subcategories selected — all POIs pass", () => {
      const result = filterPois([hike, kosherRest, normalRest], noFilter);
      expect(result).toHaveLength(3);
    });
  });
});
