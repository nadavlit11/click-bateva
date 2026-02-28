import { useCallback, useEffect, useMemo, useState, useRef } from "react";
import { APIProvider, Map, useMap } from "@vis.gl/react-google-maps";
import { MarkerClusterer, SuperClusterAlgorithm } from "@googlemaps/markerclusterer";
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
  focusLocation?: { lat: number; lng: number; zoom: number } | null;
  onFocusConsumed?: () => void;
}

const ISRAEL_CENTER = { lat: 31.5, lng: 34.8 };
const MAP_ID = "DEMO_MAP_ID";
const ISRAEL_BOUNDS = { north: 33.8, south: 29.0, west: 33.8, east: 36.0 };
const LABEL_ZOOM_THRESHOLD = 11;

export function MapView({ pois, categories, subcategories, selectedPoiId, onPoiClick, onMapClick, focusLocation, onFocusConsumed }: MapViewProps) {
  return (
    <APIProvider apiKey={import.meta.env.VITE_GOOGLE_MAPS_API_KEY} language="he" region="IL">
      <Map
        defaultCenter={ISRAEL_CENTER}
        defaultZoom={8}
        mapId={MAP_ID}
        gestureHandling="greedy"
        mapTypeControl={false}
        fullscreenControl={false}
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
          focusLocation={focusLocation}
          onFocusConsumed={onFocusConsumed}
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
  focusLocation?: { lat: number; lng: number; zoom: number } | null;
  onFocusConsumed?: () => void;
}

function ClusteredPoiMarkers({ pois, categories, subcategories, selectedPoiId, onPoiClick, focusLocation, onFocusConsumed }: ClusteredPoiMarkersProps) {
  const map = useMap();
  const [zoom, setZoom] = useState(8);
  const clusterer = useRef<MarkerClusterer | null>(null);
  const [markers, setMarkers] = useState<Record<string, Marker>>({});

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

  // Initialize clusterer when map is ready
  useEffect(() => {
    if (!map) return;
    clusterer.current = new MarkerClusterer({
      map,
      algorithm: new SuperClusterAlgorithm({ radius: 25, maxZoom: 14 }),
      onClusterClick: (_event, cluster, map) => {
        const currentZoom = map.getZoom() ?? 8;
        // Extract primitives immediately — LatLng references can go stale
        // when the clusterer re-renders on the next idle event.
        const pos = cluster.bounds?.getCenter() ?? cluster.position;
        const ll = new google.maps.LatLng(pos);
        map.moveCamera({ center: { lat: ll.lat(), lng: ll.lng() }, zoom: currentZoom + 3 });
      },
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
    return () => {
      clusterer.current?.setMap(null);
      clusterer.current = null;
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

  // Sync clusterer whenever the markers state changes
  useEffect(() => {
    if (!clusterer.current) return;
    clusterer.current.clearMarkers(true);
    clusterer.current.addMarkers(Object.values(markers));
  }, [markers]);

  // Pan and zoom to a focused location when requested
  useEffect(() => {
    if (!map || !focusLocation) return;
    map.moveCamera({ center: { lat: focusLocation.lat, lng: focusLocation.lng }, zoom: focusLocation.zoom });
    onFocusConsumed?.();
  }, [focusLocation, map, onFocusConsumed]);

  // Ref callback: register/unregister marker elements via state (not ref)
  // so the sync effect re-runs when markers actually become available
  const setMarkerRef = useCallback(
    (marker: google.maps.marker.AdvancedMarkerElement | null, key: string) => {
      setMarkers(prev => {
        if (marker && prev[key]) return prev;
        if (!marker && !prev[key]) return prev;
        if (marker) {
          return { ...prev, [key]: marker };
        } else {
          const next = { ...prev };
          delete next[key];
          return next;
        }
      });
    },
    []
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
