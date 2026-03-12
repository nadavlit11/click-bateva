import type { MapKey } from "../hooks/useFirestoreData";

export const MAP_LABELS: Record<MapKey, string> = {
  groups: "מפת קבוצות",
  agents: "מפת מפיקים",
  families: "מפת משפחות",
};

export const FOOD_CATEGORY_ID = "GACgSvKyWbBZegz02zI5";
export const HIKE_CATEGORY_ID = "hiking"; // TODO: replace with production Firestore ID
