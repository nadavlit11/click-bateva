import { useMemo } from "react";
import { APIProvider, Map } from "@vis.gl/react-google-maps";
import { PoiMarker } from "./PoiMarker";
import type { Poi, Category } from "../../types";

interface MapViewProps {
  pois: Poi[];
  categories: Category[];
  selectedPoiId: string | null;
  onPoiClick: (poi: Poi) => void;
}

const ISRAEL_CENTER = { lat: 31.5, lng: 34.8 };
const MAP_ID = "DEMO_MAP_ID";
const ISRAEL_BOUNDS = { north: 33.8, south: 28.5, west: 33.8, east: 36.0 };

export function MapView({ pois, categories, selectedPoiId, onPoiClick }: MapViewProps) {
  const colorMap = useMemo(
    () => Object.fromEntries(categories.map((c) => [c.id, c.color])),
    [categories]
  );
  const iconUrlMap = useMemo(
    () => Object.fromEntries(categories.map((c) => [c.id, c.iconUrl])),
    [categories]
  );

  return (
    <APIProvider apiKey={import.meta.env.VITE_GOOGLE_MAPS_API_KEY} language="he" region="IL">
      <Map
        defaultCenter={ISRAEL_CENTER}
        defaultZoom={8}
        mapId={MAP_ID}
        gestureHandling="greedy"
        mapTypeControl={false}
        minZoom={8}
        restriction={{ latLngBounds: ISRAEL_BOUNDS, strictBounds: false }}
        className="w-full h-full"
      >
        {pois.map((poi) => (
          <PoiMarker
            key={poi.id}
            poi={poi}
            color={colorMap[poi.categoryId] ?? "#4caf50"}
            iconUrl={iconUrlMap[poi.categoryId] ?? null}
            selected={poi.id === selectedPoiId}
            onClick={() => onPoiClick(poi)}
          />
        ))}
      </Map>
    </APIProvider>
  );
}
