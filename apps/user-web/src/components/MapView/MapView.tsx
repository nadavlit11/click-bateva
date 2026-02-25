import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { APIProvider, Map, useMap } from "@vis.gl/react-google-maps";
import { MarkerClusterer } from "@googlemaps/markerclusterer";
import type { Marker } from "@googlemaps/markerclusterer";
import { PoiMarker } from "./PoiMarker";
import type { Poi, Category, Subcategory } from "../../types";

interface MapViewProps {
  pois: Poi[];
  categories: Category[];
  subcategories: Subcategory[];
  selectedPoiId: string | null;
  onPoiClick: (poi: Poi) => void;
  onMapClick?: () => void;
}

const ISRAEL_CENTER = { lat: 31.5, lng: 34.8 };
const MAP_ID = "DEMO_MAP_ID";
const ISRAEL_BOUNDS = { north: 33.8, south: 29.0, west: 33.8, east: 36.0 };
const LABEL_ZOOM_THRESHOLD = 14;

export function MapView({ pois, categories, subcategories, selectedPoiId, onPoiClick, onMapClick }: MapViewProps) {
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
        onClick={onMapClick}
      >
        <ClusteredPoiMarkers
          pois={pois}
          categories={categories}
          subcategories={subcategories}
          selectedPoiId={selectedPoiId}
          onPoiClick={onPoiClick}
        />
      </Map>
    </APIProvider>
  );
}

interface ClusteredPoiMarkersProps {
  pois: Poi[];
  categories: Category[];
  subcategories: Subcategory[];
  selectedPoiId: string | null;
  onPoiClick: (poi: Poi) => void;
}

function ClusteredPoiMarkers({ pois, categories, subcategories, selectedPoiId, onPoiClick }: ClusteredPoiMarkersProps) {
  const map = useMap();
  const [zoom, setZoom] = useState(8);
  const clusterer = useRef<MarkerClusterer | null>(null);
  const markersRef = useRef<Record<string, Marker>>({});

  const colorMap = useMemo(
    () => Object.fromEntries(categories.map((c) => [c.id, c.color])),
    [categories]
  );
  const iconUrlMap = useMemo(
    () => Object.fromEntries(categories.map((c) => [c.id, c.iconUrl])),
    [categories]
  );
  const subcategoryIconMap = useMemo(
    () => Object.fromEntries(
      subcategories.filter((s) => s.iconUrl != null).map((s) => [s.id, s.iconUrl])
    ),
    [subcategories]
  );

  const [clustererReady, setClustererReady] = useState(false);
  const syncPending = useRef(false);

  // Initialize clusterer when map is ready; cleanup on map change
  useEffect(() => {
    if (!map) return;
    clusterer.current = new MarkerClusterer({
      map,
      renderer: {
        render({ count, position }) {
          const size = Math.min(24 + Math.floor(count / 5) * 2, 48);
          const el = document.createElement("div");
          el.style.cssText = `
            width: ${size}px; height: ${size}px;
            background: rgba(22, 163, 74, 0.85);
            border: 2px solid white;
            border-radius: 50%;
            display: flex; align-items: center; justify-content: center;
            color: white; font-size: 12px; font-weight: 600;
            font-family: Rubik, sans-serif;
            box-shadow: 0 2px 8px rgba(0,0,0,0.3);
          `;
          el.textContent = String(count);
          return new google.maps.marker.AdvancedMarkerElement({
            position,
            content: el,
            zIndex: 0,
          });
        },
      },
    });
    setClustererReady(true);
    return () => {
      clusterer.current?.clearMarkers();
      clusterer.current = null;
      setClustererReady(false);
    };
  }, [map]);

  // Track zoom changes
  useEffect(() => {
    if (!map) return;
    const listener = map.addListener("zoom_changed", () => {
      setZoom(Math.round(map.getZoom() ?? 8));
    });
    return () => listener.remove();
  }, [map]);

  // Sync markers with clusterer when POIs change or clusterer becomes ready
  useEffect(() => {
    if (!clusterer.current) return;
    clusterer.current.clearMarkers();
    const currentMarkers = Object.values(markersRef.current);
    if (currentMarkers.length > 0) {
      clusterer.current.addMarkers(currentMarkers);
    }
  }, [pois, clustererReady]);

  // Debounced clusterer sync — batches rapid marker ref callbacks into one update
  const scheduleSync = useCallback(() => {
    if (syncPending.current) return;
    syncPending.current = true;
    Promise.resolve().then(() => {
      syncPending.current = false;
      if (clusterer.current) {
        clusterer.current.clearMarkers();
        clusterer.current.addMarkers(Object.values(markersRef.current));
      }
    });
  }, []);

  const setMarkerRef = useCallback(
    (marker: google.maps.marker.AdvancedMarkerElement | null, key: string) => {
      if (marker) {
        markersRef.current[key] = marker;
      } else {
        delete markersRef.current[key];
      }
      scheduleSync();
    },
    [scheduleSync]
  );

  const showLabels = zoom >= LABEL_ZOOM_THRESHOLD;

  return (
    <>
      {pois.map((poi) => {
        const subcategoryIcon = poi.subcategoryIds.reduce<string | null>(
          (found, sid) => found ?? (subcategoryIconMap[sid] ?? null),
          null
        );
        const resolvedIconUrl = poi.iconUrl ?? subcategoryIcon ?? iconUrlMap[poi.categoryId] ?? null;
        return (
          <PoiMarker
            key={poi.id}
            poi={poi}
            color={colorMap[poi.categoryId] ?? "#4caf50"}
            iconUrl={resolvedIconUrl}
            selected={poi.id === selectedPoiId}
            showLabel={showLabels}
            onClick={() => onPoiClick(poi)}
            setMarkerRef={setMarkerRef}
          />
        );
      })}
    </>
  );
}
